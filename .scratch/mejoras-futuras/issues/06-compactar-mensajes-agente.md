# 06: Compactar aclaraciones y órdenes de implementación
Status: ready-for-agent
Execution: completed
Labels: agents, efficiency
Blocked by: 05
Commits: fc9c3b850f18
Verbosity: 1

## Estado inicial

### Qué construir

Reescribir los mensajes generados de aclaración e implementación individual/por conjunto como reglas concretas y breves, conservando sus objetivos y garantías. Comparar tamaños con el mismo contexto, sin atribuir ahorro de tokens facturados.

### Atomicidad

La entrega modifica únicamente las instrucciones generadas y sus comprobaciones. El flujo de aclaración 05 está completado; no requiere intercalar otra implementación.

### Criterios de aceptación

- [x] Aclaración conserva entrevista adaptada al triage, alternativa sin skill, aprobación antes de escribir, protección de trabajo iniciado/completado y ausencia de implementación automática.
- [x] Implementación conserva relectura, validación, readiness, atomicidad, alcance, verificación, registros y commits reales; los conjuntos mantienen orden y pausa completa ante bloqueantes externos.
- [x] Conservar contexto y datos del ticket/plan; copiar y encolar generan las mismas instrucciones y no cambian los controles del servidor.
- [x] Verificar contratos y flujos afectados; comparar tamaños de las tres instrucciones con contexto idéntico y reiniciar el viewer local.

## Trabajo realizado

- Instrucciones: reglas numeradas por decisión, contexto separado y explicaciones del viewer retiradas; plan JSON completo y controles del servidor preservados.
- Medición: [06-message-sizes.json](../06-message-sizes.json), base f10f9eb83f97 y contexto idéntico. Aclaración 2349→1488 bytes (-36,7%); individual 846→738 (-12,8%); conjunto 2499→1802 (-27,9%). Son bytes UTF-8 y palabras, no tokens facturados ni prueba de equivalencia conductual de agentes.
- Verificación: contratos ampliados y plan íntegro, 35 pruebas afectadas y suite final `node --test --test-concurrency=2` 83/83 sin omitidos. Viewer reiniciado en puerto 65005 con health correcto; sin envío a un agente real.

## Estado posterior

Mensajes compactados y verificados, con mediciones registradas y viewer actualizado; comportamiento real del agente no probado.
