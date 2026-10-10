# 13: Adoptar dos niveles de detalle para los registros de tickets
Status: ready-for-agent
Execution: completed
Labels: agents, tickets, documentation
Blocked by: 12
Commits: 16d053fbf5a7
Verbosity: 1

## Estado inicial

### Qué construir
Incorporar los niveles 1 — Minimal (predeterminado) y 2 — Detailed en la guía y plantilla. El usuario elige el nivel por ticket; conservar el nivel 3 como evidencia histórica del lab. El cambio es de escritura, sin agregar controles de UI ni cambiar parser/validación automática.

### Atomicidad
La guía final del 12 ya está completada. Esta decisión documental se implementa y verifica sin intercalar otro ticket ni modificar el protocolo o las mediciones históricas.

### Criterios de aceptación
- [x] Documentar solo dos niveles activos, default 1 y elección de 2 por ticket; omisión en tickets existentes significa 1 sin migración.
- [x] Mantener alcance, criterios, dependencias, verificaciones, fallos/soluciones, límites, hashes y registros obligatorios en ambos niveles.
- [x] Actualizar plantilla y distinguir la decisión vigente de las tres variantes históricas del lab, sin alterar sus salidas ni métricas.
- [x] Validar tickets, plantilla y skill; registrar un commit de implementación real y su hash mediante un commit posterior.

## Trabajo realizado
Niveles: guía/plantilla adoptan 1 default y 2 por elección; historial del lab intacto. Verificación: 3 pruebas pasando, 16 tickets sin errores/avisos y skill válida. Verbosity es una regla de autoría, no validación automática ni control de UI.

## Estado posterior
Completado; 16d053fbf5a7 registrado. Sin push.
