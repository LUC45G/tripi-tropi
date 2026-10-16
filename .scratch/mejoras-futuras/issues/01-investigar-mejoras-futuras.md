# 01: Investigar y priorizar posibles mejoras futuras
Status: ready-for-agent
Execution: completed
Labels: research, product, planning
Blocked by: none
Commits: 4ca460daac31
Verbosity: 1

## Estado inicial

### Qué construir

Un informe priorizado de oportunidades futuras para tripi-tropi, basado en el estado actual del producto y sin implementar ninguna propuesta.

### Atomicidad

La entrega es un único informe de investigación con una priorización utilizable. No requiere implementar parcialmente una propuesta ni coordinarse con otro ticket.

### Criterios de aceptación

- [x] Leer AGENTS.md, `docs/agents/domain.md`, el README, la skill, las decisiones documentadas y los tickets existentes antes de explorar el código.
- [x] Identificar oportunidades que no dupliquen tickets abiertos ni funcionalidades ya completadas; considerar valor para el usuario y los límites de seguridad/solo lectura.
- [x] Registrar en `.scratch/mejoras-futuras/research.md` propuestas ordenadas con problema, usuario beneficiado, evidencia o razonamiento, impacto, esfuerzo/riesgo, dependencias y siguiente paso sugerido.
- [x] Separar hechos observados de hipótesis y señalar cualquier validación con usuarios o experimento que falte.
- [x] No implementar propuestas, crear tickets adicionales, cambiar la aplicación ni alterar archivos fuera de esta feature.
- [x] Validar el ticket y el informe, registrar al menos un commit de documentación con feature y número, y guardar su hash real en un commit de ticket posterior.

## Trabajo realizado

- Investigación: revisión del estado local, documentación upstream y reportes públicos; propuestas sin implementar y sin crear tickets nuevos.
- Fuentes: páginas completas y respuestas del mantenedor contrastadas con snippets desactualizados; ocho propuestas con impacto, esfuerzo, riesgos, dependencias y experimento en el informe. Sin encuesta representativa ni métricas reales de facturación.
- Verificación: ocho propuestas en informe y ticket, enlaces Markdown locales correctos y validación estricta de 27 tickets sin errores ni advertencias; no se repitieron tests de aplicación para esta entrega documental.

### Oportunidades para revisar

Prioridad provisional de producto, no ranking estadístico de demanda. Los reportes son evidencia de problemas concretos; la solución propuesta para tripi-tropi requiere validación con usuarios.

1. **Revisión semántica del conjunto y sus criterios.** Detectar dependencias implícitas, resultados sin responsable y criterios que no verifican trabajo propio. Fallos reales confirmados: [bloqueantes entre slices](https://github.com/mattpocock/skills/issues/265) y [cobertura incompleta](https://github.com/mattpocock/skills/issues/310); [595](https://github.com/mattpocock/skills/issues/595) aporta un caso de criterios no falsificables. Probar sobre lotes conocidos; una heurística no garantiza atomicidad.
2. **Diagnóstico de compatibilidad y primer uso.** Explicar qué falta entre poder leer un ticket de to-tickets y encolarlo con nuestra guía estricta; proponer correcciones al agente sin migrar archivos automáticamente. El [template upstream](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-tickets/SKILL.md) es más pequeño que nuestro contrato. La [confusión histórica de layout](https://github.com/mattpocock/skills/issues/478) ya está resuelta. Validar el primer uso con personas ajenas al proyecto.
3. **Métricas de consumo atribuibles y coste de retrabajo.** Separar bytes, tokens reales, llamadas, reintentos y resultados cuando existan datos fiables; mostrar desconocido donde falten. El [incidente 826](https://github.com/mattpocock/skills/issues/826) pertenece a orquestación local, no al contrato de to-tickets. Ampliaría observabilidad sin repetir TOON/verbosity; necesita primero un experimento de atribución.
4. **Contexto portable para continuar en otra sesión.** Un paquete de lectura con objetivo, decisiones, dependencias, trabajo existente y próximos pasos. La [documentación de Beads](https://github.com/gastownhall/beads/blob/main/README.md) muestra una alternativa, no demanda general. Contrastar con sesiones nuevas; no reemplaza relectura ni constituye otra cola.
5. **Comprobación de coherencia del cierre.** Contrastar estado, criterios, hashes y evidencia de Git sin cerrar ni modificar tickets desde el viewer. La [discusión 1136](https://github.com/mattpocock/skills/discussions/1136) aporta un caso de verificación independiente. Probar con cierres inconsistentes y clones superficiales: evidencia desconocida no significa evidencia falsa.
6. **Elegir el siguiente ticket por efecto de desbloqueo.** Mostrar candidatos realmente listos y qué pendientes desbloquearían, explicando el criterio. Hipótesis inspirada en capacidades de [Beads](https://github.com/gastownhall/beads/blob/main/README.md); no demuestra prioridad de negocio ni camino crítico temporal. Comparar decisiones humanas con y sin indicador, sin programar envíos automáticos.
7. **Correspondencia de relaciones con un tracker remoto.** Comparar IDs, padres y bloqueantes entre Markdown y GitHub, sin sincronización de escrituras desde la UI. Los reportes [513](https://github.com/mattpocock/skills/issues/513) y [554](https://github.com/mattpocock/skills/issues/554) son antecedentes ya corregidos upstream, no bugs actuales que rehacer. Prioridad baja hasta confirmar demanda local/remota.
8. **Ubicación configurable del tracker y continuidad entre worktrees.** Explorar una raíz explícita de lectura y aislamiento por repo, sin inferir rutas desde Markdown. El [reporte 810](https://github.com/mattpocock/skills/issues/810) describe ese nicho; no una necesidad mayoritaria. Validar lectura con dos worktrees y tracker externo antes de plantear ejecución entre repos.

No se cuentan como oportunidades nuevas: grafo, aislamiento de prerrequisitos, instalación, filtros, actualizaciones en vivo y Clarify ticket ya existen; Split ticket está diseñado en 02; políticas de labels/features corresponden a 03/04; la revisión visual 07 sigue abierta por decisión del usuario. Los detalles de evidencia, impacto, esfuerzo, riesgos y experimentos se registran en [research.md](../research.md).

## Estado posterior
Investigación completada, con ocho oportunidades priorizadas para revisión; propuestas sin implementar ni aprobar automáticamente.
