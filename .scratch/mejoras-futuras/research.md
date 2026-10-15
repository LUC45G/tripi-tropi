# Oportunidades futuras para tripi-tropi

Fecha de investigación: **2026-10-15**. Entrega de `mejoras-futuras:01`; propuestas para revisar, sin implementación ni aprobación automática de alcance.

## Conclusión y alcance

La oportunidad más respaldada es ayudar a distinguir **un ticket estructuralmente válido de un trabajo realmente ejecutable y verificable**. Conviene probar primero revisión semántica del lote, explicación de readiness y medición real del trabajo. Otra vista de grafo, otro instalador o más formatos obligatorios no resuelven esos problemas.

La prioridad es una recomendación de producto, no un ranking estadístico de demanda. Se revisaron instrucciones del repositorio, README, skill, guía/formato, GLOSSARY, índice de sus 27 tickets, backlog de esta feature, documentación de pruebas y estudios de consumo existentes; también parser, estados y validaciones de queue. No había ADR locales. Fuentes externas: skill y documentación upstream actuales, issues completos con respuestas del mantenedor, una discusión de usuarios y documentación primaria de herramientas adyacentes.

Se distinguen tres niveles: **reporte de usuario** (un caso, no una encuesta), **capacidad documentada** (demuestra una alternativa técnica, no demanda) e **hipótesis de producto** (necesita validación). Algunos issues están etiquetados `ai-drafted-feedback`; se explicita cuando afecta el peso de la evidencia. Los estados siguientes son los observados en páginas completas; varios resultados del buscador conservaban estados anteriores.

## Qué necesita la gente: evidencia y vigencia

| Señal primaria | Lectura prudente al 2026-10-15 |
| --- | --- |
| [#265: dependencias de interfaz omitidas](https://github.com/mattpocock/skills/issues/265) | Abierto, `ready-for-human`. Un usuario describe lógica duplicada porque un criterio necesitaba el mecanismo de otro ticket sin declararlo como bloqueante. El mantenedor reconoce el caso real y mantiene la cuestión abierta. |
| [#310: camino de integración sin dueño](https://github.com/mattpocock/skills/issues/310) | Abierto, `ready-for-human`, con cuerpo etiquetado como redactado por IA. Reporta una conexión omitida entre preparación y UI; el mantenedor reconoce la sesión y la decisión pendiente. |
| [#595: criterios no falsificables](https://github.com/mattpocock/skills/issues/595) | Cerrado. El autor reporta criterios que ya pasaban, evaluaban trabajo ajeno o repetían el pedido. Sus números de reintentos son una anécdota no verificada, no una tasa generalizable. |
| [#478: layout local inconsistente](https://github.com/mattpocock/skills/issues/478) | Cerrado como completado el 6 de octubre. La confusión `tickets.md` frente a archivos en `.scratch/` fue real; el mantenedor declara canónica una ruta por ticket. No se presenta como bug upstream vigente. |
| [#513: texto sin vínculo bloqueante nativo](https://github.com/mattpocock/skills/issues/513), [#554: relación con spec](https://github.com/mattpocock/skills/issues/554) | Ambos cerrados como completados el 6 de octubre. Son evidencia histórica de pérdida de relaciones, no justificación para afirmar que upstream sigue sin soportarlas. |
| [#826: consumo inesperado](https://github.com/mattpocock/skills/issues/826) | Cerrado como no planificado; cuerpo etiquetado como redactado por IA. El mantenedor atribuye el fan-out a instrucciones locales, ausente en la skill publicada. Los tokens que reproduce el autor no son mediciones independientes. |
| [#810: tracker externo y varios repos](https://github.com/mattpocock/skills/issues/810) | Cerrado como no planificado, cuerpo etiquetado como redactado por IA. Necesidad específica de un usuario con worktrees efímeros y unos diez repos; el mantenedor recomienda configurar `Other`. No prueba una necesidad mayoritaria. |

La [skill upstream](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-tickets/SKILL.md) pide cortes verticales verificables, tamaño apto para un contexto fresco, aprobación del desglose, dependencias explícitas y publicación según tracker. Su plantilla local es más pequeña que la guía de tripi-tropi. La [documentación upstream](https://github.com/mattpocock/skills/blob/main/docs/engineering/to-tickets.md) también explica problemas de fragmentación excesiva, specs grandes y cierre incompleto; esas descripciones son afirmaciones del proyecto, no una medición de prevalencia realizada aquí.

## Propuestas priorizadas

Las estimaciones de esfuerzo son relativas, no compromisos de calendario. Todas conservan el viewer de solo lectura: mostrar, explicar, copiar o entregar solicitudes al agente; cualquier modificación de tickets queda en el flujo autorizado del agente.

### 1. Revisar la ejecutabilidad y cobertura del lote antes de implementarlo

- **Problema y beneficiario:** quien aprueba un conjunto puede ver archivos válidos y aun así tener dependencias implícitas, criterios ajenos o un camino de integración sin dueño. Evidencia directa: [#265](https://github.com/mattpocock/skills/issues/265) y [#310](https://github.com/mattpocock/skills/issues/310); son necesidades reconocidas, aunque no cuantificadas.
- **Propuesta mínima:** copiar o solicitar una revisión del lote contra la spec: para cada resultado, quién lo entrega, qué prerrequisitos necesita y qué observación demostraría que falta. El agente devuelve hallazgos y propuestas de relaciones, sin corregir ni aprobar automáticamente. Complementa `Clarify ticket`; no repite su entrevista individual ni `Split ticket`.
- **Criterios verificables:** incluir el problema descrito en [#595](https://github.com/mattpocock/skills/issues/595): identificar criterios que ya pasan en la base o verifican trabajo ajeno. Ensayar una muestra manual antes de convertir esa revisión en nuevos campos obligatorios; contar criterios no prueba su calidad.
- **Impacto / esfuerzo / riesgo:** alto / medio / falsos positivos y más consumo si se lee todo indiscriminadamente. No convertir heurísticas de texto en errores estructurales.
- **Dependencias:** selección del lote y fuente de alcance; reutilizar validación e instrucciones existentes. Falta decidir límites de contexto y aprobación.
- **Experimento:** cinco lotes pequeños, incluyendo dos con un bloqueante omitido conocido y uno correcto; comparar hallazgos humanos y del agente, falsos positivos y consumo total. No publicar una promesa de detección automática.

### 2. Explicar por qué se puede leer un ticket pero no enviarlo

- **Problema y beneficiario:** un usuario recién llegado puede instalar `to-tickets`, generar su plantilla y verla correctamente, pero encontrar requisitos adicionales al implementar. La [confusión histórica del layout](https://github.com/mattpocock/skills/issues/478) y la [plantilla actual upstream](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-tickets/SKILL.md) justifican comprobar el primer uso. La fricción específica de tripi-tropi es una inferencia basada en su código, todavía sin entrevistas externas.
- **Propuesta mínima:** diagnóstico contextual que separe aprobación, ejecución, dependencias y formato; indicar exactamente qué falta para enviar, con enlace a la guía y opción de copiar una solicitud de adaptación al agente. Mostrar que una advertencia legacy no impide leer. No migrar archivos, adoptar reglas ni relajar validación silenciosamente.
- **Impacto / esfuerzo / riesgo:** alto / bajo a medio / confundir una regla propia con un requisito de upstream.
- **Dependencias:** reutilizar diagnósticos actuales; revisar mensajes tanto en detalle como en revisión del conjunto. El parser ya soporta lectura legacy: no reconstruirlo.
- **Experimento:** tres personas con una feature upstream sin `Execution` ni `Commits`; medir si explican el bloqueo y encuentran el siguiente paso sin ayuda, antes y después del prototipo.

### 3. Métricas reales por solicitud, ticket y sesión

- **Problema y beneficiario:** quien compara flujos no sabe cuánto proviene de planificación, implementación, revisión o reintentos. [#826](https://github.com/mattpocock/skills/issues/826) muestra un incidente de orquestación custom y atribución confusa; no demuestra un defecto ni consumo típico de `to-tickets`.
- **Propuesta mínima:** comprobar si el host expone contadores fiables y, solo entonces, asociarlos a solicitudes y ventanas de trabajo: entrada cacheada/no cacheada, salida, duración, intentos y atribución compartida o desconocida. Mostrar `unavailable` donde falten datos. No convertir bytes a coste ni repartir el total de una sesión entre tickets por una fórmula arbitraria.
- **Impacto / esfuerzo / riesgo:** alto para usuarios intensivos / medio a alto / cambios de formatos, doble conteo y privacidad de sesiones. Sin telemetría oficial o local verificable, conservar solo un experimento manual.
- **Dependencias:** contrato de métricas del host por investigar; permisos explícitos para leer datos sensibles. Reutilizar [el estudio del ticket 12](../../docs/research/12-ticket-workflow-efficiency.md), que ya separa tamaños serializados de tokens y no probó ahorro económico general. No repetir TOON, verbosity ni el CLI de cierre descartado.
- **Experimento:** tres pares de tareas equivalentes, orden alternado, incluyendo intentos fallidos; registrar todo el consumo disponible y calidad con el mismo criterio de aceptación. Informar cobertura de atribución, no solo un porcentaje de ahorro.

### 4. Recuperar contexto al cambiar de sesión sin duplicar la historia

- **Problema y beneficiario:** tras una pausa, otra PC o una sesión nueva cuesta encontrar la última decisión y distinguirla de información obsoleta. [Beads](https://github.com/gastownhall/beads/blob/main/README.md) documenta memoria persistente, contexto de arranque y auditoría; es una capacidad competidora, no evidencia de adopción necesaria en tripi-tropi.
- **Propuesta mínima:** una vista de continuidad con enlaces a spec, trabajo/final, bloqueantes y commits ya existentes, fecha de lectura y diferencias relevantes desde una revisión local. Copiar un índice de fuentes para releer, sin resumirlas como verdad actual ni importar conversaciones enteras.
- **Impacto / esfuerzo / riesgo:** medio a alto / medio / resúmenes obsoletos o exposición de información personal si se amplía a logs. Empezar exclusivamente con archivos del proyecto.
- **Dependencias:** identidad y frescura de archivos; reutilizar índice TOON, selección y registros actuales. No reemplaza la lectura completa obligatoria antes de actuar.
- **Experimento:** retomar tres tickets después de una semana con una sesión nueva; medir tiempo y llamadas para identificar próximo paso y decisiones, verificando que detecte una dependencia cambiada.

### 5. Separar declarado completado, evidencia y resultado verificado

- **Problema y beneficiario:** el responsable de un lote necesita saber si un estado completado tiene evidencia consultable, no solo checkboxes. En la [discusión #1136](https://github.com/mattpocock/skills/discussions/1136) el autor de un ejecutor describe gates independientes del relato del agente y pregunta cómo otros deciden que un ticket terminó. Es un caso de usuario y herramienta, no un estándar de cierre demostrado.
- **Propuesta mínima:** presentar enlaces a commits y comprobaciones registradas, con avisos cuando un hash no existe en el checkout o falta evidencia. Diferenciar dato declarado de verificación efectuada; no ejecutar tests ni Git con efectos desde el viewer, ni declarar falso un hash ausente en un clon superficial.
- **Impacto / esfuerzo / riesgo:** medio a alto / medio / falsa confianza, commits externos y repos sin Git. Una referencia válida tampoco demuestra los criterios funcionales.
- **Dependencias:** lectura Git opcional y acotada; formato de evidencia por acordar. Ya mostramos hashes y exigimos verificaciones al agente: la novedad es corroboración y procedencia visibles.
- **Experimento:** fixtures con hash válido, inexistente, commit inaccesible por shallow clone y evidencia ausente; observar si el usuario distingue desconocido de inválido y completado de verificado.

### 6. Ayudar a elegir el siguiente ticket por efecto de desbloqueo

- **Problema y beneficiario:** con varias features listas, el usuario puede querer priorizar el trabajo que desbloquea un objetivo, sin revisar manualmente todos los caminos. Es una hipótesis; `bd ready` y prioridades en [Beads](https://github.com/gastownhall/beads/blob/main/README.md) muestran viabilidad conceptual, no demanda por este ranking.
- **Propuesta mínima:** lista opcional de candidatos realmente listos con cantidad y nombres de pendientes que desbloquearían, distinguiendo bloqueo directo de transitivo. Explicar el criterio; no llamarlo camino crítico temporal sin duraciones ni convertirlo en prioridad de negocio automática.
- **Impacto / esfuerzo / riesgo:** medio / bajo a medio / inducir a elegir una tarea técnicamente central pero poco valiosa.
- **Dependencias:** reutilizar grafo y estados; decisión humana del objetivo. No agrega otro planificador, scheduler paralelo ni envío automático.
- **Experimento:** dos backlogs con varias ramas; pedir elegir el próximo ticket con y sin indicador, registrando tiempo y motivos, no solo coincidencia con el ranking.

### 7. Interoperabilidad consultiva entre tickets locales y GitHub

- **Problema y beneficiario:** equipos mixtos necesitan conservar identidad, spec y dependencias cuando parte del trabajo vive en GitHub. Los reportes históricos [#513](https://github.com/mattpocock/skills/issues/513) y [#554](https://github.com/mattpocock/skills/issues/554) muestran pérdida de relaciones; ambos están resueltos upstream. [GitHub documenta dependencias nativas y su consulta](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies), distinta de una simple mención en el cuerpo.
- **Propuesta mínima:** estudiar primero enlaces de procedencia y comparación de un snapshot remoto obtenido explícitamente: qué relación falta o diverge. Una eventual exportación debe ser una propuesta o instrucción para el agente, nunca publicación ni sincronización bidireccional desde el viewer.
- **Impacto / esfuerzo / riesgo:** alto para equipos mixtos, bajo para local puro / alto / autenticación, límites API, caché obsoleta y conflictos de autoridad.
- **Dependencias:** acordar identificadores externos, tracker fuente y aprobación; no asumir que número local y número GitHub coinciden.
- **Experimento:** tres tickets locales y sus equivalentes en un repositorio de prueba, comparación de enlaces nativos frente a menciones y una divergencia deliberada; empezar sin escrituras remotas.

### 8. Tracker fuera del checkout y continuidad entre worktrees

- **Problema y beneficiario:** worktrees efímeros pueden eliminar el tracker y una feature puede atravesar varios repos. La necesidad específica está reportada en [#810](https://github.com/mattpocock/skills/issues/810); upstream la deja a configuración particular, no la prioriza como solución general.
- **Propuesta mínima:** investigar separar explícitamente directorio de tickets y repositorio de ejecución; primero soportar lectura desde una raíz autorizada, sin inferir rutas arbitrarias desde Markdown. Mantener una relación inequívoca entre ticket, repo, destino y recibo. Multi-repo completo sería una fase posterior, no parte implícita de esta mejora.
- **Impacto / esfuerzo / riesgo:** alto para ese nicho / alto / escapar límites de archivos, actuar en el repo incorrecto y duplicar reservas entre worktrees.
- **Dependencias:** diseño de identidades, aislamiento de rutas y autorización por repositorio; revisar launcher, watcher, enlaces locales, persistencia y queue conjuntamente.
- **Experimento:** dos worktrees temporales y un tracker externo autorizado; comprobar continuidad de lectura al reemplazar un worktree y rechazo de rutas no autorizadas. No habilitar queue multi-repo durante la prueba inicial.

## Lo que no corresponde vender como oportunidad nueva

- **Ya implementado:** instalación npm, modo lista/grafo, aislamiento de prerrequisitos y planificación, dependencias entre features, filtros, actualización en vivo, selección de sesión, copia de mensajes y `Clarify ticket` (`mejoras-futuras:05`).
- **Diseño aprobado, implementación pendiente:** `Split ticket` en [acciones-tickets.md](acciones-tickets.md), resultado del 02. No crear otro análisis equivalente.
- **Backlog abierto:** política de labels (03), cuándo crear features (04) y ajustes visuales de `tripi-tropi:07`. Fragmentación excesiva y elección de grupos deben resolverse allí, no con tickets duplicados.
- **Investigación existente:** TOON, patches y dos niveles de verbosity (12/13), con sus límites de medición. No sustituir Markdown por JSON como solución presumida: [Task Master #921](https://github.com/eyaltoledano/claude-task-master/issues/921) documenta un fallo histórico de dependencias `null` en JSON, cerrado; demuestra que cambiar serialización no evita inconsistencias semánticas, no que JSON sea inadecuado en general.
- No proponer auto-reparación de relaciones ni ejecución desatendida por defecto. [#818](https://github.com/mattpocock/skills/issues/818) fue cerrado en favor de los casos reales 265/310; parte de sus controles adicionales no tenía una sesión detrás. [#791](https://github.com/mattpocock/skills/issues/791), sobre independencia de criterios en un flujo regulatorio, también fue cerrado como no planificado y etiquetado como redactado por IA: no es una aprobación upstream para imponer QC universal.

## Próximos pasos y límites

Primero revisar con el usuario **1 y 2**: mejor evidencia y encaje directo con la promesa actual. En paralelo de producto, diseñar el experimento de **3** antes de afirmar ahorros. Validar **4–6** con casos reales; mantener **7–8** exploratorios hasta encontrar usuarios con esos flujos. No se crearon tickets de implementación a partir de esta lista.

No hubo encuesta representativa, entrevistas externas, análisis exhaustivo de todos los issues/discusiones, estadísticas de uso, prueba de herramientas competidoras ni acceso a facturación real. Búsquedas dirigidas en GitHub y documentación pueden omitir feedback no indexado o privado; los estados y contenido de `main` son mutables. Algunos documentos de herramientas adyacentes no se pudieron abrir; no se atribuyen capacidades a páginas inaccesibles. Las capacidades de Beads y GitHub sirven como comparación, no justifican copiar su arquitectura. No se importó código de competidores ni se modificó el viewer.
