# 09: Evaluar y habilitar envío a sesiones de Claude y OpenCode
Status: ready-for-agent
Execution: pending
Labels: integration, agents
Blocked by: 05
Commits: none

## Estado inicial

### Qué construir
Extender la vinculación y el envío del visor a Claude y OpenCode únicamente si sus interfaces oficiales permiten entregar mensajes a una sesión existente de manera simple, sin interrumpir trabajo ni iniciar otra sesión. Si un agente no ofrece esa capacidad, explicarlo y dejar el envío deshabilitado para ese agente. El alcance solicitado excluye pruebas mediante envíos reales y la creación de una suite de tests para estas integraciones.

### Atomicidad
La entrega es una capacidad de vinculación multiagente con disponibilidad explícita por proveedor. Se investiga antes de implementar cada adaptador; soportar un proveedor no depende de completar parcialmente el otro. Después del 05 puede terminar con adaptadores simples soportados o con capacidades no disponibles documentadas. Si se requiere infraestructura compleja, registrar el límite y no ampliar este ticket ni intercalar otro para completarlo.

### Criterios de aceptación
- [ ] Consultar documentación oficial y ayuda CLI de las versiones disponibles para determinar si Claude y OpenCode permiten enviar o encolar mensajes a una sesión existente sin interrumpir el turno activo. Registrar fuentes, versiones, limitaciones y decisión por proveedor; no asumir que resume equivale a queue.
- [ ] Implementar únicamente adaptadores simples basados en CLI o API oficial ya disponible. Si requiere wrappers interactivos, scraping, inyección de teclas, coordinación de procesos o infraestructura adicional, marcar el proveedor como no soportado en esta entrega.
- [ ] Permitir vincular proveedor y sesión explícitamente, mostrar nombre/ID cuando estén disponibles y evitar inferir un destino distinto. Conservar el comportamiento actual de Codex.
- [ ] Habilitar Queue implementation únicamente para ready-for-agent listo y proveedor compatible; mostrar una explicación clara cuando no se pueda enviar, sin presentar entrega como comprobada.
- [ ] Reutilizar revalidación de tickets/dependencias, instrucciones de atomicidad, commits reales, origen/token y protección contra duplicados. Pasar argumentos separados sin shell o usar una API fija; el navegador no puede enviar comandos arbitrarios.
- [ ] No crear sesiones, cambiar permisos, interrumpir el agente ni editar archivos, estados o hashes desde el visor. Mantener registros operativos fuera del repo.
- [ ] Separar Sending/Queued/Error de la ejecución del ticket; no reintentar automáticamente ni prometer entrega no confirmada por la interfaz oficial.
- [ ] Actualizar la skill y la documentación con vinculación, requisitos y capacidades reales por agente; no declarar soporte si la investigación no lo permite.
- [ ] Verificar el alcance mediante revisión de código, documentación y ayuda CLI sin enviar mensajes a Claude/OpenCode, iniciar agentes ni crear tests para esas integraciones, según lo solicitado. Declarar explícitamente que la entrega real no fue probada.

## Trabajo realizado
Pendiente. Se registró una integración condicionada a viabilidad; no se consultaron ni ejecutaron agentes externos.

## Estado posterior
Pendiente. La compatibilidad de Claude y OpenCode no está confirmada. No instalar proveedores ni enviar mensajes como parte de escribir este ticket. Registrar la investigación y resultados de revisión, las limitaciones de verificación y hashes reales antes del cierre.
