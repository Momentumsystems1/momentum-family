"""Provider adapters: Geocoding, Routing, Traffic. Azure Maps when configured, otherwise legitimate public/open data
(Nominatim / OSRM demo). Traffic and transit have NO free source -> truthful 'service not configured'."""
import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core import AZURE_MAPS_KEY, Unavailable, current_user

router = APIRouter(prefix="/mobility", tags=["mobility"])
log = logging.getLogger("providers")
UA = {"User-Agent": "SentinelFamily/1.0 (contact: support@sentinel.app)"}


def provider_status() -> dict:
    azure = bool(AZURE_MAPS_KEY)
    return {
        "geocoding": {"provider": "azure_maps" if azure else "nominatim_osm", "configured": True,
                      "production_ready": azure, "note": None if azure else "Nominatim: uso limitado (1 req/s), no apto para producción"},
        "routing": {"provider": "azure_maps" if azure else "osrm_demo", "configured": True,
                    "production_ready": azure, "note": None if azure else "OSRM demo público: sin garantía de servicio"},
        "traffic": {"provider": "azure_maps" if azure else None, "configured": azure, "production_ready": azure,
                    "note": None if azure else "Sin datos de tráfico: requiere clave Azure Maps"},
        "transit": {"provider": None, "configured": False, "production_ready": False,
                    "note": "Sin proveedor de transporte público configurado"},
        "parking": {"provider": None, "configured": False, "production_ready": False, "note": "Sin proveedor de parkings"},
        "weather": {"provider": None, "configured": False, "production_ready": False, "note": "Sin proveedor meteorológico"},
        "messaging": {"provider": "os_share_intent", "configured": True, "production_ready": True,
                      "note": "WhatsApp/SMS mediante enlaces del sistema; sin confirmación de entrega"},
        "camera_streaming": {"provider": None, "configured": False, "production_ready": False,
                             "note": "Requiere WebRTC + servidor TURN y build nativo"},
        "v16": {"provider": None, "configured": False, "production_ready": False, "note": "Sin integración de fabricante"},
        "billing": {"provider": None, "configured": False, "production_ready": False,
                    "note": "Sin credenciales App Store / Play Store"},
    }


class GeocodeResult(BaseModel):
    name: str
    lat: float
    lng: float
    provider: str


async def geocode(query: str) -> list[GeocodeResult]:
    async with httpx.AsyncClient(timeout=10) as c:
        if AZURE_MAPS_KEY:
            r = await c.get("https://atlas.microsoft.com/search/fuzzy/json",
                            params={"api-version": "1.0", "subscription-key": AZURE_MAPS_KEY, "query": query, "limit": 5,
                                    "language": "es-ES"})
            r.raise_for_status()
            return [GeocodeResult(name=(i.get("poi", {}).get("name") or "") + (" · " if i.get("poi") else "") + i["address"].get("freeformAddress", ""),
                                  lat=i["position"]["lat"], lng=i["position"]["lon"], provider="azure_maps")
                    for i in r.json().get("results", [])]
        r = await c.get("https://nominatim.openstreetmap.org/search",
                        params={"q": query, "format": "json", "limit": 5, "accept-language": "es"}, headers=UA)
        r.raise_for_status()
        return [GeocodeResult(name=i["display_name"], lat=float(i["lat"]), lng=float(i["lon"]), provider="nominatim_osm")
                for i in r.json()]


class RouteResult(BaseModel):
    distance_m: float
    duration_s: float
    duration_traffic_s: Optional[float] = None
    geometry: list[list[float]]  # [[lat, lng], ...]
    provider: str


async def route(points: list[tuple[float, float]]) -> RouteResult:
    """points: [(lat, lng), ...]"""
    async with httpx.AsyncClient(timeout=15) as c:
        if AZURE_MAPS_KEY:
            q = ":".join(f"{lat},{lng}" for lat, lng in points)
            r = await c.get("https://atlas.microsoft.com/route/directions/json",
                            params={"api-version": "1.0", "subscription-key": AZURE_MAPS_KEY, "query": q,
                                    "traffic": "true", "routeRepresentation": "polyline", "travelMode": "car"})
            r.raise_for_status()
            rt = r.json()["routes"][0]
            s = rt["summary"]
            geom = [[p["latitude"], p["longitude"]] for leg in rt["legs"] for p in leg["points"]]
            return RouteResult(distance_m=s["lengthInMeters"], duration_s=s["travelTimeInSeconds"] - s.get("trafficDelayInSeconds", 0),
                               duration_traffic_s=s["travelTimeInSeconds"], geometry=geom, provider="azure_maps")
        q = ";".join(f"{lng},{lat}" for lat, lng in points)
        r = await c.get(f"https://router.project-osrm.org/route/v1/driving/{q}",
                        params={"overview": "simplified", "geometries": "geojson"}, headers=UA)
        r.raise_for_status()
        rt = r.json()["routes"][0]
        return RouteResult(distance_m=rt["distance"], duration_s=rt["duration"], duration_traffic_s=None,
                           geometry=[[lat, lng] for lng, lat in rt["geometry"]["coordinates"]], provider="osrm_demo")


async def traffic_flow(lat: float, lng: float) -> dict:
    if not AZURE_MAPS_KEY:
        raise Unavailable("service", "Sin datos de tráfico: requiere clave Azure Maps.", "traffic")
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get("https://atlas.microsoft.com/traffic/flow/segment/json",
                        params={"api-version": "1.0", "subscription-key": AZURE_MAPS_KEY, "style": "absolute",
                                "zoom": 12, "query": f"{lat},{lng}"})
        r.raise_for_status()
        seg = r.json()["flowSegmentData"]
        return {"current_speed": seg["currentSpeed"], "free_flow_speed": seg["freeFlowSpeed"],
                "confidence": seg.get("confidence"), "road_closure": seg.get("roadClosure", False), "provider": "azure_maps"}


# ---------------- NAVIGATION module (autocomplete, multi-mode routing with waypoints, POI along route, history) ----------------
from typing import Optional as _Opt

from core import db as _db, now as _now


@router.get("/autocomplete")
async def autocomplete(q: str, lat: _Opt[float] = None, lng: _Opt[float] = None, user=Depends(current_user)):
    """Azure fuzzy typeahead biased to the user's position (nearest first). Returns whether a house number is present."""
    if not AZURE_MAPS_KEY:
        raise Unavailable("service", "Autocompletar requiere Azure Maps.", "geocoding")
    params = {"api-version": "1.0", "subscription-key": AZURE_MAPS_KEY, "query": q, "typeahead": "true", "limit": 5, "language": "es-ES",
              "countrySet": "ES,PT,FR,IT,DE,GB"}
    import math
    if lat is not None and lng is not None and not (math.isnan(lat) or math.isnan(lng)):
        params.update({"lat": lat, "lon": lng, "radius": 50000})
    try:
        async with httpx.AsyncClient(timeout=8) as c:
            r = await c.get("https://atlas.microsoft.com/search/fuzzy/json", params=params)
            r.raise_for_status()
    except httpx.HTTPError as e:
        log.warning("autocomplete failed: %s", e)
        raise Unavailable("service", "El autocompletar no respondió.", "geocoding")
    out = []
    for i in r.json().get("results", []):
        a = i.get("address", {})
        poi = i.get("poi", {}).get("name")
        out.append({"name": (poi + " · " if poi else "") + a.get("freeformAddress", ""), "lat": i["position"]["lat"], "lng": i["position"]["lon"],
                    "type": i.get("type"), "has_number": bool(a.get("streetNumber")) or bool(poi), "street": a.get("streetName"),
                    "municipality": a.get("municipality"), "distance_m": i.get("dist")})
    return out


class NavRouteBody(BaseModel):
    points: list[list[float]]  # [[lat,lng],...] origin, stops..., destination
    mode: str = "car"  # car | motorcycle | bicycle | pedestrian
    optimize_stops: bool = False


@router.post("/nav-route")
async def nav_route(body: NavRouteBody, user=Depends(current_user)):
    if len(body.points) < 2:
        raise Unavailable("service", "Se necesitan origen y destino.", "routing")
    if not AZURE_MAPS_KEY:
        raise Unavailable("service", "La navegación requiere Azure Maps.", "routing")
    mode = body.mode if body.mode in ("car", "motorcycle", "bicycle", "pedestrian") else "car"
    q = ":".join(f"{p[0]},{p[1]}" for p in body.points)
    params = {"api-version": "1.0", "subscription-key": AZURE_MAPS_KEY, "query": q, "travelMode": mode, "traffic": "true",
              "instructionsType": "text", "language": "es-ES", "routeRepresentation": "polyline"}
    if body.optimize_stops and len(body.points) > 3:
        params["computeBestOrder"] = "true"
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get("https://atlas.microsoft.com/route/directions/json", params=params)
            r.raise_for_status()
            rt = r.json()["routes"][0]
    except (httpx.HTTPError, KeyError, IndexError) as e:
        log.warning("nav-route failed: %s", e)
        raise Unavailable("service", "El servicio de rutas no respondió para este modo.", "routing")
    s = rt["summary"]
    legs = [{"distance_m": l["summary"]["lengthInMeters"], "duration_s": l["summary"]["travelTimeInSeconds"]} for l in rt["legs"]]
    steps = [{"text": i.get("message"), "distance_m": i.get("routeOffsetInMeters"), "lat": i["point"]["latitude"], "lng": i["point"]["longitude"]}
             for i in rt.get("guidance", {}).get("instructions", [])]
    return {"mode": mode, "distance_m": s["lengthInMeters"], "duration_s": s["travelTimeInSeconds"], "delay_s": s.get("trafficDelayInSeconds", 0),
            "arrival": s.get("arrivalTime"), "legs": legs, "steps": steps, "provider": "azure_maps",
            "geometry": [[p["latitude"], p["longitude"]] for leg in rt["legs"] for p in leg["points"]]}


class AlongBody(BaseModel):
    geometry: list[list[float]]
    category: str  # cafe | ev | fuel | rest | parking


CATS = {"cafe": "CAFE_PUB", "ev": "ELECTRIC_VEHICLE_STATION", "fuel": "PETROL_STATION", "rest": "REST_AREA", "parking": "OPEN_PARKING_AREA"}


@router.post("/along-route")
async def along_route(body: AlongBody, user=Depends(current_user)):
    if not AZURE_MAPS_KEY:
        raise Unavailable("service", "Puntos en ruta requieren Azure Maps.", "places")
    if body.category not in CATS:
        raise Unavailable("service", "Categoría no disponible (WC no existe como categoría fiable).", "places")
    step = max(1, len(body.geometry) // 90)
    pts = body.geometry[::step] or body.geometry
    payload = {"route": {"type": "LineString", "coordinates": [[p[1], p[0]] for p in pts]}}
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post("https://atlas.microsoft.com/search/alongRoute/json",
                             params={"api-version": "1.0", "subscription-key": AZURE_MAPS_KEY, "query": CATS[body.category], "maxDetourTime": 300, "limit": 12, "language": "es-ES"},
                             json=payload)
            r.raise_for_status()
    except httpx.HTTPError as e:
        log.warning("along-route failed: %s", e)
        raise Unavailable("service", "La búsqueda en ruta no respondió.", "places")
    return [{"name": i.get("poi", {}).get("name") or i["address"].get("freeformAddress"), "lat": i["position"]["lat"], "lng": i["position"]["lon"],
             "detour_s": i.get("detourTime"), "category": body.category} for i in r.json().get("results", [])]


class HistoryBody(BaseModel):
    name: str
    lat: float
    lng: float


@router.get("/history")
async def nav_history(lat: _Opt[float] = None, lng: _Opt[float] = None, user=Depends(current_user)):
    """Recent destinations, nearest first when a position is given."""
    import math
    cur = _db.nav_history.find({"user_id": str(user["_id"])}).sort("at", -1)
    items = [{"name": h["name"], "lat": h["lat"], "lng": h["lng"], "at": h["at"].isoformat()} for h in await cur.to_list(30)]
    seen, uniq = set(), []
    for i in items:
        if i["name"] not in seen:
            seen.add(i["name"]); uniq.append(i)
    if lat is not None and lng is not None:
        for i in uniq:
            i["distance_m"] = 2 * 6371000 * math.asin(math.sqrt(math.sin(math.radians(i["lat"] - lat) / 2) ** 2 + math.cos(math.radians(lat)) * math.cos(math.radians(i["lat"])) * math.sin(math.radians(i["lng"] - lng) / 2) ** 2))
        uniq.sort(key=lambda i: i["distance_m"])
    return uniq[:8]


@router.post("/history", status_code=201)
async def add_history(body: HistoryBody, user=Depends(current_user)):
    await _db.nav_history.insert_one({**body.model_dump(), "user_id": str(user["_id"]), "at": _now()})
    return {"ok": True}


@router.get("/reverse")
async def reverse_geocode(lat: float, lng: float, user=Depends(current_user)):
    """Address of a tapped map point (Azure reverse geocoding)."""
    import math
    if math.isnan(lat) or math.isnan(lng):
        raise Unavailable("service", "Coordenadas no válidas.", "geocoding")
    if not AZURE_MAPS_KEY:
        raise Unavailable("service", "La dirección del punto requiere Azure Maps.", "geocoding")
    try:
        async with httpx.AsyncClient(timeout=8) as c:
            r = await c.get("https://atlas.microsoft.com/search/address/reverse/json",
                            params={"api-version": "1.0", "subscription-key": AZURE_MAPS_KEY, "query": f"{lat},{lng}", "language": "es-ES"})
            r.raise_for_status()
    except httpx.HTTPError as e:
        log.warning("reverse failed: %s", e)
        raise Unavailable("service", "La geocodificación inversa no respondió.", "geocoding")
    items = r.json().get("addresses", [])
    a = items[0]["address"] if items else {}
    name = a.get("freeformAddress") or f"{lat:.5f}, {lng:.5f}"
    return {"name": name, "street": a.get("streetName"), "number": a.get("streetNumber"), "municipality": a.get("municipality"),
            "lat": lat, "lng": lng, "has_number": True}


@router.get("/providers")
async def providers():
    return provider_status()


@router.get("/geocode")
async def geocode_ep(q: str, user=Depends(current_user)):
    try:
        return [g.model_dump() for g in await geocode(q)]
    except httpx.HTTPError as e:
        log.warning("geocode failed: %s", e)
        raise Unavailable("service", "El servicio de geocodificación no respondió.", "geocoding")


class RouteBody(BaseModel):
    points: list[list[float]]  # [[lat,lng],...]


@router.post("/route")
async def route_ep(body: RouteBody, user=Depends(current_user)):
    if len(body.points) < 2:
        raise Unavailable("service", "Se necesitan al menos dos puntos.", "routing")
    try:
        return (await route([(p[0], p[1]) for p in body.points])).model_dump()
    except (httpx.HTTPError, KeyError, IndexError) as e:
        log.warning("route failed: %s", e)
        raise Unavailable("service", "El servicio de rutas no respondió.", "routing")


@router.get("/traffic")
async def traffic_ep(lat: float, lng: float, user=Depends(current_user)):
    try:
        return await traffic_flow(lat, lng)
    except httpx.HTTPError as e:
        log.warning("traffic failed: %s", e)
        raise Unavailable("service", "El servicio de tráfico no respondió.", "traffic")


@router.get("/anti-congestion")
async def anti_congestion(from_lat: float, from_lng: float, to_lat: float, to_lng: float, user=Depends(current_user)):
    """Real anti-congestion evaluation with Azure Maps predictive traffic (departAt now / +30 / +60 min) and one alternative
    route. Transit / park&ride / micromobility strategies need providers that are not configured -> stated truthfully."""
    from routers.entitlements import require
    await require(user, "antiCongestion", "Anti-congestión no está incluido en tu plan.")
    if not AZURE_MAPS_KEY:
        raise Unavailable("service", "Anti-congestión requiere tráfico predictivo (clave Azure Maps).", "antiCongestion")
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    q = f"{from_lat},{from_lng}:{to_lat},{to_lng}"
    options = []
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            for offset in (0, 30, 60):
                depart = now + timedelta(minutes=offset)
                params = {"api-version": "1.0", "subscription-key": AZURE_MAPS_KEY, "query": q, "traffic": "true", "travelMode": "car",
                          "computeTravelTimeFor": "all", "routeRepresentation": "summaryOnly"}
                if offset:
                    params["departAt"] = depart.strftime("%Y-%m-%dT%H:%M:%SZ")
                else:
                    params["maxAlternatives"] = 1
                r = await c.get("https://atlas.microsoft.com/route/directions/json", params=params)
                r.raise_for_status()
                for i, rt in enumerate(r.json()["routes"]):
                    s = rt["summary"]
                    options.append({"strategy": "salir_ahora" if offset == 0 and i == 0 else "ruta_alternativa" if offset == 0 else "descanso",
                                    "depart_in_min": offset, "travel_s": s["travelTimeInSeconds"], "delay_s": s.get("trafficDelayInSeconds", 0),
                                    "no_traffic_s": s.get("noTrafficTravelTimeInSeconds"), "distance_m": s["lengthInMeters"],
                                    "arrival": (depart + timedelta(seconds=s["travelTimeInSeconds"])).isoformat()})
    except (httpx.HTTPError, KeyError) as e:
        log.warning("anti-congestion failed: %s", e)
        raise Unavailable("service", "El servicio de tráfico predictivo no respondió.", "antiCongestion")
    base = options[0]
    recs = []
    for o in options:
        if o["strategy"] == "descanso":
            extra = (o["depart_in_min"] * 60 + o["travel_s"]) - base["travel_s"]
            saved = base["travel_s"] - o["travel_s"]
            if saved > 300:
                recs.append({"strategy": "DESCANSO", "why": f"Saliendo en {o['depart_in_min']} min conducirás {saved // 60} min menos en atasco; llegarás {max(0, extra) // 60} min más tarde.", "option": o})
        if o["strategy"] == "ruta_alternativa" and o["travel_s"] < base["travel_s"] - 120:
            recs.append({"strategy": "RUTA ALTERNATIVA", "why": f"Ahorra {(base['travel_s'] - o['travel_s']) // 60} min con tráfico actual.", "option": o})
    if base["delay_s"] < 300 and not recs:
        recs.append({"strategy": "SALIR AHORA", "why": f"Retraso por tráfico bajo ({base['delay_s'] // 60} min).", "option": base})
    unavailable = [{"strategy": "PARK & RIDE", "reason": "Sin proveedor de transporte público ni parkings"},
                   {"strategy": "MICROMOVILIDAD", "reason": "Sin proveedor de micromovilidad"}]
    return {"provider": "azure_maps", "evaluated_at": now.isoformat(), "options": options, "recommendations": recs, "unavailable": unavailable}
