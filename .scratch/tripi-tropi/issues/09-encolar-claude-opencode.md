# 09: Evaluar y habilitar envío a sesiones de Claude y OpenCode
Status: ready-for-agent
Execution: completed
Labels: integration, agents
Blocked by: 05
Commits: 8a7e274bfbe9

## Estado inicial

### Qué construir
Extender la vinculación y el envío del visor a Claude y OpenCode únicamente si sus interfaces oficiales permiten entregar mensajes a una sesión existente de manera simple, sin interrumpir trabajo ni iniciar otra sesión. Si un agente no ofrece esa capacidad, explicarlo y dejar el envío deshabilitado para ese agente. El alcance solicitado excluye pruebas mediante envíos reales y la creación de una suite de tests para estas integraciones.

### Atomicidad
La entrega es una capacidad de vinculación multiagente con disponibilidad explícita por proveedor. Se investiga antes de implementar cada adaptador; soportar un proveedor no depende de completar parcialmente el otro. Después del 05 puede terminar con adaptadores simples soportados o con capacidades no disponibles documentadas. Si se requiere infraestructura compleja, registrar el límite y no ampliar este ticket ni intercalar otro para completarlo.

### Criterios de aceptación
- [x] Consultar documentación oficial y ayuda CLI de las versiones disponibles para determinar si Claude y OpenCode permiten enviar o encolar mensajes a una sesión existente sin interrumpir el turno activo. Registrar fuentes, versiones, limitaciones y decisión por proveedor; no asumir que resume equivale a queue.
- [x] Implementar únicamente adaptadores simples basados en CLI o API oficial ya disponible. Si requiere wrappers interactivos, scraping, inyección de teclas, coordinación de procesos o infraestructura adicional, marcar el proveedor como no soportado en esta entrega.
- [x] Permitir vincular proveedor y sesión explícitamente, mostrar nombre/ID cuando estén disponibles y evitar inferir un destino distinto. Conservar el comportamiento actual de Codex.
- [x] Habilitar Queue implementation únicamente para ready-for-agent listo y proveedor compatible; mostrar una explicación clara cuando no se pueda enviar, sin presentar entrega como comprobada.
- [x] Reutilizar revalidación de tickets/dependencias, instrucciones de atomicidad, commits reales, origen/token y protección contra duplicados. Pasar argumentos separados sin shell o usar una API fija; el navegador no puede enviar comandos arbitrarios.
- [x] No crear sesiones, cambiar permisos, interrumpir el agente ni editar archivos, estados o hashes desde el visor. Mantener registros operativos fuera del repo.
- [x] Separar Sending/Queued/Error de la ejecución del ticket; no reintentar automáticamente ni prometer entrega no confirmada por la interfaz oficial.
- [x] Actualizar la skill y la documentación con vinculación, requisitos y capacidades reales por agente; no declarar soporte si la investigación no lo permite.
- [x] Verificar el alcance mediante revisión de código, documentación y ayuda CLI sin enviar mensajes a Claude/OpenCode, iniciar agentes ni crear tests para esas integraciones, según lo solicitado. Declarar explícitamente que la entrega real no fue probada.

## Trabajo realizado
Claude y OpenCode quedaron deshabilitados por no ofrecer una entrega no interactiva fiable al siguiente turno ocupado. Se conservaron las sesiones explícitas de Codex y se quitaron instrucciones ambiguas de espera de turno.

Verificación: OpenCode 1.18.35 y ayuda CLI; Claude CLI no instalado; fuentes y límites en `skills/tripi-tropi/references/agent-queue-compatibility.md`. `npm test`: 37/37; validación estricta: 13 tickets sin errores ni avisos. No se enviaron mensajes reales.

## Estado posterior
Completado y verificado. Implementación: 8a7e274bfbe9. Claude/OpenCode siguen deshabilitados hasta contar con una interfaz oficial que garantice el encolado no interactivo.
