# BAYMOVE / G3000 — NAP transporte público, avisos de servicio y tráfico
**Investigación oficial:** 2026-10-14. **Estado:** fuente identificada, implementación futura / no conectada ni validada en producción.
**Propósito:** alertas de movilidad y previsión de incidencias en rutas familiares, viajes recurrentes y convoyes, comenzando por Cataluña y Madrid y ampliando a España/UE.

## 1. Hay dos NAP diferentes que se complementan
**NAP Transporte Multimodal** — https://nap.transportes.gob.es/
- Ministerio de Transportes y Movilidad Sostenible: portal nacional de datos de servicios regulares de transporte de viajeros.
- Catálogo: https://nap.transportes.gob.es/ConjuntoDato/List
- Formatos que aparecen en el portal (octubre de 2026): GTFS (horarios), **GTFS-RT** (posibles actualizaciones de servicio en tiempo real), **SIRI** (actualizaciones de transporte), NeTEx (datos estructurados de red), páginas web y documentación.
- El portal permite alta como **consumidor de datos** y expone licencias de datos abiertos del ministerio. La disponibilidad de feed directo, requisitos de acceso y licencia de cada operador se validan **por conjunto**; no existe prueba de una API universal única que dé incidencias de todos los operadores.
- Ejemplos indexados: *Transporte metropolitano de Barcelona (Bus y Metro)* GTFS; *Autobús metropolitano Barcelona* GTFS + GTFS-RT; *Ferrocarriles de la Generalitat de Cataluña* GTFS + GTFS-RT; *Cercanías Renfe* GTFS + GTFS-RT; *RENFE Media, Larga Distancia y AVE* GTFS + GTFS-RT; *Autobús urbano Madrid* GTFS + GTFS-RT; *Euskotren/Metro Bilbao/Bilbobus* GTFS, GTFS-RT, SIRI/NeTEx.
- **Advertencia:** que un conjunto se etiquete GTFS-RT no prueba que contenga a la vez `TripUpdates`, `ServiceAlerts` y `VehiclePositions`; inspeccionar el feed y su actualización antes de ofrecer alertas.

**NAP DGT Tráfico y Movilidad** — https://nap.dgt.es/es/
- Catálogo: https://nap.dgt.es/es/dataset
- Incluye *Incidencias DGT DATEX II v3.7* de la red estatal **excepto Cataluña y País Vasco**; esos ámbitos se cubren con *Incidencias SCT* (Servei Català de Trànsit) y *Incidencias DT-GV* (Gobierno Vasco).
- Fuente **SCT** https://nap.dgt.es/es/dataset/incidencias-sct (DATEX II, publicación de 5 minutos indicada en los metadatos; comprobar disponibilidad del recurso).
- DGT también lista paneles/cámaras, ZBE, tramos especiales de riesgo, SRTI y datos de terceros, incluido TomTom Safety Related Traffic. Todo sometido a licencia/términos del dataset, atribución y revisión de caducidad. Se debe preferir **DATEX II v3.7 actual** frente a formatos antiguos marcados a extinguir.
- NAP DGT registra feeds, **no es lo mismo que una API universal autenticada** y no sustituye las autorizaciones comerciales de TomTom.

## 2. Proveedores locales de tiempo real que sí conviene incluir

| Proveedor | Catálogo/entrada | Tipo | Autenticación / salvedad |
|---|---|---|---|
| TMB Barcelona (bus, metro) | https://www.tmb.cat/es/tmb-app-y-otras-aplicaciones/herramientas-para-desarrolladores ; https://developer.tmb.cat/ | GTFS semanal + APIs de red en tiempo real, iBus | Registrar acceso al portal de desarrollador, comprobar APIs concretas de interrupciones y permisos |
| EMT Madrid | https://datos.emtmadrid.es/es/dataset/tiempo-real-para-autobuses-de-emt | Llegadas en tiempo real + Service Alerts Protobuf | API de llegadas pide API key en MobilityLabs |
| EMT Madrid alteraciones | https://datos.emtmadrid.es/es/dataset/incidencias-o-alteraciones-del-servicio-de-emt | RSS + endpoint `https://openapi.emtmadrid.es/v1/bus/servicealerts/proto` (validar formato de respuesta) | Confirmar autenticación, términos y formato de cada endpoint |
| Renfe Cercanías | https://nap.transportes.gob.es/ConjuntoDato/List | GTFS/GTFS-RT declarado | Auditar alertas reales, cobertura y permisos |
| FGC | https://nap.transportes.gob.es/ConjuntoDato/List | GTFS/GTFS-RT declarado | Auditar frecuencia, alertas reales y cobertura |
| SCT tráfico Cataluña | https://nap.dgt.es/es/dataset/incidencias-sct | DATEX II incidencias | Verificar recurso activo, calidad y frecuencia |
| DGT resto de España | https://nap.dgt.es/es/dataset | DATEX II v3.7 | Excluye Cataluña y País Vasco |
| Gobierno Vasco | https://nap.dgt.es/es/dataset | DATEX II | Feed independiente |
| TomTom | https://my.tomtom.com/ | Routing, Traffic Flow/Incidents; extra SRTI referenciado en NAP | `TOMTOM_API_KEY` servidor en G3000; disponibilidad/plan/licencias específicas |

## 3. Arquitectura implementable
- Se crean adaptadores independientes `transit_nap`, `tmb_live`, `emt_madrid`, `renfe_realtime`, `fgc_realtime`, `dgt_datex37`, `sct_datex`, `basque_datex`, `tomtom_traffic`.
- El backend G3000 adquiere recursos autorizados (polling ajustado a actualización real, HTTP conditional requests cuando estén soportados) y **no** envía keys al móvil. 
- Pipeline: ingestión → validación de esquema y marca de tiempo → reconciliación IDs de servicio/operador/parada → normalización de alertas → geo-intersección de origen/destino/trayecto + ventanas horarias → deduplicación → notificación cuando cambia materialmente el trayecto.
- Diferenciar **horarios GTFS estáticos** (sin garantía de actualizaciones de explotación) de GTFS-RT (`trip_updates`, `vehicle_positions`, `alerts` según feed), SIRI (cambios/llegadas), NeTEx (datos de oferta) y DATEX II (incidencias de circulación).
- Esquema interno recomendado: `id, provider, nativeId, mode, operator, lineIds[], stopIds[], affectedGeometry?, description, category, severity, startTime, endTime?, observedAt, publishedAt?, sourceUrl?, feedFormat, verification, staleAfter, accessRights`. Reflejar `sourceUnavailable` sin inventar ausencia de incidentes.
- Asociar a trayectos habituales por consentimiento (familia, colegio, trabajo), no inferir ni difundir lugares sensibles sin permiso; controlar retención y opt-out. No avisar de supuestas interrupciones si solo se observan diferencias de horarios.

## 4. Ejemplo de caso BAYMOVE
**Trayecto guardado casa → colegio, horario de mañana**. TMB notifica incidencia de línea utilizada o FGC/Renfe feed marca retrasos verificables. BAYMOVE calcula alternativa, compara tiempo, añade pronóstico de lluvia/viento y envía **una sola notificación** anticipada a quienes tengan permisos: `Hay una afectación publicada para la línea; considera salir 15 minutos antes` solo si ETA alternativa y calidad de feed hacen medible el retraso. De lo contrario, `Incidencia publicada: consulta antes de salir`. No hacer promesas de precisión sin medir.

## 5. Credenciales que podrían requerirse
- **Ninguna credencial universal NAP.** Registro como consumidor, enlaces o claves según el dataset/editor. No crear secretos sin necesidad ni inventar endpoints.
- **TMB**: si exige App ID/App Key, usar `TMB_APP_ID` y `TMB_APP_KEY` en Secret Manager, servidor únicamente.
- **EMT Madrid**: si registro MobilityLabs crea token o key, `EMT_MADRID_API_KEY`, servidor únicamente.
- **TomTom**: `TOMTOM_API_KEY`, guardar en **Google Cloud Secret Manager del proyecto G3000**, no en GitHub ni `EXPO_PUBLIC_*`; restricciones/cuotas por proveedor.
- **DGT/SCT**: no asumir que precisan claves por el hecho de consumir DATEX II; revisar condiciones específicas del recurso.

## 6. Aceptación antes de prometer "tiempo real"
- [ ] Identificar URL exacta del feed y condiciones de licencia por operador; registrar comprobación con fecha.
- [ ] Obtener por lo menos 1 GTFS estático y 1 GTFS-RT/SIRI activo en España y distinguir `ServiceAlerts` de datos de horario.
- [ ] Verificar tiempos de llegada TMB con token válido y filtro por parada/servicio, sin inventar resultados.
- [ ] Verificar alertas EMT Madrid y decodificar Protobuf/RSS.
- [ ] Verificar feed SCT Cataluña y DGT v3.7 nacional, parsing y geo-intersección.
- [ ] Alerta con TTL/fecha/autoridad, no repetida, no enviada tras revocar permisos.
- [ ] Probar límites de solicitud, privacidad, trazabilidad, fuente de incidencia y caída de proveedor.
- [ ] Mostrar "Datos no disponibles" cuando el operador no ofrece alertas en tiempo real; no mostrar un verde falso.

## Fuentes originales (consultadas el 14/10/2026)
- https://nap.transportes.gob.es/
- https://nap.transportes.gob.es/ConjuntoDato/List
- https://nap.dgt.es/es/dataset
- https://nap.dgt.es/es/dataset/incidencias-sct
- https://www.dgt.es/conoce-el-estado-del-trafico/informacion-e-incidencias-de-trafico/
- https://www.tmb.cat/es/tmb-app-y-otras-aplicaciones/herramientas-para-desarrolladores
- https://datos.emtmadrid.es/es/dataset/incidencias-o-alteraciones-del-servicio-de-emt
- https://datos.emtmadrid.es/es/dataset/tiempo-real-para-autobuses-de-emt
