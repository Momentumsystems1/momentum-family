# Navigation

`app/navigate.tsx` + `backend/routers/providers.py` (autocomplete, nav-route, along-route, history). Flujo: historial (más cercano primero) → autocompletar (debounce 300 ms, sesgo por posición) → popup de número si falta → ruta con bandera → modos → paradas con nombre (waypoints) → POI en ruta → personas del grupo a <500 m de la polilínea → indicaciones de texto. Anti-congestión integrada (plan Basic/Pro).
