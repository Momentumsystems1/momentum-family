# BAYMOVE / G3000 — Circle Experience, Fase A (propuesta para revisión)
**14 octubre 2026 · No reemplaza la interfaz existente. No habilitar producción.**
**Estado:** especificación de UX + prototipo HTML autónomo de evaluación. La maqueta se conserva como archivo de revisión en la conversación, no se ha desplegado una web ni se ha cambiado `main`.

## Hipótesis
Formar un círculo debe sentirse como activar una red de personas de confianza, no crear una lista de contactos. La estética debe ser seria, reconocible y ligera: movimiento orbital lento, microinteracciones deliberadas, respuesta táctil y discreto halo mineral. Evitar neón arcoíris y efectos 3D/pantallas de carga que consuman batería.

## Flujo UX aprobado para prototipar
| Paso | Acción | Respuesta visual | Estado real previsto |
|------|--------|------------------|---------------------|
| 00 Activación | Tocar el núcleo parpadeante | Un pulso y onda expansiva; núcleo despierta | Solo interacción local |
| 01 Nombre | Introducir nombre | Texto se ancla en el núcleo | Borrador local hasta pulsar Guardar |
| 02 Plazas | Elegir número de invitados (no incluye al creador) | Nodos 01…NN nacen y orbitan lentamente | Plazas vacías, no miembros |
| 03 Propósito | Base o Flash, y duración Flash | Órbita conserva estructura; estado del núcleo cambia | Base = persistente, Flash = sesión/círculo con caducidad |
| 04 Invitaciones | Tocar nodo y elegir alias, rol, permisos | Nodo vacío pasa a «borrador preparado» | No se envía hasta compartir de forma explícita; destinatario debe aceptar |
| 05 Revisión | Ver nombre, tipo, capacidad, borradores | Animación de estabilización y resumen | Maqueta no crea círculo real |

**Conceptos que no deben confundirse:** plaza != invitación creada != invitación abierta en WhatsApp/SMS != entrega verificada != invitado aceptado != permiso de ubicación otorgado. Cada transición visible debe proceder de un evento real confirmado por servidor o sistema.

## Círculo Base y Círculo Flash
- **Base**: entidad persistente (familia, amigos, equipo) con miembros y roles; compartir ubicación no está implícito. Puede iniciar sesiones temporales Convoy o Meeting.
- **Flash**: red temporal asociada a un propósito (viaje, convoy, encuentro, cuidador); expiración obligatoria, acceso por enlace web previsto *después*, límite de permisos, revocación y aviso de expiración.
- **Decisión de arquitectura:** duración del círculo y duración del acceso de **cada invitado** son ejes independientes. El mismo círculo Base puede alojar una visita puntual. Una sesión Flash no debe conceder acceso retrospectivo a la ubicación o a otros círculos.
- **Capacidad**: primera maqueta admite 1–8 invitados en órbita 01. Más de 8 requiere órbita 02 o agrupación; no se deben solapar ni hacer inalcanzables nodos pequeños. Los límites definitivos vendrán de diseño de plan y permisos, no del prototipo.
- **Propietario**: ocupa núcleo, no se cuenta entre las «plazas de invitados» para evitar errores del tipo N vs N+1.

## Permisos por persona
- Base: pertenencia y recepción de check-in (opt-in, sujeto a elección del destinatario).
- Ubicación aproximada o precisa (excluyentes por defecto en la UI), ETA y estado, cada uno con consentimiento granular y revocación.
- Coordinación de Meetings y Convoy; no equivale a permiso de localización perpetua.
- Roles propuestos: Miembro, Administrador, Cuidador, Invitado, Conductor, Acompañante. Los roles definitivos deben mapearse a capacidades **autorizadas por backend**. Para menores y dependientes se necesita una revisión específica de consentimiento/tutela.
- Los permisos propuestos en una invitación son una solicitud, nunca una concesión sobre el dispositivo de otra persona.
- El receptor podrá unirse a la sesión Flash desde web con alcance y caducidad, **cuando se implemente**; la web no debe prometer seguimiento en background equivalente al nativo.

## Lenguaje de estados visuales
- **Vacío**: nodo numerado apagado, sin nombre; no hay invitación.
- **Borrador**: alias introducido; aún no hay enlace enviado.
- **Invitado**: enlace generado/canal abierto, **no «entregado»** sin confirmación de plataforma.
- **Aceptado**: avatar y color propios; aparición animada cuando llega confirmación del backend.
- **Suspendido, rechazado, caducado**: representar aparte; no eliminarlos silenciosamente.
- Selección de nodo pausa órbita para evitar pulsaciones accidentales. Preferir movimiento de ~120–150 segundos por vuelta, suspender fuera de pantalla y en «reduced motion».

## Dirección estética PROVISIONAL (fase B pendiente)
- Graphite abyss `#091218`, superficie `#111D25`, borde `#29404A`, texto `#EEF2EF`.
- Verde mineral iluminado `#9BE7D6` y latón cálido `#D5B889`, señal crítica `#EF9388` solo cuando corresponda.
- Glow monocromo sutil, sin saturar pantallas: foco lumínico en núcleo y nodo activo; navegación y formularios muy legibles.
- Prototipo HTML usa CSS, gradientes, capas y transformaciones sin dependencias ni imágenes. Peso comprobado ~29 KB en un archivo; **no equivale al tamaño de la futura app móvil**, que reutilizará `react-native-reanimated` y primitivas nativas existentes.

## Integración progresiva con repositorio existente
1. Congelar experiencia visual tras revisión del usuario. **No sustituir todavía `frontend/app/onboarding/group.tsx`**; tiene lógica de backend real validada con MongoDB.
2. Adaptar `frontend/src/components/OrbitalField.tsx` para plazas de invitación además de miembros reales; corregir concepto de estado y pausa interactiva.
3. Crear asistente `CreateCircleFlow` que almacene borradores en memoria y solo emita `POST /groups` al confirmar; actualmente `group.tsx` crea un grupo vacío al montar la pantalla, comportamiento a cambiar.
4. Backend: modelo de Flash con caducidad y accesos temporales por recurso; endpoint de creación atómica y TTL; **no confundir TTL de documento Mongo con revocación efectiva inmediata**.
5. Mantener `POST /groups/{id}/invitations` y consentimiento; adaptar roles/permisos con validación servidor y pruebas de rechazo entre círculos.
6. Aceptación invitación → transición de estado al recibir respuesta real, no por temporizador ni simulación.
7. Probar con lectores de pantalla, teclado, 320–430px, reduce motion y teléfono Android físico; medir uso CPU/batería antes de declarar estética final.

## Criterios de aceptación de la fase A
- [x] Prototipo HTML local realiza secuencia 00→05, incluido selector número, Base/Flash y ficha individual por plaza.
- [x] Prueba automatizada de navegador de escritorio y móvil: navegación, estado, permisos, resumen y ausencia de errores JavaScript; sin scroll horizontal en 390px.
- [x] El prototipo no transmite datos a ningún servidor, no recoge GPS ni envía invitaciones.
- [ ] Usuario revisa claridad, atractivo, pausar animación y legibilidad de nombres/permisos.
- [ ] Comparar 2–3 alternativas de composición cromática (fase B).
- [ ] Benchmark de aplicaciones del mercado después de la validación conceptual (fase C).

## Riesgos detectados en el código vigente
- `frontend/app/onboarding/group.tsx` crea un círculo automáticamente si el usuario no tiene ninguno: es incompatible con «nombre primero» y con consentimiento informado de creación.
- `OrbitalField` actual distribuye miembros alrededor de un núcleo; **no representa plazas vacías numeradas** ni Flash como tipo de círculo; no debemos reescribirlo sin tests.
- Cambio visual aislado podría degradar el flujo real; integrar con pruebas y flags de preview antes de reemplazar el onboarding.

## Alcance de esta entrega
**Sólo interfaz conceptual.** La construcción posterior de app nativa, sesiones Flash web, sistema de permisos ejecutables y envío de invitaciones requiere trabajo de backend, seguridad y QA distinto. No se ha modificado la aplicación real ni las credenciales G3000.
