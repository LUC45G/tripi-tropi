# API de planificación de componentes

Servicio de graph-view 03, utilizado por los controles visuales de 04. En el grafo, aislar el componente y elegir `Review component` abre la revisión accesible con orden, completados, advertencias y confirmaciones. Una solicitud entrega **una instrucción secuencial al agente**; no crea un scheduler en el viewer ni implementa tickets por sí misma.

La UI invalida revisiones y limpia confirmaciones si cambian los tickets relevantes o el contexto de feature, filtros, aislamiento o destino. No revisa ni reenvía automáticamente: se usa `Review again`. `Cancel`/Escape cierran una revisión sin enviar; una entrega ya iniciada continúa si se cierra el diálogo o el viewer.

## Autenticación y entradas

Todas las rutas siguientes son POST al origen loopback del viewer y requieren:

- `Origin`: origen exacto del viewer, por ejemplo `http://127.0.0.1:<port>`.
- `Content-Type: application/json`.
- `X-Queue-Token`: `token` obtenido de `GET /api/queue`.
- Cuerpo JSON de hasta 4096 bytes UTF-8; los caracteres divididos entre chunks se decodifican correctamente.

`ticket` es el identificador del snapshot, por ejemplo `graph-view/03-programar-conjuntos-en-agente.md`, no una ruta arbitraria. El servidor descubre el componente completo de esa feature, incluyendo tickets completados y los ocultos/atenuados por filtros. No acepta listas, orden, instrucciones, permisos ni parámetros adicionales del cliente.

## 1. Revisar: POST /api/component-plan

```json
{ "ticket": "demo/01-task.md" }
```

Devuelve 200 con:

| Campo | Significado |
| --- | --- |
| `plan.feature` | Feature del componente local. |
| `plan.component` | Integrantes completos: `id`, `number`, `title`, `state`. |
| `plan.completed` | IDs completados que se mantienen como contexto. |
| `plan.order` | Trabajo pendiente ordenado; cada entrada incluye identificación, estado, ruta relativa `file` y `dependencies`. |
| `plan.warnings` | Dependencias externas aún pendientes: ticket afectado, ID del bloqueante, feature, número, título y estado. |
| `plan.pauseBefore` | Primer ticket ante el cual se pausaría si su dependencia externa sigue pendiente; null si no hay advertencias. |
| `reviewToken` | Firma opaca de la revisión, necesaria para copiar o enviar. |
| `conflicts` | Reservas previas sobre trabajo pendiente: `ticket`, `status`, `batch`, `resumable`. |
| `requiresPausedConfirmation` | Todos los conflictos permiten una reanudación manual, pero el usuario todavía debe confirmar que el agente anterior se detuvo. |

Los pendientes deben tener Execution pending, aprobación ready-for-agent y formato válido. Se revisa la estructura de todas las dependencias transitivas; ciclos, referencias inválidas, dependencias descartadas y tickets completados con prerrequisitos incompletos se rechazan. El servidor verifica estructura, no comprende por sí mismo la atomicidad semántica: la instrucción exige al agente revisarla antes de cada ticket.

El orden topológico considera los pendientes; completados ya satisfacen sus aristas. Entre candidatos disponibles gana el número menor. Los bloqueantes pendientes incluidos en el conjunto no impiden planificarlo. Esto no modifica la regla más estricta del endpoint de envío individual.

Revisar no reserva trabajo ni escribe archivos. Un componente válido con reservas previas puede devolverse para inspección; copiar/enviar puede seguir bloqueado por sus conflictos.

## 2. Copiar o enviar el plan revisado

`POST /api/component-message` devuelve la instrucción sin entregarla ni modificar el ledger. `POST /api/component-queue` la entrega a la sesión Codex vinculada y reserva los tickets. Ambos aceptan exclusivamente:

```json
{
  "ticket": "demo/01-task.md",
  "reviewToken": "<64 hexadecimal characters returned by review>",
  "confirmExternal": true,
  "confirmPaused": false
}
```

Las confirmaciones son booleanos opcionales; omitirlas equivale a no confirmar. No se deben preseleccionar como consentimiento ni enviar por un refresco de datos.

- Si hay advertencias externas, mostrar los afectados y sus bloqueantes, pedir confirmación y enviar `confirmExternal: true` solo después de aceptarla. Texto acordado: `This ticket has an external dependency. The implementation flow will pause before completing the full set. Continue?`. Cancelar no llama al envío y no altera tickets ni reservas.
- Si `requiresPausedConfirmation` es true, pedir al usuario que verifique en la CLI que el flujo anterior está pausado y no retomará esos tickets. Solo esa confirmación permite `confirmPaused: true`. Resolver la dependencia o ver un commit no demuestra por sí mismo que el agente esté detenido.
- Si algún conflicto no es resumible, no ofrecer confirmación para forzarlo. Los intentos individuales anteriores, los conjuntos sin pausa externa registrada y las entregas Sending/Error conservan la protección contra duplicados.

Antes de copiar o enviar, el servidor relee desde disco y verifica la firma. Cambios en contenido completo de los tickets relevantes, pertenencia, dependencias transitivas, triage, destino o reservas relevantes invalidan la revisión. Cambios en tickets ajenos al componente y sus prerrequisitos no la invalidan. Una revisión también expira al reiniciar el viewer. Ante 409, revisar nuevamente y volver a solicitar las confirmaciones que correspondan; no reintentar automáticamente el envío.

Una copia exitosa devuelve `plan`, `reviewToken`, `conflicts`, `requiresPausedConfirmation` y `message`, con `code: 200`. No necesita sesión vinculada; cambiar el destino entre revisión y copia exige una revisión nueva. Copiar no marca como pausado un intento anterior, no reserva trabajo y no puede proteger contra envíos manuales realizados fuera del viewer.

Un envío exitoso devuelve `code: 200` y `record`, con `status: Queued`. No equivale a haber comenzado ni terminado la implementación. Sin sesión vinculada no se entrega. El mensaje copiado y el enviado se generan con las mismas reglas.

## Pausas, reservas y reanudación

La instrucción enumera rutas y dependencias, obliga a releer AGENTS.md, la guía, cada ticket y TODOS sus bloqueantes, y exige validar antes de empezar. Se implementa uno por vez con commits separados y hashes reales registrados después. Se pregunta al usuario en la CLI cuando falta información; no se modifican permisos ni se hace push implícito.

Ante el primer bloqueante externo todavía incompleto, el agente pausa todo el flujo antes de reclamar el ticket, sin saltar a otra rama ni implementar trabajo externo. Si el bloqueante ya se completó al releerlo, puede continuar tras validar. Los fallos o cambios de elegibilidad también impiden avanzar. Cerrar el viewer no cancela una instrucción ya entregada.

Las reservas se guardan fuera del repositorio, en el ledger existente por repo y UUID de sesión. `GET /api/queue` mantiene sus recibos por ID de ticket; los conjuntos agregan registros internos `@batch:<id>` con `tickets`, `pauseBefore` y estado. Todos los pendientes, incluyendo el tramo posterior a la pausa prevista, se reservan antes de invocar Codex para evitar solapamientos. La cola individual consulta las mismas reservas.

Para una reanudación manual:

1. Verificar que el agente anterior está pausado; resolver los bloqueantes externos cuando se quiera continuar el flujo completo.
2. Revisar el componente desde disco. Se omiten los completados, pero los demás deben seguir pendientes y aprobados.
3. El servicio solo habilita la confirmación de pausa si el recibo anterior es Queued/Paused, tenía una pausa externa prevista y todos los tickets anteriores a ese punto están completados. Esta comprobación no demuestra pausa efectiva: se necesita la confirmación humana explícita.
4. Tras confirmación y envío, el recibo de conjunto anterior queda Paused con referencia al nuevo intento; las reservas del trabajo restante apuntan al nuevo conjunto. No se borran el historial ni los recibos de completados.

Si el bloqueante externo sigue pendiente se requiere también `confirmExternal`; el agente volverá a pausar donde corresponda. No hay reanudaciones automáticas. Un Error o una entrega interrumpida nunca se convierten en resumibles por pasar estas confirmaciones; se debe comprobar lo ocurrido en la sesión y resolver cualquier envío manualmente fuera del viewer.

## Errores y pruebas

| HTTP | Caso |
| --- | --- |
| 400 | Payload, identificador o campos de confirmación inválidos; JSON ilegible. |
| 403 | Host/origen o token no permitidos. |
| 404 | Ticket raíz inexistente. |
| 409 | Inelegibilidad, falta de trabajo/sesión, revisión obsoleta, confirmación ausente o conflicto de entrega. |
| 413 | Cuerpo superior a 4096 bytes. |
| 415 | Content-Type distinto de JSON. |
| 502 | Fallo o incertidumbre al entregar/persistir el intento; sin reintento automático. |

Las pruebas de `tests/component-queue.test.mjs` usan archivos y HTTP reales con entrega simulada. Comprueban planificación, autenticación, revalidación, concurrencia, persistencia y texto de la instrucción. No demuestran que un agente real ejecute toda la secuencia, pause o formule preguntas correctamente; esa conducta se expresa como instrucciones y necesita validación con el agente real antes de afirmarla como observada.
