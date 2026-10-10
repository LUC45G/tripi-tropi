# 08: Vincular dependencias entre tickets de distintas features
Status: ready-for-agent
Execution: pending
Labels: dependencies, viewer
Blocked by: 03; 04; 05
Commits: none

## Estado inicial

### Qué construir
Permitir que un ticket declare bloqueantes de otra feature dentro del mismo repositorio, calcule su disponibilidad y navegue al ticket correcto. La interfaz sigue siendo de solo lectura; las relaciones se escriben en los Markdown por el agente.

### Atomicidad
Después de completar todas las dependencias, este ticket entrega el flujo completo de referencias, validación, estados y navegación. No requiere intercalar otro ticket: el trabajo de parser, grafo, UI y cola pertenece a esta misma capacidad verificable. No permitir dependencias parciales entre features ni dentro de una feature.

### Criterios de aceptación
- [ ] Admitir referencias calificadas feature:NN en Blocked by, por ejemplo authentication:02, junto a referencias locales existentes como 01; los números sin feature siguen apuntando a la feature del ticket actual.
- [ ] Resolver la identidad por feature y número, nunca por número global ni por coincidencia parcial de nombres. Mantener compatibles los tickets existentes, los títulos acompañantes y los formatos legacy documentados.
- [ ] Corregir y verificar listas de tres o más dependencias numéricas separadas por comas, además de listas mixtas con referencias calificadas. El parser actual falla con 03, 04, 05; este ticket usa el separador legacy válido de punto y coma hasta resolverlo.
- [ ] Validar feature/ticket inexistentes, referencias ambiguas, autorreferencias y ciclos que atraviesen features. Rechazar rutas fuera de .scratch y no seguir enlaces que escapen del repositorio.
- [ ] Calcular Blocked/Ready to implement según todas las dependencias, incluso externas a la feature; una referencia inválida mantiene bloqueado el ticket.
- [ ] Mostrar feature, número, título y estado en los bloqueantes externos; un clic selecciona la feature y el detalle correctos, conservando filtros y el aviso si queda fuera de ellos. URL e historia permiten volver.
- [ ] Actualizar dependientes en vivo cuando se completa, edita, renombra o elimina un bloqueante de otra feature, sin modificar archivos desde la UI.
- [ ] Revalidar el grafo completo antes de encolar y nombrar todas las dependencias en la orden al agente. No autorizar implementación si alguna sigue pendiente o existe dependencia parcial.
- [ ] Actualizar la guía de tickets y ejemplos con referencias locales y entre features, atomicidad obligatoria y al menos un commit por ticket con hashes reales en Commits.
- [ ] Verificar dos features con el mismo número, dependencias mixtas, ciclos entre features, cambios en vivo y navegación con filtros; incluir revalidación de cola y ausencia de escrituras del visor.

## Trabajo realizado
Pendiente. Se definió el alcance; no se implementaron relaciones entre features.

## Estado posterior
Pendiente de implementación y verificación. El formato actual solo resuelve dependencias numéricas dentro de la misma feature; no usar referencias calificadas hasta completar este ticket. Registrar resultados y hashes reales antes del cierre.
