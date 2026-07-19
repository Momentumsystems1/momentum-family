# Arquitectura inicial

## Principio

La aplicación empieza pequeña, comprobable y sin gasto variable. Los datos simulados permiten validar navegación y diseño antes de conectar servicios externos.

## Capas

- **Expo / React Native:** una única app para Android, iOS y vista web de desarrollo.
- **Supabase:** autenticación, PostgreSQL, fotografías, tiempo real y políticas RLS.
- **Azure Maps:** mapa, tráfico, incidencias, rutas y ETA. Se integrará mediante un token temporal servido por backend; la clave compartida no se incluirá en la aplicación.
- **GitHub:** fuente oficial del código.

## Módulos iniciales

- Familia
- Ficha del miembro
- Mapa
- Alertas
- Ajustes y permisos

## Hitos

1. Base visual y navegación con datos simulados.
2. Supabase Auth, perfiles y creación de familia.
3. Invitación y consentimiento mutuo.
4. Ubicación real en primer plano entre dos teléfonos.
5. Azure Maps con miembros, tráfico e incidencias.
6. Ubicación en segundo plano, SOS y notificaciones.
7. Lugares, rutas, V16 y analítica de movimiento.
