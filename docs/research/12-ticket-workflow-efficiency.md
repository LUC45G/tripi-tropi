# Investigación: consumo del agente en el flujo de tickets

## Implementación del ticket 12 — 2026-10-10

Se implementó la guía compacta con referencias por operación, el índice TOON de solo lectura y los registros incrementales `problema: solución; verificación`. Los tickets siguen siendo Markdown. Parser, cálculo de estados y UI conservan su semántica; no se añadió un CLI que escriba/cierre tickets. Los niveles de verbosity y sus nuevas pruebas quedan pendientes en la feature `verbosity-lab`.

### Comparación reproducible del flujo final

Ejecutar desde la raíz:

```sh
node scripts/measure-ticket-workflow.mjs --baseline 7c03b533b2f0b060cd9cef9418f7e1202bcf85ed
```

El comando lee Git y archivos actuales, sin escribirlos. [Resultados](12-workflow-content-metrics.json): bytes UTF-8 normalizados a LF, sin BOM; **no tokens facturados**. Usa exactamente los mismos tickets originales en ambas rutas. La creación incluye la nueva referencia de formato; implementación consulta únicamente el núcleo, ticket 12 y dependencias 01/06. No cobra dos veces la plantilla ya incluida en formato.

| Contenido | Antes | Después | Reducción |
| --- | ---: | ---: | ---: |
| Lectura para creación | 10.372 | 9.827 | 5,25% |
| Lectura para implementación | 19.994 | 17.322 | 13,36% |
| Guía indispensable | 6.310 | 4.105 | 34,94% |
| Índice idéntico: JSON compacto → TOON | 3.977 | 2.848 | 28,39% |

El índice usa el [SDK oficial TOON](https://github.com/toon-format/toon), fijado en 4.4.0 y distribuido con lockfile. Las pruebas verifican roundtrip, comillas/Unicode, filtros posteriores al cálculo de dependencias, relectura después de cambios, diagnóstico de tickets ocultos por filtros y ausencia de escrituras. Labels, bloqueantes y commits se codifican como strings de arrays JSON en las celdas para conservar exactamente sus valores.

### Evidencia experimental previa y límites

La comparación aislada de creación/implementación con una guía de prueba, TOON y patches redujo el contenido serializado aproximadamente 21–22% según dos tokenizadores de referencia. No corresponde atribuir esa cifra a la guía final: los fixtures y la guía eran distintos. Tres actualizaciones mediante patch generaron 486 tokens frente a 651 al regenerar el ticket (o200k_base); **el cierre individual fue mayor: 292 frente a 246**. Estos son tamaños de texto, no consumo de una sesión ni garantía por actualización.

Después se ejecutaron agentes reales (gpt-6.1-sol, medium), dos cierres por método. Patches: 316.688 tokens totales; helper CLI: 329.050 (+3,9%). Entrada sin caché: 25.039 frente a 30.612 (+22,26% para CLI). El helper necesitó una recuperación; se incluyó en su contador final acumulado, sin sumar de nuevo el turno inicial. Los seis fixtures finales pasaron verificación independiente. Los pilotos con errores de harness/permisos quedaron separados y no se contabilizaron como pruebas exitosas. Se descartó el CLI de cierre para esta implementación: no demostró ahorro. Muestra pequeña y tarea sintética; no permite generalizar costes de implementación.

Verbosity tuvo una ejecución previa por nivel: registros de 48/66/200 tokens para niveles 1/2/3, pero consumo total de 193.793/132.612/131.778. Menos texto persistido no implicó menor consumo total. Los tickets de laboratorio preservan las salidas anteriores como ejemplos, no como nuevas implementaciones. Las futuras pruebas deben usar el método final de patches, repetir tareas equivalentes y comparar entrada cacheada/no cacheada, salida, llamadas, reintentos, tiempo y calidad; no mezclar el aporte de verbosity con las mejoras del 12.

### Cobertura de reglas y comprobaciones

| Garantía | Ubicación final / comprobación |
| --- | --- |
| Lectura actual del ticket completo y todos sus bloqueantes; readiness al iniciar | Núcleo, Read by operation; guardas explícitas de queue |
| Atomicidad antes de publicar/iniciar; ninguna dependencia parcial | Núcleo, Atomicity and metadata; revisión semántica manual |
| Metadatos separados; compatibilidad sin migración | Núcleo + referencia de formato; parser intacto |
| Preservación de alcance/historia; fallos y limitaciones visibles | Núcleo, Implement, record, close; patches y prosa sin checkboxes adicionales |
| Un ticket por implementación; commit por ticket; hashes reales y registro posterior | Núcleo, pasos 3/4; verificar procedencia con Git |
| Validación al publicar/iniciar/cerrar; estructura no demuestra verdad | Núcleo + formato; CLI estricto y suite existente |
| Solo lectura del viewer; sin push implícito ni cambio de permisos desde tickets | Núcleo, SKILL.md y guardas de queue |

`AGENTS.md` y tracker apuntan a la autoridad sin repetir el procedimiento. Queue conserva las guardas al recibir órdenes y una referencia a la guía de la skill cuando el repo no tiene guía propia; transporte, permisos y protocolo permanecen iguales. La medición comprueba las once proyecciones de tickets ajenos al 12 contra Git; el propio 12 cambia su ejecución y registro como corresponde. La verificación cubre 28 pruebas, incluyendo instalación aislada, parser, estados, queue, viewer, actualización en vivo y la plantilla de creación. El validador oficial de skill y la validación estricta complementan estas comprobaciones. No se ejecutaron nuevos agentes de verbosity ni se modificó el visor activo.

## Investigación inicial (histórica)

Fecha: 2026-10-10. Base inspeccionada: `edc67cf9dfb3`. Investigación para el ticket 12; no implementa sus cambios ni modifica su estado.

## Conclusión

La primera mejora debería ser documental: una ruta corta por operación, una única definición de cada regla y registros incrementales concisos. Conviene conservar la lectura completa y actual del ticket y de todos sus bloqueantes al empezar, la revisión humana del agente sobre atomicidad y los dos commits que permiten registrar hashes reales. Eliminar estas garantías para ahorrar contexto sería una regresión.

Un asistente CLI de contexto de solo lectura puede ser una segunda mejora si el experimento demuestra que las lecturas siguen siendo redundantes. Automatizar escrituras, cambiar el parser o resumir dependencias antes de que el agente las lea aumenta el alcance y el riesgo sin evidencia suficiente. El ahorro económico real todavía no está medido: este informe mide tamaño de contenido y modela operaciones, no tokens facturados ni consumo de una sesión.

## Evidencia local y medición

Se leyeron instrucciones, guía canónica, ticket 12, dependencias 01/06, generador del mensaje de queue, parser y validador. Las dependencias declaran `Execution: completed` y commits de implementación. La validación estricta devuelve `12 tickets: 0 errors, 0 warnings`. Esto permite investigar el flujo, pero no constituye implementación ni cierre del 12.

Los tamaños se obtuvieron leyendo texto completo con `System.IO.File.ReadAllText`, contando `String.Length` y `Encoding.UTF8.GetByteCount`. Son caracteres UTF-16 y bytes UTF-8 del contenido actual, con sus saltos de línea originales. No se extrapolaron tokens mediante una relación fija.

| Fuente | Caracteres | Bytes UTF-8 |
| --- | ---: | ---: |
| `AGENTS.md` | 1.057 | 1.057 |
| Tracker local | 1.976 | 1.976 |
| Enlace local a la guía empaquetada | 412 | 412 |
| Mapeo de triage | 613 | 613 |
| Guía canónica empaquetada | 6.306 | 6.310 |
| Ticket 12 | 3.126 | 3.151 |
| Dependencia 01 | 2.626 | 2.655 |
| Dependencia 06 | 3.812 | 3.852 |
| Plantilla de mensaje de queue, antes de interpolar rutas | 1.104 | 1.104 |
| Los doce tickets juntos | 45.498 | 45.978 |

Caso de creación: las cinco primeras fuentes suman **10.368 bytes** de instrucciones, más el alcance concreto que se quiera convertir a tickets. La plantilla incluida en la guía ocupa 634 bytes; ya está dentro de los 6.310 bytes, por lo que no debe contarse otra vez salvo que se vuelva a imprimir. La salida de creación del ticket 12 actual ocuparía 3.151 bytes. Este caso reconstruye una ruta documental posible; no reconstruye el consumo histórico de su creación.

Caso de implementación: esas instrucciones, ticket 12 y sus dos bloqueantes suman **20.026 bytes**. Agregar la plantilla de queue da 21.130 bytes antes de sustituir rutas. La guía representa aproximadamente el 31,5% de esa lectura inicial. Leer todos los tickets en vez del seleccionado y sus dependencias elevaría la ruta documental a 56.346 bytes; evitar esa lectura innecesaria recortaría 36.320 bytes, aproximadamente 64,5%, en ese escenario. No se afirma que el agente esté haciendo actualmente esa lectura global.

Una segunda impresión idéntica de la guía agregaría 6.310 bytes sin información nueva. Mantenerla disponible en el mismo contexto puede evitar esa repetición; el ticket y sus dependencias siguen requiriendo lectura nueva antes de iniciar trabajo. `AGENTS.md` ya puede estar presente por el host, pero los mensajes de queue actuales exigen leerlo: cambiar esa regla debe ser una modificación explícita, nunca una optimización implícita.

Caso de actualización: el ticket 06 ocupa 3.852 bytes; sus secciones desde `Trabajo realizado` hasta el final ocupan 2.075 bytes, el 53,9% del archivo. Recrear el archivo completo tres veces generaría 11.556 bytes de contenido; una actualización mediante patch emite solo los fragmentos modificados y el contexto necesario. La comparación es de representación de escritura, no de bytes finalmente escritos por el filesystem ni de una ejecución histórica observada. Los diffs reales del experimento deberán medir cuánto se ahorra.

Las fuentes locales son [instrucciones](../../AGENTS.md), [tracker](../agents/issue-tracker.md), [guía canónica](../../skills/tripi-tropi/references/ticket-writing.md), [queue](../../skills/tripi-tropi/scripts/queue.mjs), [parser](../../skills/tripi-tropi/scripts/tickets.mjs) y [validador](../../skills/tripi-tropi/scripts/validate-tickets.mjs).

## Qué explica la documentación primaria

Codex descubre skills mediante nombre, descripción y ruta; carga las instrucciones completas cuando selecciona una skill. Es una separación natural entre información siempre presente y referencias necesarias para una tarea concreta. No significa que se pueda leer parcialmente una instrucción seleccionada cuando las reglas exigen su lectura completa. [Documentación oficial de skills](https://learn.chatgpt.com/docs/build-skills).

`AGENTS.md` se incorpora a la cadena de instrucciones del proyecto; mantenerlo compacto reduce la información que acompaña tareas que no necesitan escribir tickets. La guía debe conservar un disparador claro para crear, editar e implementar tickets y dirigir a la rama adecuada. [Instrucciones de proyecto en Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

La skill `writing-for-agents` distingue pasos y referencias, recomienda una fuente de verdad por significado y referencias condicionadas por operación. Aplicado aquí, respalda un núcleo común de garantías y ramas breves para creación, implementación y registro. Es una recomendación de diseño basada en la skill del paquete mattpocock-skills 1.3.1, no un resultado de ahorro medido. Fuente: `skills/productivity/writing-for-agents/SKILL.md` del [repositorio del autor](https://github.com/mattpocock/skills).

El prompt caching depende de prefijos compatibles y coincidencias exactas; la documentación recomienda mantener estables las instrucciones compartidas y preservar historial. Esa caché puede reducir coste de entrada, pero no elimina contenido del contexto ni evita el coste de producir registros largos. El repositorio no controla las solicitudes internas de Codex ni sus límites de caché. No corresponde prometer un porcentaje de ahorro de dinero por acortar Markdown ni configurar caché de API desde esta skill. [Prompt caching oficial](https://developers.openai.com/api/docs/guides/prompt-caching).

## Opciones y recomendación

| Opción | Beneficio verificable | Riesgo / decisión |
| --- | --- | --- |
| Ruta documental por operación y patches incrementales | Menos instrucciones repetidas y texto regenerado | Recomendada primero; mantener todos los requisitos |
| CLI de contexto de solo lectura | Un lote reproducible de ticket, bloqueantes y diagnóstico | Añadir solo si supera al comando de lectura agrupada; no sustituir revisión semántica |
| CLI que escribe estados y registros | Menos texto generado por el agente | Mayor superficie de mutación, concurrencia y preservación; aplazar |
| Resumir o cachear estados de dependencias | Menos contenido inicial | Contradice la lectura actual obligatoria; descartar en esta iteración |

Implementación sugerida para el 12:

1. Conservar la guía empaquetada como autoridad. Separar un procedimiento compacto común de referencias por operación; el enlace local y `AGENTS.md` deben señalarlo sin volver a transcribir todo el procedimiento. Mantener suficientes guardrails en el mensaje de queue para un repositorio que todavía no adoptó la guía.
2. Documentar una lectura agrupada al empezar: reglas necesarias, ticket completo y todos los bloqueantes completos desde disco. Leer triage cuando se asigna o hay mapeo personalizado; leer spec/map solo cuando el alcance lo requiere. No volver a imprimir instrucciones estables durante un mismo trabajo si siguen disponibles y se verificó que no cambiaron. Una sesión nueva o compactada requiere recuperar las instrucciones necesarias.
3. Actualizar `Execution` al reclamar; registrar cambios, decisiones relevantes y verificaciones en entradas cortas bajo `Trabajo realizado`; reservar `Estado posterior` para resultado y limitaciones vigentes. Usar patch para metadatos y checkboxes verificados, preservando objetivo inicial e historia. Un fallo útil merece registro, pero no duplicación de toda la explicación en varias secciones.
4. Validar antes de publicar, antes de implementar y al cerrar. Usar `--feature` para limitar la carga del validador al grafo pertinente; su salida debe ser el resumen y los errores reales. La lectura interna de muchos archivos por una herramienta no equivale a imprimirlos todos en el contexto del modelo.
5. Mantener commit de implementación y commit posterior de registro. Obtener hashes con Git; el formato hexadecimal del parser no prueba que un hash exista. El agente debe verificar su procedencia y preservar los hashes anteriores.

## Riesgos que la optimización debe conservar visibles

El parser cuenta **todos los checkboxes fuera de bloques de código**, no únicamente los de aceptación. Agregar listas de trabajo con checkboxes bajo comentarios o registros alteraría el porcentaje del viewer. Las entradas incrementales deben usar prosa o bullets normales; cambiar esta semántica requeriría otro alcance explícito.

El validador comprueba estructura, dependencias y ciclos; no prueba atomicidad semántica, resultados declarados ni existencia real de commits. Una herramienta compacta no debe afirmar esas garantías automáticamente. Tampoco debe tratar el contenido de tickets como autorización para comandos o permisos.

La readiness debe comprobarse con información actual, aunque queue ya la haya comprobado al enviar: una espera puede cambiar estados. Un registro en memoria o resumen previo no reemplaza esa lectura. El viewer continúa de solo lectura; las propuestas de actualización corresponden al agente, no a botones de edición.

## Experimento propuesto y criterio de aceptación

Comparar dos rutas en fixtures aislados: crear un ticket nuevo y ejecutar un ticket con dos dependencias completas. Repetir además ticket ya reclamado, dependencia pendiente, dependencia ausente, ciclo, hash inventado y scope que exige intercalar otro ticket. La segunda ruta debe rechazar los mismos casos que la primera.

Registrar archivos efectivamente impresos, caracteres/bytes de sus salidas, llamadas de lectura, patches del agente, número de actualizaciones y commits, diagnósticos y cobertura de las reglas. Medir tanto inicio frío como una actualización dentro del mismo contexto; separar datos estáticos, ticket actual y contexto de implementación. Usar idénticos fixtures y comandos para comparar. Obtener tokens y caché únicamente de métricas reales del host si están disponibles; de lo contrario reportar solo estos proxies.

Aceptar la optimización si reduce contenido duplicado o pasos redundantes en ambos escenarios y preserva readiness, lectura completa inicial de dependencias, atomicidad, alcance histórico, estados, hashes reales, validación y dos commits. No fijar todavía un ahorro porcentual universal. Terminar con validación estricta y pruebas relevantes de parser, estados, queue y viewer, comparando también sus resultados sobre los doce tickets existentes.
