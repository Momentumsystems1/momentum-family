# BAYMOVE — Circle Express v03 · decisión UX propuesta

Fecha: 2026-10-14. Prototipo HTML interactivo local entregado en la conversación. **No se ha cambiado el código de producción de la aplicación.**

## Identidad visual bloqueada para esta ronda
- Blanco predominante `#FFFFFF`.
- Rojo principal `#C91E32`.
- Rellenos / énfasis suave: rojo al 5 % `rgba(201,30,50,0.05)`.
- Tipografía de lectura en gris oscuro; estados pendientes en gris neutro. Sin púrpura, berenjena ni fucsia.

## Una pantalla para crear
1. El usuario introduce el nombre del círculo (único dato obligatorio).
2. «Base» viene preseleccionado. «Flash» es una alternativa con duración configurable, valor inicial 24 h.
3. Pulsa **Crear círculo**. Se confirma el círculo y se ofrece **+ Añadir personas**, sin bloquear por invitaciones.
4. No se pregunta previamente cuántas personas tendrá. Las plazas numeradas aparecen automáticamente cuando se seleccionan personas.
5. En «Añadir personas» se usa selección múltiple para preparar varias invitaciones a la vez. Las invitaciones se mantienen grises hasta que la persona realmente acepte, escoja su color/foto y sus permisos.
6. Los números de cada nodo orbital conservan posición vertical durante el movimiento. La órbita se detiene mientras se abre el selector.

**Clics estimados:** Base = nombre + 1 clic. Flash = nombre + seleccionar Flash + 1 clic (sin cambiar duración). Selección múltiple: N toques de contacto + un clic para preparar N invitaciones.

## Veracidad / privacidad
- La demo HTML utiliza contactos ficticios y no hace peticiones a red.
- Preparar invitación no significa enviarla, entregarla ni aceptarla.
- Una cuenta existente BAYMOVE solo se puede identificar mediante descubrimiento opt-in con protección contra enumeración: nunca por lectura de las aplicaciones instaladas en teléfonos ajenos; no subir agendas completas por defecto.
- Los permisos de ubicación son independientes, desactivados por defecto y requieren consentimiento receptor. La primera pantalla de creación no solicita GPS.
- «Flash» en el prototipo solo representa una duración, aún no crea revocación ni sesión web real.
- La app nativa necesitará `POST /groups` **tras** el clic Crear y no al montar la pantalla como ocurre hoy; esta transición debe preservar la prueba de integración MongoDB y gestionar errores de red.

## Estado y siguiente paso
El archivo `BAYMOVE_Creacion_Express_03.html` está en los artefactos locales de la conversación, **no publicado en GitHub Pages**. Probado en Chromium a 1440px y 390px (Base, Flash, selección múltiple, reinicio, sin errores JavaScript ni overflow horizontal). Tras aprobación visual, integrar el nuevo flujo en una rama protegida de la UI nativa y probar de nuevo con backend MongoDB desechable; no tocar `main` ni exponer claves.
