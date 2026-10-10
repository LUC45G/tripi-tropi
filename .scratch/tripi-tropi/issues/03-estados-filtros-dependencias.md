# 03: Mostrar estados, filtros y navegación entre dependencias
Status: ready-for-agent
Execution: in-progress
Labels: viewer, dependencies
Blocked by: 02
Commits: none

## Estado inicial

### Qué construir

El usuario distingue tickets pendientes, listos, activos y completados; filtra por labels y navega con un clic hacia sus bloqueantes.

### Atomicidad

Todas las dependencias declaradas deben estar completadas antes de empezar. Este ticket entrega una capacidad verificable sin intercalar trabajo de otro ticket. Si aparece una dependencia parcial, revisar y dividir el alcance antes de implementarlo.

### Criterios de aceptación

- [x] Separar triage, ejecución y estado calculado; Execution tiene prioridad y Status heredado sigue funcionando.
- [x] Mostrar Pending, Ready to implement, In progress, Blocked, Completed, Discarded y Unknown; checkboxes solo muestran progreso.
- [x] Ready to implement exige ready-for-agent/ready-for-human, ninguna dependencia pendiente y ausencia de errores críticos.
- [x] Resolver números/títulos, comas, punto y coma y secciones de bloqueantes dentro de cada feature; None/Ninguno indican ausencia.
- [x] Solo dependencias completadas desbloquean; referencias inexistentes/ambiguas y ciclos bloquean con diagnóstico.
- [x] Filtrar por labels con OR y combinar con estado mediante AND; colorear labels y bloqueantes con significado, texto y contraste.
- [x] Abrir bloqueantes incluso fuera del filtro conservando filtros; distinguir dependencias resueltas de pendientes.
- [x] Los ejemplos de qr-wedding producen 14 tickets: 5 Completed, 1 Ready to implement, 3 Pending y 5 Blocked.
- [x] Verificar estados, enlaces, filtros, labels personalizados y commits sin modificar el contenido.

## Trabajo realizado

Se implementó el cálculo de estados y dependencias desde un snapshot validado, separando aprobación de triage y ejecución. Se agregó soporte para mappings de labels personalizados conservando sus nombres originales. Las dependencias inválidas o cíclicas bloquean y muestran diagnóstico; solo las completadas desbloquean.

La UI permite filtrar labels con OR y combinar con estado mediante AND, ver labels y bloqueantes coloreados, progreso de aceptación y navegar a dependencias incluso fuera de los filtros. También se pueden abrir referencias Markdown a tickets conocidos dentro de .scratch. El detalle muestra un aviso si la selección está fuera de los filtros; el resumen de feature conserva sus conteos totales.

Verificación: 17 pruebas pasando, incluidas pruebas de navegador para filtros, navegación, commits y lectura sin mutaciones. Se verificaron mappings personalizados, prioridades de ejecución, estados desconocidos, bloqueos inválidos/cíclicos y actualización manual de dependencias. Los 14 tickets reales de qr-wedding producen 5 Completed, 1 Ready to implement, 3 Pending y 5 Blocked. Skill validada y revisión visual desktop realizada. Visor reiniciado en el mismo puerto con los cambios.

## Estado posterior

Implementación verificada; pendiente registrar el commit para cerrar. Se conservan Refresh manual y los archivos de solo lectura. Actualización en vivo y paneles ajustables corresponden al 04, envío al agente al 05 e instalación simplificada al 06.

