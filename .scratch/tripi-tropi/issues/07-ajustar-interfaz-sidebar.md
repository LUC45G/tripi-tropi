# 07: Ajustar identidad visual y colapsar la sidebar
Status: ready-for-agent
Execution: in-progress
Labels: viewer, design
Blocked by: 04
Commits: none

## Estado inicial

### Qué construir
Usar el SVG del favicon en la marca de la interfaz, eliminar los textos Read-only y Updates automatically when files change., permitir colapsar la sidebar y mostrar cursores de resize en los separadores.

### Atomicidad
Entrega completa de presentación y navegación de la sidebar, después del 04, sin intercalar otros tickets. La integración del agente pertenece exclusivamente al 05.

### Criterios de aceptación
- [x] La marca usa el SVG empaquetado del favicon.
- [x] Los separadores verticales usan col-resize y los horizontales row-resize; los demás controles clickeables usan pointer.
- [x] Sidebar colapsable con botón accesible, persistencia por repo y restauración del ancho elegido; ambos paneles aprovechan el espacio liberado.
- [x] Eliminar ambos textos solicitados y conservar Live con explicación accesible de su significado.
- [x] Verificar visualmente y en navegador, sin escrituras del visor.

## Trabajo realizado
Marca SVG compartida con favicon, textos eliminados y cursores de resize según orientación. Botón accesible con aria-expanded para colapsar/expandir la sidebar, preferencia por repositorio y ancho conservado. Live tiene descripción de su conexión para actualizaciones automáticas. Pruebas de navegador verifican identidad, ausencia de textos, cursores, colapso, recarga y restauración de ancho; las pruebas en vivo siguen pasando.

## Estado posterior
Implementación verificada; pendiente registrar hash real y cierre. Los cambios corresponden solo al 07; el 05 se implementará después.
