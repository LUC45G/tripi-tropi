# Catálogo de tests de tripi-tropi

Inventario del checkout, basado en la versión **0.1.3** con graph-view 01 y 03: **65 tests declarados en 10 archivos**, ejecutados con `node:test`. Cada fila corresponde a una llamada a `test(...)`; un test puede contener varias comprobaciones. Los nombres en inglés son los nombres exactos del código.

## Clasificación

- **Unit test:** comprueba una función o regla aislada con datos en memoria. Puede simular una dependencia, como el proceso de Codex.
- **Integration test:** comprueba componentes conectados con archivos, HTTP o procesos reales. Incluye contratos entre documentación y parser, y entre los metadatos de los paquetes.
- **E2E test:** recorre un flujo completo de usuario mediante navegador y servidor reales, o el ciclo de instalación y ejecución de la skill. La entrega al agente se simula: estos tests no envían instrucciones a una sesión real de Codex.

Esta clasificación documenta el alcance de los tests; el runner no tiene categorías ni etiquetas configuradas. Seguridad, regresión, contrato, CLI y concurrencia son enfoques adicionales, no categorías excluyentes.

| Archivo | Unit | Integration | E2E | Total |
| --- | ---: | ---: | ---: | ---: |
| `tickets.test.mjs` | 7 | 2 | 0 | 9 |
| `ticket-states.test.mjs` | 4 | 2 | 0 | 6 |
| `ticket-index.test.mjs` | 0 | 3 | 0 | 3 |
| `queue.test.mjs` | 1 | 7 | 1 | 9 |
| `live-viewer.test.mjs` | 0 | 2 | 1 | 3 |
| `viewer.test.mjs` | 0 | 3 | 4 | 7 |
| `install-skill.test.mjs` | 0 | 0 | 1 | 1 |
| `audit-regressions.test.mjs` | 1 | 7 | 1 | 9 |
| `graph-view.test.mjs` | 4 | 0 | 2 | 6 |
| `component-queue.test.mjs` | 4 | 8 | 0 | 12 |
| **Total** | **21** | **34** | **10** | **65** |

## Parser y validación de tickets

Fuente: [tests/tickets.test.mjs](../tests/tickets.test.mjs).

| Test | Categoría | Qué se prueba | Objetivo |
| --- | --- | --- | --- |
| `strict guide format separates triage, execution, labels, commits and acceptance progress` | Unit | Parseo estricto de campos, hashes y criterios marcados; conservación del título. | Separar aprobación, ejecución y progreso sin confundir sus significados. |
| `original to-tickets template is compatible without migration` | Unit | Lectura de la plantilla original, incluyendo campos en negrita y avisos por campos ausentes. | Mantener compatibilidad de lectura con tickets existentes. |
| `qr-wedding variants retain unnumbered titles and parse multiple dependencies` | Unit | Títulos sin número, número obtenido del archivo, bloqueantes múltiples y expresiones de ausencia. | Leer variantes reales sin traducir ni alterar títulos. |
| `code examples cannot override metadata or contribute fake acceptance checkboxes` | Unit | Campos y checkboxes dentro de bloques de código. | Evitar que un ejemplo modifique el estado o el progreso del ticket. |
| `strict validation catches missing sections, invalid states, hashes and completed tickets without commits` | Unit | Estructura incompleta, estados y hashes inválidos, duplicación de campos, número incoherente y cierre sin commits. | Detectar tickets que incumplen el formato obligatorio. |
| `graph validation handles missing/ambiguous references, self edges and every cycle member` | Unit | Referencias inexistentes, números duplicados, autorreferencias y ciclos. | Identificar dependencias imposibles y señalar todos los integrantes de un ciclo. |
| `cross-feature references resolve by exact feature and number, parse long comma lists and detect cross-feature cycles` | Integration | Carga desde disco de referencias entre features, listas mixtas, ciclos y features ausentes. | Resolver cada bloqueante contra su feature y número exactos. |
| `loader and CLI read complete features without altering observed files` | Integration | Carga de tickets y descripción, validación mediante un proceso CLI y comparación de archivos antes/después. | Garantizar lectura completa y validación sin modificar tickets. |
| `path containment rejects traversal and sibling-prefix lookalikes` | Unit | Pertenencia de rutas al directorio permitido, incluyendo rutas hermanas con prefijos parecidos. | Evitar accesos fuera de la raíz autorizada. |

## Estados y disponibilidad para implementar

Fuente: [tests/ticket-states.test.mjs](../tests/ticket-states.test.mjs).

| Test | Categoría | Qué se prueba | Objetivo |
| --- | --- | --- | --- |
| `readiness requires approval, no unfinished blockers, and no critical validation errors` | Unit | Derivación de estados según triage, dependencias y errores; los checkboxes completos no implican cierre. | Mostrar disponibilidad coherente con las reglas del ticket. |
| `explicit execution takes priority and completed/discarded tickets keep terminal states` | Unit | Prioridad de Execution, estados terminales, alias y valores desconocidos. | Evitar que triage o dependencias sobrescriban una ejecución explícita. |
| `missing, ambiguous, self and cyclic references block tickets without inventing target links` | Unit | Estado bloqueado y enlaces válidos o nulos ante dependencias problemáticas; un ticket descartado no satisface la dependencia. | Mostrar bloqueos reales sin fabricar destinos navegables. |
| `custom triage labels retain spelling and resolve to canonical approval roles` | Integration | Configuración de labels leída desde disco y aplicación a tickets reales de la fixture. | Reconocer roles personalizados conservando su escritura original. |
| `cross-feature blockers resolve by exact feature and gate the dependent ticket` | Integration | Dos features con el mismo número de ticket; cambio del bloqueante de completado a pendiente. | Habilitar o bloquear según el ticket correcto de la otra feature. |
| `fixtures matching qr-wedding yield agreed frontier and state counts` | Unit | Grafo representativo de 14 tickets y conteos esperados de estados. | Evitar regresiones en la frontera de trabajo disponible. |

## Índice compacto y contrato de escritura

Fuente: [tests/ticket-index.test.mjs](../tests/ticket-index.test.mjs).

| Test | Categoría | Qué se prueba | Objetivo |
| --- | --- | --- | --- |
| `progressively disclosed creation template preserves strict format and dependency references` | Integration | Extracción de la plantilla real de la guía y validación con el parser estricto. | Mantener sincronizados el formato documentado y el formato aceptado. |
| `discovery preserves metadata, roundtrips escaped cells, filters after deriving dependencies and rereads without writes` | Integration | Índice desde archivos, ida y vuelta TOON, comillas/Unicode, filtros y nueva lectura tras cambios. | Ofrecer un índice compacto fiel, actualizado y de solo lectura. |
| `CLI exposes invalid graph even when filters hide its tickets and never prints Markdown bodies` | Integration | CLI real, salida JSON/TOON, código de salida y errores de tickets ocultos por filtros. | Conservar diagnósticos globales y evitar volcar las descripciones en el índice. |

## Cola de implementación y mensajes

Fuente: [tests/queue.test.mjs](../tests/queue.test.mjs).

| Test | Categoría | Qué se prueba | Objetivo |
| --- | --- | --- | --- |
| `optional session display name reads the latest matching index record and tolerates missing or partial metadata` | Integration | Índice de sesiones en disco: nombre más reciente, registros parciales y archivos ausentes. | Mostrar nombres sin fallar ante metadatos incompletos. |
| `session picker metadata sorts by recent activity and reads project and source from local rollout metadata` | Integration | Índice y metadatos locales de sesiones: orden, proyecto, origen y parent thread. | Facilitar la identificación de la sesión de destino. |
| `session selection reuses only indexed IDs and keeps each destination queue ledger separate` | Integration | Selección y desvinculación, rechazo de destinos inválidos y recibos persistidos por sesión. | Evitar destinos arbitrarios y mezclar recibos entre sesiones. |
| `queue adapter passes separate arguments without shell, session creation or permission overrides` | Unit | Argumentos, entorno y opciones del proceso con spawn simulado; tratamiento de fallos. | Construir la invocación de Codex sin shell ni cambios de permisos. |
| `queue revalidates disk state, blocks duplicates across concurrent requests and restart, and never writes tickets` | Integration | Relectura de elegibilidad, concurrencia, cambio de destino durante envío, persistencia, fallos y archivos intactos. | Encolar una sola vez un ticket elegible sin alterar su ejecución. |
| `HTTP queue requires exact origin and token and only accepts ticket identifiers` | Integration | API HTTP real: origen, token, campos permitidos, identificadores y duplicados. | Restringir la cola a solicitudes autenticadas y tickets concretos. |
| `implementation-message endpoint copies only a currently ready ticket without queueing or writing` | Integration | Generación HTTP del mensaje, revalidación tras cambios y ausencia de envíos, recibos o escrituras. | Permitir copiar instrucciones sin ejecutar ni encolar trabajo. |
| `queued cross-feature ticket names every revalidated dependency in the agent instruction` | Integration | Mensaje construido con dependencias de otra feature cargadas desde disco. | Dar al agente la lista exacta de dependencias revalidadas. |
| `browser displays linked destination, Sending and Queued separately from execution` | E2E | UI real de destino, envío, recibo persistido, recarga y botones habilitados; entrega simulada. | Distinguir la cola del estado de implementación y evitar dobles envíos. |

## Actualización en tiempo real

Fuente: [tests/live-viewer.test.mjs](../tests/live-viewer.test.mjs).

| Test | Categoría | Qué se prueba | Objetivo |
| --- | --- | --- | --- |
| `watcher observes a newly created tree, atomic saves, dependencies, config, renames and removal` | Integration | Watcher real: creación de .scratch, guardados por rename, labels, hashes, descripciones, configuración y borrado/recreación. Ignora archivos ajenos; exige actualización normal en menos de un segundo. | Mantener snapshots actuales ante distintas formas de guardar y organizar archivos. |
| `watcher recalculates a cross-feature dependency when its target changes or disappears` | Integration | Cambios, renombrado y eliminación del bloqueante de otra feature. | Actualizar estado y enlace del dependiente en tiempo real. |
| `live browser preserves workspace, navigates history, reconnects and falls back after deletion` | E2E | UI y actualizaciones reales: filtros, splitters, scroll, historial, recarga, sidebar, favicon, cursores y reduced motion. Reinicio del servidor, árbol ilegible, recuperación, vista móvil y ticket eliminado. | Actualizar sin perder el contexto de lectura y recuperarse de desconexiones o cambios del árbol. |

## Servidor, visor y controles de usuario

Fuente: [tests/viewer.test.mjs](../tests/viewer.test.mjs).

| Test | Categoría | Qué se prueba | Objetivo |
| --- | --- | --- | --- |
| `HTTP viewer isolates repositories and rejects write requests, traversal and foreign origins` | Integration | Dos servidores con repos distintos, recursos estáticos, API y rechazo de escrituras, traversal y orígenes ajenos. | Aislar repositorios y conservar la lectura segura de tickets. |
| `session API accepts only indexed destinations and authenticated Exit stops only its viewer` | Integration | API de sesiones autenticada, selección/desvinculación, parada del servidor y limpieza de registro; otro visor sigue activo. | Limitar cambios de destino y detener solamente la instancia solicitada. |
| `browser renders original Markdown and hashes, with inert checkboxes and sanitized content` | E2E | Markdown, tablas, código, hashes, tabla de metadatos y checkboxes deshabilitados; sanitización de HTML/URLs, layout y Refresh. | Mostrar contenido fiel y seguro sin permitir editar tickets desde la UI. |
| `detached launcher reuses same repo, separates another repo and stops only its own instance` | Integration | Launcher y procesos reales: reutilización por repo, destino de sesión, conflicto de destino y parada selectiva. | Ejecutar el visor en background sin duplicar ni detener otras instancias. |
| `browser filters use label OR and status AND and navigate to blockers outside filters without writes` | E2E | Combinación de filtros, vacíos, limpieza, criterios, bloqueantes, enlaces Markdown y recalculo tras completar una dependencia. | Navegar a dependencias conservando los filtros y los archivos originales. |
| `browser follows a qualified blocker to the exact feature while preserving filters` | E2E | Navegación desde una referencia calificada hacia otra feature en navegador real. | Abrir el bloqueante exacto sin perder el contexto de filtrado. |
| `browser selects and unlinks Codex sessions, closes the menu accessibly and exits without closing its tab` | E2E | Menú de sesiones, proyectos y filtro de origen; Escape/foco y click exterior; selección/desvinculación, copia y Exit con fallo/reintento. | Completar los controles de sesión y salida con feedback claro. La escritura al portapapeles se simula. |

## Instalación y actualización

Fuente: [tests/install-skill.test.mjs](../tests/install-skill.test.mjs).

| Test | Categoría | Qué se prueba | Objetivo |
| --- | --- | --- | --- |
| `isolated installation is complete, launches two repositories, and updates explicitly` | E2E | Instalación en directorio temporal con dependencias reales; CLI instalado y dos visores, incluyendo rutas con espacios. Actualización explícita, preservación de skills/config ajenas, rollback por fallos, limpieza, locks y rechazo de destinos no administrados o solapados. | Verificar que la skill instalada funciona fuera del checkout y que instalar/actualizar protege datos existentes. |

Este E2E es de sistema: usa npm, archivos y procesos reales, sin navegador. Los casos de fallo de dependencias se provocan intencionalmente. No publica ni instala el paquete desde el registry de npm.

## Vista del grafo de dependencias

Fuente: [tests/graph-view.test.mjs](../tests/graph-view.test.mjs).

| Test | Categoría | Qué se prueba | Objetivo |
| --- | --- | --- | --- |
| `graph projection preserves local tickets, first explicit label and blocker-to-dependent edges without mutating input` | Unit | Proyección de la feature, dirección de aristas, marca externa y primera label explícita, sin mutación de datos. | Conservar el contexto local y distinguir labels declaradas del triage agregado. |
| `graph layout places prerequisites before dependents with deterministic bounded coordinates` | Unit | Layout de cadenas y ramas, orden determinista, coordenadas únicas y límites. | Situar bloqueantes antes de dependientes dentro del espacio del grafo. |
| `graph projection keeps cycles and invalid references visible without fabricating targets` | Unit | Ciclos, errores y referencias sin destino, con coordenadas válidas. | Mantener visibles los problemas sin crear nodos ficticios ni impedir el render. |
| `graph projection handles empty features and tickets without explicit labels` | Unit | Feature vacía, ticket sin label explícita y ausencia de dependencias. | Manejar estados vacíos y borde neutro. |
| `browser graph navigates tickets, retains filtered context and updates live with original files untouched` | E2E | SVG y colores reales, hover, selección, detalle, filtros, flechas externas, cambios en vivo, historial y regreso a lista. | Integrar el grafo con la navegación existente sin modificar tickets. |
| `browser graph exposes cycles, invalid references and neutral labels within a responsive accessible panel` | E2E | Errores, contenido malicioso escapado, foco, Enter/Space, panel redimensionado, móvil y feature vacía. | Mostrar un grafo navegable y contenido seguro sin desbordar el layout. |

El E2E de instalación también comprueba que `/graph.mjs` se sirve desde la skill instalada. Estas pruebas no cubren arrastre, pan/zoom, aislamiento ni programación de componentes: corresponden a los siguientes tickets.

## Planificación y entrega de componentes

Fuente: [tests/component-queue.test.mjs](../tests/component-queue.test.mjs). Contrato: [API de componentes](component-queue-api.md).

| Test | Categoría | Qué se prueba | Objetivo |
| --- | --- | --- | --- |
| `component planner discovers weak connectivity and orders available work by dependencies then number` | Unit | Pertenencia local, ramas, desempate entre disponibles, determinismo y ausencia de mutación. | Planificar el componente completo desde un ticket raíz sin confiar en filtros ni listas del cliente. |
| `component planner keeps completed bridges as context and identifies the first external pause` | Unit | Conectividad mediante completados, orden pendiente, bloqueantes externos y punto inicial de pausa. | Omitir trabajo terminado conservando contexto y advertencias. |
| `component planner rejects ineligible members, cycles, invalid references and empty work` | Unit | Triage no aprobado, ejecución no pendiente, ciclos, referencias inválidas y conjunto completado. | Evitar programar trabajo inelegible o inexistente. |
| `component planner validates transitive external structure and refuses discarded or inconsistent prerequisites` | Unit | Prerrequisitos transitivos inválidos, descartados, ciclos externos y completados con dependencias pendientes. | No tratar una confirmación externa como permiso para ignorar errores. |
| `component review and copy are read-only and one delivery preserves the validated instruction and individual readiness` | Integration | Archivos reales, revisión, copia sin ledger, mensaje y una entrega simulada; envío individual sigue bloqueado por dependencias pendientes. | Entregar una secuencia sin escribir tickets ni relajar el flujo individual. |
| `component confirmation binds full relevant files, membership, dependencies and destination to the reviewed plan` | Integration | Revisión obsoleta por cambios de contenido, contexto externo, integrantes, aprobación, ejecución o destino; cambios ajenos no invalidan el plan. | Exigir una revisión vigente y rechazar firmas inventadas. |
| `external dependencies require explicit current-plan confirmation and never add external work` | Integration | Confirmación externa, cancelación sin efectos y revalidación tras resolver un bloqueante. | Advertir sobre la pausa sin incluir trabajo de otra feature. |
| `component reservations block concurrent, overlapping and restarted sends and protect destination changes` | Integration | Solicitudes simultáneas, solapamiento entre flujo individual y conjunto, cambio de sesión y ledger tras reinicio. | Reservar una sola entrega antes de invocar al agente. |
| `manual component resumption skips completed work and requires acknowledgment of a previously paused flow` | Integration | Prefijo completado, revisión nueva, confirmación humana de pausa, copia sin efectos y reemplazo de reservas del trabajo restante. | Permitir una reanudación explícita sin deducir pausa efectiva del recibo Queued. |
| `failed and interrupted component deliveries stay reserved without automatic retry` | Integration | Error simulado, recibos Sending interrumpidos y recuperación del ledger. | Conservar bloqueada una entrega incierta y evitar reintentos. |
| `component HTTP endpoints enforce authentication, strict payloads and reviewed plan confirmation` | Integration | HTTP real: origen/token, Content-Type, campos permitidos, identificadores y revisión antes de copiar/enviar. | Mantener los límites de confianza en los tres endpoints nuevos. |
| `component HTTP endpoints decode split Unicode and apply the byte limit on every new route` | Integration | Caracteres UTF-8 repartidos entre chunks y cuerpos superiores a 4096 bytes en plan/message/queue. | Decodificar correctamente y acotar las entradas del servicio. |

La entrega se simula: las pruebas del mensaje verifican reglas de relectura, atomicidad, pausa, preguntas en CLI y commits. No observan una implementación real del conjunto ni prueban los controles de UI previstos en 04.

## Regresiones de la auditoría

Fuente: [tests/audit-regressions.test.mjs](../tests/audit-regressions.test.mjs).

| Test | Categoría | Qué se prueba | Objetivo |
| --- | --- | --- | --- |
| `Markdown cannot invoke queue/copy actions but resolved ticket links still navigate` | E2E | HTML malicioso con atributos de acciones, ausencia de solicitudes/envíos y navegación por enlaces legítimos. | Impedir que el contenido del ticket invoque controles privilegiados. |
| `installer preserves a destination created while staging` | Integration | Creación concurrente del destino durante staging, usando instalación de dependencias simulada. | Rechazar el conflicto sin borrar datos creados por otro proceso. |
| `session names and UUIDs share duplicate protection, including legacy name records` | Integration | Resolución de nombres a UUID, recibos antiguos, migración, renombrado y nombres ambiguos; entrega simulada. | Mantener la protección contra duplicados aunque cambie el nombre de la sesión. |
| `queue and copy reject missing structure, missing pending execution, and invalid completed dependencies` | Integration | Tickets incompletos, Execution ausente o distinto de pending y dependencias completadas estructuralmente inválidas. | Exigir validación estricta antes de generar o enviar instrucciones. |
| `absence markers cannot conceal explicit dependencies` | Unit | Expresiones contradictorias como none junto con una referencia local o entre features. | Evitar que una declaración de ausencia oculte un bloqueante explícito. |
| `feature filters retain cross-feature state and CLI validation` | Integration | Índice filtrado y CLI sobre un grafo con dependencias externas a la feature seleccionada. | Filtrar la salida sin recortar el grafo usado para validar y calcular estados. |
| `all authenticated POST routes decode split Unicode and retain byte limits` | Integration | HTTP real con un carácter UTF-8 dividido entre chunks en queue, copy y session; rechazo por límite en bytes. | Decodificar cuerpos correctamente y mantener el límite de tamaño. |
| `unknown first CLI arguments fail before installation` | Integration | Proceso CLI con una opción desconocida y protección de la fixture contra una instalación accidental. | Rechazar errores de uso antes de iniciar acciones de instalación. |
| `published package, embedded skill and lockfiles have one matching release version` | Integration | Versiones de los dos package.json y sus lockfiles, incluyendo el paquete raíz de cada lock. | Evitar versiones divergentes en los artefactos locales de release. No consulta el registry. |

## Ejecución

Desde la raíz del repositorio, con **Node.js 24 o superior** y npm:

```sh
npm ci
npm ci --prefix skills/tripi-tropi
npm test
```

Ejecutar un archivo o un test por nombre:

```sh
node --test tests/tickets.test.mjs
node --test --test-name-pattern="absence markers" tests/audit-regressions.test.mjs
```

Los **9 tests de navegador** necesitan un ejecutable compatible con Chromium y Playwright. En Windows buscan Edge en su ubicación estándar; en otros sistemas hay que indicar el ejecutable. Si no está disponible, se marcan como **skipped**, por lo que una suite sin fallos no garantiza que se haya probado la UI.

Ejemplo en PowerShell:

```powershell
$env:TRIPI_TROPI_BROWSER = 'C:\path\to\chrome.exe'
npm test
```

El E2E de instalación puede necesitar acceso a npm o un cache utilizable para instalar dependencias. Los tests usan repositorios y destinos temporales y limpian sus fixtures; algunos tests de navegador guardan capturas en `.cache/` del checkout.

La validación de los tickets actuales es un control adicional, separado de estos 65 tests:

```sh
npm run validate:tickets
```

## Límites de cobertura

- No se verifica entrega real a Codex, Claude u OpenCode, ni la ejecución posterior del mensaje por un agente.
- No se comprueba publicación en npm ni instalación desde una versión publicada en el registry.
- Los hashes de fixtures prueban formato y visualización; no demuestran que existan commits reales con esos hashes.
- Las capturas guardadas no se comparan con una referencia: no hay una suite de regresión visual por imágenes.
- Hay comprobaciones puntuales de accesibilidad y un límite temporal del watcher, pero no una auditoría completa de accesibilidad ni benchmarks de carga o consumo de tokens.
- La suite no configura una matriz de ejecución para distintos sistemas operativos.

El catálogo describe comprobaciones existentes, no una medición de cobertura de líneas o ramas.
