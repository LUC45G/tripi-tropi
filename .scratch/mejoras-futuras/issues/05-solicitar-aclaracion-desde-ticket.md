# 05: Solicitar aclaraciones desde el detalle de un ticket
Status: ready-for-agent
Execution: in-progress
Labels: frontend, backend
Blocked by: 02
Commits: none
Verbosity: 1

## Estado inicial

### Qué construir

Implementar `Clarify ticket` según [el diseño aprobado](../acciones-tickets.md): nota opcional, previsualización, copia o entrega a Codex y liberación manual de una solicitud anterior. El viewer no escribe tickets. `Split ticket` queda fuera de esta entrega.

### Atomicidad

La UI y su servicio entregan una única acción completa y verificable. El análisis 02 está completado; no requiere intercalar otro ticket.

### Criterios de aceptación

- [x] Ofrecer la acción en tickets que requieran aclaraciones, aunque no estén listos para implementar; incluir nota y previsualización antes de copiar o enviar.
- [x] Generar una instrucción autocontenida adaptada al triage, con preguntas en CLI, alternativa sin grill-me, aprobación previa a escrituras y restricciones sobre trabajo iniciado/completado.
- [x] Revalidar contexto y destino, proteger endpoints y evitar duplicados y solapamientos con implementación; copiar no escribe recibos ni tickets.
- [x] Permitir `Allow new clarification` solo con confirmación manual y sin cancelar ni reenviar al agente; conservar intentos e impedir liberar una entrega en curso.
- [x] Verificar backend y navegador con entrega simulada, documentar alcance y límites, y levantar el viewer local actualizado.

## Trabajo realizado

- Solicitud: UI con nota y previsualización, endpoints firmados, copia sin escrituras, recibos separados y liberación manual; entrega y portapapeles simulados en tests.
- Verificación: 29 pruebas afectadas correctas; suite completa 83/83 con `node --test --test-concurrency=2`. `npm test` sin límite pasó 82/83 por el límite temporal del watcher; no se relajó la comprobación.
- Viewer: reiniciado en `http://127.0.0.1:65005`, health correcto; comportamiento de entrevista con un agente real no probado.

## Estado posterior

Acción disponible en el viewer; pendiente registrar hash real y validar cierre.
