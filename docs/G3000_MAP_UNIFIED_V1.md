# BAYMOVE G3000 — Mapa unificado V1 (Explorar · Navegar · Círculo)
**14 de octubre de 2026. Rama:** `feature/baymove-unified-map-20261014`.
**Estado:** código React Native implementado y compilación de software en CI. No desplegado en móviles ni publicado; no altera `main`.

## Decisión
Un solo `frontend/app/map.tsx` y una sola instancia `MapCanvas`, con tres **estados visuales** de uso, no tres mapas ni tres proveedores duplicados.

### 1. Explorar
- Mapa nativo actual (Google Maps en Android cuando se compile con API key G3000 bien restringida; iOS provider según configuración; web es visual espacial **sin tiles reales**).
- Barra de búsqueda, controles cámara 2D/3D en nativo, centrar GPS tras autorización y selección del punto por toque.
- Panel inferior compacto: Ir/Búsqueda, Círculos, Seguridad (pantalla de privacidad existente).
- Nunca enviar localización al grupo solo por centrar mapa en el teléfono.

### 2. Navegar (ruta preliminar)
- Seleccionar punto en mapa o buscar destino *explícitamente* mediante `GET /api/mobility/geocode?q=` (backend: Nominatim si Azure no configurado). Sin consultas por tecla, para reducir carga del proveedor público.
- Calcular ruta con **POST `/api/mobility/route`** desde la posición consentida del teléfono al destino. El backend existente usa OSRM público como fallback de demostración sin tráfico: **NO es una oferta de routing preparada para producción**.
- Dibujar geometría real sobre el mismo `MapCanvas`, encuadrar todo el trayecto con `fitToCoordinates`, mostrar duración/distancia y etiqueta de ruta preliminar.
- Cambio de vista 2D/3D y recenter conservados; Convoy se abre en flujo propio desde panel.
- **No hay** navegación guiada con voz, matching GPS sobre carretera, instrucciones giro a giro en directo, tráfico Waze, accidentes/hazards o avisos de carril. Un test web o Gradle no demuestra esos servicios.
- Fuente de datos vigente prevista para etapa comercial: Google G3000 + posible TomTom Orbis (sujeto a cuotas/licencia/acceso); **no reactivar Azure heredado**. El endpoint `/mobility/nav-route` en `app/navigate.tsx` conserva dependencia Azure obsoleta: no se utiliza desde el nuevo mapa unificado.

### 3. Círculo
- `GET /api/groups` obtiene miembros, activos e invitaciones pendientes.
- `GET /api/groups/{id}/positions` solo presenta coordenadas cuando están compartidas y autorizadas; si no, mostrar «Sin ubicación», nunca marcador inventado.
- Pulsar miembro que comparte mueve cámara; si no comparte, aviso honesto.
- Acciones Círculo, «¿Todo bien?» (POST real a `/api/events`, sin promesa de push) y Quedada (flujo actual).
- El backend ya pasó la prueba de autenticación/invitación/aceptación y bloqueo a terceros contra MongoDB desechable.

## Seguridad y privacidad
- Diferenciar permisos de **GPS del dispositivo** de consentimiento de **compartir ubicación en círculo**; el código usa `useLocationSharing(sharesLocation)` y `/permissions`.
- No inventar estado de entrega de notificaciones.
- No incrustar `TOMTOM_API_KEY` ni clave G3000 de servidor en la aplicación. `G3000_MAPS_ANDROID_API_KEY` solo en build restringida al paquete + huella SHA-1.
- Repositorio público: pipeline **no** publica APK ni incluye credenciales.
- Si no hay backend en `EXPO_PUBLIC_BACKEND_URL`, la UI informa del fallo. Si no hay Google Maps Android key, `MapCanvas` deja un aviso específico.
- No mostrar localización de un invitado pendiente, aunque tenga nombre y nodo.

## Validación
Automática:
- `My Cluster recovery checks` (importación FastAPI, pruebas MongoDB, TypeScript y export web).
- `BAYMOVE Android native (no EAS)` (Expo prebuild + `assembleDebug`, sin claves); confirma que compila pero no distribución autónoma, JS empaquetado, GPS ni mapa mostrado.
Manual en siguiente etapa con APK/servidor:
- [ ] Dos teléfonos con Android: pantalla mapa muestra Google real con clave restringida y GPS independiente.
- [ ] Tres botones intercambian estados sin abandonar la pantalla y sin perder cámara.
- [ ] Destino buscado genera geometría sobre el mapa cuando backend responde; falla con aviso si servicio no disponible.
- [ ] Recorrido completo se encuadra (origen/destino) y cambia inclinación 2D/3D.
- [ ] Usuario A no ve ubicación B sin consentimiento; tras concederlo, se muestra; tras revocarlo desaparece.
- [ ] ¿Todo bien? crea evento en backend (pero no se muestra como notificación entregada).
- [ ] Sin internet, servidor apagado y GPS denegado se muestran errores explícitos.
- [ ] Modo conducción real y seguridad vial se validarán por separado antes de permitir mensajes que sugieran navegación operacional.

## Fuera de V1
- UI de mapas avanzada, ETA de tráfico autorizado, navegación por voz, control de ruta en background, alertas NAP/DGT, predicción y accidente.
- Círculos Flash web, notificaciones push, Convoy multiusuario operativo.
- Limpieza del módulo antiguo `app/navigate.tsx` y dependencia Azure en backend, que se migrarán sin cortar flujos que todavía usan esas rutas.
