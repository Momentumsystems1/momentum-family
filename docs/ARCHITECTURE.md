# Arquitectura

Backend FastAPI + MongoDB (`/api`). Routers: auth, consent, entitlements, groups, people (perfil/posiciones/eventos), providers (adaptadores), coordination (quedadas/convoy).

Frontend Expo Router + TypeScript + Reanimated + Gesture Handler. `src/theme.ts` (Día/Noche), `src/api.ts` (JWT + refresh), `src/auth.tsx`.

Adaptadores: GeocodingProvider, RoutingProvider, TrafficProvider (Azure Maps si `AZURE_MAPS_KEY`, si no Nominatim/OSRM demo). Transit/Parking/Weather/Camera/V16/Billing: no configurados (estado veraz).

## Segmentación del código (para modificación posterior)

| Módulo | Ruta | Contenido |
|---|---|---|
| ORB | `frontend/src/orb/Orb.tsx` | Contenedor: orbe cerrado (arrastre/inercia) y escena abierta |
| ORB_RENDERER_HIGH | `frontend/src/orb/OrbRendererHigh.tsx` | Gate WebGL (NOT AVAILABLE) → delega al fallback |
| ORB_RENDERER_FALLBACK | `frontend/src/orb/OrbRendererFallback.tsx` | Render nativo con profundidad, aristas, glow, nacimiento |
| ORB_PHYSICS | `frontend/src/orb/orbPhysics.ts` | Fuerzas (repulsión/resorte/ancla), cámara, proyección |
| ORB_NODES | `frontend/src/orb/orbNodes.ts` | Grafo raíz→familias→herramientas (expand/collapse) |
| ORB_INTERACTIONS | `frontend/src/orb/orbInteractions.ts` | Gestos orbitales, ticker, haptics, reduce-motion |
| ORB_THEME | `frontend/src/orb/orbTheme.ts` | Todas las constantes visuales/físicas |
| USER_ORB | `frontend/app/person/[id].tsx`, `src/components/orbs.tsx` (PersonAvatar) | |
| GROUP_ORB | `frontend/src/components/OrbitalField.tsx`, `orbs.tsx` (MiniOrb) | |
| MEETING_ORB | `frontend/app/meeting/*` | |
| CARDS | `frontend/src/cards/PulseCard.tsx`, `cardTheme.ts`, `app/privacy.tsx` | |
| MAP | `frontend/src/components/MapCanvas(.web).tsx`, `app/map.tsx` | |
| MEMBERS / GROUPS | `frontend/app/group/[id].tsx`, `src/components/sheets.tsx`, `src/invites.ts`, `backend/routers/groups.py` | |
| CONVOY | `frontend/app/convoy/*`, `backend/routers/coordination.py` | |
| MOBILITY | `frontend/app/mobility/anti.tsx`, `backend/routers/providers.py` | |
| CAMERA | `backend/server.py` (camera_session) | Modelo de sesión; transporte bloqueado |
| INCIDENTS | `backend/routers/people.py` (events) | Motor de alertas unificado |
| INTEGRATIONS | `backend/routers/providers.py` (`provider_status`), `app/plans.tsx` | |
