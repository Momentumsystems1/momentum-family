"""Legal documents, consent evidence (append-only) and granular sharing permissions (append-only events)."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core import TERMS_VERSION, current_user, db, now, serialize

router = APIRouter(tags=["consent"])

# NOTE: These texts are technical drafts. Status: PENDIENTE DE REVISIÓN LEGAL.
LEGAL_DOCS = {
    "terms": {
        "title": "Condiciones de uso de Sentinel",
        "version": TERMS_VERSION,
        "status": "PENDIENTE DE REVISIÓN LEGAL",
        "body": [
            "Sentinel Family es una aplicación de movilidad, coordinación y seguridad para grupos. Sus funciones dependen de permisos que tú concedes de forma explícita.",
            "Sentinel no activa funciones ocultas: ninguna función de localización, cámara o micrófono se activa sin tu conocimiento.",
            "Puedes revocar cualquier permiso en cualquier momento desde la Tarjeta de Privacidad. La revocación se aplica de inmediato a los nuevos datos.",
            "Los invitados temporales pierden sus permisos automáticamente al expirar el periodo configurado.",
            "El servicio se ofrece en planes con capacidades distintas. Las funciones no incluidas en tu plan se muestran como NO DISPONIBLE EN EL PLAN ACTUAL.",
        ],
    },
    "privacy": {
        "title": "Política de privacidad",
        "version": TERMS_VERSION,
        "status": "PENDIENTE DE REVISIÓN LEGAL",
        "body": [
            "Datos que pueden tratarse según los permisos concedidos: ubicación exacta o aproximada, rutas, ETA, estado de movimiento, modo de movilidad, eventos de seguridad, cámara, micrófono, información del dispositivo, eventos V16 y métricas de movilidad.",
            "Cada permiso indica qué se comparte, por qué, con quién y durante cuánto tiempo.",
            "El historial de consentimientos y cambios de permisos se conserva de forma añadida (no se sobrescribe) para garantizar trazabilidad.",
            "Las posiciones se conservan durante 30 días salvo configuración distinta. Puedes solicitar la eliminación de tu cuenta; los datos se marcan como eliminados y dejan de ser accesibles.",
        ],
    },
    "security": {
        "title": "Información sobre seguridad",
        "version": TERMS_VERSION,
        "status": "PENDIENTE DE REVISIÓN LEGAL",
        "body": [
            "Comunicaciones cifradas mediante HTTPS cuando es técnicamente aplicable.",
            "Sesiones autenticadas con tokens de acceso de corta duración y tokens de renovación rotativos y revocables.",
            "Permisos temporales con expiración automática e historial de accesos consultable.",
            "Separación entre datos personales, de grupo y temporales. Las contraseñas se almacenan únicamente como hash bcrypt.",
        ],
    },
    "how": {
        "title": "Cómo funciona Sentinel",
        "version": TERMS_VERSION,
        "status": "INFORMATIVO",
        "body": [
            "Primero aceptas las condiciones y decides qué compartes. Después creas tu perfil y tu primer Grupo.",
            "El mapa es tu entorno permanente. El Orbe Sentinel controla las herramientas según el contexto.",
            "Las personas del grupo aparecen en el mapa solo si han aceptado y comparten ubicación.",
        ],
    },
}

PERMISSION_KEYS = [
    ("exact_location", "Ubicación exacta", "Para que tu grupo pueda verte en el mapa con precisión"),
    ("approx_location", "Ubicación aproximada", "Para indicar tu zona sin revelar la posición exacta"),
    ("eta", "ETA", "Para calcular tu hora estimada de llegada en quedadas y convoyes"),
    ("status", "Estado actual", "Para mostrar si estás en camino, parado o has llegado"),
    ("recent_route", "Ruta reciente", "Para mostrar tu trayecto reciente a tu grupo"),
    ("mobility_mode", "Modo de movilidad", "Para distinguir coche, transporte público, bici o a pie"),
    ("patterns", "Patrones de movilidad", "Para análisis de rutas habituales (Inteligencia)"),
    ("safety_alerts", "Alertas de seguridad", "Para avisar a tu grupo ante incidencias"),
    ("v16", "Eventos V16", "Para asociar avisos de la baliza V16 a tu grupo"),
    ("camera", "Cámara", "Para compartir tu cámara de forma temporal y visible"),
    ("microphone", "Micrófono", "Para registrar incidencias por voz"),
    ("road_reality", "Road Reality", "Para grabar el estado real de la vía de forma voluntaria"),
    ("metrics", "Métricas", "Para estadísticas de movilidad del grupo"),
    ("group_visibility", "Visibilidad en el grupo", "Para aparecer como miembro visible del grupo"),
]


class ConsentBody(BaseModel):
    document: str
    version: str
    accepted: bool
    language: str = "es"
    app_version: str = "1.0.0"
    platform: str = "unknown"
    accepted_at_client: Optional[datetime] = None


class PermissionBody(BaseModel):
    key: str
    granted: bool
    scope: str = "all"  # 'all' or group id
    duration_minutes: Optional[int] = None
    reason: Optional[str] = None


@router.get("/legal/documents")
async def legal_documents():
    return {k: {"title": v["title"], "version": v["version"], "status": v["status"]} for k, v in LEGAL_DOCS.items()}


@router.get("/legal/documents/{doc}")
async def legal_document(doc: str):
    if doc not in LEGAL_DOCS:
        raise HTTPException(404, "Documento no encontrado")
    return LEGAL_DOCS[doc]


@router.post("/consents", status_code=201)
async def record_consent(body: ConsentBody, user=Depends(current_user)):
    if body.document not in LEGAL_DOCS:
        raise HTTPException(400, "Documento desconocido")
    rec = {**body.model_dump(), "user_id": str(user["_id"]), "recorded_at": now(),
           "status": "accepted" if body.accepted else "declined"}
    res = await db.consents.insert_one(rec)
    rec["_id"] = res.inserted_id
    return serialize(rec)


@router.get("/consents")
async def list_consents(user=Depends(current_user)):
    cur = db.consents.find({"user_id": str(user["_id"])}).sort("recorded_at", -1)
    return [serialize(c) for c in await cur.to_list(200)]


@router.get("/consents/status")
async def consent_status(user=Depends(current_user)):
    latest = await db.consents.find_one({"user_id": str(user["_id"]), "document": "terms", "accepted": True},
                                        sort=[("recorded_at", -1)])
    return {"terms_accepted": bool(latest), "current_version": TERMS_VERSION,
            "accepted_version": latest["version"] if latest else None,
            "requires_reconsent": bool(latest) and latest["version"] != TERMS_VERSION}


@router.get("/permissions/catalog")
async def permission_catalog():
    return [{"key": k, "label": l, "why": w} for k, l, w in PERMISSION_KEYS]


@router.post("/permissions", status_code=201)
async def set_permission(body: PermissionBody, user=Depends(current_user)):
    if body.key not in {k for k, _, _ in PERMISSION_KEYS}:
        raise HTTPException(400, "Permiso desconocido")
    from datetime import timedelta
    expires_at = now() + timedelta(minutes=body.duration_minutes) if body.duration_minutes else None
    rec = {"user_id": str(user["_id"]), "key": body.key, "scope": body.scope, "granted": body.granted,
           "expires_at": expires_at, "reason": body.reason, "created_at": now()}
    res = await db.permission_events.insert_one(rec)
    rec["_id"] = res.inserted_id
    return serialize(rec)


async def effective_permissions(user_id: str) -> dict:
    """Latest event per (key, scope), dropping expired grants."""
    cur = db.permission_events.find({"user_id": user_id}).sort("created_at", 1)
    eff: dict = {}
    for ev in await cur.to_list(2000):
        eff[f"{ev['key']}::{ev['scope']}"] = ev
    out = {}
    for k, ev in eff.items():
        exp = ev.get("expires_at")
        if exp and exp.tzinfo is None:
            from datetime import timezone
            exp = exp.replace(tzinfo=timezone.utc)
        granted = ev["granted"] and not (exp and exp < now())
        out[k] = {**serialize(ev), "effective": granted}
    return out


def is_granted(eff: dict, key: str, group_id: str) -> bool:
    for scope in (group_id, "all"):
        ev = eff.get(f"{key}::{scope}")
        if ev is not None:
            return ev["effective"]
    return False


@router.get("/permissions")
async def my_permissions(user=Depends(current_user)):
    return await effective_permissions(str(user["_id"]))


@router.get("/permissions/history")
async def permission_history(user=Depends(current_user)):
    cur = db.permission_events.find({"user_id": str(user["_id"])}).sort("created_at", -1)
    return [serialize(e) for e in await cur.to_list(200)]
