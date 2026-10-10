# 12: Optimizar el consumo del agente al escribir y actualizar tickets
Status: ready-for-agent
Execution: completed
Labels: agents, tickets, efficiency
Blocked by: 01, 06
Commits: b9fba19dd324

## Estado inicial

### Qué construir

El flujo actual exige releer reglas, dependencias y registros completos cada vez que un agente crea, actualiza o implementa un ticket. Mejorar las instrucciones y herramientas del flujo para reducir lecturas, texto repetido y escrituras innecesarias, manteniendo la información que el agente necesita para tomar decisiones correctas y dejando un historial verificable.

### Atomicidad

El resultado es una única mejora observable del flujo de tickets: un agente nuevo puede seguir una ruta documentada y compacta para crear, reclamar, implementar, validar y cerrar un ticket sin perder reglas obligatorias ni trazabilidad. El alcance incluye medir el flujo actual, ajustar la guía y los puntos de entrada relacionados, y verificar el resultado como una unidad. Si la medición revela que hacen falta cambios independientes en el parser, el viewer o el protocolo de queue, dividirlos en tickets separados antes de intercalarlos.

### Criterios de aceptación

- [x] Medir el flujo actual en al menos un caso de creación y uno de implementación, identificando lecturas y escrituras repetidas que no agregan información.
- [x] Definir una ruta compacta de lectura con referencias progresivas: cargar primero las reglas indispensables y consultar detalles solo cuando el ticket o su estado lo requiera.
- [x] Reducir duplicación entre `AGENTS.md`, la guía empaquetada, plantillas y mensajes de queue sin eliminar reglas sobre atomicidad, dependencias, commits reales, validación o solo lectura del viewer.
- [x] Permitir actualizar un registro de trabajo de forma incremental, preservando el alcance inicial y evitando reescribir secciones históricas completas.
- [x] Mantener separados los campos de triage, ejecución, labels, dependencias y commits para que el parser y el viewer puedan seguir calculando estados sin heurísticas nuevas.
- [x] Documentar qué archivos debe leer el agente en cada etapa y qué validación mínima debe ejecutar antes de crear, implementar o cerrar un ticket.
- [x] Verificar con una comparación antes/después que el flujo requiere menos contenido repetido o pasos redundantes, sin reducir la cobertura de las reglas obligatorias.
- [x] Ejecutar la validación estricta de tickets y la suite relevante; confirmar que los tickets existentes, sus hashes y el comportamiento del viewer no cambian de significado.

## Trabajo realizado

- Lecturas repetidas: núcleo compacto y referencia de formato por operación; creación -5,25% e implementación -13,36% en bytes UTF-8 contra la misma base. Script reproducible y resultados en docs/research/12-workflow-content-metrics.json.
- Descubrimiento: índice TOON de solo lectura, filtros por feature/label/estado y JSON opcional; roundtrip exacto y -28,39% de bytes frente al JSON equivalente. Metadatos y estados de los otros once tickets preservados.
- Registros: patches incrementales y entradas problema: solución; verificación, conservando alcance, historia, fallos y límites. Atomicidad, readiness, hashes reales, validación y dos commits siguen obligatorios; queue conserva guardas y referencia de respaldo a la guía.
- Verificación: suite completa de 27 pruebas y nueva prueba de plantilla pasan; instalación aislada actualizada verifica índice y referencia empaquetados. Validación estricta: 15 tickets, sin errores/avisos; validador oficial de skill válido.
- Alcance: parser y UI intactos; CLI de cierre descartado según la prueba previa de agentes reales. Verbosity queda experimental y sus nuevos tests pendientes. Los porcentajes de contenido no prueban menor consumo total del agente.

## Estado posterior

Completado y verificado; implementación b9fba19dd324, registrada mediante este cierre posterior. Investigación y cobertura en docs/research/12-ticket-workflow-efficiency.md. Siguiente paso: pruebas controladas de verbosity, sin atribuirles todavía ahorro total. No se hizo push.
