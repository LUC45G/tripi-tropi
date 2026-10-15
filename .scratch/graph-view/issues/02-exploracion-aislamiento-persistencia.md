# 02: Explorar y aislar componentes con posiciones persistentes
Status: ready-for-agent
Execution: completed
Labels: graph-view, frontend
Blocked by: 01
Commits: 456e722f2c0c
Verbosity: 1

## Estado inicial

### Qué construir

Completar la exploración espacial de la vista creada en 01: mover nodos, pan/zoom dentro del panel, encuadrar, reorganizar y aislar el componente del ticket seleccionado. Persistir preferencias por repositorio y feature en el navegador, reutilizando el manejo de workspace existente. Seguir [la especificación](../spec.md); no agregar controles de programación todavía.

El componente usa conexión débil del grafo local completo, incluyendo nodos completados y los atenuados por filtros. Las marcas de dependencias externas no crean nodos ni conectan componentes de distintas features. Una feature puede tener componentes aislados de un único ticket.

### Atomicidad

Comienza con 01 terminado y entrega el conjunto completo de herramientas de exploración, usable sin programación de implementaciones. No necesita intercalar 03 ni 04.

### Criterios de aceptación

- [x] Arrastrar mueve un nodo y sus aristas sin abrir accidentalmente el ticket; click conserva selección/detalle. Pan y zoom quedan dentro del panel, sin mover ni desbordar el documento.
- [x] Controles accesibles permiten encuadrar el contenido y reorganizar automáticamente. El layout se adapta al redimensionado por splitters y a pantallas estrechas; mantiene legibilidad y respeta reduced motion.
- [x] Posiciones, pan/zoom y modo de vista se restauran por repositorio y feature sin contaminar otros proyectos/features; almacenamiento ausente o inválido no rompe el visor. No se modifica ningún archivo.
- [x] `Isolate component` muestra el componente del nodo seleccionado y `Show all` restaura la feature; filtros solo atenúan y no recortan integrantes. La conectividad no depende de la dirección ni excluye tickets completados.
- [x] Actualizaciones en vivo preservan posiciones existentes; altas, bajas y cambios de aristas actualizan aislamiento y selección sin dejar referencias obsoletas. Nodos nuevos reciben posiciones utilizables; no se reorganiza todo automáticamente.
- [x] Tests unitarios cubren pertenencia de componentes y cambios del grafo; E2E local cubre arrastre frente a click, pan/zoom, encuadre, reorganización, aislamiento, filtros, persistencia y actualizaciones. Verificar aislamiento entre features/repos y solo lectura; actualizar docs/testing.md.

## Trabajo realizado

- Inicio: ticket aprobado y atómico; dependencia 01 releída y completada. Validación estricta de graph-view sin errores/advertencias.
- Exploración: SVG con arrastre/cámara, encuadre/reorganización, movimiento por teclado local y componentes débiles; preferencias por repo/feature saneadas, sin escrituras de tickets ni animaciones nuevas.
- Verificación: `node --test tests/graph-view.test.mjs` 10/10; `npm test` 69/69, 0 omitidos. Fixtures cubren altas/bajas, filtros, storage inválido y repos distintos sobre un mismo origen; catálogo y README actualizados. Programación de conjuntos fuera de 02.

## Estado posterior

Exploración persistente e aislamiento disponibles, verificados en 456e722f2c0c; sin push. Dependencia 02 del ticket 04 completada.
