# 03: Planificar y entregar una secuencia validada de tickets al agente
Status: ready-for-agent
Execution: in-progress
Labels: graph-view, backend
Blocked by: none
Commits: none
Verbosity: 1

## Estado inicial

### Qué construir

Entregar un servicio HTTP completo para revisar un componente, obtener su instrucción copiable y encolarla una sola vez en Codex. Debe funcionar mediante API y tests sin depender de la vista Graph: el servidor resuelve el componente desde un identificador de ticket y los archivos actuales, nunca confía en una lista u orden arbitrarios del cliente. Contrato de comportamiento en [la especificación](../spec.md), sección Programación de un componente.

Reutilizar `skills/tripi-tropi/scripts/{queue.mjs,server.mjs,tickets.mjs,ticket-states.mjs}`, autenticación, lectura estricta, resolución de sesión UUID y ledger existentes. Mantener seguridad, límites de cuerpos y funcionamiento del envío individual. Documentar el contrato de revisión/confirmación que consumirá 04; no implementar todavía sus controles visuales.

### Atomicidad

El servicio acepta un ticket raíz y descubre su componente desde disco, por lo que se puede construir y verificar independientemente de 01/02. Entrega planificación, mensaje, autenticación y protección de entrega completos; 04 solo conecta una interfaz a este contrato terminado.

### Criterios de aceptación

- [x] El servidor calcula el componente débil de la feature, valida sus tickets y dependencias transitivas y produce un orden topológico determinista, con desempate por número. Conserva completados como contexto y los omite del trabajo; rechaza conjuntos sin trabajo.
- [x] Cada ticket no completado debe estar pending, ready-for-agent, estructuralmente válido y sin reclamación. Se rechazan ciclos, referencias inválidas y otras causas de inelegibilidad; se permiten predecesores pendientes incluidos en el plan sin relajar el endpoint individual. La instrucción exige revisar atomicidad antes de comenzar cada ticket.
- [x] Las dependencias externas válidas pendientes se incluyen como advertencias identificables. Sin confirmación explícita del plan revisado no se encola; cancelar no tiene efectos. Relectura antes del envío rechaza planes relevantes modificados y exige nueva revisión; el cliente no puede falsificar pertenencia, orden, aprobación ni ausencia de bloqueantes.
- [x] Una sola instrucción enumera rutas, orden y dependencias; exige relectura y validación antes de cada ticket, ejecución secuencial, pausa total antes de la primera dependencia externa aún pendiente, preguntas en la CLI ante dudas, y parada ante cambios/fallos. No implementa dependencias externas ni interrumpe el turno activo; no requiere que el viewer permanezca abierto.
- [x] La instrucción mantiene guía/AGENTS.md, permisos originales, commits propios por ticket y registro posterior con hashes reales, sin push implícito. Copiar genera esa misma instrucción validada sin enviar ni registrar una entrega; no garantiza ejecución por otro agente.
- [x] Reutiliza sesión vinculada y registra Sending/Queued/Error fuera del repo, sin atribuir ejecución a un recibo. Bloquea duplicados concurrentes, tras reinicio y solapamientos con envíos individuales o conjuntos pendientes de resolver; errores inciertos no se reintentan automáticamente. Una reanudación manual reconstruye pendientes desde disco y permite un plan nuevo tras completar la parte anterior, sin reenviar trabajo ya entregado sin resolver.
- [x] Los nuevos accesos HTTP exigen origen y token válidos, payload acotado y campos permitidos; no aceptan comandos ni cambios de permisos. Planificar/copiar/encolar no escribe tickets. Cambiar destino durante entrega mantiene la protección existente.
- [x] Tests unitarios e integración HTTP/archivos con entrega simulada cubren cadenas, ramas, desempate, ciclos, completados, ticket no aprobado/reclamado, dependencias externas, confirmación obsoleta, cuerpos Unicode/límites, concurrencia, reinicio, solapamientos y reanudación. Verifican texto de pausa/preguntas/commits y regresión del flujo individual; actualizar docs/testing.md y documentar que la ejecución real del agente no se prueba por simular entrega.

## Trabajo realizado

- Inicio: ticket pendiente y aprobado, sin dependencias; atomicidad revisada y validación estricta de graph-view sin errores ni advertencias.
- Servicio: plan desde disco, revisión firmada con secreto del servidor, copia/envío autenticados y reservas compartidas con el flujo individual; contrato en docs/component-queue-api.md.
- Reanudación: Queued no prueba pausa; se exige prefijo completado y confirmación humana explícita de pausa del flujo anterior. Error/Sending interrumpido no habilitan reintentos; solo lectura y ledger fuera del repo preservados.
- Verificación: `npm test` 65/65, 0 omitidos; ajuste final del texto para ejecutar al recibir la instrucción, `node --test tests/component-queue.test.mjs` 12/12. Catálogo 65/65 y validación estricta global 26 tickets sin errores/advertencias.
- Runtime: viewer reiniciado en http://127.0.0.1:65005, revisión real por API devuelve 200 sin copiar/encolar. No se probó ejecución, pausa ni preguntas de un agente real; entrega simulada en tests. UI de conjuntos sigue fuera de 03.

## Estado posterior

Pendiente.
