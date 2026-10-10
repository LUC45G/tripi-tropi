# 05: Encolar la implementación de un ticket en Codex
Status: ready-for-agent
Execution: pending
Labels: codex, integration
Blocked by: 03
Commits: none

## Estado inicial

### Qué construir

Queue implementation envía una orden a la sesión vinculada para implementar un ticket listo, sin interrumpir el turno activo ni escribir tickets desde el visor.

### Atomicidad

Todas las dependencias declaradas deben estar completadas antes de empezar. Este ticket entrega una capacidad verificable sin intercalar trabajo de otro ticket. Si aparece una dependencia parcial, revisar y dividir el alcance antes de implementarlo.

### Criterios de aceptación

- [ ] Vincular destino mediante --thread o CODEX_THREAD_ID heredado; mostrarlo y deshabilitar el envío sin sesión vinculada.
- [ ] Ofrecer Queue implementation solo para Ready to implement aprobado como ready-for-agent; no enviar ready-for-human.
- [ ] Ejecutar codex queue con argumentos separados, sin shell, sin crear otra sesión ni cambiar permisos de la existente.
- [ ] Revalidar ticket y dependencias al enviar; generar en servidor orden con repo/ruta y obligación de releer reglas, atomicidad y dependencias antes de ejecutar.
- [ ] Ordenar al agente detener la implementación si ya no está listo o requiere trabajo intercalado; respetar al menos un commit por ticket y actualizar Commits.
- [ ] Mostrar Sending, Queued y error; Queued no equivale a iniciado ni completado; prevenir duplicados sin reintentos automáticos.
- [ ] Proteger envío con origen y token de sesión; aceptar identificadores de ticket, no comandos arbitrarios del navegador.
- [ ] No editar archivos, estados ni hashes al encolar; el visor refleja únicamente los cambios posteriores escritos por el agente.
- [ ] Probar adaptador simulado y una orden inocua en sesión de prueba explícitamente vinculada; verificar no interrupción y ausencia de escrituras del visor.

## Trabajo realizado

Pendiente. No se realizaron cambios ni verificaciones de implementación.

## Estado posterior

Pendiente de implementación y verificación. Registrar resultados, problemas, soluciones y pendientes antes de completar.

