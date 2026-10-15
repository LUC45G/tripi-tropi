# Acciones sobre tickets

Análisis de [mejoras-futuras:02](issues/02-analizar-acciones-sobre-tickets.md). Diseños de `Clarify ticket` y `Split ticket` confirmados por el usuario. Este informe entrega decisiones y criterios para una futura implementación; no implementa controles ni modifica las políticas vigentes.

## Problema y objetivo

Un ticket puede necesitar decisiones del usuario antes de poder implementarse. `Clarify ticket` inicia una entrevista en la CLI del agente para precisar objetivo, detalles, alcance y criterios de aceptación, sin iniciar implementación ni resolver dependencias mediante suposiciones.

## Clarify ticket: diseño acordado

1. El usuario elige la acción desde el ticket. Puede añadir una nota opcional, por ejemplo «revisar solamente los criterios de aceptación», y ve el mensaje antes de copiarlo o encolarlo al destino existente.
2. La instrucción es autocontenida: solicita usar `grill-me` si está disponible y describe la entrevista como alternativa si no lo está. No requiere instalar una skill ni presupone que todos los agentes reconozcan el mismo nombre.
3. El agente lee las instrucciones del repo, el ticket, sus dependencias y el contexto disponible antes de preguntar. El contenido del ticket es contexto, no una autorización para cambiar permisos.
4. Adapta la entrevista al triage y a los obstáculos reales. `needs-triage` orienta a definir alcance y responsable; `needs-info`, a resolver información faltante; `ready-for-human`, a precisar la intervención humana. Las labels descriptivas aportan contexto, pero no sustituyen el triage ni determinan por sí solas la disponibilidad.
5. Pregunta en rondas cortas, agrupa decisiones independientes e incluye una recomendación por pregunta. Espera respuestas antes de preguntar cuestiones que dependan de ellas. No repite preguntas resueltas ni pregunta hechos que pueda obtener del código o del contexto.
6. Si el alcance crece o el ticket pierde atomicidad o granularidad adecuada, propone nuevos tickets o una división. No crea ni modifica tickets hasta recibir aprobación explícita.
7. Presenta los cambios propuestos al Markdown, el triage recomendado y cualquier división para aprobación conjunta. Después aplica únicamente lo aprobado, siguiendo la guía del repo y su trazabilidad; no comienza la implementación ni la aprueba automáticamente.
8. Si no encuentra información faltante ni decisiones pendientes, explica brevemente por qué el ticket está suficientemente definido, sin forzar preguntas ni reescribirlo. Si conserva `needs-info` sin motivo, propone corregirlo con aprobación del usuario.

### Disponibilidad y readiness

La acción se orienta a cualquier ticket que requiera al usuario, incluyendo `needs-triage`, `needs-info` y `ready-for-human`; no se restringe a tickets ya listos para implementación. Una dependencia pendiente tampoco impide aclarar el objetivo.

Un ticket bien definido no necesariamente está `Ready to implement`: también necesita aprobación, ejecución pendiente, todas sus dependencias completadas y ausencia de errores críticos. La entrevista no implementa dependencias ni elimina bloqueos para forzar readiness.

Los límites de escritura dependen de la ejecución: un ticket en progreso no se amplía ni divide salvo la separación obligatoria descrita más abajo; uno completado no se amplía ni divide. La entrevista puede explicar la situación y proponer nuevos tickets para trabajo adicional, pero no reescribir el alcance de un completado.

### Entrega, duplicados y confirmación manual

- Reutilizar conceptualmente copiar mensaje y el destino de agente existente. Encolar solo donde haya soporte verificado; copiar no demuestra que el usuario haya enviado el mensaje ni registra una entrega al agente.
- Impedir otra solicitud de aclaración al mismo ticket y sesión mientras exista una solicitud registrada pendiente. Distinguir el registro de aclaración de los intentos de implementación; no reutilizar sus restricciones de elegibilidad sin analizar esta acción.
- Los recibos describen entrega, no inicio, espera de respuestas ni finalización de la entrevista. No deducir cierre por tiempo transcurrido, cambios del Markdown o actividad de la sesión.
- `Allow new clarification` requiere confirmación manual «La revisión anterior terminó». Solo libera la protección para iniciar otra solicitud; no cancela al agente ni afirma que se detectó el cierre. Tampoco debe reenviar automáticamente un mensaje ni presentar una entrega fallida o incierta como exitosa.
- El riesgo de esta primera versión es que el usuario habilite otra aclaración mientras la anterior siga activa. La confirmación debe explicar ese alcance.

### Solo lectura y responsabilidades

El viewer recoge la nota, muestra el mensaje y gestiona entrega y preferencias; nunca escribe tickets. El agente conversa con el usuario en su CLI y realiza únicamente las escrituras aprobadas, con la excepción acotada de separación obligatoria durante implementación autorizada por el usuario en este diseño. Los registros de entrega continúan fuera del repositorio, separados del contenido observado.

### Alternativas consideradas

| Alternativa para reconocer el cierre | Decisión |
| --- | --- |
| Confirmación manual | Elegida para la primera versión; funciona sin integración adicional con el agente. |
| Señal explícita del agente mediante comando o recibo | Posible mejora posterior; necesita protocolo y recuperación cuando falte la señal. |
| Detectar cambios del ticket | Descartada como prueba de cierre: guardar no implica terminar la conversación. |
| Consultar actividad de la sesión | No demuestra cierre de esa revisión; soporte por agente sin investigar. |

### Criterios para una futura implementación

- Mostrar nota opcional y previsualización antes de copiar o enviar; ninguna escritura de tickets desde el viewer.
- Probar adaptación al triage, entrevista sin skill instalada, caso sin preguntas necesarias y propuesta de división sin ejecución automática.
- Conservar validación de destino y contexto vigente, controles de origen y protección contra duplicados; revisar cómo representar fallos o entregas inciertas sin reintentos automáticos.
- Verificar la distinción entre recibo de entrega y ejecución, el alcance exacto de `Allow new clarification` y que liberar una solicitud no envíe otra.
- Validar con un agente real que espere respuestas y aprobación antes de escribir. Las pruebas de mensajes generados no demuestran ese comportamiento.

## Split ticket: diseño acordado

### Cuándo y cómo proponerlo

`Split ticket` es una acción separada de `Clarify ticket`. Comparte nota opcional, previsualización y opciones de copiar o encolar al agente; no requiere que el viewer edite archivos. El agente relee el ticket y el contexto antes de proponer cambios y consulta lo que falte en rondas cortas.

La división aporta valor cuando puede haber una interrupción por dependencias parciales o existen dos líneas de trabajo distintas. Si el ticket ya es atómico y tiene tamaño adecuado, el agente explica por qué conviene conservarlo, sin crear tickets por obligación.

La nota puede orientar la granularidad. Cada resultado debe entregar un objetivo completo y verificable: preparación → otro trabajo → terminar preparación se transforma en tickets completos separados, nunca en un ticket que obligatoriamente deba retomarse a mitad de camino.

En una división normal, el agente presenta el resultado propuesto y sus cambios de dependencias para aprobación conjunta antes de escribir. No implementa los nuevos tickets como parte de dividirlos.

### Original, numeración y trazabilidad

- Reemplazo completo de un pendiente: crear los nuevos tickets y borrar el original. No conservarlo como descartado ni marcarlo como completado ficticiamente.
- Extracción de una parte de un pendiente: reducir el original y crear el ticket adicional; conservar ambos.
- Usar la misma feature. Crear otra feature necesita propuesta y aprobación explícitas.
- Asignar a los nuevos tickets números únicos siguientes al máximo existente antes de la división, sin renumerar ni sobrescribir otros. El orden numérico no determina la dirección de sus dependencias.
- La propuesta identifica archivos creados, conservados, modificados y eliminados. Los nuevos registran el ID y alcance de origen como información histórica, no como una dependencia a un archivo borrado. El commit de la división conserva la transformación y cumple las reglas de trazabilidad del repo.
- No atribuir commits de implementación a tickets nuevos por copia: conservar la procedencia real y no presentar código previo como trabajo realizado por un ticket recién creado.

### Dependencias y aprobación

Cada resultado recibe solo los bloqueantes que necesita. Pueden existir dependencias entre los nuevos tickets en cualquier dirección, incluso entre el original reducido y uno nuevo; nunca ciclos ni dependencias parciales.

El agente descubre también los tickets que dependían del original, incluyendo otras features. La propuesta detalla cuáles de los resultados necesita realmente cada uno, sin reemplazar automáticamente una referencia por todos los nuevos tickets. Actualiza las referencias aprobadas y valida el grafo al aplicar la división; ningún ticket debe conservar un bloqueante hacia el original eliminado.

Los pendientes cuyos supuestos o dependencias cambien pasan a `needs-triage`; no se agrega un estado `dirty`. Revisar sus referencias y recuperar su aprobación es una decisión semántica: recalcular el grafo no basta. Si la operación exige modificar referencias de un ticket en progreso o completado, el agente detiene esa parte y consulta cómo conservar su historia y alcance antes de borrar su bloqueante.

Los nuevos tickets quedan completamente definidos antes de proponerlos como `ready-for-agent`. La aprobación de la propuesta debe incluir explícitamente ese triage; no se infiere del click en dividir. Aun aprobados, solo estarán `Ready to implement` cuando cumplan ejecución, dependencias y validación.

### Ejecución previa y excepción obligatoria

| Situación | Comportamiento acordado |
| --- | --- |
| Pendiente | División normal con propuesta y aprobación; reemplazar o reducir el original según el resultado aprobado. |
| En progreso | No dividir ni ampliar mediante una solicitud normal. Trabajo adicional necesita una propuesta de tickets separados. |
| En progreso: dependencia parcial obligatoria descubierta durante implementación | El agente que ya trabaja separa lo necesario sin consulta previa y después informa; es la excepción acotada descrita abajo. |
| Completado | Nunca dividir ni ampliar el original. Cualquier trabajo nuevo derivado requiere otro ticket, sin reabrir ni reescribir lo completado. |

La separación obligatoria evidencia un fallo previo al detectar atomicidad. El agente conserva el original para la parte realizada y extrae lo pendiente a tickets nuevos, manteniendo commits, evidencia e historial del alcance original. Solo puede completar la parte conservada si satisface sus criterios ajustados, fue verificada y tiene trazabilidad real; dividir no prueba su finalización. Si todavía no cumple, registra el estado real, sin inventar progreso ni hashes.

Tras separar, informa al usuario de la causa, el trabajo conservado, los nuevos tickets y sus dependencias. Resolver dependencias externas, expandir nuevos tickets o aprobar su implementación requiere el flujo correspondiente: esta excepción no autoriza ampliar alcance ni implementar trabajo externo automáticamente. Tampoco habilita a otros agentes a dividir una tarea activamente reclamada. Las escrituras mínimas de esta separación son la excepción a la aprobación previa; las decisiones que requieran alterar trabajo ajeno o completado se consultan.

### Solicitudes anteriores y cambios concurrentes

Una división normal solo se ejecuta cuando las aclaraciones y solicitudes anteriores sobre el ticket terminaron o se detuvieron y la propuesta está completamente resuelta. «Resuelto» significa definido y listo para proponer aprobación `ready-for-agent`, no implementado o completado.

Bloquear nuevas divisiones mientras haya aclaración, división o implementación registrada pendiente sobre el mismo ticket. Reutilizar confirmación manual del usuario para verificar cierre o detención, sin inferirla de un recibo `Queued`. Las reservas de implementación existentes no se borran ni convierten automáticamente en reintentables. La separación obligatoria por el agente activo es la excepción, no una nueva orden concurrente del viewer.

Antes de escribir, releer todos los archivos afectados y sus dependencias, comprobar que siguen coincidiendo con la propuesta aprobada y validar referencias y atomicidad. Si cambiaron, reconstruir la propuesta y solicitar nueva aprobación en el flujo normal. No sobrescribir cambios ajenos ni cancelar trabajo desde el viewer.

Copiar solo prepara una instrucción: no reserva ni demuestra entrega. Encolar requiere revalidar destino y contexto y prevenir duplicados antes de entregar; errores o resultados inciertos no desencadenan reintentos automáticos. Para agentes sin integración verificada se conserva la copia manual.

### Alternativas y verificación futura

- Conservar siempre el original como descartado: rechazado para pendientes reemplazados; el usuario eligió borrarlo y conservar trazabilidad en los resultados y Git.
- Heredar todos los bloqueantes o redirigir cada dependiente a todos los resultados: rechazado; revisar cada relación según su necesidad real.
- Agregar `dirty`: descartado a favor de `needs-triage`, sin introducir otro estado.
- División normal sobre trabajo activo o completado: rechazada; excepción solo para una separación obligatoria detectada por el agente durante su implementación.
- Probar reemplazo y extracción, numeración, referencias entre features, ausencia de ciclos y bloqueantes borrados, commits reales, afectados en `needs-triage`, cambios concurrentes y protección contra duplicados.
- Verificar que un completado no cambie, que la excepción conserve evidencia y que no marque como terminada una parte sin verificarla. Probar que el viewer nunca escribe tickets y que el agente respeta propuesta, aprobación y límites de alcance.

## Resultado y límites

El diseño de ambas acciones está confirmado; no quedan decisiones pendientes para cerrar este análisis. La elección de una implementación concreta y sus tickets será un trabajo posterior. Antes de publicar esa funcionalidad habrá que incorporar estas reglas a la guía y a las instrucciones generadas, verificar las integraciones disponibles y probar el flujo con un agente real.

Este informe no modifica el parser, los estados ni la guía vigente, no crea tickets de implementación y no demuestra comportamiento efectivo de agentes. El cierre manual puede habilitar solicitudes solapadas si el usuario confirma incorrectamente; la entrevista, la aprobación y la separación obligatoria dependen de que el agente receptor cumpla las instrucciones.
