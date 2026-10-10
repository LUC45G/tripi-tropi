# 05: Encolar la implementación de un ticket en Codex
Status: ready-for-agent
Execution: in-progress
Labels: codex, integration
Blocked by: 03
Commits: none

## Estado inicial

### Qué construir

Queue implementation envía una orden a la sesión vinculada para implementar un ticket listo, sin interrumpir el turno activo ni escribir tickets desde el visor.

### Atomicidad

Todas las dependencias declaradas deben estar completadas antes de empezar. Este ticket entrega una capacidad verificable sin intercalar trabajo de otro ticket. Si aparece una dependencia parcial, revisar y dividir el alcance antes de implementarlo.

### Criterios de aceptación

- [x] Vincular destino mediante --thread o CODEX_THREAD_ID heredado; mostrarlo y deshabilitar el envío sin sesión vinculada.
- [x] Ofrecer Queue implementation solo para Ready to implement aprobado como ready-for-agent; no enviar ready-for-human.
- [x] Ejecutar codex queue con argumentos separados, sin shell, sin crear otra sesión ni cambiar permisos de la existente.
- [x] Revalidar ticket y dependencias al enviar; generar en servidor orden con repo/ruta y obligación de releer reglas, atomicidad y dependencias antes de ejecutar.
- [x] Ordenar al agente detener la implementación si ya no está listo o requiere trabajo intercalado; respetar al menos un commit por ticket y actualizar Commits.
- [x] Mostrar Sending, Queued y error; Queued no equivale a iniciado ni completado; prevenir duplicados sin reintentos automáticos.
- [x] Proteger envío con origen y token de sesión; aceptar identificadores de ticket, no comandos arbitrarios del navegador.
- [x] No editar archivos, estados ni hashes al encolar; el visor refleja únicamente los cambios posteriores escritos por el agente.
- [x] Probar adaptador simulado y una orden inocua en sesión de prueba explícitamente vinculada; verificar no interrupción y ausencia de escrituras del visor.

## Trabajo realizado

Se agregó vinculación mediante --thread o CODEX_THREAD_ID, visible en la interfaz, con bloqueo de reutilización si cambia el destino. Queue implementation aparece solo para Ready to implement con triage ready-for-agent y queda deshabilitado sin sesión.

El endpoint acepta únicamente un identificador de ticket y requiere origen exacto más token de sesión. Relee tickets/dependencias desde disco y genera la orden en servidor. El adaptador ejecuta codex queue con argumentos separados y shell deshabilitado, sin crear sesiones ni cambiar permisos. La orden exige releer reglas, readiness, atomicidad y dependencias, verificar el trabajo y registrar commits reales.

Sending, Queued y Error son estados de entrega independientes de Execution. Un registro persistente fuera del repositorio evita duplicados, incluso tras recarga/reinicio, y no se realizan reintentos automáticos ante entrega incierta. El visor no escribe tickets; los cambios de ejecución siguen llegando exclusivamente desde los archivos escritos por el agente.

Verificación: 23 pruebas Node/Edge pasan. Nuevas pruebas cubren argumentos sin shell, errores del adaptador, triage humano, dependencias pendientes, revalidación ante cambio externo, requests concurrentes, persistencia de duplicados, origen/token, comandos extra rechazados, ausencia de escrituras y estados visibles en navegador. Skill válida y siete tickets sin errores ni advertencias.

Prueba real autorizada por el usuario: codex queue aceptó una orden inocua dirigida a 01a12348-9f5d-77b1-b21e-859ee41ac728, solicitando solo confirmación cuando terminara el turno activo y prohibiendo herramientas, archivos, commits e implementación. El proceso terminó correctamente y este turno continuó trabajando sin interrupción. La respuesta del siguiente turno queda separada de la confirmación de entrega.

## Estado posterior

Implementación verificada; pendiente registrar hash real y cierre. La entrega depende de codex queue disponible en PATH y una sesión válida. Las entregas fallidas o inciertas requieren revisar manualmente la sesión antes de volver a enviar; la UI no reintenta. El ticket 06 queda listo al cerrar 05. Los ajustes adicionales del 07 se harán después, en otro commit.

