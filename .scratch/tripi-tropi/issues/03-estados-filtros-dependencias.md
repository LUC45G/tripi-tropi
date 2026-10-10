# 03: Mostrar estados, filtros y navegación entre dependencias
Status: ready-for-agent
Execution: pending
Labels: viewer, dependencies
Blocked by: 02
Commits: none

## Estado inicial

### Qué construir

El usuario distingue tickets pendientes, listos, activos y completados; filtra por labels y navega con un clic hacia sus bloqueantes.

### Atomicidad

Todas las dependencias declaradas deben estar completadas antes de empezar. Este ticket entrega una capacidad verificable sin intercalar trabajo de otro ticket. Si aparece una dependencia parcial, revisar y dividir el alcance antes de implementarlo.

### Criterios de aceptación

- [ ] Separar triage, ejecución y estado calculado; Execution tiene prioridad y Status heredado sigue funcionando.
- [ ] Mostrar Pending, Ready to implement, In progress, Blocked, Completed, Discarded y Unknown; checkboxes solo muestran progreso.
- [ ] Ready to implement exige ready-for-agent/ready-for-human, ninguna dependencia pendiente y ausencia de errores críticos.
- [ ] Resolver números/títulos, comas, punto y coma y secciones de bloqueantes dentro de cada feature; None/Ninguno indican ausencia.
- [ ] Solo dependencias completadas desbloquean; referencias inexistentes/ambiguas y ciclos bloquean con diagnóstico.
- [ ] Filtrar por labels con OR y combinar con estado mediante AND; colorear labels y bloqueantes con significado, texto y contraste.
- [ ] Abrir bloqueantes incluso fuera del filtro conservando filtros; distinguir dependencias resueltas de pendientes.
- [ ] Los ejemplos de qr-wedding producen 14 tickets: 5 Completed, 1 Ready to implement, 3 Pending y 5 Blocked.
- [ ] Verificar estados, enlaces, filtros, labels personalizados y commits sin modificar el contenido.

## Trabajo realizado

Pendiente. No se realizaron cambios ni verificaciones de implementación.

## Estado posterior

Pendiente de implementación y verificación. Registrar resultados, problemas, soluciones y pendientes antes de completar.

