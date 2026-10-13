"""BAYMOVE G3000: real ASGI + MongoDB end-to-end MVP smoke test.

Uses a disposable CI MongoDB service. No live user, phone, GPS, SMS, WhatsApp,
external provider, secret, or simulator is involved.
Run from backend/: python tests/vertical_slice_ci.py
"""
import asyncio
import uuid

import httpx
from server import app


async def checked(client: httpx.AsyncClient, method: str, route: str, expect: int, **kwargs) -> dict:
    response = await client.request(method, f"/api{route}", **kwargs)
    if response.status_code != expect:
        raise AssertionError(
            f"{method} {route}: expected HTTP {expect}, got {response.status_code}: {response.text[:600]}"
        )
    if response.status_code == 204:
        return {}
    return response.json()


def authorization(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


async def run() -> None:
    # ASGITransport executes the real FastAPI handlers; Motor talks to a real
    # disposable MongoDB instance supplied by GitHub Actions.
    await app.router.startup()
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://baymove-ci.invalid",
            timeout=12,
        ) as client:
            prefix = uuid.uuid4().hex[:12]
            emails = [f"baymove-{label}-{prefix}@baymove-ci.dev" for label in ("owner", "guest", "stranger")]
            members = []
            for email in emails:
                result = await checked(
                    client, "POST", "/auth/register", 201,
                    json={"email": email, "password": "CiOnly2026!ReallySafe"},
                )
                assert result["access_token"] and result["user"]["id"]
                members.append(result)
            owner, guest, stranger = members
            owner_h, guest_h, outsider_h = [
                authorization(member["access_token"]) for member in (owner, guest, stranger)
            ]
            assert await checked(client, "GET", "/permissions", 200, headers=owner_h) == {}
            await checked(client, "POST", "/location", 403, headers=owner_h,
                          json={"lat": 41.3851, "lng": 2.1734})
            await checked(client, "PUT", "/profile", 200, headers=owner_h,
                          json={"name": "Ana", "language": "es"})
            group = await checked(client, "POST", "/groups", 201, headers=owner_h,
                                  json={"name": "Familia de prueba"})
            gid = group["id"]
            assert group["name"] == "Familia de prueba"
            assert group["my_role"] == "owner"
            assert group["stats"]["members"] == 1
            await checked(client, "GET", f"/groups/{gid}", 403, headers=outsider_h)
            await checked(client, "POST", "/groups", 402, headers=owner_h, json={"name": "Extra"})
            # Invitation only prepares a link; it does not send any real message.
            invite = await checked(client, "POST", f"/groups/{gid}/invitations", 201,
                                   headers=owner_h, json={
                                       "name": "Eva", "membership": "fixed", "channel": "whatsapp"
                                   })
            record = invite["invitation"]
            assert record["status"] == "prepared"
            assert record["token"] and record["link"].endswith(record["token"])
            inv_id = record["id"]
            await checked(client, "GET", f"/groups/{gid}/events", 403, headers=outsider_h)
            assert (await checked(client, "GET", f"/groups/{gid}", 200, headers=owner_h))["stats"]["pending"] == 1
            await checked(client, "GET", f"/invitations/by-token/{record['token']}", 200)
            await checked(client, "POST", f"/invitations/by-token/{record['token']}/respond", 200,
                          headers=guest_h, json={"accept": True})
            joined = await checked(client, "GET", f"/groups/{gid}", 200, headers=guest_h)
            assert joined["my_role"] in ("adult_member", "temporary_guest")
            assert joined["stats"]["members"] == 2
            for person in joined["members"]:
                # A non-admin is not allowed to see another person's invite
                # bearer token/phone/link, even if they joined that circle.
                assert "invitation" not in person
                assert "invitation_id" not in person
            group_owner = await checked(client, "GET", f"/groups/{gid}", 200, headers=owner_h)
            assert group_owner["stats"]["pending"] == 0
            # No live push infrastructure is configured. The event is real and
            # auditable in MongoDB, but cannot be reported as delivered.
            event = await checked(client, "POST", "/events", 201, headers=owner_h, json={
                "group_id": gid, "kind": "checkin", "severity": "info",
                "message": "¿Todo bien?",
            })
            assert event["state"] == "open"
            assert guest["user"]["id"] in event["recipients"]
            assert event["trace"][0]["action"] == "created"
            visible = await checked(client, "GET", f"/groups/{gid}/events", 200, headers=guest_h)
            assert event["id"] in [e["id"] for e in visible]
            # IDOR regression: strangers cannot mutate an event by knowing its ID.
            await checked(client, "POST", f"/events/{event['id']}/action", 403,
                          headers=outsider_h, json={"action": "respond_ok"})
            answered = await checked(client, "POST", f"/events/{event['id']}/action", 200,
                                     headers=guest_h, json={"action": "respond_ok"})
            assert answered["state"] == "resolved"
            assert answered["trace"][-1]["by"] == guest["user"]["id"]
            await checked(client, "DELETE", f"/groups/{gid}/members/{next(m['id'] for m in joined['members'] if m['user_id'] == guest['user']['id'])}",
                          200, headers=owner_h)
            await checked(client, "POST", f"/events/{event['id']}/action", 403,
                          headers=guest_h, json={"action": "acknowledge"})
            await checked(client, "GET", f"/groups/{gid}/events", 403, headers=guest_h)
            await checked(client, "POST", f"/invitations/{inv_id}/dispatched", 200, headers=owner_h)
            print("PASS — 3 authenticated users; profile; circle; pending invite; acceptance; privacy; event; authorized response; removal.")
            print("NOT VERIFIED — push delivery, real device GPS, mobile UI, hosted backend, standalone APK.")
    finally:
        await app.router.shutdown()


if __name__ == "__main__":
    asyncio.run(run())
