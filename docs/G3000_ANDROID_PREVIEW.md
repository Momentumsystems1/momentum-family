# BAYMOVE / G3000 — primera APK Android y mapa nativo

**Estado:** código preparado en la rama `recovery/my-cluster-core-20261013`; compilación Android y GPS nativo aún sin verificar.
**No publicar ni trasladar a `main` sin aprobación.**

## Qué se ha integrado
- Config dinámica de Expo mediante `frontend/app.config.js`: Google Maps para Android/iOS solo si la clave existe en el entorno de compilación, mediante el plugin oficial `react-native-maps`.
- `G3000_MAPS_ANDROID_API_KEY` y `G3000_MAPS_IOS_API_KEY` son variables **de compilación**, nunca escritas en Git.
- En Android el mapa base usa Google Maps; si falta su clave, BAYMOVE muestra un mensaje explícito en la interfaz (no simula que el mapa está operativo).
- En iOS se usa Google Maps cuando la clave está instalada. Sin ella se usa el mapa nativo de Apple de forma provisional.
- Cámara con pitch de 45 grados en modo 3D *perspectiva* (2,5D, no Maps 3D SDK), zoom y botón 2D/3D nativo. El modo 3D fotorrealista sigue en fase posterior.
- `frontend/eas.json` tiene perfil `preview` con salida Android APK de distribución interna.
- No hay claves reales, certificados, archivos de firma ni identificadores de Expo inventados en el repositorio.

## Orden correcto sin exponer API keys

### A. Vincular BAYMOVE con Expo Application Services (EAS)
1. Entrar con la cuenta correcta en [expo.dev](https://expo.dev/) y seleccionar o crear el proyecto BAYMOVE.
2. Desde un clon de esta rama, dentro de `frontend`, iniciar sesión con `npx eas-cli login` y vincular el proyecto con `npx eas-cli init` (requiere acceso autorizado). **No sobrescribir los identificadores iOS/Android de BAYMOVE.**
3. Para generar la primera firma Android sin exponer la clave aún, compilar con el perfil `preview` sin clave de Maps. Esa primera APK puede mostrar que el mapa no está configurado; su propósito es generar una firma verificable. Comando: `npx eas-cli build -p android --profile preview`.
4. Una vez generado el Android Keystore por EAS, obtener de las credenciales de EAS la huella SHA-1 **real**; no inventarla ni copiar SHA-1 de otro proyecto. Si se utilizará Google Play App Signing, registrar también su SHA-1 al preparar distribución.
5. En G3000 → la clave Android, fijar **Android apps** con `com.momentumsystems.baymove` y la huella SHA-1 real; API restriction = únicamente **Maps SDK for Android**.
6. Guardar `G3000_MAPS_ANDROID_API_KEY` como variable `sensitive` o `secret` del entorno `preview` en EAS. Para resolver `app.config.js`, se recomienda `sensitive` (enmascarada en logs; disponible en CLI); no usar una variable `EXPO_PUBLIC_*`. El SDK nativo **siempre incorpora la clave en el paquete**; su seguridad real viene de las restricciones de aplicación/API.
7. Volver a compilar APK `preview`. La nueva APK contendrá la clave nativa restringida. Verificar en móvil que se muestra el mapa, zoom, posición consentida y botón 2D/3D.

**Atención:** las claves en *GitHub Actions Secrets* NO están automáticamente disponibles para un build de EAS; habrá que cargar las variables también en EAS o establecer una entrega protegida entre ambos sistemas. No copiar el Secret Manager del servidor al dispositivo Android.

### B. iOS (más tarde)
- El bundle ID configurado es `com.momentumsystems.baymove`.
- La clave iOS debe estar limitada a **Maps SDK for iOS** y a ese bundle ID.
- Configurar `G3000_MAPS_IOS_API_KEY` en el entorno EAS correspondiente, nunca en el frontend JavaScript.
- Para una compilación instalable en iPhone real se necesitarán credenciales de firma iOS, habitualmente mediante Apple Developer. Antes de eso, la compilación Android puede validarse independientemente.

### C. Backend
- El prototipo de familia/usuarios requiere FastAPI + MongoDB; todavía no se ha verificado con una base de datos desplegada.
- El acceso al Secret Manager `G3000_MAPS_SERVER_API_KEY` es **exclusivamente de servidor**; no se debe poner en Expo, en EAS mobile, en URLs compartidas ni en código web.
- Air Quality, Pollen, Weather, Routes y Elevation se conectarán cuando exista backend autenticado seguro; las credenciales amplias de desarrollo no se consumirán desde una app pública.

## Comprobación objetiva (pendiente)
- [ ] Vinculación EAS y APK preview generada.
- [ ] SHA-1 obtenido del certificado que realmente firma la APK.
- [ ] Android Maps key restringida por API, paquete y SHA-1.
- [ ] APK recompilada con key y mapa visible en Android.
- [ ] Botón 2D/3D cambia la inclinación de cámara sin romper gestos.
- [ ] Usuario autoriza GPS y ve su ubicación real, sin posición inventada.
- [ ] Dos cuentas comparten posición de manera consentida con backend de prueba.
- [ ] App funciona y informa verazmente con servidor desconectado.

Referencias:
- https://github.com/react-native-maps/react-native-maps/blob/master/docs/installation.md
- https://docs.expo.dev/eas/environment-variables/
- https://docs.expo.dev/eas/environment-variables/faq/
- https://docs.expo.dev/build/eas-json/
- https://docs.expo.dev/versions/latest/sdk/maps/
