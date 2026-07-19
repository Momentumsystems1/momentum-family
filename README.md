# Momentum Family

Nueva base controlada de Momentum Family: movilidad, tranquilidad y seguridad para toda la familia.

## Estado actual

- Navegación principal funcional.
- Familia y fichas con datos simulados.
- Pantallas de mapa, alertas y ajustes.
- Cliente Supabase preparado pero desactivado mientras falten variables.
- Modelo SQL inicial con RLS.
- Azure Maps desacoplado mediante `MapProvider`; todavía no realiza llamadas ni genera consumo.

## Arranque local

Requisitos: Node.js LTS y la aplicación Expo Go, o un emulador.

```bash
npm install
cp .env.example .env
npm start
```

Escanea el QR con Expo Go. En Windows también puedes pulsar `w` para abrir la vista web.

## Variables

Completa solamente cuando llegue la fase de conexión:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_AZURE_MAPS_TOKEN_ENDPOINT=
EXPO_PUBLIC_AZURE_MAPS_CLIENT_ID=
```

No añadas claves `service_role`, contraseñas de base de datos ni claves compartidas de Azure Maps.

## Base de datos

Ejecuta `supabase/migrations/0001_initial_schema.sql` en un proyecto Supabase nuevo cuando se inicie el segundo hito.

## Próximo trabajo

Conectar registro/inicio de sesión, perfil y creación de familia sin modificar todavía Azure Maps.
