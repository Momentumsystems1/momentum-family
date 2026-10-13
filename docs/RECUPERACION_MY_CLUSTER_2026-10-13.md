# My Cluster — recuperación controlada (13 octubre 2026)

## Fuente y protección del trabajo
- Rama de trabajo: `recovery/my-cluster-core-20261013`.
- Punto de partida **sin modificaciones en origen**: `conflict_050926_0728`, commit `3319ab5be96cda3af3f5b1ab51c8aeec05cb80dd` (7 septiembre).
- Alternativa conservada para **recuperar el orbe más adelante**: `sentinel/k1-audit-v1`, commit `b4980fd71688eec936c371cd3ff5534421f4bf27` (11 septiembre).
- La rama `main` y todas las ramas originales siguen intactas. Nada se ha desplegado ni publicado desde esta recuperación.

## Por qué esta base
La rama fuente tiene flujos de mapa, navegación, destinos, convoy, reuniones, grupos, invitaciones, permisos, alertas y backend FastAPI/MongoDB. El mapa móvil utiliza `react-native-maps`; la versión **web muestra expresamente una vista espacial sustitutiva**, no mapas reales.

La otra rama aporta `OrbField` y `/orb-lab`, pero tiene menos funciones de navegación. `/orb-lab` está documentado como **laboratorio visual con acciones simuladas**. NO incorporarlo al mapa de producción hasta probarlo por separado.

## Trabajo ejecutado en esta rama
- Cliente Supabase inicializado de forma opcional para evitar un fallo de arranque al faltar las variables públicas.
- Inicio de sesión y registro capaces de funcionar con la API FastAPI actual (modo predeterminado), conservando Supabase como modo opcional.
- Renovación de sesión FastAPI o Supabase según `EXPO_PUBLIC_AUTH_BACKEND`.
- Las fotos con Supabase Storage avisan claramente si el servicio no está configurado.
- Mensaje explícito si falta `EXPO_PUBLIC_BACKEND_URL`.
- Plantillas de entorno y automatización estática de comprobaciones.

Los cambios **no equivalen a una compilación ni una prueba en dispositivos reales**.

## Arquitectura heredada — deuda técnica
- Frontend: Expo/React Native, Expo Router, TypeScript, react-native-maps.
- Backend: FastAPI, MongoDB y tokens; Supabase Auth es opcional. La propuesta futura puede migrarse una vez probado el núcleo.
- **No volver a Azure como arquitectura de producto.** El código heredado en `backend/routers/providers.py` todavía menciona Azure Maps. Se debe sustituir por Google Maps Platform y el ecosistema Google/Gemini conforme a la decisión de producto, con presupuestos/credenciales seguros. No introducir claves de Maps en Git.
- La vista web **no es una prueba válida del mapa nativo**.
- La ubicación actual es de **primer plano**, no seguimiento persistente con teléfono bloqueado.
- Compartir ubicación requiere permisos efectivos y consentimiento; no inventar posiciones ni estados.
- Las funciones de accidente/sensores, llamadas de emergencia, V16, cámara y pagos quedan fuera de esta recuperación.

## Ejecución local prevista
1. Clonar ESTA rama en el equipo de desarrollo.
2. Crear `backend/.env` desde `backend/.env.example`, generar `JWT_SECRET` aleatorio y tener MongoDB accesible.
3. Crear `frontend/.env` desde `frontend/.env.example`. Para dos teléfonos físicos, sustituir la URL de ejemplo por la IP LAN de la máquina que sirve FastAPI.
4. Arrancar backend: `cd backend && pip install -r requirements-core.txt && uvicorn server:app --host 0.0.0.0 --port 8000`. **Atención**: `requirements.txt` contiene una dependencia privada heredada de Emergent y puede requerir limpieza para instalarse fuera de esa plataforma.
5. Arrancar frontend: `cd frontend && corepack enable && yarn install --frozen-lockfile && npx expo start`.
6. Probar iOS/Android con cuentas **de prueba**, permisos de ubicación explícitos y tráfico real de red.
7. No utilizar claves de producción, datos personales reales ni publicar la app antes de pasar controles.

## Criterios objetivos del núcleo recuperado (pendientes de verificar)
- [ ] `yarn install --frozen-lockfile` termina sin errores.
- [ ] `npx tsc --noEmit` sin errores TypeScript.
- [ ] `npx expo export -p web` genera la vista web sin fallos (no demuestra mapa nativo).
- [ ] Backend arranca con MongoDB de prueba y `GET /api/` responde.
- [ ] Usuario A se registra, hace onboarding y crea un grupo; usuario B se registra y acepta invitación.
- [ ] Ambos ven sus ubicaciones reales en dos teléfonos distintos al conceder permisos.
- [ ] Los estados «última actualización», ubicación no compartida y errores de conexión son veraces.
- [ ] Al volver a abrir la app la sesión se conserva; los permisos y visibilidad siguen correctos.
- [ ] Prueba específica de seguridad, privacidad y consumo energético antes de producción.

## Fuera de alcance ahora
Detección de accidentes por sensores, monitorización de fondo permanente, integración V16, pagos, inteligencia de hábitos y convoy avanzado. Se abordarán con dispositivos reales después de validar el núcleo.

## Estado de validación
Revisión estática del código vía GitHub y recuperación de rama realizadas. No se ha ejecutado el proyecto en móvil ni instalado dependencias localmente desde este entorno. No declarar hitos completos solo por los informes históricos de Emergent.
