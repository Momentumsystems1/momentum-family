# Arquitectura

Backend FastAPI + MongoDB (`/api`). Routers: auth, consent, entitlements, groups, people (perfil/posiciones/eventos), providers (adaptadores), coordination (quedadas/convoy).

Frontend Expo Router + TypeScript + Reanimated + Gesture Handler. `src/theme.ts` (Día/Noche), `src/api.ts` (JWT + refresh), `src/auth.tsx`.

Adaptadores: GeocodingProvider, RoutingProvider, TrafficProvider (Azure Maps si `AZURE_MAPS_KEY`, si no Nominatim/OSRM demo). Transit/Parking/Weather/Camera/V16/Billing: no configurados (estado veraz).
