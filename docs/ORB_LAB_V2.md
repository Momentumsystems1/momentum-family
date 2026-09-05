# Sentinel Orb Lab V2 — Fake First

Purpose: isolate and refine the visual personality and physical behavior of the Sentinel Orb without touching production tool flows.

## Route

`/orb-lab`

## Design source

- `remix-3d-mind-map-visualizatio.zip` is the primary visual/behavior reference.
- `PARA GPT ORBE 1.docx` defines the current interaction corrections.

## Current lab rules

1. The map remains visible behind the Orb.
2. The normal map UI is intentionally not connected to production logic.
3. The closed Orb is a compressed visual core.
4. Opening the Orb reveals Parent tools without replacing the map.
5. Parent selection isolates that branch and reveals its Child tools.
6. `Expandir todo` opens the complete graph.
7. The top Parent navbar can isolate a branch directly.
8. In `Orbe` mode, gestures manipulate the 3D graph.
9. In `Mapa` mode, touches pass through to the map while the graph stays visible.
10. Links are curved and include moving energy particles.
11. Nodes are draggable and the camera supports rotation, pan and zoom.
12. Pressing a final Child tool never invokes production logic; it only opens a popup with `HERRAMIENTA`.
13. The search field is only a visual travel/personality test in the lab; it is not a real geocoder yet.

## Architecture

`frontend/app/orb-lab.tsx`

→ `frontend/src/orb-lab/OrbPersonalityLab.tsx`

→ transparent Three.js/WebGL scene inside a local WebView over `MapCanvas`

→ React Native bridge receives only visual-lab state/tool events.

The production `frontend/src/orb/*` implementation is not modified by this lab.

## Acceptance before production integration

Do not reconnect the lab Orb to Sentinel production tools until the following are accepted visually:

- closed-core identity
- depth and lighting
- Parent composition
- Child composition
- link design
- moving particles
- node spacing / no overlap
- node drag behavior
- camera rotation
- zoom
- map/orb interaction switch
- expand-all behavior
- collapse behavior
- branch isolation
- transition rhythm
- overall Sentinel personality
