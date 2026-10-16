# 04: Definir cuándo crear una feature y cuándo reutilizar una existente
Status: ready-for-agent
Execution: pending
Labels: research, planning
Blocked by: none
Commits: none
Verbosity: 1

## Estado inicial

### Qué construir

Analizar criterios para crear una feature nueva, agregar un ticket a una existente o resolver un cambio pequeño sin una feature nueva. Entregar una propuesta revisable en `.scratch/mejoras-futuras/criterios-features.md`, sin reorganizar el tracker ni cambiar sus reglas todavía.

Usar ejemplos del repositorio y distinguir objetivo de producto, agrupación de tickets y rama Git: no asumir que son equivalentes. Considerar claridad de navegación, tamaño del trabajo, mantenimiento, dependencias entre features y trazabilidad.

### Atomicidad

La entrega es una guía de decisión propuesta con ejemplos y límites. No depende de 01 ni de las políticas de labels o acciones; no requiere mover tickets para verificar que la propuesta es comprensible.

### Criterios de aceptación

- [ ] Identificar cómo se agrupan hoy tickets y features, con ejemplos de agrupaciones útiles y posibles agrupaciones demasiado amplias o pequeñas; diferenciar observaciones de hipótesis.
- [ ] Proponer una regla de decisión para crear feature, reutilizar una existente o tratar un cambio puntual, sin convertir una preferencia en obligación antes de su revisión.
- [ ] Cubrir bugs, mantenimiento, investigación, cambios transversales, mejoras pequeñas y ampliaciones de features completadas; explicar qué hacer cuando una propuesta abarca varios objetivos.
- [ ] Precisar el mínimo de especificación, nombre y alcance que justificaría una feature nueva, y cómo representar dependencias externas sin duplicar tickets ni introducir dependencias parciales.
- [ ] Registrar ejemplos aplicados, alternativas, preguntas pendientes y recomendaciones de adopción. No crear/mover/renumerar tickets adicionales, cambiar ramas ni modificar la guía vigente durante la investigación.

## Trabajo realizado

- Aclaración: criterios confirmados con el usuario; el análisis documental queda pendiente, sin reorganizar tickets ni modificar la guía vigente.

### Decisiones confirmadas para el análisis

- Una feature persigue un objetivo común: puede ser un módulo, una investigación, una funcionalidad u otro resultado definido. Si un ticket se desvía de ese objetivo, sugerir crear una nueva feature.
- Una feature de módulo puede reunir varios objetivos específicos del mismo módulo bajo su objetivo común. Un único objetivo también puede atravesar varios módulos, sin crear una feature por cada módulo o capa técnica.
- Puede tener un solo ticket; no dividir artificialmente el trabajo para justificar la agrupación.
- Reutilizar una feature cuando el trabajo corrige o completa su objetivo, aunque sus tickets anteriores estén completados. Un objetivo independiente justifica proponer otra; no ampliar ni reabrir tickets completados para incorporar trabajo nuevo.
- Antes de crearla, declarar principalmente objetivo y resultado esperado; precisar alcance y exclusiones de forma proporcional al trabajo. Elegir nombres descriptivos por objetivo, sin equiparar feature, rama Git, versión o sesión.
- Si un cambio es suficientemente pequeño, no tiene dependencias y puede iniciarse y terminarse sin interferir con otros procedimientos, sugerir implementarlo directamente, sin crear ticket ni feature. Si hay dudas, aclararlas primero y volver a evaluar. No imponer límites arbitrarios de líneas o archivos ni interpretar la sugerencia como aprobación automática de ejecución.
- Una auditoría solo justifica una feature si constituye una investigación con objetivo y resultado propios; agrupar correcciones por actividad o versión no basta. El usuario señaló `audit-013` como ejemplo de agrupación innecesaria; conservar su historial actual y usarla como caso del informe, sin reorganizarla.
- Mantener tickets atómicos, con dependencias reales entre ellos o entre features; compartir módulo no obliga a agrupar objetivos independientes ni autoriza dependencias parciales.

## Estado posterior

Criterios aclarados y aprobados para realizar el análisis documental; Execution permanece pending, con todos los criterios de aceptación pendientes de verificación.
