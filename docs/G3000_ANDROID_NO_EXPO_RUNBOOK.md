# BAYMOVE — compilar Android sin Expo EAS (contingencia)
**Fecha:** 2026-10-14. **Rama:** `recovery/my-cluster-core-20261013`.
**Autorización:** compilación técnica privada, sin publicación en tiendas ni cambios en `main`.
**Estado:** workflow creado; no dar por superada la compilación nativa ni la instalación hasta que GitHub Actions complete correctamente.

## Contexto
- El proyecto Expo histórico de `dctinvent.com` tiene ID `23176eaf-b779-4840-8f1e-f7f7e6d5d9fe`.
- La organización Expo visible en el segundo ordenador (`momentumsystems-team`) contiene **otro** `sentinel-family` (ID `adb3ceea-e116-4fd1-a56f-da3a01b3f410`).
- No se deben confundir, vincular ni migrar por nombre de slug. Ninguna credencial Expo debe compartirse por chat.
- El flujo de contingencia usa el repositorio GitHub y **no requiere cuenta Expo, Expo Go, EAS, ni la CLI `eas`**.

## Compilación reproducible
Archivo: `.github/workflows/baymove-android-native.yml`.
Secuencia: checkout rama → Node 22 → Java 17 → Android SDK 36 → Yarn 1.22 con lockfile → `npx expo config` → `npx expo prebuild --clean --platform android --no-install` → Gradle `assembleDebug`.
No utiliza llaves G3000, TomTom, AEMET, NAP ni tokens privados. Es la **primera prueba nativa de compilación**, no una validación funcional.

### Protección
- El repositorio `Momentumsystems1/momentum-family` es público. Los artefactos GitHub Actions de repositorios públicos son accesibles a lectores del repositorio; por tanto **no se sube APK alguna** por defecto.
- El paso de subida está doblemente protegido: repositorio **privado** y ejecución `workflow_dispatch` con confirmación explícita.
- La APK debug convencional puede requerir un servidor **Metro** para descargar JavaScript. No confundir `assembleDebug` con un instalador autónomo apto para envío a terceros.
- La APK debug se firma con certificado de depuración del runner; el SHA-1 puede cambiar entre ejecuciones. **No restringir permanentemente Google Maps usando una huella efímera.**
- Antes de entregar una APK autónoma de prueba hay que compilar una variante que incluya el bundle JS (p.ej. `assembleRelease`), firmarla con **keystore estable no productivo** y distribuirla privadamente. Comprobar el SHA-1 real de ese certificado, restringir la clave de Android en Google Cloud (`com.momentumsystems.baymove` + SHA-1 + Maps SDK for Android) y evitar que se incluyan secretos de servidor en la APK.
- No subir llaves de firma al repositorio; mantenerlas fuera de la web pública en un gestor de secretos con controles IAM.

## Qué significa que el workflow pase
- Se pueden generar fuentes nativas y compilar la variante Android de BAYMOVE en CI sin Expo.
- **No implica** que Google Maps muestre teselas sin clave de Android, que GPS esté probado, que exista backend accesible, que la app funcione sin Metro o que el seguimiento de familia sea fiable.
- Validación pendiente: mapa 2D/3D, permiso GPS, pantalla bloqueada, dos usuarios, consentimiento, rutas y alertas (en móviles físicos).

## Pasos siguientes si el workflow compila
1. Decidir cómo distribuir la APK de forma privada; preferible repositorio/CI privado o entrega directa a dispositivo controlado.
2. Generar y custodiar keystore **estable de pruebas** y su SHA-1, nunca publicarlo.
3. Añadir `G3000_MAPS_ANDROID_API_KEY` exclusivamente como variable segura **de compilación**, con restricción Android paquete + SHA-1 en Google Cloud. La clave del servidor `G3000_MAPS_SERVER_API_KEY` no se instala en móvil.
4. Compilar un APK autónomo con JS incorporado y firma estable, descargar de entorno privado e instalar.
5. Comprobar que el backend de pruebas es accesible desde el móvil (no `localhost` del propio teléfono).
6. Si regresa acceso a Expo, EAS sigue siendo opción alternativa; no está bloqueada ni es requisito.

## Referencias
- https://docs.expo.dev/guides/adopting-prebuild/
- https://reactnative.dev/docs/signed-apk-android
- https://docs.github.com/en/rest/actions/artifacts
- https://docs.expo.dev/versions/latest/sdk/map-view/
