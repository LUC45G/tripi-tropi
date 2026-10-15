# 03: Revisar la cantidad de labels y los criterios para crear nuevas
Status: needs-triage
Execution: pending
Labels: research, planning
Blocked by: none
Commits: none
Verbosity: 1

## Estado inicial

### Qué construir

Evaluar cómo reducir labels redundantes y cuándo corresponde crear una nueva. Entregar una propuesta revisable en `.scratch/mejoras-futuras/politica-labels.md`, basada en el uso actual y sin renombrar ni eliminar labels todavía.

Separar labels descriptivas de roles de triage y estado de ejecución. Considerar que los filtros y el futuro borde de los nodos del grafo dependen de las labels; no asumir que más labels implican más información útil.

### Atomicidad

La entrega es una política propuesta y un diagnóstico de labels existentes. Es independiente de 01, de las acciones sobre tickets y de la política de features; no necesita implementar una limpieza para poder revisarse.

### Criterios de aceptación

- [ ] Inventariar labels actuales con ejemplos y frecuencia, distinguiendo etiquetas explícitas del triage agregado por el visor; identificar sinónimos, duplicaciones y labels con utilidad poco clara.
- [ ] Proponer criterios concretos para reutilizar, crear, fusionar o retirar una label y para limitar la cantidad por ticket, explicando excepciones si se recomiendan.
- [ ] Evaluar convención de nombres, nivel de generalidad y elección/orden de la label principal, incluyendo impacto en filtros, colores y graph-view sin modificar su diseño confirmado.
- [ ] Incluir ejemplos de tickets bien etiquetados y casos donde no se justifica crear una label nueva; separar evidencia del repo de recomendaciones pendientes de aprobación.
- [ ] Registrar una propuesta de consolidación y sus riesgos de compatibilidad, preguntas abiertas y siguiente paso. No migrar tickets ni cambiar la guía vigente durante este análisis.

## Trabajo realizado

Pendiente de análisis y revisión.

## Estado posterior

Pendiente.
