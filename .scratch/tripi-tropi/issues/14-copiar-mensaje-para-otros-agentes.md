# 14: Copiar el mensaje de implementación para otros agentes
Status: ready-for-agent
Execution: completed
Labels: viewer, agents, queue
Blocked by: 05, 09
Commits: 55c9159ac5fd
Verbosity: 1

## Estado inicial

### Qué construir

Un botón permite copiar al portapapeles el mensaje seguro de implementación de un ticket listo para que el usuario lo pegue manualmente en Claude, OpenCode u otro agente no compatible con Queue implementation.

### Atomicidad

El resultado completo es una acción de copia manual, independiente de la entrega del agente. No crea ni selecciona sesiones, no envía mensajes y no modifica tickets; la validación y generación se hacen en una sola operación.

### Criterios de aceptación

- [x] Mostrar Copy implementation message únicamente para tickets listos con triage `ready-for-agent`; revalidar ticket y dependencias en el servidor al generar el mensaje.
- [x] Copiar instrucciones que incluyan repo, ruta, dependencias completas y reglas del ticket, reutilizando el generador actual de Queue implementation.
- [x] No encolar ni enviar mensajes, inferir o modificar destinos, crear sesiones, alterar permisos ni escribir tickets, estados o hashes.
- [x] Comunicar éxito/error de portapapeles en la interfaz; explicar que el usuario debe pegar el mensaje manualmente en el agente elegido.
- [x] Mantener el contenido y nombres de tickets sin traducir y la interfaz en inglés; validar la petición con origen y token existentes.
- [x] Verificar API y flujo de copia en navegador sin entregar mensajes a agentes; validar tickets y registrar hashes reales en un commit posterior.

## Trabajo realizado
Se agregó Copy implementation message para tickets listos. El servidor revalida estado y dependencias y devuelve el mensaje existente; el navegador solo lo copia al portapapeles. La ruta exige origen/token y no encola ni persiste intentos.

Verificación: API y UI prueban copia, revalidación, errores de readiness y ausencia de envíos/escrituras; `npm test`: 38/38; validación estricta: 17 tickets sin errores ni avisos. No se enviaron mensajes a agentes.

## Estado posterior
Completado y verificado. Implementaci?n: 55c9159ac5fd. La copia requiere que el usuario pegue el mensaje manualmente; no se enviaron ?rdenes a agentes.
