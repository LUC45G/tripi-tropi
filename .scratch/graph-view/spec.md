# Graph view

## Objetivo

Explorar las dependencias de los tickets en una vista alternativa a la lista y programar la implementación secuencial de un componente mediante una única instrucción al agente. Diseño confirmado por el usuario; esta feature está pendiente de implementación.

## Vista y alcance

- `List / Graph` alterna el contenido del panel central. Se conservan sidebar de features, splitters y detalle derecho.
- Cada nodo representa un ticket de la feature seleccionada. El número aparece en el centro; hover muestra nombre, estado y labels. Click abre el detalle Markdown existente.
- Las aristas siguen el flujo de trabajo: **bloqueante → dependiente**. Si 02 depende de 01, se dibuja `01 → 02`.
- Una dependencia de otra feature se representa solamente con una punta de flecha entrando al nodo dependiente: sin nodo externo ni nombre externo en el lienzo. El detalle mantiene la identificación y navegación del bloqueante. Esta marca no conecta componentes locales entre sí.
- El borde usa el color de la primera label declarada en `Labels:`, excluyendo el triage que el visor agrega a sus labels. Sin label explícita, borde neutro. Fondo/centro usa el color del estado existente; número y foco deben conservar contraste.
- Estados, aprobación y ejecución se reutilizan del modelo actual: no se infieren exclusivamente de las aristas. Ciclos y referencias inválidas tienen señal de error adicional y explicación accesible; no se inventan destinos para referencias inválidas.
- Los filtros mantienen todos los nodos y conexiones, atenuando los tickets que no coinciden. No cambian la composición del conjunto que se programa.

## Exploración del espacio

- Panel delimitado por el layout actual; el contenido queda recortado dentro del panel y admite pan y zoom.
- Layout automático inicial, nodos arrastrables, control para encuadrar y acción de reorganización automática.
- Posiciones y vista del grafo se guardan en el navegador por repositorio y feature; no se escriben archivos ni coordenadas en tickets.
- Las actualizaciones en vivo conservan posiciones de nodos existentes y contexto de lectura; altas, bajas y cambios de dependencias se reflejan sin reorganizar todo innecesariamente.
- `Isolate component` muestra el componente del nodo seleccionado; `Show all` restaura la feature. Se usa conexión débil: se ignora la dirección de las aristas locales para calcular pertenencia, incluyendo tickets completados que conectan el conjunto.
- Un componente fuertemente conexo de varios nodos es un ciclo, no una unidad ejecutable. Los ciclos impiden programar el conjunto.
- Se mantiene accesibilidad de controles, selección de tickets y contenido; los atajos globales de teclado siguen fuera de alcance.

## Programación de un componente

1. El usuario aísla un componente y solicita programarlo. Se presenta el conjunto y su orden; los filtros visuales no recortan sus integrantes.
2. El servidor vuelve a leer el componente y sus dependencias desde disco. Todos los tickets no completados deben tener Execution pending, aprobación ready-for-agent, estructura válida y atomicidad. Tickets reclamados, en progreso, descartados sin satisfacer una dependencia, referencias inválidas y ciclos no se omiten para forzar un envío.
3. El orden es topológico dentro del componente. Entre candidatos disponibles se desempata por número ascendente. Los completados se conservan como contexto y se omiten del trabajo; no hay envío si no queda trabajo.
4. Se permite incluir un sucesor bloqueado por un predecesor pendiente del mismo conjunto. Esta regla pertenece al flujo de conjuntos; el envío individual sigue requiriendo todas sus dependencias completadas.
5. Si alguna dependencia externa válida está pendiente, advertir antes del envío: `This ticket has an external dependency. The implementation flow will pause before completing the full set. Continue?`. Mostrar los tickets afectados y sus dependencias. Ofrecer cancelar para resolverlas antes o confirmar para continuar hasta la pausa. Nunca incluir automáticamente trabajo de otra feature.
6. Confirmar el riesgo no convierte un ticket en elegible ni satisface su dependencia. El servidor valida otra vez al enviar; si cambió el conjunto, el orden, la elegibilidad o las dependencias relevantes desde la revisión, se exige revisar el plan actualizado. No se acepta autorización implícita por tiempo transcurrido.
7. Una única instrucción a la sesión Codex vinculada enumera el conjunto y el orden. El agente implementa un ticket por vez, vuelve a leer el ticket y TODAS sus dependencias antes de empezar, valida y cumple AGENTS.md y la guía de escritura. El plan no autoriza cambios de permisos.
8. Antes de cada ticket, sus dependencias deben estar completadas. Al encontrar la primera dependencia externa aún pendiente, el agente pausa toda la secuencia antes de reclamar ese ticket; no salta a otra rama para evitar la pausa. Si la dependencia se resolvió mientras tanto, la revalidación permite continuar. Cualquier otro cambio de elegibilidad, fallo de verificación o atomicidad impide avanzar hasta resolverlo.
9. Las dudas que aparezcan durante el trabajo se consultan en la CLI del agente. El viewer no recibe respuestas ni mantiene un scheduler. Si la sesión permite preguntas interactivas, el agente espera la respuesta; no adivina ni continúa sin ella.
10. Cada ticket implementado mantiene al menos un commit de implementación propio, hashes reales abreviados y un commit posterior de registro; nunca mezclar tickets ni inventar hashes. No hacer push sin autorización explícita.
11. Reanudar exige una acción manual que construye un plan nuevo desde disco y omite los completados. No hay reanudación automática ni reintento automático de entregas fallidas o inciertas. La protección contra duplicados y solapamientos debe permitir esta reanudación legítima sin reenviar tickets aún pendientes con una entrega previa sin resolver.

## Solo lectura y entrega

El viewer nunca modifica tickets: solamente preferencias del navegador y registros de entrega fuera del repo, como en el flujo actual. `Sending`, `Queued` y errores describen entrega, no ejecución. El agente mantiene los tickets y commits al implementar. El trabajo encolado continúa aunque se cierre el viewer; no interrumpe el turno activo.

Se conserva el flujo individual actual. La programación automática de conjuntos tiene como destino Codex; se ofrece también copiar la misma instrucción para pegarla manualmente en otro agente, sin afirmar integración con su cola ni registrar un envío al copiar.

## Plan de tickets

| Ticket | Resultado completo | Dependencias |
| --- | --- | --- |
| [01](issues/01-vista-grafo-dependencias.md) | Vista alternativa navegable y actualizada del grafo | Ninguna |
| [02](issues/02-exploracion-aislamiento-persistencia.md) | Exploración espacial persistente y aislamiento de componentes | 01 |
| [03](issues/03-programar-conjuntos-en-agente.md) | Servicio validado de planificación, mensaje y entrega de conjuntos | Ninguna |
| [04](issues/04-controles-programacion-componentes.md) | Flujo UI completo de revisión, advertencia, envío y reanudación | 02, 03 |

## Verificación y límites

Cada ticket incluye pruebas de su resultado. Reutilizar fixtures temporales, servidor HTTP, Playwright y dobles de entrega existentes; no enviar implementaciones reales como parte de tests automáticos. Distinguir pruebas de instrucciones generadas de ejecución efectiva por un agente. Actualizar el catálogo de tests cuando cambien las pruebas.

No incluye edición de tickets, cambios de formato Markdown, paralelismo entre implementaciones, ejecución de dependencias externas, scheduler persistente, colas nativas de otros agentes ni publicación de una release. No se cambia la versión en esta planificación.
