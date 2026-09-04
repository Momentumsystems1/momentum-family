"""Generates /app/docs/*.md, IMPLEMENTATION_STATUS.md and SENTINEL_IMPLEMENTATION_GAPS.pdf from a single source of truth.
Run: python3 /app/docs/generate.py"""
import json
import os
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = os.path.dirname(os.path.abspath(__file__))
TODAY = date.today().isoformat()
PEND = "Pendiente de cotización o validación técnica."

# ---------------------------------------------------------------------------------------------------------------------
# FEATURE STATUS (single source of truth)  status ∈ COMPLETE | PARTIAL | BLOCKED | NOT AVAILABLE
# ---------------------------------------------------------------------------------------------------------------------
FEATURES = [
    ("P0 Onboarding legal (Términos → Datos → Transparencia → Ciberseguridad)", "COMPLETE", "FastAPI + Mongo", "Sí (web e2e)", "—", "Textos PENDIENTE DE REVISIÓN LEGAL"),
    ("P0 Evidencia de consentimiento versionada (append-only)", "COMPLETE", "Mongo consents", "Sí", "—", "Incluye plataforma, idioma, versión app, timestamp cliente"),
    ("P0 Consentimiento granular (14 permisos independientes)", "COMPLETE", "Mongo permission_events", "Sí", "—", "Sin “Compartir todo”"),
    ("P0 Autenticación email + contraseña (JWT + refresh rotativo)", "COMPLETE", "bcrypt, PyJWT, SecureStore", "Sí (curl + e2e)", "—", "Google/Microsoft/Supabase: BLOCKED (sin credenciales)"),
    ("P1 Perfil + avatar (color, símbolo, inicial)", "COMPLETE", "Mongo users", "Sí", "—", "Foto/ilustración: BLOCKED (sin object storage)"),
    ("P2 Creación visual de grupo (orbital, física, nacimiento, gris/vivo)", "COMPLETE", "Reanimated + Mongo groups/members", "Sí (web e2e)", "—", "Haptics solo nativo"),
    ("P2 Invitaciones WhatsApp/SMS (estados prepared/dispatched/accepted/…)", "COMPLETE", "Deep link + wa.me + expo-sms", "Parcial (web abre wa.me; SMS requiere dispositivo)", "—", "Nunca “Mensaje enviado” sin confirmación del SO"),
    ("P2 ENVIAR A TODOS + formación + colapso a Mini-Orb", "COMPLETE", "—", "Sí (web e2e)", "—", "Secuencial: el SO solo abre un share a la vez"),
    ("P2 Aceptación por enlace /invite/<token>", "COMPLETE", "Mongo invitations", "Sí (API)", "—", "Enlace universal a tiendas: BLOCKED hasta publicar"),
    ("P2 Roles y entitlements (Owner/Admin/…; canCreateGroups, max…)", "COMPLETE", "EntitlementService (routers/entitlements.py)", "Sí (API 402)", "—", "Invitado temporal no crea grupos sin delegación"),
    ("P3 Mapa (react-native-maps) con avatares y estados veraces", "PARTIAL", "expo-location → /api/location", "Solo web (placeholder veraz)", "Expo Go nativo", "Mapa nativo no verificable desde la vista web"),
    ("Proveedores Azure Maps (geocoding, rutas con tráfico, flujo de tráfico, tráfico predictivo)", "COMPLETE", "AZURE_MAPS_KEY configurada", "Sí (API)", "—", "Nominatim/OSRM quedan como fallback si falta la clave"),
    ("P4 Orbe Sentinel — escena 3D del mind-map (grafo raíz→familias→herramientas, física de fuerzas portada, cámara orbital, profundidad) — renderer FALLBACK", "COMPLETE", "src/orb/* (nodes, physics, interactions, renderer, theme)", "Sí (web e2e)", "—", "Constantes centralizadas en orbTheme.ts"),
    ("P4 Orbe Sentinel — renderer HIGH (WebGL/Three.js)", "NOT AVAILABLE", "Interfaz RendererProps definida; OrbRendererHigh delega al fallback", "—", "expo-gl + three", "Ver gaps"),
    ("Tarjetas estilo Pulse Engine (PulseCard: header/mono, barras, divisor, footer, flip 0.8 s, claro/oscuro)", "COMPLETE", "src/cards/*", "Sí (web e2e)", "—", "Barras representan datos reales (permisos activos)"),
    ("P5 Orbe de persona (acciones contextuales)", "PARTIAL", "positions + events", "Sí (render)", "—", "Llamar: sin teléfono en perfil; Cámara: BLOCKED"),
    ("P6 Tarjeta de privacidad doble cara (flip 3D)", "COMPLETE", "permissions + sessions + history", "Sí", "—", "Conexiones de cámara: no configurado"),
    ("P7 Quedada (orbe espacial, estados, ETA real, deep link)", "PARTIAL", "Nominatim + OSRM demo (o Azure Maps si hay clave)", "Sí (API)", "Clave Azure Maps para tráfico/producción", "Optimización multi-criterio: BLOCKED"),
    ("P7 Comando natural (“quedar a cenar en X a mi grupo Y”)", "PARTIAL", "Parser determinista", "Sí", "LLM opcional (clave universal)", "Sin LLM: interpreta lugar y acción por patrón"),
    ("P8 Convoy (líder/copiloto/cola, separación temporal, cohesión)", "PARTIAL", "OSRM/Azure routing + positions", "Sí (API, 1 vehículo)", "≥2 miembros con ubicación", "Combustible: “Datos de consumo no disponibles”"),
    ("P9 Anti-congestión (salir ahora / descanso +30 +60 / ruta alternativa con tráfico predictivo)", "PARTIAL", "Azure Maps departAt + maxAlternatives", "Sí (API, plan pro)", "Plan con antiCongestion", "Park&Ride y micromovilidad: SERVICIO NO CONFIGURADO"),
    ("P9 Multimodal / ahorro combustible / movilidad sostenible / rutas cotidianas", "BLOCKED", "—", "Estado veraz", "Transporte público, micromovilidad, consumo", "SERVICIO NO CONFIGURADO"),
    ("P10 Road Reality + botón incidencia por voz", "BLOCKED", "—", "Estado veraz", "Anonimización caras/matrículas; STT", "Publicación bloqueada por privacidad"),
    ("P11 Cámara compartida temporal (1 min, extensión, onda radio)", "BLOCKED", "Modelo de sesión en servidor (POST /api/camera/sessions → 503)", "Estado veraz", "WebRTC + TURN + build nativa", "—"),
    ("P12 WhatsApp Business / SMS proveedor", "BLOCKED", "Share intent implementado", "—", "WhatsApp Business Platform, proveedor SMS", "Sin confirmación de entrega"),
    ("P13 V16", "BLOCKED", "Modelo de evento", "Estado veraz", "API fabricante / canal regulatorio", "—"),
    ("P14 Métricas / patrones / inteligencia", "NOT AVAILABLE", "—", "—", "Datos históricos + plan", "Gated por entitlement familyMetrics"),
    ("Motor de alertas unificado (¿Todo bien?, incidencia, emergencia, trazabilidad)", "COMPLETE", "Mongo events", "Sí (API + UI)", "—", "Escalado: private_warning → escalated → emergency"),
    ("Planes Free/Basic/Pro + popup NO DISPONIBLE + Ver planes", "COMPLETE", "Mongo plans (configurable)", "Sí", "—", "Pago: BLOCKED (sin App Store / Play Store)"),
    ("Documentos legales versionados + re-consentimiento por versión", "COMPLETE", "TERMS_VERSION (.env)", "Sí", "Revisión legal profesional", "PENDIENTE DE REVISIÓN LEGAL"),
    ("Tema Día/Noche automático", "COMPLETE", "—", "Sí", "—", "Sigue el sistema"),
]

GAPS = [
    dict(name="Autenticación social (Google, Microsoft, Supabase)", status="BLOCKED",
         done="Email+contraseña con JWT y refresh rotativo; UI muestra proveedores como SERVICIO NO CONFIGURADO.",
         missing="OAuth con Google/Microsoft y/o Supabase Auth.", reason="El usuario entregará las claves al finalizar esta versión.",
         api="Google Identity / Microsoft Entra ID / Supabase Auth", account="Google Cloud, Azure AD, Supabase", credential="Client ID/Secret; Supabase URL + anon key",
         subscription="Gratis en tiers básicos", infra="Redirect URIs / esquema sentinel://", payment="No", approval="Verificación de app OAuth (Google) si se publica",
         files="backend/routers/auth.py, frontend/app/onboarding/account.tsx", changes="Añadir endpoints /auth/oauth/*, vincular cuenta por email verificado, UI de botones.",
         activation="Crear credenciales → añadir a backend/.env → desplegar → probar en dispositivo.", security="Validar id_token en servidor; nunca en cliente.", privacy="Solo email y nombre; sin scopes extra.",
         cost="Sin coste verificado", time=PEND),
    dict(name="Mapa nativo (react-native-maps) — verificación en dispositivo", status="PARTIAL",
         done="Integrado con estilos Día/Noche, marcadores de personas con estados veraces; vista web muestra un lienzo espacial honesto.",
         missing="Prueba en Expo Go/dispositivo; clave Google Maps para Android en build de producción.", reason="La vista web no renderiza mapas nativos.",
         api="Apple Maps (iOS) / Google Maps SDK (Android)", account="Google Cloud (solo Android build)", credential="Android API key (app.json android.config.googleMaps.apiKey)",
         subscription="Google Maps Platform (crédito mensual gratuito)", infra="—", payment="Posible según uso", approval="No",
         files="frontend/src/components/MapCanvas.tsx", changes="Añadir la clave a app.json antes de generar la build Android.",
         activation="Publish → build Android con clave configurada.", security="Restringir clave por paquete.", privacy="Ninguna adicional.", cost=PEND, time=PEND),
    dict(name="Renderer WebGL del Orbe (Three.js / expo-gl)", status="NOT AVAILABLE",
         done="Arquitectura separada: orbNodes (datos), orbPhysics (simulación portada del template), orbInteractions (gestos), OrbRendererFallback (vistas nativas con profundidad), OrbRendererHigh (gate), orbTheme (constantes). El fallback ya reproduce composición, profundidad, expansión, cámara y física.",
         missing="Implementación GL de RendererProps (esferas con material, bloom, HDRI).", reason="expo-gl/three no integrados en esta build para evitar riesgo de bundle en Expo Go; el fallback cumple la fidelidad exigida.",
         api="expo-gl + three (WebGLRenderer; WebGPU no existe en móvil)", account="—", credential="—", subscription="—", infra="—", payment="No", approval="No",
         files="frontend/src/orb/OrbRendererHigh.tsx", changes="Implementar escena three con los nodos proyectados; activar isHighRendererAvailable() con detección de GL.",
         activation="yarn expo install expo-gl three → implementar → build nativa para validar rendimiento.", security="—", privacy="—", cost="Sin coste", time=PEND),
    dict(name="Transporte público, parkings, park & ride, micromovilidad, meteorología (Quedada, Convoy, Anti-congestión)", status="BLOCKED",
         done="Azure Maps operativo (geocoding, rutas con tráfico, flujo, tráfico predictivo). Anti-congestión evalúa salir ahora / descanso / ruta alternativa con datos reales. Transit/parking/micromovilidad devuelven SERVICIO NO CONFIGURADO.",
         missing="Transporte público, parkings, micromovilidad, meteorología.", reason="Sin proveedores configurados para esas fuentes (Azure Maps Transit requiere habilitación; parkings/micromovilidad dependen de operadores).",
         api="Azure Maps Route/Traffic/Search; Azure Maps Transit (o GTFS operadores); parkings municipales", account="Azure", credential="AZURE_MAPS_KEY",
         subscription="Azure Maps Gen2 (tier gratuito limitado)", infra="—", payment="Sí por encima del tier gratuito", approval="No",
         files="backend/routers/providers.py, coordination.py", changes="Pegar la clave en backend/.env; implementar TransitProvider/ParkingProvider sobre Azure/GTFS.",
         activation="Añadir AZURE_MAPS_KEY → reiniciar backend → /api/system/status muestra azure_maps.", security="Clave solo en servidor.", privacy="Posiciones enviadas al proveedor solo para calcular rutas.", cost=PEND, time=PEND),
    dict(name="Cámara compartida temporal (WebRTC)", status="BLOCKED",
         done="Modelo de sesión (1 min, extensión, cierre, revocación) definido; endpoint devuelve estado veraz; UI muestra popup honesto.",
         missing="Transporte de vídeo en tiempo real, señalización, servidor TURN, animación de onda radio sobre stream real.", reason="react-native-webrtc no funciona en Expo Go; sin servidor TURN.",
         api="WebRTC (react-native-webrtc), Azure Communication Services o LiveKit", account="Azure o LiveKit", credential="Connection string / API key + TURN",
         subscription="Sí", infra="Servidor de señalización + TURN", payment="Sí", approval="Permisos de cámara en tiendas",
         files="backend/server.py (camera_session), frontend/app/person/[id].tsx", changes="Build nativa (Publish), SDK WebRTC, señalización WebSocket, temporizador 60 s con EXTENDER PERMISO 1 MINUTO.",
         activation="Aprovisionar servicio → build nativa → pruebas en dos dispositivos.", security="Consentimiento explícito, tokens de sesión cortos, cifrado DTLS-SRTP.", privacy="Indicador siempre visible; sin grabación oculta.", cost=PEND, time=PEND),
    dict(name="Road Reality (grabación + anonimización + publicación)", status="BLOCKED",
         done="Punto de acceso y estados veraces; endpoint /api/road-reality/publish → 503.", missing="Grabación en app, detección/anonimización de caras y matrículas, transcripción de voz, publicación.",
         reason="Sin servicio de anonimización ni STT configurados.", api="Azure AI Vision / Video Indexer (blur), OpenAI Whisper o Azure Speech (STT)", account="Azure / OpenAI",
         credential="Claves de servicio", subscription="Sí", infra="Almacenamiento de vídeo (Object Storage)", payment="Sí", approval="No",
         files="backend/server.py", changes="Módulo roadReality con expo-camera, pipeline de anonimización servidor, tarjeta de incidencia.",
         activation="Configurar claves → desplegar pipeline → build nativa.", security="Retención limitada, acceso autenticado.", privacy="Publicación solo tras anonimización irreversible.", cost=PEND, time=PEND),
    dict(name="Pago en la app / planes de suscripción", status="BLOCKED",
         done="Catálogo Free/Basic/Pro configurable en Mongo; EntitlementService; popup NO DISPONIBLE EN EL PLAN ACTUAL con “Ver planes”; POST /billing/upgrade registra la intención y devuelve estado veraz.",
         missing="Cobro real y sincronización de entitlements.", reason="Sin credenciales App Store Connect / Google Play Billing.",
         api="RevenueCat (gestionado) o StoreKit/Play Billing", account="Apple Developer, Google Play Console", credential="Claves de tiendas / API key RevenueCat",
         subscription="Cuentas de desarrollador", infra="Webhooks → users.plan", payment="Sí (cuotas de tiendas)", approval="Sí (revisión de tiendas)",
         files="backend/routers/entitlements.py, frontend/app/plans.tsx", changes="Integrar SDK, webhooks que actualicen users.plan.",
         activation="Crear productos en tiendas → configurar → build nativa.", security="Verificación de recibos en servidor.", privacy="Ninguna adicional.", cost=PEND, time=PEND),
    dict(name="V16", status="BLOCKED", done="Modelo de evento unificado admite kind=v16; endpoint devuelve SERVICIO NO CONFIGURADO.",
         missing="Integración con fabricante/canal regulatorio y asociación consentida.", reason="No existe API pública del fabricante disponible.",
         api="API del fabricante de la baliza (DGT 3.0 conectividad)", account="Acuerdo con fabricante", credential="Por definir", subscription="Por definir", infra="Webhook receptor",
         payment="Por definir", approval="Sí (regulatorio)", files="backend/routers/people.py", changes="Adaptador V16Provider + consentimiento de asociación.",
         activation="Acuerdo → credenciales → adaptador.", security="No exponer identificadores técnicos.", privacy="Solo evento privado con consentimiento.", cost=PEND, time=PEND),
    dict(name="WhatsApp Business Platform / proveedor SMS", status="BLOCKED",
         done="Invitaciones vía wa.me y expo-sms con estados veraces (preparada/lanzada; SMS ‘enviado’ solo si el SO lo confirma).",
         missing="Envío servidor con confirmación de entrega y plantillas aprobadas.", reason="Sin cuenta WhatsApp Business ni proveedor SMS.",
         api="WhatsApp Cloud API, Twilio/Azure Communication Services SMS", account="Meta Business, Twilio/Azure", credential="Tokens API", subscription="Sí", infra="Webhooks de estado",
         payment="Sí", approval="Sí (plantillas Meta)", files="frontend/src/invites.ts, backend/routers/groups.py", changes="MessagingProvider servidor + webhooks → invitations.status=delivered.",
         activation="Cuenta → plantillas aprobadas → claves.", security="Opt-in obligatorio.", privacy="Números solo si el usuario los aporta.", cost=PEND, time=PEND),
    dict(name="Foto de perfil / gráfico personalizado del avatar", status="BLOCKED", done="Avatar con color, símbolo e inicial; requisitos de subida mostrados en UI.",
         missing="Subida y almacenamiento de imágenes.", reason="Object Storage no configurado en esta versión.", api="Emergent Object Storage", account="Emergent", credential="Gestionada",
         subscription="—", infra="Bucket", payment="No verificado", approval="No", files="frontend/app/onboarding/profile.tsx", changes="expo-image-picker + endpoint de subida + URL en users.avatar.",
         activation="Integrar playbook de Object Storage.", security="Validar tipo/tamaño.", privacy="Solo visible para grupos.", cost=PEND, time=PEND),
    dict(name="Textos legales definitivos", status="PARTIAL", done="Pantallas y versionado completos; textos redactados técnicamente.",
         missing="Revisión legal profesional (RGPD, menores).", reason="No se han entregado textos corporativos.", api="—", account="—", credential="—", subscription="—", infra="—",
         payment="Honorarios legales", approval="Sí (asesoría legal)", files="backend/routers/consent.py (LEGAL_DOCS)", changes="Sustituir textos y subir TERMS_VERSION para forzar re-consentimiento.",
         activation="Editar textos → cambiar TERMS_VERSION en .env.", security="—", privacy="Crítico para cumplimiento.", cost=PEND, time=PEND),
    dict(name="Especificación maestra PDF y repositorio sentinel-family", status="PARTIAL",
         done="Construido desde el prompt maestro v2.0 y las referencias (mind map, pulse card, referencia.png).", missing="Contraste con SENTINEL_FAMILY_Especificacion_Maestra_v1.0.pdf; commits en rama consolidation/sentinel-recovery.",
         reason="PDF no entregado; repo no importado en el workspace (la plataforma gestiona commits).", api="—", account="GitHub", credential="—", subscription="—", infra="—",
         payment="No", approval="No", files="/app", changes="Usar “Save to GitHub” hacia la rama indicada.", activation="Save to GitHub → rama consolidation/sentinel-recovery.", security="—", privacy="—", cost="—", time="—"),
]

DOCS = {
    "PRODUCT_SPEC.md": "# Sentinel Family — Product Spec\n\nJerarquía: PRIMER ACCESO (consentimiento → transparencia → perfil → grupo) → OPERACIÓN (mapa → personas → orbes → acciones → movilidad → seguridad).\n\nExperiencias firma: Orbe Inteligente, Orbe de Persona, Formación de Grupo, Mini-Orb, Tarjeta de Privacidad doble cara, Orbe Quedada, Tarjeta Operativa de Convoy.\n\nReglas absolutas: sin modo demo, sin datos inventados, estados veraces (`NO DISPONIBLE EN EL PLAN ACTUAL` para plan, `SERVICIO NO CONFIGURADO` para credenciales/infra).",
    "ONBOARDING_AND_CONSENT.md": "# Onboarding y consentimiento\n\nPantallas: Términos → Datos → Transparencia → Ciberseguridad → Cuenta → Consentimiento granular → Perfil → Grupo.\n\nProgreso local (`sentinel.onboarding`) antes de la cuenta; servidor (`users.onboarding.step`) después. Sobrevive reinicios.\n\nEvidencia: `consents` (append-only): documento, versión, aceptado, timestamp cliente/servidor, idioma, plataforma, versión app. Re-consentimiento cuando cambia `TERMS_VERSION`.",
    "LEGAL_ARCHITECTURE.md": "# Arquitectura legal\n\nDocumentos versionados en `routers/consent.py` (`LEGAL_DOCS`) con estado `PENDIENTE DE REVISIÓN LEGAL`. `GET /api/consents/status` indica `requires_reconsent`.",
    "ARCHITECTURE.md": "# Arquitectura\n\nBackend FastAPI + MongoDB (`/api`). Routers: auth, consent, entitlements, groups, people (perfil/posiciones/eventos), providers (adaptadores), coordination (quedadas/convoy).\n\nFrontend Expo Router + TypeScript + Reanimated + Gesture Handler. `src/theme.ts` (Día/Noche), `src/api.ts` (JWT + refresh), `src/auth.tsx`.\n\nAdaptadores: GeocodingProvider, RoutingProvider, TrafficProvider (Azure Maps si `AZURE_MAPS_KEY`, si no Nominatim/OSRM demo). Transit/Parking/Weather/Camera/V16/Billing: no configurados (estado veraz).",
    "ORB_SYSTEM.md": "# Orbe Sentinel\n\n`src/components/SentinelOrb.tsx`: arrastre con inercia (`withDecay`), acomodación en bordes, compresión 8 % al tocar, pulso interno, onda de energía, 7 familias en arco (release escalonado), herramienta seleccionada → contenedor inferior; cierre inverso. Reduce-motion respetado. Herramientas con `capability` se bloquean por entitlement (candado + popup).",
    "GROUP_SYSTEM.md": "# Sistema de grupos\n\nTerminología: GRUPO. Creación espacial (`OrbitalField`): núcleo, órbita lenta, nacimiento desde el núcleo con resorte, pendiente gris → activo vivo con transición luminosa. Invitaciones: prepared → dispatched → accepted/declined/expired/cancelled. Temporales expiran automáticamente. ENVIAR A TODOS lanza secuencialmente los canales del SO. Colapso a Mini-Orb.",
    "USER_ORB.md": "# Orbe de persona\n\n`app/person/[id].tsx`: acciones contextuales gated por consentimiento y datos reales (estado, ETA, ¿Todo bien?, reunirse, seguir, mensaje, …). Cámara y llamada muestran estado veraz.",
    "AVATAR_SYSTEM.md": "# Avatar\n\nSímbolo de geolocalización + inicial/foto en círculo superior derecho (`PersonAvatar`). Personalización: color, símbolo. Foto: bloqueada (Object Storage).",
    "UX_SYSTEM.md": "# UX\n\nTokens en `design_guidelines.json` / `src/theme.ts`. Sin tab bar, sin hamburguesa. Toasts y sheets, nunca Alert. Estados: cargando/activo/vacío/sin permiso/denegado/expirado/no disponible/error.",
    "PRIVACY_MODEL.md": "# Modelo de privacidad\n\n`permission_events` append-only; permiso efectivo = último evento por (clave, ámbito) no expirado. Ubicación se sube solo con permiso efectivo + permiso del SO. Aproximada = 2 decimales. Historial visible en la Tarjeta de Privacidad.",
    "PERMISSIONS.md": "# Permisos\n\n14 claves: exact_location, approx_location, eta, status, recent_route, mobility_mode, patterns, safety_alerts, v16, camera, microphone, road_reality, metrics, group_visibility. Cada una: qué/por qué/con quién/hasta cuándo.",
    "ENTITLEMENTS.md": "# Entitlements\n\n`routers/entitlements.py`: planes en Mongo (`plans`), `user_entitlements()`, `require()`. Claves: canCreateGroups, maxGroups, maxPermanentMembers, maxTemporaryGuests, cameraShareDuration, advancedMobility, roadReality, familyMetrics, convoy, meetings, antiCongestion. Invitado temporal: canCreateGroups solo por delegación.",
    "MEETING_SYSTEM.md": "# Quedada\n\n`/api/meetings`: destino geocodificado real, participantes con 11 estados, ETA por participante solo con consentimiento + posición + proveedor de rutas, deep link ABRIR EN SENTINEL. Optimización multi-criterio: bloqueada.",
    "CONVOY_SYSTEM.md": "# Convoy\n\n`/api/convoys`: líder/copiloto/cola, ETA por vehículo, separación temporal (máx−mín ETA), cohesión stable/warning/risk, consejo nunca de acelerar, combustible “no disponible”, reagrupación por asientos libres declarados.",
    "ANTI_CONGESTION.md": "# Anti-congestión\n\nEstrategias previstas: descanso, park & ride, micromovilidad, ruta alternativa. Estado: SERVICIO NO CONFIGURADO (requiere tráfico + transporte + parkings).",
    "ROAD_REALITY.md": "# Road Reality\n\nBloqueado: requiere anonimización de rostros/matrículas y STT. Grabación siempre visible; nunca oculta.",
    "CAMERA_SHARING.md": "# Cámara compartida\n\nSesión por defecto 1 minuto, EXTENDER PERMISO 1 MINUTO a 10 s, cierre con “SE HA CERRADO LA CONEXIÓN DE LA CÁMARA”. Transporte WebRTC: bloqueado.",
    "WHATSAPP_SMS.md": "# WhatsApp / SMS\n\nCanales legítimos: wa.me (share/deep link) y expo-sms. Estados: “Invitación preparada” / “lanzada”; “SMS enviado” solo si el SO confirma. Sin Business Platform.",
    "V16_INTEGRATION.md": "# V16\n\nSeparación: dispositivo/fabricante → canal regulatorio → evento privado Sentinel (consentido). Sin integración disponible.",
    "DATA_MODEL.md": "# Modelo de datos (Mongo)\n\nusers, sessions, consents, permission_events, plans, billing_intents, permission_requests, groups, members, invitations, positions (TTL 30 d), positions_latest, events, meetings, convoys, camera_requests. Borrados: soft (`deleted_at`, `status=removed`).",
    "SECURITY.md": "# Seguridad\n\nbcrypt, JWT HS256 30 min, refresh rotativo (hash SHA-256, TTL), SecureStore en nativo, HTTPS, validación Pydantic, secretos en .env, sin logs sensibles.",
    "INTEGRATIONS.md": "# Integraciones\n\n`GET /api/system/status` devuelve el estado real de cada proveedor. Azure Maps se activa con `AZURE_MAPS_KEY`.",
    "TEST_PLAN.md": "# Plan de pruebas\n\nFlujo primer uso completo (§80), estados de grupo (§81), interacción del Orbe (§82). Ejecutado: e2e web + API. Pendiente: dispositivo (mapa nativo, SMS, haptics).",
    "DEPLOYMENT.md": "# Despliegue\n\nBotón Publish de Emergent. Secretos: JWT_SECRET, AZURE_MAPS_KEY, TERMS_VERSION, APP_PUBLIC_URL. Builds iOS/Android desde el panel de publicación.",
    "CHANGELOG.md": f"# Changelog\n\n## {TODAY}\n- feat(onboarding): consent and transparency flow\n- feat(auth): email/password JWT\n- feat(groups): orbital group creation, invitations, mini-orb\n- feat(orb): Sentinel intelligent orb shell\n- feat(permissions): double-sided sharing card\n- feat(meeting): Quedada orb with real ETA\n- feat(convoy): operational convoy card\n- feat(plans): entitlement service + plans page\n- docs: implementation status + gaps PDF",
}

ADRS = {
    "ADR-001-mobile-stack.md": "# ADR-001 Stack móvil\n\nExpo SDK 57 + Expo Router + TypeScript + Reanimated 4 + Gesture Handler. Sin motores 3D (WebGPU de la referencia se traduce a física 2D con resortes).",
    "ADR-002-map-provider.md": "# ADR-002 Proveedor de mapas\n\nreact-native-maps (Apple/Google) para render; rutas/geocoding por adaptador (Azure Maps preferente, OSRM/Nominatim como fallback no productivo). Nunca acoplar UI a un proveedor.",
    "ADR-003-orb-animation-architecture.md": "# ADR-003 Animación del Orbe\n\nShared values + withDecay/withSpring; estado de apertura en React; herramientas en contenedor inferior. Reduce-motion cambia entradas a fade.",
    "ADR-004-consent-storage.md": "# ADR-004 Almacenamiento de consentimiento\n\nColecciones append-only (`consents`, `permission_events`); el estado efectivo se deriva, nunca se sobrescribe.",
    "ADR-005-group-invitation-model.md": "# ADR-005 Invitaciones\n\nToken opaco + deep link; estados prepared/dispatched/accepted/declined/expired/cancelled; el cliente solo marca `dispatched` tras abrir el canal del SO.",
    "ADR-006-entitlement-model.md": "# ADR-006 Entitlements\n\nCatálogo en Mongo; `require()` centralizado; error 402 con código `PLAN_UNAVAILABLE`; infraestructura ausente → 503 `SERVICE_NOT_CONFIGURED`.",
    "ADR-007-camera-session-security.md": "# ADR-007 Cámara\n\nSesiones de 60 s con extensión explícita, indicador visible permanente, revocación automática; transporte WebRTC diferido a build nativa.",
}


def write_docs():
    os.makedirs(os.path.join(ROOT, "decisions"), exist_ok=True)
    for n, body in DOCS.items():
        open(os.path.join(ROOT, n), "w").write(body + "\n")
    for n, body in ADRS.items():
        open(os.path.join(ROOT, "decisions", n), "w").write(body + "\n")
    rows = ["| Feature | Status | Real integration | Tested | Dependency | Notes |", "|---|---|---|---|---|---|"]
    rows += [f"| {f} | {st} | {ri} | {t} | {d} | {n} |" for f, st, ri, t, d, n in FEATURES]
    open(os.path.join(ROOT, "IMPLEMENTATION_STATUS.md"), "w").write(f"# Implementation status ({TODAY})\n\nStatuses: COMPLETE | PARTIAL | BLOCKED | NOT AVAILABLE\n\n" + "\n".join(rows) + "\n")
    json.dump({"generated": TODAY, "features": [dict(zip(["feature", "status", "integration", "tested", "dependency", "notes"], f)) for f in FEATURES], "gaps": GAPS},
              open(os.path.join(ROOT, "implementation_status.json"), "w"), ensure_ascii=False, indent=2)


def write_pdf():
    path = os.path.join(ROOT, "SENTINEL_IMPLEMENTATION_GAPS.pdf")
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=16 * mm, bottomMargin=16 * mm)
    ss = getSampleStyleSheet()
    h1, h2, body = ss["Title"], ss["Heading2"], ParagraphStyle("b", parent=ss["BodyText"], fontSize=9, leading=12)
    small = ParagraphStyle("s", parent=body, fontSize=8, leading=10)
    el = [Paragraph("SENTINEL FAMILY — Implementation Gaps Report", h1), Paragraph(f"Generado: {TODAY} · Versión inicial (build 1)", body), Spacer(1, 6),
          Paragraph("Este informe enumera cada función incompleta o bloqueada, qué está implementado realmente, qué falta y el procedimiento exacto de activación. "
                    "Cuando un dato no está verificado se indica “Pendiente de cotización o validación técnica.” No se inventan cifras.", body), Spacer(1, 10),
          Paragraph("Resumen de estado", h2)]
    data = [["Feature", "Status", "Tested"]] + [[Paragraph(f, small), st, Paragraph(t, small)] for f, st, _, t, _, _ in FEATURES]
    t = Table(data, colWidths=[105 * mm, 30 * mm, 40 * mm], repeatRows=1)
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.25, colors.grey), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DCE4EC")), ("FONTSIZE", (0, 0), (-1, -1), 8), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    el += [t, PageBreak()]
    labels = [("status", "Estado actual"), ("done", "Implementado realmente"), ("missing", "Qué falta"), ("reason", "Motivo exacto del bloqueo"), ("api", "API requerida"),
              ("account", "Cuenta requerida"), ("credential", "Credencial requerida"), ("subscription", "Suscripción requerida"), ("infra", "Infraestructura requerida"),
              ("payment", "¿Requiere pago?"), ("approval", "¿Requiere aprobación externa?"), ("files", "Ficheros relevantes"), ("changes", "Cambios técnicos requeridos"),
              ("activation", "Procedimiento de activación"), ("security", "Implicaciones de seguridad"), ("privacy", "Implicaciones de privacidad"), ("cost", "Coste conocido"), ("time", "Tiempo estimado")]
    for g in GAPS:
        el.append(Paragraph(g["name"], h2))
        rows = [[Paragraph(f"<b>{l}</b>", small), Paragraph(str(g[k]), small)] for k, l in labels]
        tb = Table(rows, colWidths=[45 * mm, 130 * mm])
        tb.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
        el += [tb, Spacer(1, 10)]
    doc.build(el)
    return path


if __name__ == "__main__":
    write_docs()
    print("PDF:", write_pdf())
