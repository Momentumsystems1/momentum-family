# BAYMOVE G3000 — vertical slice de onboarding, círculo y primera acción
**Fecha:** 2026-10-14
**Decisión:** validar experiencia de principio a fin antes de multiplicar herramientas, mapas y alertas.
**Estado:** el repositorio tiene pantallas nativas de onboarding/grupos/eventos; aún dependen de backend FastAPI/MongoDB y no hay prueba extremo a extremo con dos usuarios. Existe un prototipo HTML autocontenido para valoración visual, **pero no equivale a la app nativa en funcionamiento ni contiene un mapa real**.

## Una experiencia usable en 3 minutos
1. Bienvenida: promesa concreta de seguridad y movilidad familiar.
2. Perfil: nombre visible; registro completo con autenticación real solo en app nativa.
3. Privacidad: decidir compartir ubicación y recibir avisos, por separado. Inicialmente desactivados y con revocación accesible. No pedir permisos del sistema hasta que la función lo requiera.
4. Crear círculo: nombre del grupo, representación visual orbital, propietario.
5. Invitar: añadir una persona, rol/relación y estado pendiente. La demo nunca envía mensajes reales ni inserta usuarios falsos como si hubieran aceptado. La app real requerirá invitación y aceptación/autorización.
6. Panel familiar: miembros con estado, vista de mapa (solo ilustrativa en prototipo), acción «¿Todo bien?» y actividad legible.
7. La respuesta en prototipo es una **simulación marcada**; en producción se exigirá backend, autenticación, notificaciones y trazabilidad.

## Reutilización del código nativo ya existente
- `frontend/app/index.tsx` contiene el enrutador de onboarding por pasos.
- `frontend/src/components/OnboardingScreen.tsx` es el marco visual y contiene la secuencia local/legal.
- `frontend/app/onboarding/group.tsx` crea/renombra un círculo con FastAPI, usa `OrbitalField` e invitaciones.
- `frontend/app/group/[id].tsx` tiene miembros, actividad, invitaciones, encuentros y convoyes.
- `frontend/app/map.tsx` añade «¿Todo bien?» mediante endpoint `/events`.
- `frontend/src/api.ts` requiere `EXPO_PUBLIC_BACKEND_URL`; no funciona sin servidor ni sesión. No ocultar errores por medio de datos inventados.

## Validación vs. comparables
- Life360: crear círculo → enviar código → aceptación → check-in de la ubicación. Referencia: https://support.life360.com/hc/en-us/articles/23053382837143-Create-a-Circle y https://support.life360.com/hc/en-us/articles/23053645947031-Check-In-With-My-Circle
- Apple Find My: control para decidir con quién compartir; https://support.apple.com/en-us/105107
- Google Maps: avisos de llegada/salida solo si existe localización voluntariamente compartida; https://support.google.com/maps/answer/11966807
- GeoZilla: alertas de zonas y seguridad; https://geozilla.com/family/
**Differenciación BAYMOVE:** el círculo está al servicio de la seguridad y movilidad, no de la vigilancia. La capa NAP/TomTom/DGT/Weather/AirQuality/Pollen llegará después.

## Dos niveles de demo que NO debemos confundir
**A. Demo local HTML de concepto**: funciona en un navegador; crea un círculo local, permite añadir invitados pendientes y una actividad `¿Todo bien?` con respuesta **simulada**. Los datos se guardan solo en almacenamiento del navegador; no accede a sensores, red ni backend. Su objetivo es UX.
**B. Vertical slice real**: crear perfil/círculo en FastAPI/MongoDB, invitación con expiración, segunda cuenta real acepta, ambos conceden permisos, check-in/confirmación a destinatario, auditoría en backend. Debe validarse con dos teléfonos y sin datos de muestra.

## Puertas de calidad para B (no logradas aún)
- Onboarding explicable sin capacitación.
- Ninguna geolocalización ni envío al servidor sin permiso explícito.
- Invitación no enviada permanece como «borrador» o «pendiente», no como entregada.
- Check-in distingue creado, entregado, recibido y respondido.
- Se puede retirar consentimiento sin perder la cuenta o el círculo.
- Perfil menor / familiar vulnerable con tutela/consentimiento apropiados.
- Datos de ubicación nunca accesibles fuera del círculo autorizado; minimizar retención.
- Primer check-in completado entre **dos cuentas reales** y verificado por el receptor.
- Consola de validación indica fallo de red y backend, no sustitución silenciosa por mock.

## Orden de ejecución
1. Usuario prueba A y reporta tres fricciones del flujo.
2. Ajustar interfaces del repositorio original y unificar nombres BAYMOVE, sin perder nada.
3. Levantar backend real protegido, pruebas de onboarding/círculo/invite/check-in.
4. APK Android estable + Google Maps real (otra vía de validación, no condiciona A).
5. Con dos usuarios y mapa funcionando, conectar fuentes NAP/Weather/TomTom y después el módulo de accidentes.

## Resultado de la ejecución — 2026-10-14

**Validación CI real pasada:** [GitHub Actions run 38484471615](https://github.com/Momentumsystems1/momentum-family/actions/runs/38484471615). Se ejecuta `backend/tests/vertical_slice_ci.py` contra un servicio MongoDB temporal real y a través de FastAPI ASGITransport. Tres usuarios de prueba independientes: creación de cuenta/perfil, círculo, invitación preparada y aceptada, evento ¿Todo bien?, lectura y respuesta del invitado, denegación a usuario ajeno y denegación tras retirada. El pipeline también pasó importación backend, TypeScript y exportación web.

**Correcciones implementadas:**
- Permisos del onboarding desactivados por defecto; evita guardar consentimientos vacíos cuando falla la carga del catálogo.
- Acción de evento requiere pertenencia activa y ser creador o destinatario; probado que un tercero no puede responder conociendo el ID.
- Las claves bearer de invitación y teléfonos solo se muestran al administrador del círculo, no a los miembros comunes.
- El flujo de creación de círculo solo navega al mapa si el backend confirma `/formed`; conserva el nombre introducido.
- El frontend deja de afirmar que ha enviado un aviso: `delivery_status: not_configured` indica que se registra la actividad pero aún no hay notificación push.
- Etiquetas principales de inicio de sesión/invitaciones actualizadas a BAYMOVE. Aceptación legal solo si existe evidencia local de aceptación, sin inventar fecha.

**Pendiente (no probado y no debemos llamarlo funcional):**
- Una sesión real en móvil de dos personas y confirmación de que el receptor recibe una alerta push.
- Hosting privado accesible del backend y MongoDB con TLS/IAM, protección de datos y copias de seguridad.
- Una APK Android autónoma con bundle JS, firma estable, clave Maps restringida a paquete/SHA-1 y mapa 2D/3D verificado.
- GPS real, consentimiento y geolocalización de fondo, rutas, NAP, TomTom y detección de accidentes.
- La demo HTML offline anterior sigue siendo solo una simulación de UX, no está conectada a los nuevos tests MongoDB.

**Decisión siguiente:** preparar un backend privado de pruebas y dos cuentas reales de QA, y conectarlo después a la primera APK instalable. No desplegar datos personales en servicios públicos sin políticas y controles.
