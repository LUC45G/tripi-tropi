# 07: Ajustar identidad visual y colapsar la sidebar
Status: ready-for-agent
Execution: in-progress
Labels: viewer, design
Blocked by: 04
Commits: 21d5ec8d3520

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
- [x] Unificar dropdowns de Status y Labels, ambos con título y cierre al hacer clic afuera.
- [x] Mostrar Clear filters como acción explícita y eliminar el subtítulo con cantidades duplicadas.
- [x] Mover el botón de colapso a sidebar-note y eliminar todo su texto adicional, conservando un control visible para expandir.
- [x] Explorar Annnimate e instalar su base GSAP para probar movimiento discreto compatible con reduced motion.
- [x] Usar 1337 como referencia para fondos y botones, conservando colores de labels y estados.
- [ ] Mantener el ticket abierto hasta la conformidad explícita del usuario con la UI.

## Trabajo realizado
Marca SVG compartida con favicon, textos eliminados y cursores de resize según orientación. Botón accesible con aria-expanded para colapsar/expandir la sidebar, preferencia por repositorio y ancho conservado. Live tiene descripción de su conexión para actualizaciones automáticas. Pruebas de navegador verifican identidad, ausencia de textos, cursores, colapso, recarga y restauración de ancho; las pruebas en vivo siguen pasando.

Segunda entrega: Status y Labels comparten títulos y dropdowns, cierre con clic exterior/Escape y selección con controles nativos accesibles. Clear filters explicita su acción y se eliminó la cantidad duplicada. El control de sidebar se movió al pie; colapsar conserva una franja de 44 px para expandir y el ancho elegido previamente. Annnimate admite HTML/CSS/JS e indica instalar GSAP: se agregó GSAP 3.15.0 servido localmente, con transición propia de 140 ms en filtros y reduced motion. Morphing Tooltip y Gooey Filter Chips se evaluaron como candidatos; sus fuentes requieren acceso pago, no se copiaron. Referencias: https://annnimate.com/docs/getting-started/installation y https://annnimate.com/docs/guides/production.

Colores de superficies y botones basados en el 1337 original de MarkMichos/1337-Scheme, fondo #191919 y selección gris. No se encontró una definición editable del tema dentro de la instalación local de Codex; la adaptación usa la fuente original https://github.com/MarkMichos/1337-Scheme/blob/master/1337.tmTheme como referencia, sin afirmar equivalencia exacta con la apariencia de Codex. Se conservaron los colores semánticos de labels y estados.

Verificación: 23 pruebas pasan, incluyendo clic exterior, títulos de filtros, cantidades no duplicadas, botón en el pie, colapso persistente y reduced motion. La sesión Codex vinculada se verificó en navegador tras reiniciar el servidor anterior; desapareció Codex: unavailable. El ticket permanece in-progress por pedido explícito del usuario hasta su conformidad con la UI.

## Estado posterior
Primera entrega verificada: 21d5ec8d3520. Reabierto por nuevos ajustes solicitados y revisión visual del usuario. No completar este ticket hasta su conformidad explícita con la UI; registrar los próximos commits reales sin cerrar el ticket.

## Comments

El usuario agregó consistencia y títulos para dropdowns, cierre al hacer clic afuera, Clear filters explícito y eliminación del contador textual duplicado. Solicitó mover el control de colapso al pie y eliminar los textos de sidebar-note. Reforzó que el 07 debe permanecer abierto hasta quedar conforme con la UI. Los nuevos ajustes son una ampliación de esta entrega visual, sin depender parcialmente de otros tickets.
