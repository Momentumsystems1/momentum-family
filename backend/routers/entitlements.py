"""Plans catalog (configurable in Mongo), entitlements and billing gate."""
from fastapi import APIRouter, Depends

from core import Unavailable, current_user, db, now, serialize

router = APIRouter(tags=["entitlements"])

DEFAULT_PLANS = [
    {"code": "free", "name": "Free", "price_label": "0 €", "order": 0,
     "entitlements": {"canCreateGroups": True, "maxGroups": 1, "maxPermanentMembers": 5, "maxTemporaryGuests": 2,
                      "cameraShareDuration": 60, "advancedMobility": False, "roadReality": False,
                      "familyMetrics": False, "convoy": True, "meetings": True, "antiCongestion": False}},
    {"code": "basic", "name": "Basic", "price_label": "Pendiente de cotización o validación técnica", "order": 1,
     "entitlements": {"canCreateGroups": True, "maxGroups": 3, "maxPermanentMembers": 10, "maxTemporaryGuests": 5,
                      "cameraShareDuration": 60, "advancedMobility": True, "roadReality": False,
                      "familyMetrics": True, "convoy": True, "meetings": True, "antiCongestion": True}},
    {"code": "pro", "name": "Pro", "price_label": "Pendiente de cotización o validación técnica", "order": 2,
     "entitlements": {"canCreateGroups": True, "maxGroups": 10, "maxPermanentMembers": 30, "maxTemporaryGuests": 20,
                      "cameraShareDuration": 120, "advancedMobility": True, "roadReality": True,
                      "familyMetrics": True, "convoy": True, "meetings": True, "antiCongestion": True}},
]


async def seed_plans():
    for p in DEFAULT_PLANS:
        await db.plans.update_one({"code": p["code"]}, {"$setOnInsert": {**p, "created_at": now()}}, upsert=True)


async def user_entitlements(user: dict) -> dict:
    plan = await db.plans.find_one({"code": user.get("plan", "free")}) or DEFAULT_PLANS[0]
    ent = dict(plan["entitlements"])
    # Temporary guests never create groups unless explicitly delegated or plan-entitled independently.
    if user.get("account_role") == "temporary_guest":
        ent["canCreateGroups"] = "create_groups" in user.get("delegated_permissions", [])
    return {"plan": plan["code"], "plan_name": plan["name"], "entitlements": ent}


async def require(user: dict, capability: str, reason: str):
    ent = (await user_entitlements(user))["entitlements"]
    if not ent.get(capability):
        raise Unavailable("plan", reason, capability)
    return ent


@router.get("/plans")
async def plans():
    cur = db.plans.find({}, {"_id": 0}).sort("order", 1)
    return await cur.to_list(20)


@router.get("/entitlements")
async def my_entitlements(user=Depends(current_user)):
    return await user_entitlements(user)


@router.post("/billing/upgrade/{plan_code}")
async def upgrade(plan_code: str, user=Depends(current_user)):
    plan = await db.plans.find_one({"code": plan_code})
    if not plan:
        raise Unavailable("service", "Plan desconocido")
    # No App Store / Play Store billing credentials configured: never simulate a payment.
    await db.billing_intents.insert_one({"user_id": str(user["_id"]), "plan": plan_code, "created_at": now(),
                                         "status": "blocked_no_billing_provider"})
    raise Unavailable("service", "El pago en la app no está configurado (faltan credenciales de App Store / Play Store).",
                      "billing")


@router.post("/permissions/request-group-creation")
async def request_group_creation(user=Depends(current_user)):
    rec = {"user_id": str(user["_id"]), "type": "create_groups", "status": "pending", "created_at": now()}
    res = await db.permission_requests.insert_one(rec)
    rec["_id"] = res.inserted_id
    return serialize(rec)
