"""Sentinel Family backend regression tests.

Covers: auth, legal/consent, permissions, profile, groups & invitations,
location, events, plans/entitlements/billing, providers/mobility, meetings, convoys.

Uses the public EXPO_PUBLIC_BACKEND_URL from /app/frontend/.env.
"""
import os
import time
import uuid

import pytest
import requests

# Load public URL from frontend/.env
FRONTEND_ENV = "/app/frontend/.env"
BASE_URL = None
with open(FRONTEND_ENV) as f:
    for line in f:
        if line.strip().startswith("EXPO_PUBLIC_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
            break
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not found"
API = f"{BASE_URL}/api"


def uniq_email(prefix="user"):
    return f"TEST_{prefix}_{uuid.uuid4().hex[:10]}@sentinelfamily.app"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def owner(s):
    """Register a fresh owner user and finish through consent+profile+group."""
    email = uniq_email("owner")
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Sentinel2026!"})
    assert r.status_code == 201, r.text
    data = r.json()
    tok = data["access_token"]
    ref = data["refresh_token"]
    return {"email": email, "access": tok, "refresh": ref, "user": data["user"]}


def auth_h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ------------------ AUTH ------------------
class TestAuth:
    def test_register_returns_tokens_and_user(self, s):
        email = uniq_email("reg")
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Sentinel2026!"})
        assert r.status_code == 201
        d = r.json()
        assert d["token_type"] == "bearer"
        assert d["access_token"] and d["refresh_token"]
        assert d["user"]["email"] == email.lower()
        assert d["user"]["plan"] == "free"

    def test_register_duplicate_409(self, s, owner):
        r = s.post(f"{API}/auth/register", json={"email": owner["email"], "password": "Sentinel2026!"})
        assert r.status_code == 409

    def test_login_wrong_password_401(self, s, owner):
        r = s.post(f"{API}/auth/login", json={"email": owner["email"], "password": "WrongPass1!"})
        assert r.status_code == 401

    def test_me_with_bearer(self, s, owner):
        r = s.get(f"{API}/auth/me", headers=auth_h(owner["access"]))
        assert r.status_code == 200
        assert r.json()["email"] == owner["email"].lower()

    def test_refresh_rotates_and_old_fails(self, s):
        email = uniq_email("refresh")
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Sentinel2026!"})
        old_ref = r.json()["refresh_token"]
        r2 = s.post(f"{API}/auth/refresh", json={"refresh_token": old_ref})
        assert r2.status_code == 200
        assert r2.json()["refresh_token"] != old_ref
        # Using old refresh token must fail 401
        r3 = s.post(f"{API}/auth/refresh", json={"refresh_token": old_ref})
        assert r3.status_code == 401


# ------------------ LEGAL / CONSENT / PERMISSIONS ------------------
class TestLegalConsentPermissions:
    def test_legal_documents_list(self, s):
        r = s.get(f"{API}/legal/documents")
        assert r.status_code == 200
        docs = r.json()
        assert "terms" in docs and "privacy" in docs and "security" in docs

    def test_legal_terms_body(self, s):
        r = s.get(f"{API}/legal/documents/terms")
        assert r.status_code == 200
        d = r.json()
        assert d["version"] and isinstance(d["body"], list)

    def test_record_consent(self, s, owner):
        r = s.post(f"{API}/consents", headers=auth_h(owner["access"]),
                   json={"document": "terms", "version": "2026-06-01", "accepted": True})
        assert r.status_code == 201

    def test_consent_status(self, s, owner):
        # accept terms first (idempotent, appended)
        s.post(f"{API}/consents", headers=auth_h(owner["access"]),
               json={"document": "terms", "version": "2026-06-01", "accepted": True})
        r = s.get(f"{API}/consents/status", headers=auth_h(owner["access"]))
        assert r.status_code == 200
        assert r.json()["terms_accepted"] is True

    def test_permissions_catalog_14(self, s):
        r = s.get(f"{API}/permissions/catalog")
        assert r.status_code == 200
        assert len(r.json()) == 14

    def test_permission_grant_then_revoke_history(self, s, owner):
        h = auth_h(owner["access"])
        r = s.post(f"{API}/permissions", headers=h,
                   json={"key": "exact_location", "granted": True, "scope": "all"})
        assert r.status_code == 201
        r = s.get(f"{API}/permissions", headers=h)
        assert r.status_code == 200
        assert r.json()["exact_location::all"]["effective"] is True
        r = s.post(f"{API}/permissions", headers=h,
                   json={"key": "exact_location", "granted": False, "scope": "all"})
        assert r.status_code == 201
        r = s.get(f"{API}/permissions", headers=h)
        assert r.json()["exact_location::all"]["effective"] is False
        r = s.get(f"{API}/permissions/history", headers=h)
        assert r.status_code == 200
        # Should have at least 2 permission events for exact_location
        events = [e for e in r.json() if e["key"] == "exact_location"]
        assert len(events) >= 2


# ------------------ PROFILE / GROUP / INVITATIONS ------------------
@pytest.fixture(scope="session")
def owner_with_profile(s, owner):
    h = auth_h(owner["access"])
    r = s.put(f"{API}/profile", headers=h, json={"name": "Ana"})
    assert r.status_code == 200
    r = s.put(f"{API}/profile/avatar", headers=h,
              json={"color": "#22D3EE", "symbol": "pin", "outline": "solid"})
    assert r.status_code == 200
    return owner


@pytest.fixture(scope="session")
def owner_group(s, owner_with_profile):
    h = auth_h(owner_with_profile["access"])
    r = s.post(f"{API}/groups", headers=h, json={"name": "Grupo 1"})
    assert r.status_code == 201, r.text
    g = r.json()
    return {"id": g["id"], "data": g, "owner": owner_with_profile}


class TestProfileAndGroups:
    def test_profile_and_avatar(self, s, owner_with_profile):
        r = s.get(f"{API}/auth/me", headers=auth_h(owner_with_profile["access"]))
        assert r.json()["profile"]["name"] == "Ana"
        assert r.json()["avatar"]["color"] == "#22D3EE"

    def test_free_plan_second_group_402(self, s, owner_group):
        h = auth_h(owner_group["owner"]["access"])
        r = s.post(f"{API}/groups", headers=h, json={"name": "Grupo 2"})
        assert r.status_code == 402
        d = r.json()["detail"]
        assert d["code"] == "PLAN_UNAVAILABLE"
        assert d["title"] == "NO DISPONIBLE EN EL PLAN ACTUAL"

    def test_rename_group(self, s, owner_group):
        h = auth_h(owner_group["owner"]["access"])
        r = s.patch(f"{API}/groups/{owner_group['id']}", headers=h, json={"name": "Familia"})
        assert r.status_code == 200
        assert r.json()["name"] == "Familia"

    def test_invitation_dispatch_resend_cancel(self, s, owner_group):
        h = auth_h(owner_group["owner"]["access"])
        # Create fixed whatsapp invitation
        r = s.post(f"{API}/groups/{owner_group['id']}/invitations", headers=h,
                   json={"name": "Marta", "membership": "fixed", "channel": "whatsapp"})
        assert r.status_code == 201
        inv = r.json()["invitation"]
        assert inv["status"] == "prepared"
        assert inv["link"].endswith(f"/invite/{inv['token']}")

        # Dispatch
        r = s.post(f"{API}/invitations/{inv['id']}/dispatched", headers=h)
        assert r.status_code == 200
        assert r.json()["status"] == "dispatched"

        # Resend -> prepared again
        r = s.post(f"{API}/invitations/{inv['id']}/resend", headers=h)
        assert r.status_code == 200
        assert r.json()["status"] == "prepared"

        # Cancel -> member removed
        r = s.post(f"{API}/invitations/{inv['id']}/cancel", headers=h)
        assert r.status_code == 200
        r2 = s.get(f"{API}/groups/{owner_group['id']}", headers=h)
        assert not any(m["display_name"] == "Marta" and m["status"] != "removed" for m in r2.json()["members"])

    def test_temporary_invite_and_accept_flow(self, s, owner_group):
        h = auth_h(owner_group["owner"]["access"])
        # Temporary sms with duration_hours
        r = s.post(f"{API}/groups/{owner_group['id']}/invitations", headers=h,
                   json={"name": "Luis", "membership": "temporary", "channel": "sms", "duration_hours": 72})
        assert r.status_code == 201
        inv = r.json()["invitation"]
        token = inv["token"]

        # by-token without auth
        r = s.get(f"{API}/invitations/by-token/{token}")
        assert r.status_code == 200
        by_tok = r.json()
        assert by_tok["group_name"] in ("Familia", "Grupo 1")
        assert "token" not in by_tok  # token stripped

        # Second user registers and responds
        email = uniq_email("guest")
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Sentinel2026!"})
        assert r.status_code == 201
        guest_tok = r.json()["access_token"]

        r = s.post(f"{API}/invitations/by-token/{token}/respond",
                   headers=auth_h(guest_tok), json={"accept": True})
        assert r.status_code == 200
        assert r.json()["status"] == "accepted"

        # Group now shows guest as active
        r = s.get(f"{API}/groups/{owner_group['id']}", headers=h)
        members = r.json()["members"]
        # Verify location_state exists for members with user_id
        for m in members:
            if m.get("user_id"):
                assert m["location_state"] in ("not_shared", "permission_pending", "shared")
        assert r.json()["stats"]["members"] >= 2


# ------------------ LOCATION ------------------
class TestLocation:
    def test_location_without_permission_403(self, s):
        # Fresh user with no permissions
        email = uniq_email("nopos")
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "Sentinel2026!"})
        tok = r.json()["access_token"]
        r = s.post(f"{API}/location", headers=auth_h(tok),
                   json={"lat": 40.4168, "lng": -3.7038})
        assert r.status_code == 403

    def test_location_with_permission_ok_and_positions(self, s, owner_group):
        h = auth_h(owner_group["owner"]["access"])
        # Grant exact_location for the owner
        s.post(f"{API}/permissions", headers=h,
               json={"key": "exact_location", "granted": True, "scope": "all"})
        r = s.post(f"{API}/location", headers=h,
                   json={"lat": 40.4168, "lng": -3.7038, "mobility_mode": "car", "status": "moving"})
        assert r.status_code == 200
        r = s.get(f"{API}/groups/{owner_group['id']}/positions", headers=h)
        assert r.status_code == 200
        data = r.json()
        assert any(p["is_me"] and p["state"] == "shared" for p in data)
        # Guest that hasn't shared location must show not_shared
        assert any((not p["is_me"]) and p["state"] == "not_shared" for p in data) or len(data) == 1


# ------------------ EVENTS ------------------
class TestEvents:
    def test_checkin_and_action_resolve(self, s, owner_group):
        h = auth_h(owner_group["owner"]["access"])
        r = s.post(f"{API}/events", headers=h,
                   json={"group_id": owner_group["id"], "kind": "checkin", "severity": "info", "message": "hola"})
        assert r.status_code == 201
        ev = r.json()
        r = s.get(f"{API}/groups/{owner_group['id']}/events", headers=h)
        assert r.status_code == 200
        assert any(e["id"] == ev["id"] for e in r.json())
        r = s.post(f"{API}/events/{ev['id']}/action", headers=h, json={"action": "respond_ok"})
        assert r.status_code == 200
        assert r.json()["state"] == "resolved"

    def test_v16_kind_returns_503(self, s, owner_group):
        h = auth_h(owner_group["owner"]["access"])
        r = s.post(f"{API}/events", headers=h,
                   json={"group_id": owner_group["id"], "kind": "v16"})
        assert r.status_code == 503
        d = r.json()["detail"]
        assert d["code"] == "SERVICE_NOT_CONFIGURED"


# ------------------ PLANS / ENTITLEMENTS / BILLING ------------------
class TestPlans:
    def test_plans_catalog_has_three(self, s):
        r = s.get(f"{API}/plans")
        assert r.status_code == 200
        codes = [p["code"] for p in r.json()]
        assert set(codes) >= {"free", "basic", "pro"}

    def test_entitlements(self, s, owner):
        r = s.get(f"{API}/entitlements", headers=auth_h(owner["access"]))
        assert r.status_code == 200
        assert r.json()["plan"] == "free"

    def test_billing_upgrade_pro_503(self, s, owner):
        r = s.post(f"{API}/billing/upgrade/pro", headers=auth_h(owner["access"]))
        assert r.status_code == 503
        assert r.json()["detail"]["code"] == "SERVICE_NOT_CONFIGURED"

    def test_system_status_providers(self, s):
        r = s.get(f"{API}/system/status")
        assert r.status_code == 200
        prov = r.json()["providers"]
        assert "geocoding" in prov and "routing" in prov and "traffic" in prov


# ------------------ MOBILITY PROVIDERS ------------------
class TestMobility:
    def test_geocode_puerta_del_sol(self, s, owner):
        r = s.get(f"{API}/mobility/geocode",
                  params={"q": "Puerta del Sol Madrid"}, headers=auth_h(owner["access"]))
        # Provider may be slow / rate-limited; accept 200 or 503
        assert r.status_code in (200, 503)
        if r.status_code == 200:
            res = r.json()
            assert isinstance(res, list) and len(res) >= 1
            assert "lat" in res[0] and "lng" in res[0]

    def test_route_two_points(self, s, owner):
        r = s.post(f"{API}/mobility/route", headers=auth_h(owner["access"]),
                   json={"points": [[40.4168, -3.7038], [40.4530, -3.6883]]})
        assert r.status_code in (200, 503)
        if r.status_code == 200:
            d = r.json()
            assert d["distance_m"] > 0 and d["duration_s"] > 0

    def test_traffic_truthful(self, s, owner):
        """With AZURE_MAPS_KEY configured traffic returns real flow data; without it a truthful 503."""
        r = s.get(f"{API}/mobility/traffic",
                  params={"lat": 40.4168, "lng": -3.7038}, headers=auth_h(owner["access"]))
        assert r.status_code in (200, 503)
        if r.status_code == 200:
            assert r.json()["provider"] == "azure_maps" and "current_speed" in r.json()
        else:
            assert r.json()["detail"]["code"] == "SERVICE_NOT_CONFIGURED"

    def test_anti_congestion_plan_gate(self, s, owner):
        """Free plan → 402 PLAN_UNAVAILABLE (entitlement antiCongestion=false)."""
        r = s.get(f"{API}/mobility/anti-congestion",
                  params={"from_lat": 40.4168, "from_lng": -3.7038, "to_lat": 40.4895, "to_lng": -3.6827}, headers=auth_h(owner["access"]))
        assert r.status_code == 402
        assert r.json()["detail"]["code"] == "PLAN_UNAVAILABLE"


# ------------------ MEETINGS ------------------
class TestMeetings:
    def test_create_meeting_geocoded(self, s, owner_group):
        h = auth_h(owner_group["owner"]["access"])
        r = s.post(f"{API}/meetings", headers=h,
                   json={"group_id": owner_group["id"], "name": "Café",
                         "place_query": "Puerta del Sol Madrid"})
        assert r.status_code == 201, r.text
        m = r.json()
        # Destination may be None if provider failed. Best-effort: retry once.
        if m.get("destination") is None:
            time.sleep(1.5)
            r = s.post(f"{API}/meetings", headers=h,
                       json={"group_id": owner_group["id"], "name": "Café",
                             "place_query": "Puerta del Sol Madrid"})
            m = r.json()
        assert m.get("destination") is not None, "Nominatim did not geocode Puerta del Sol"
        mid = m["id"]
        r = s.get(f"{API}/meetings/{mid}", headers=h)
        assert r.status_code == 200
        data = r.json()
        assert data["destination"] and "lat" in data["destination"]
        # Every participant must have an eta object with a state
        for p in data["participants"]:
            assert "eta" in p and "state" in p["eta"]
        # Respond en_camino
        r = s.post(f"{API}/meetings/{mid}/respond", headers=h, json={"state": "en_camino"})
        assert r.status_code == 200


# ------------------ CONVOYS ------------------
class TestConvoys:
    def test_convoy_flow(self, s, owner_group):
        h = auth_h(owner_group["owner"]["access"])
        r = s.post(f"{API}/convoys", headers=h,
                   json={"group_id": owner_group["id"], "name": "Ruta",
                         "lat": 40.4168, "lng": -3.7038, "place_name": "Puerta del Sol"})
        assert r.status_code == 201, r.text
        cid = r.json()["id"]
        r = s.get(f"{API}/convoys/{cid}", headers=h)
        assert r.status_code == 200
        d = r.json()
        assert d["cohesion"]["state"] == "insufficient_data"
        assert d["fuel"]["label"] == "Datos de consumo no disponibles"
        assert len(d["vehicles"]) == 1
        # Close by leader
        r = s.post(f"{API}/convoys/{cid}/close", headers=h)
        assert r.status_code == 200
