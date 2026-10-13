# My Cluster — rama de recuperación

Este repositorio contiene una base histórica Expo/React Native + FastAPI para la aplicación familiar My Cluster.

**Rama actual:** `recovery/my-cluster-core-20261013` (no modificar `main`).
**Fuente preservada:** `conflict_050926_0728`. También se conserva `sentinel/k1-audit-v1` para evaluar el orbe.

[Informe de recuperación, riesgos, instalación y criterios de aceptación](docs/RECUPERACION_MY_CLUSTER_2026-10-13.md).

## Ejecutar en desarrollo

1. Instala MongoDB y crea `backend/.env` a partir de `backend/.env.example` con un `JWT_SECRET` seguro.
2. `cd backend && pip install -r requirements-core.txt && uvicorn server:app --host 0.0.0.0 --port 8000`.
3. Crea `frontend/.env` desde `frontend/.env.example`; cambia la IP del backend.
4. `cd frontend && corepack enable && yarn install --frozen-lockfile && npx expo start`.

**No es todavía una aplicación validada.** El mapa móvil debe comprobarse en teléfonos reales; el mapa web es solo una vista espacial. La detección de accidentes, el GPS continuo en segundo plano y la conexión V16 siguen fuera del alcance de esta recuperación. Rutas y tráfico aún referencian Azure heredado, pendiente de migración a Google Maps.
