# 07: Ajustar identidad visual y colapsar la sidebar
Status: ready-for-agent
Execution: in-progress
Labels: viewer, design
Blocked by: 04
Commits: 21d5ec8d3520, 4c1d7bef077c, 6458e758c733, 20f4f8c58f68, 090145a, 7b26ad6251d8, 24a61004967d, e84e41f77898

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
- [x] Presentar metadatos del ticket en tabla de título/valores sin bordes, con Queue implementation y su explicación juntos arriba.
- [x] Botón de colapso ocupa todo el ancho disponible del pie y article.markdown ocupa todo el ancho del detalle.
- [x] Mostrar Codex: nombre de sesión - ID, con ID muted y fallback cuando no haya nombre disponible.
- [ ] Mantener el ticket abierto hasta la conformidad explícita del usuario con la UI.
- [x] Mostrar en cada feature el porcentaje de tickets con estado Completed en lugar del total de tickets.
- [x] Mostrar junto al estado de los tickets In progress el porcentaje de criterios de aceptación completados; un ticket completado muestra 100%.
- [x] Mostrar la ruta del repositorio en el header con una barra inicial para identificarla como directorio.
- [x] Mostrar solo el título de la feature en su encabezado, eliminando el contador textual que aparece junto al nombre.
- [x] Al clickear una dependencia dentro de un ticket, desplazar la lista de la mitad izquierda hasta ese ticket cuando pertenece a la misma feature.
- [x] En el selector Codex, mostrar por defecto las sesiones de usuario (`thread_source: user`), ordenadas por actividad reciente; permitir mostrar el resto y mantener accesible el destino actualmente vinculado.
- [x] Mostrar el proyecto/carpeta y fecha de actividad en cada opción, leyendo `cwd` y `thread_source` de los metadatos locales de sesión sin modificar archivos de Codex.
- [x] Encolar a Codex con `CODEX_HOME` configurado o con el directorio `~/.codex` como fallback cuando esa variable no exista en el entorno del viewer.

## Trabajo realizado
Marca SVG compartida con favicon, textos eliminados y cursores de resize según orientación. Botón accesible con aria-expanded para colapsar/expandir la sidebar, preferencia por repositorio y ancho conservado. Live tiene descripción de su conexión para actualizaciones automáticas. Pruebas de navegador verifican identidad, ausencia de textos, cursores, colapso, recarga y restauración de ancho; las pruebas en vivo siguen pasando.

Segunda entrega: Status y Labels comparten títulos y dropdowns, cierre con clic exterior/Escape y selección con controles nativos accesibles. Clear filters explicita su acción y se eliminó la cantidad duplicada. El control de sidebar se movió al pie; colapsar conserva una franja de 44 px para expandir y el ancho elegido previamente. Annnimate admite HTML/CSS/JS e indica instalar GSAP: se agregó GSAP 3.15.0 servido localmente, con transición propia de 140 ms en filtros y reduced motion. Morphing Tooltip y Gooey Filter Chips se evaluaron como candidatos; sus fuentes requieren acceso pago, no se copiaron. Referencias: https://annnimate.com/docs/getting-started/installation y https://annnimate.com/docs/guides/production.

Colores de superficies y botones basados en el 1337 original de MarkMichos/1337-Scheme, fondo #191919 y selección gris. No se encontró una definición editable del tema dentro de la instalación local de Codex; la adaptación usa la fuente original https://github.com/MarkMichos/1337-Scheme/blob/master/1337.tmTheme como referencia, sin afirmar equivalencia exacta con la apariencia de Codex. Se conservaron los colores semánticos de labels y estados.

Verificación: 23 pruebas pasan, incluyendo clic exterior, títulos de filtros, cantidades no duplicadas, botón en el pie, colapso persistente y reduced motion. La sesión Codex vinculada se verificó en navegador tras reiniciar el servidor anterior; desapareció Codex: unavailable. El ticket permanece in-progress por pedido explícito del usuario hasta su conformidad con la UI.

Tercera entrega: encabezado del detalle organizado en tabla semántica de título/valores sin bordes, con filas Status, Triage, Labels, Acceptance criteria, Commits y Dependencies. Queue implementation y su explicación aparecen juntos arriba. Los metadatos reconocidos antes de las secciones se presentan en esa tabla y no se duplican como texto suelto en el Markdown renderizado; título, prosa y ejemplos dentro de fences conservan su contenido. Los archivos originales no se modifican. Se verificó visualmente con el ticket 06 sin encolarlo; las 23 pruebas siguen pasando, incluidas ausencia de bordes y de metadatos duplicados.

Cuarta entrega: botón de colapso al 100% del ancho disponible del pie y Markdown al 100% de la columna, sin máximo de 76ch. Codex muestra nombre de sesión seguido del ID muted. El servidor consulta únicamente metadatos del índice local de sesiones, de forma opcional y de solo lectura; admite líneas incompletas o un índice ausente sin afectar el visor y no cambia el destino de envío. Si no hay nombre, muestra Unnamed session. Texto insertado como contenido seguro, sin interpretar HTML. Nombre real verificado: Set up Matt Pocock skills. Verificación visual de anchos y 24 pruebas Node/Edge pasan; el 07 permanece abierto para conformidad del usuario.

Quinta entrega pendiente: completar la información visual de progreso y simplificar los encabezados. El porcentaje de una feature debe contar tickets Completed sobre todos sus tickets, sin depender de los filtros activos. El porcentaje de un ticket In progress debe derivarse de sus criterios de aceptación detectados en Markdown; los tickets sin criterios muestran 0% y los completados 100%. La ruta del repositorio debe comenzar con `/` en el header y el encabezado de la feature debe conservar únicamente su título.

Quinta entrega implementada: la sidebar muestra el porcentaje de tickets Completed por feature. Los tickets In progress muestran el porcentaje derivado de sus criterios de aceptación, mientras que el resto conserva su estado. El repositorio aparece con `/` inicial y el encabezado de feature ya no repite la cantidad de tickets. Las dependencias que apuntan a un ticket de la misma feature conservan el detalle seleccionado y desplazan la tabla de la mitad izquierda hasta la fila destino. Se verificó con la suite completa: 25 pruebas pasan y la validación estricta no informa errores ni advertencias. El ticket permanece abierto para revisión visual explícita.

Corrección posterior: el desplazamiento de una dependencia ahora centra la fila destino en la mitad izquierda en lugar de usar un desplazamiento mínimo, que podía dejar el ticket cortado al subir. Las pruebas de viewer y navegador pasan 6/6.

Selector Codex: las sesiones se ordenan por actividad reciente; se muestra carpeta, fecha e ID. Por defecto aparecen las sesiones `user`, con acceso opcional al índice completo. Se leen metadatos locales sin escribirlos. `npm test`: 37/37; validación estricta: 13 tickets sin errores ni warnings.

Codex queue en Windows: cuando `CODEX_HOME` falta, el subproceso recibe `~/.codex` como fallback. `codex queue --help` reproduce el error de home sin la variable y lo elimina con el fallback; `npm test`: 37/37.

## Estado posterior
Entregas verificadas: 21d5ec8d3520, 4c1d7bef077c, 6458e758c733 y 20f4f8c58f68. Sigue in-progress por revisión visual del usuario. No completar este ticket hasta su conformidad explícita con la UI; registrar los próximos commits reales sin cerrar el ticket.

La última entrega agrega sesiones ordenadas por actividad reciente, carpeta/proyecto visible y filtro inicial por origen de usuario con opción de mostrar el resto. La UI fue verificada en navegador; el ticket sigue in-progress hasta la conformidad explícita del usuario.

## Comments

El usuario agregó consistencia y títulos para dropdowns, cierre al hacer clic afuera, Clear filters explícito y eliminación del contador textual duplicado. Solicitó mover el control de colapso al pie y eliminar los textos de sidebar-note. Reforzó que el 07 debe permanecer abierto hasta quedar conforme con la UI. Los nuevos ajustes son una ampliación de esta entrega visual, sin depender parcialmente de otros tickets.

El usuario agregó porcentajes de completitud para features y tickets en progreso, una ruta de repositorio identificable como directorio y un encabezado de feature sin contador. Estos ajustes pertenecen al 07 y no cierran el ticket hasta recibir conformidad explícita.

El usuario pidió ordenar las sesiones Codex recientes, identificar el proyecto/carpeta de cada una y facilitar que el selector muestre las sesiones de usuario en lugar de revisiones guardian repetidas. Se añadió esta ampliación al 07; sigue abierto hasta la conformidad visual explícita.

El usuario reportó que `Queue implementation` fallaba al no encontrar Codex home. Se verificó que el viewer hereda `CODEX_HOME` vacío y se corrigió el entorno del proceso hijo con el fallback local de Codex; el ticket continúa abierto.
