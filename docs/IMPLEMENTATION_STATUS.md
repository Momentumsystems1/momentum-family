# Implementation status (2026-09-06)

Statuses: COMPLETE | PARTIAL | BLOCKED | NOT AVAILABLE

| Feature | Status | Real integration | Tested | Dependency | Notes |
|---|---|---|---|---|---|
| P0 Onboarding legal (Términos → Datos → Transparencia → Ciberseguridad) | COMPLETE | FastAPI + Mongo | Sí (web e2e) | — | Textos PENDIENTE DE REVISIÓN LEGAL |
| P0 Evidencia de consentimiento versionada (append-only) | COMPLETE | Mongo consents | Sí | — | Incluye plataforma, idioma, versión app, timestamp cliente |
| P0 Consentimiento granular (14 permisos independientes) | COMPLETE | Mongo permission_events | Sí | — | Sin “Compartir todo” |
| P0 Autenticación email + contraseña (JWT + refresh rotativo) | COMPLETE | bcrypt, PyJWT, SecureStore | Sí (curl + e2e) | — | Google/Microsoft/Supabase: BLOCKED (sin credenciales) |
| P1 Perfil + avatar (color, símbolo, inicial) | COMPLETE | Mongo users | Sí | — | Foto/ilustración: BLOCKED (sin object storage) |
| P2 Creación visual de grupo (orbital, física, nacimiento, gris/vivo) | COMPLETE | Reanimated + Mongo groups/members | Sí (web e2e) | — | Haptics solo nativo |
| P2 Invitaciones WhatsApp/SMS (estados prepared/dispatched/accepted/…) | COMPLETE | Deep link + wa.me + expo-sms | Parcial (web abre wa.me; SMS requiere dispositivo) | — | Nunca “Mensaje enviado” sin confirmación del SO |
| P2 ENVIAR A TODOS + formación + colapso a Mini-Orb | COMPLETE | — | Sí (web e2e) | — | Secuencial: el SO solo abre un share a la vez |
| P2 Aceptación por enlace /invite/<token> | COMPLETE | Mongo invitations | Sí (API) | — | Enlace universal a tiendas: BLOCKED hasta publicar |
| P2 Roles y entitlements (Owner/Admin/…; canCreateGroups, max…) | COMPLETE | EntitlementService (routers/entitlements.py) | Sí (API 402) | — | Invitado temporal no crea grupos sin delegación |
| P3 Mapa (react-native-maps) con avatares y estados veraces | PARTIAL | expo-location → /api/location | Solo web (placeholder veraz) | Expo Go nativo | Mapa nativo no verificable desde la vista web |
| Proveedores Azure Maps (geocoding, rutas con tráfico, flujo de tráfico, tráfico predictivo) | COMPLETE | AZURE_MAPS_KEY configurada | Sí (API) | — | Nominatim/OSRM quedan como fallback si falta la clave |
| Mapa estilo Life360: barra tipo Uber (Hola X, ¿nos movemos? · Grupo), hoja inferior de personas con estado/última actualización, acciones rápidas | COMPLETE | positions + groups | Sí (web e2e) | — | El Orbe navegador fue eliminado por decisión del usuario (2026-06) |
| NAVIGATION: historial por cercanía, autocompletar Azure (5 propuestas), popup de número, ruta con bandera, modos coche/moto/bici/a pie, paradas con nombre, POI en ruta (cafés, EV, gasolineras, descanso, parkings), personas del grupo en ruta, indicaciones | COMPLETE | Azure Maps (fuzzy typeahead, directions, alongRoute) | Sí (web e2e + API) | — | Transporte público y WC: SERVICIO NO CONFIGURADO; guiado por voz/background: build nativa |
| NAVIGATION fase 2: movilidad grupal (gestor, tarjetas por miembro, tareas, icono de movilizados) | NOT AVAILABLE | — | — | Fase siguiente | Diseñado, no implementado |
| Tarjetas estilo Pulse Engine (PulseCard: header/mono, barras, divisor, footer, flip 0.8 s, claro/oscuro) | COMPLETE | src/cards/* | Sí (web e2e) | — | Barras representan datos reales (permisos activos) |
| P5 Orbe de persona (acciones contextuales) | PARTIAL | positions + events | Sí (render) | — | Llamar: sin teléfono en perfil; Cámara: BLOCKED |
| P6 Tarjeta de privacidad doble cara (flip 3D) | COMPLETE | permissions + sessions + history | Sí | — | Conexiones de cámara: no configurado |
| P7 Quedada (orbe espacial, estados, ETA real, deep link) | PARTIAL | Nominatim + OSRM demo (o Azure Maps si hay clave) | Sí (API) | Clave Azure Maps para tráfico/producción | Optimización multi-criterio: BLOCKED |
| P7 Comando natural (“quedar a cenar en X a mi grupo Y”) | PARTIAL | Parser determinista | Sí | LLM opcional (clave universal) | Sin LLM: interpreta lugar y acción por patrón |
| P8 Convoy (líder/copiloto/cola, separación temporal, cohesión) | PARTIAL | OSRM/Azure routing + positions | Sí (API, 1 vehículo) | ≥2 miembros con ubicación | Combustible: “Datos de consumo no disponibles” |
| P9 Anti-congestión (salir ahora / descanso +30 +60 / ruta alternativa con tráfico predictivo) | PARTIAL | Azure Maps departAt + maxAlternatives | Sí (API, plan pro) | Plan con antiCongestion | Park&Ride y micromovilidad: SERVICIO NO CONFIGURADO |
| P9 Multimodal / ahorro combustible / movilidad sostenible / rutas cotidianas | BLOCKED | — | Estado veraz | Transporte público, micromovilidad, consumo | SERVICIO NO CONFIGURADO |
| P10 Road Reality + botón incidencia por voz | BLOCKED | — | Estado veraz | Anonimización caras/matrículas; STT | Publicación bloqueada por privacidad |
| P11 Cámara compartida temporal (1 min, extensión, onda radio) | BLOCKED | Modelo de sesión en servidor (POST /api/camera/sessions → 503) | Estado veraz | WebRTC + TURN + build nativa | — |
| P12 WhatsApp Business / SMS proveedor | BLOCKED | Share intent implementado | — | WhatsApp Business Platform, proveedor SMS | Sin confirmación de entrega |
| P13 V16 | BLOCKED | Modelo de evento | Estado veraz | API fabricante / canal regulatorio | — |
| P14 Métricas / patrones / inteligencia | NOT AVAILABLE | — | — | Datos históricos + plan | Gated por entitlement familyMetrics |
| Motor de alertas unificado (¿Todo bien?, incidencia, emergencia, trazabilidad) | COMPLETE | Mongo events | Sí (API + UI) | — | Escalado: private_warning → escalated → emergency |
| Planes Free/Basic/Pro + popup NO DISPONIBLE + Ver planes | COMPLETE | Mongo plans (configurable) | Sí | — | Pago: BLOCKED (sin App Store / Play Store) |
| Documentos legales versionados + re-consentimiento por versión | COMPLETE | TERMS_VERSION (.env) | Sí | Revisión legal profesional | PENDIENTE DE REVISIÓN LEGAL |
| Tema Día/Noche automático | COMPLETE | — | Sí | — | Sigue el sistema |
