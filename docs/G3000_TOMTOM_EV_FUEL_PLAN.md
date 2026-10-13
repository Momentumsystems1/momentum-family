# BAYMOVE / G3000 — TomTom, combustible y recarga eléctrica
**Decisión de producto:** 2026-10-14 · **Estado:** requisito aprobado / investigación de proveedores. No implementado ni probado.

## Resultado
- Google Maps permanece como mapa base de BAYMOVE. TomTom se reserva a capacidades diferenciales de rutas, tráfico, incidentes y búsqueda de estaciones. No incrustar una clave TomTom en Expo ni exponerla en código público.
- **TomTom Orbis Maps** es la plataforma nueva (no un producto de catálogo o un conmutador en la página de documentación); existen endpoints y esquemas independientes de la plataforma TomTom Maps anterior. Para integraciones TomTom nuevas escoger Orbis y **no mezclar** Orbis Routing con tráfico/IDs legados sin una capa de compatibilidad explícita.
- **Fuel Prices API**: España figura como mercado cubierto, pero el acceso oficial en octubre de 2026 es Automotive only / Contact Sales, no incluido en free evaluation ni Pay-As-You-Grow; la variante Orbis aparece en private preview. Por tanto, ver documentación ≠ derecho de consulta con clave gratuita.
- **EV Search API**: búsqueda avanzada de estaciones, ubicaciones, tipos de conector, potencias, horas, restricciones y disponibilidad, pero también requiere autorización comercial fuera del plan gratuito en sus variantes documentadas.
- **EV Charging Stations Availability API**: estados y plazas libres por conector y potencia, periodicidad típica de actualización ~3 min; las variantes Orbis en documentación están en private preview, de modo que acceso real y cobertura española requieren validación.
- **Precios de recarga**: NO asumir que TomTom EV Search/Availability incluye tarifas `€/kWh`; la API documentada no garantiza devolución del precio público efectivo (pueden intervenir tarifas por tiempo, roaming, ocupación, impuestos y tipo de pago). Tratar los precios como campo separado por fuente, fecha y condiciones, nunca inventarlos.
- **Combustibles en España**: el ministerio MITECO/Industria publica datasets y REST de estación de servicio + precios actuales; evaluar licencias, tasas, frescura y restricciones para integrar en backend. Si podemos usarlo, evita el bloqueo comercial TomTom Fuel Prices para España.
- **Recarga en España**: REVE de Red Eléctrica informa ubicación, conectores, estado y precio de puntos públicos; actualmente se ha confirmado que la app los presenta, **NO** que ofrezca API pública reutilizable. Solicitar autorización/datos por vía oficial o encontrar fuentes con licencia verificable. No scrapear el mapa sin revisión legal.

## Funciones de aplicación a preparar
1. En mapa: filtro gasolineras, precio por litro, nombre, tipo combustible, horario y última actualización (si fuente disponible).
2. En mapa: cargadores EV por tipo de conector (CCS2/Type2/etc), potencia, horario, pago/acceso, disponibilidad y precio (si disponible de fuente autorizada).
3. En ruta: desvío adicional, tiempo, precio estimado por coste de viaje `€/litro` o `€/kWh`, condicionados a vehículo, consumo, tarifa y condiciones.
4. Alertar de coste desconocido, estación fuera de servicio o precio desactualizado. No confundir `sin datos` con gratuito/disponible.
5. Cada elemento debe indicar la fuente, timestamp, precisión/cobertura y calidad. Explicitar que el precio en el punto de venta puede variar.
6. Integrar precios y estaciones como datos operativos en panel de ruta familiar, no como un tercer mapa separado.

## Plan de credenciales
- Portal correcto: https://my.tomtom.com/ → **Keys** → **API & SDK Keys**; cuenta autenticada en `docs.tomtom.com` no equivale a estar en el dashboard de claves.
- Puede haber clave inicial `My first API key`; crear `BAYMOVE-G3000-DEV` separada si el plan permite. Verificar catálogo de **Products** asignados a la key y sus límites reales. No seleccionar productos licenciados a los que aún no se tenga acceso.
- Secreto del backend `TOMTOM_API_KEY` en Google Cloud Secret Manager (G3000). El valor no debe mostrarse en capturas ni chats.
- Nada de pagos/contratos adicionales antes de contrastar alternativa MITECO/REVE y límites de facturación.

## Verificaciones pendientes
- [ ] Cuenta TomTom visible en `my.tomtom.com`, con productos habilitados y términos/plan verificados.
- [ ] Key de desarrollo creada y guardada sin compartir valor.
- [ ] Adaptador Orbis para routing/traffic diseñado con compatibilidad de coordenadas y condiciones de licencia en Google Maps.
- [ ] Prueba real de consulta a rutas/tráfico con Madrid/Barcelona y gestión de cuota.
- [ ] Prueba oficial del REST de precios de combustible español, lat/lon y timestamp.
- [ ] Confirmación escrita de condiciones de reutilización/consulta de datos REVE, EV puntos y tarifas.
- [ ] Campo precio EV ausente muestra `precio no disponible`; nunca `0 €`.
- [ ] No mostrar como activo ningún servicio sin prueba y autorización.

## Fuentes oficiales consultadas
- https://docs.tomtom.com/tomtom-orbis-maps/documentation/introduction
- https://docs.tomtom.com/platform/documentation/my-tomtom/how-to-get-a-tomtom-api-key
- https://docs.tomtom.com/fuel-prices-api/documentation/product-information/market-coverage
- https://docs.tomtom.com/fuel-prices-api/documentation/tomtom-orbis-maps/product-information/introduction
- https://docs.tomtom.com/ev-search-api/documentation/product-information/introduction
- https://docs.tomtom.com/ev-charging-stations-availability-api/documentation/tomtom-orbis-maps/product-information/introduction
- https://sede.serviciosmin.gob.es/es-es/datosabiertos/catalogo-datos/paginas/dataset.aspx?iddataset=12
- https://www.ree.es/es/transicion-ecologica/electrificacion/reve-puntos-de-recarga
