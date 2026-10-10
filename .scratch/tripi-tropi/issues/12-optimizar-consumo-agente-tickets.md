# 12: Optimizar el consumo del agente al escribir y actualizar tickets
Status: ready-for-agent
Execution: pending
Labels: agents, tickets, efficiency
Blocked by: 01, 06
Commits: none

## Estado inicial

### Qué construir

El flujo actual exige releer reglas, dependencias y registros completos cada vez que un agente crea, actualiza o implementa un ticket. Mejorar las instrucciones y herramientas del flujo para reducir lecturas, texto repetido y escrituras innecesarias, manteniendo la información que el agente necesita para tomar decisiones correctas y dejando un historial verificable.

### Atomicidad

El resultado es una única mejora observable del flujo de tickets: un agente nuevo puede seguir una ruta documentada y compacta para crear, reclamar, implementar, validar y cerrar un ticket sin perder reglas obligatorias ni trazabilidad. El alcance incluye medir el flujo actual, ajustar la guía y los puntos de entrada relacionados, y verificar el resultado como una unidad. Si la medición revela que hacen falta cambios independientes en el parser, el viewer o el protocolo de queue, dividirlos en tickets separados antes de intercalarlos.

### Criterios de aceptación

- [ ] Medir el flujo actual en al menos un caso de creación y uno de implementación, identificando lecturas y escrituras repetidas que no agregan información.
- [ ] Definir una ruta compacta de lectura con referencias progresivas: cargar primero las reglas indispensables y consultar detalles solo cuando el ticket o su estado lo requiera.
- [ ] Reducir duplicación entre `AGENTS.md`, la guía empaquetada, plantillas y mensajes de queue sin eliminar reglas sobre atomicidad, dependencias, commits reales, validación o solo lectura del viewer.
- [ ] Permitir actualizar un registro de trabajo de forma incremental, preservando el alcance inicial y evitando reescribir secciones históricas completas.
- [ ] Mantener separados los campos de triage, ejecución, labels, dependencias y commits para que el parser y el viewer puedan seguir calculando estados sin heurísticas nuevas.
- [ ] Documentar qué archivos debe leer el agente en cada etapa y qué validación mínima debe ejecutar antes de crear, implementar o cerrar un ticket.
- [ ] Verificar con una comparación antes/después que el flujo requiere menos contenido repetido o pasos redundantes, sin reducir la cobertura de las reglas obligatorias.
- [ ] Ejecutar la validación estricta de tickets y la suite relevante; confirmar que los tickets existentes, sus hashes y el comportamiento del viewer no cambian de significado.

## Trabajo realizado

Pendiente. Las reglas actuales de escritura, atomicidad, dependencias y commits están descritas en `docs/agents/ticket-writing.md` y `skills/tripi-tropi/references/ticket-writing.md`. Este ticket optimiza el flujo sin cambiar el formato compatible de los tickets existentes.

## Estado posterior

Pendiente de implementar después de confirmar las reglas base del ticket 01 y la distribución del paquete del 06. La mejora debe conservar la capacidad de que un agente nuevo comprenda y ejecute el flujo sin depender de contexto conversacional oculto.
