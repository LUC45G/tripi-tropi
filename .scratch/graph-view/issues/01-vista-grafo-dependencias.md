# 01: Mostrar una vista alternativa del grafo de dependencias
Status: ready-for-agent
Execution: in-progress
Labels: graph-view, frontend
Blocked by: none
Commits: none
Verbosity: 1

## Estado inicial

### Qué construir

Entregar una vista `Graph` utilizable junto a `List` en el panel central, con layout automático inicial, selección de tickets y actualizaciones en vivo. Respetar [la especificación](../spec.md), especialmente dirección de aristas, colores, dependencias externas y filtros. El arrastre, pan/zoom, persistencia e aislamiento se entregan íntegros en 02; la programación de conjuntos no forma parte de este ticket.

Reutilizar snapshot, estados, detalle Markdown, colores y navegación existentes. Consultar `skills/tripi-tropi/assets/{app.js,index.html,style.css}`, `scripts/ticket-states.mjs` y `scripts/snapshot-stream.mjs` dentro de la skill. Elegir la solución mínima compatible con el empaquetado instalado; si se incorpora una librería, incluir sus recursos locales y dependencias de runtime necesarias.

### Atomicidad

La vista funciona de punta a punta sin necesitar los controles espaciales ni la programación. Ninguna aceptación depende de trabajo parcial de 02, 03 o 04.

### Criterios de aceptación

- [x] `List / Graph` cambia solamente el panel central y conserva sidebar, splitters, filtros y detalle; la lista sigue funcionando.
- [x] Cada nodo de la feature muestra su número. Hover y foco permiten consultar nombre, estado y labels; click o activación accesible abre el detalle Markdown original, sin escribir tickets.
- [x] Borde según primera label explícita, excluyendo triage agregado; borde neutro si no hay labels. Fondo según estado y texto/foco legibles. No se cambian los colores de las etiquetas existentes.
- [x] Una dependencia local se dibuja bloqueante → dependiente; las externas muestran solo punta de flecha entrante sin nodo ni nombre externo. El detalle conserva sus datos y navegación.
- [x] Los filtros atenúan sin quitar nodos ni conexiones; ciclos y referencias inválidas se distinguen con explicación accesible y sin enlaces inventados. Features vacías y tickets sin aristas tienen una presentación válida.
- [x] El grafo usa el espacio disponible sin desbordar el panel y refleja snapshots nuevos, selección e historial sin romper la navegación existente. Todo texto nuevo de UI está en inglés; contenido y nombres permanecen intactos.
- [x] Pruebas unitarias del modelo/proyección y E2E local cubren dirección, colores/triage, dependencia externa, filtros, selección, cambios en vivo y regreso a lista; se verifican solo lectura y recursos de la skill instalada. Actualizar docs/testing.md y ejecutar las comprobaciones afectadas.

## Trabajo realizado

- Inicio: aprobación, atomicidad y ausencia de dependencias verificadas; validación estricta de graph-view con 0 errores y 0 advertencias.
- Vista: SVG nativo con proyección por niveles, colores existentes, marcas externas, filtros atenuados, errores y navegación; sin dependencias nuevas. README y catálogo de tests actualizados.
- Verificación: `node --test tests/graph-view.test.mjs` 6/6; `npm test` 53/53, 0 omitidos, incluyendo recursos de instalación aislada y flujos existentes; validación estricta global 26 tickets, 0 errores/advertencias.
- Inspección: captura desktop revisada y viewer reiniciado en http://127.0.0.1:65005 con la sesión previa; `/graph.mjs` responde 200. Solo lectura comprobado con fixtures. Arrastre, zoom, persistencia espacial, aislamiento y programación quedan fuera de 01; no probados como funcionalidades disponibles.

## Estado posterior

Pendiente.
