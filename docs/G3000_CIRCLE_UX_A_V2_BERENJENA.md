# BAYMOVE G3000 — Flujo UX A v2: Circle Experience (berenjena y blanco)
**Fecha:** 14 octubre 2026. **Estado:** propuesta visual + prototipo HTML local, pendiente de valoración; no sustituye la aplicación nativa ni publica datos.
**Decisión de producto:** reducir pasos, usar blanco dominante, identidad berenjena, pequeños acentos púrpura/fucsia, sin vídeo o gráficos pesados.

## Flujo propuesto para la persona que crea
1. **Despertar (00)**. Un solo núcleo berenjena parpadea suavemente sobre una escena blanca. Toque → onda de ~800 ms, sin efectos 3D. Botón alternativo visible para accesibilidad.
2. **Nombrar (01)**. Escribir nombre del círculo directamente. Se previsualiza en el núcleo, sin crear datos en servidor ni pedir localización.
3. **Dimensionar (02)**. Seleccionar de 1 a 8 **plazas de invitados**, sin incluir al creador en la numeración. Los nodos 01–08 emergen en gris sobre la órbita. Se mueven lentamente, pero los números siempre permanecen verticales y legibles. Si luego aumentamos capacidad, usar una segunda órbita o vista alternativa para no saturar.
4. **Elegir propósito (03)**: **Base** (relaciones estables) o **Flash** (expiración obligatoria 2/24/72 horas en prototipo). Un círculo Base también puede tener invitados temporales con permisos caducables sin que todo el círculo expire.
5. **Configurar invitaciones (04)**. Tocar plaza numerada detiene la órbita para facilitar selección. Elegir contacto del teléfono con permiso explícito, o alias/enlace manual; configurar rol y permisos propuestos por separado. Guardar crea **borrador de invitación** (nodo continúa gris con pequeño indicador), no la envía. Canales futuros: compartir enlace/WhatsApp/SMS/QR, con estado de apertura, envío y entrega si puede verificarse.
6. **Revisar (05)**. Resumen nombre/tipo/plazas/borradores. Confirmar la creación REAL del círculo en backend solo cuando la persona lo autorice; mostrar errores de red sin datos ficticios. Si se comparten enlaces, permanecerán «pendientes» hasta aceptación.

## Experiencia de quien recibe
- Abrir invitación (app o web para sesiones Flash); ver círculo, rol propuesto, vigencia y permisos **antes** de aceptar.
- Aceptar pertenencia no activa automáticamente compartir ubicación. Cada permiso requiere consentimiento independiente, informado y revocable.
- Elegir color y foto/avatar propio. Solo tras aceptar, el nodo gris pasa a avatar/color elegido, con una microanimación y sin rotación del texto.
- El creador no elige el color/foto de otra persona. Caducidad/revocación en servidor, no solo CSS.

## Identidad visual provisional
- **Blanco dominante:** `#FFFFFF`; fondo blanco cálido: `#FAF9FC`.
- **Berenjena identitario:** `#512447`; berenjena profundo `#35132C`.
- **Púrpura de acento:** `#8A4B95`; **fucsia breve:** `#D63794`.
- Gris de plazas vacías `#EBE7ED` / `#D5CEDA`, textos `#302436`.
- Acentos contenidos en núcleo, botón principal, foco/estados activos. No asignar colores llamativos a plazas vacías.
- Nada de gradientes multicolor en cada nodo; futuro tema claro como referencia principal.
- Animación geométrica CSS/React Native Reanimated de bajo coste; pausar al configurar invitación, fuera de pantalla y ante «reducir movimiento».

## Contactos e identificación de usuarios BAYMOVE
- Para «Elegir contacto», usar selector nativo del sistema **solo después de una acción voluntaria**, con permiso limitado donde la plataforma permita. Proporcionar alternativa manual completa si se deniega.
- La agenda del teléfono **no revela qué aplicaciones tienen instaladas otras personas**. «Ya está en BAYMOVE» requiere *descubrimiento de cuenta* propio, autorizado por las personas a las que se localiza. Nunca fingir que el sistema operativo sabe que un tercero tiene BAYMOVE.
- Diseño con usuarios registrados de muestra sólo en prototipo. Producción: ofrecer buscar por identificador/código/usuario de forma explícita y opt-in como primera opción. Contact matching, si se implementa, requiere análisis RGPD/privacidad, rate limit, mecanismos anti-enumeración y privacidad resistente a ataques de diccionario; **SHA-256 de teléfonos por sí solo no anonimiza ni evita ataques**. No subir la agenda en bloque ni mostrar cuentas de quienes han desactivado descubrimiento.
- Invitado sin app: enlace limitado, con caducidad y consentimiento. La experiencia web Flash podrá participar cuando esté desarrollada; la web no asegura GPS continuo en segundo plano.

## Estados visuales sin engaño
| Estado | Nodo | Mensaje |
|---|---|---|
| Plaza vacía | Gris, número grande | Aún no se ha elegido a nadie |
| Borrador | Gris + punto fucsia | Invitación preparada, sin enviar |
| Compartido | Gris + indicador | Canal de compartir abierto; entrega por verificar |
| Aceptado | Avatar/color elegidos por receptor | Miembro confirmado |
| Rechazado/caducado | Gris y motivo en ficha | Sin acceso |
| Invitación aceptada sin permiso GPS | Avatar, sin ubicación | Ubicación no compartida |

## Prototipo A v2
Archivo local de referencia: `BAYMOVE_Circle_Experience_02.html` entregado en la conversación. Archivo HTML autónomo de ~27 KB; **no es build de la app**. Tiene contactos ficticios explícitos, colores de aceptación simulados y no puede leer contactos, enviar invitaciones, acceder a mapas ni a un servidor.
Prueba realizada en Chromium automatizado: 1440px y 390px, 00→05, selección Flash y duración, cinco plazas, contacto simulado, permiso de check-in, guardar borrador, simular aceptación. Sin excepciones JavaScript ni desbordamiento horizontal.

## No modificar todavía en producción
La UI real `frontend/app/onboarding/group.tsx` crea automáticamente un círculo al entrar, y la vista `OrbitalField` representa miembros existentes. Se necesitará desacoplar **plazas/borradores** de **miembros aceptados** antes de desplegar la nueva experiencia. Conservar backend validado, permisos revocables y tests de dos cuentas. Probar «reduced motion» y pantallas pequeñas.

## Criterio de aprobación para pasar a implementación
Tras revisar el prototipo, confirmar (a) paleta; (b) velocidad/pausa de órbita; (c) 1–8 plazas y núcleo propietario; (d) invitaciones sin enviar por defecto; (e) Base/Flash y permisos; (f) legibilidad y tiempo de configuración.
