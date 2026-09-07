"""Shared infrastructure: db, models base, auth dependency, helpers."""
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any, Optional

import jwt
from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
ACCESS_MINUTES = int(os.environ["ACCESS_MINUTES"])
REFRESH_DAYS = int(os.environ["REFRESH_DAYS"])
AZURE_MAPS_KEY = os.environ.get("AZURE_MAPS_KEY", "").strip()
APP_PUBLIC_URL = os.environ["APP_PUBLIC_URL"].rstrip("/")
TERMS_VERSION = os.environ["TERMS_VERSION"]
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
ALGO = "HS256"

bearer = HTTPBearer(auto_error=False)


def now() -> datetime:
    return datetime.now(timezone.utc)


def oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(404, "Recurso no encontrado")


PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    def to_mongo(self) -> dict[str, Any]:
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("_id", None)
        return data

    @classmethod
    def from_mongo(cls, doc: dict[str, Any]):
        return cls.model_validate(doc)


def serialize(doc: dict[str, Any]) -> dict[str, Any]:
    """Convert a raw Mongo doc into a JSON-safe dict (ObjectId -> str, _id -> id)."""
    out: dict[str, Any] = {}
    for k, v in doc.items():
        key = "id" if k == "_id" else k
        if isinstance(v, ObjectId):
            v = str(v)
        elif isinstance(v, datetime):
            v = v.isoformat()
        elif isinstance(v, dict):
            v = serialize(v)
        elif isinstance(v, list):
            v = [serialize(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i) for i in v]
        out[key] = v
    return out


async def _supabase_user(token: str) -> Optional[dict[str, Any]]:
    """Resolve a Supabase access token to the app user doc (Mongo).

    Verification goes through Supabase Auth's /auth/v1/user endpoint, so it works
    regardless of the project's JWT signing algorithm. On first login the app user
    document is provisioned automatically, keyed by the Supabase user id.
    """
    import httpx

    try:
        async with httpx.AsyncClient(timeout=10) as cli:
            r = await cli.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"},
            )
    except httpx.HTTPError:
        raise HTTPException(503, "Servicio de autenticación no disponible")
    if r.status_code != 200:
        return None
    su = r.json()
    supa_id, email = su.get("id"), (su.get("email") or "").lower()
    if not supa_id or not email:
        return None
    user = await db.users.find_one({"supabase_id": supa_id, "deleted_at": None})
    if user:
        return user
    legacy = await db.users.find_one({"email": email, "deleted_at": None})
    if legacy:
        await db.users.update_one({"_id": legacy["_id"]}, {"$set": {"supabase_id": supa_id}})
        legacy["supabase_id"] = supa_id
        return legacy
    doc = {
        "supabase_id": supa_id, "email": email, "created_at": now(), "deleted_at": None,
        "language": "es", "plan": "free", "account_role": "owner",
        "delegated_permissions": [], "onboarding": {"completed": False, "step": "consent"},
        "profile": None, "avatar": {"color": "#22D3EE", "symbol": "pin", "outline": "solid"},
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc


async def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict[str, Any]:
    if creds is None:
        raise HTTPException(401, "Sesión no iniciada")
    if SUPABASE_URL and SUPABASE_ANON_KEY:
        user = await _supabase_user(creds.credentials)
        if not user:
            raise HTTPException(401, "Sesión no válida o expirada")
        return user
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[ALGO])
        if payload.get("type") != "access":
            raise ValueError
        user = await db.users.find_one({"_id": ObjectId(payload["sub"]), "deleted_at": None})
    except (jwt.InvalidTokenError, ValueError, InvalidId, KeyError):
        raise HTTPException(401, "Sesión no válida o expirada")
    if not user:
        raise HTTPException(401, "Sesión no válida o expirada")
    return user


class Unavailable(HTTPException):
    """Truthful unavailable states. kind: 'plan' | 'service'."""

    def __init__(self, kind: str, reason: str, capability: str = ""):
        title = "NO DISPONIBLE EN EL PLAN ACTUAL" if kind == "plan" else "SERVICIO NO CONFIGURADO"
        super().__init__(
            status_code=402 if kind == "plan" else 503,
            detail={"code": "PLAN_UNAVAILABLE" if kind == "plan" else "SERVICE_NOT_CONFIGURED",
                    "title": title, "reason": reason, "capability": capability},
        )
