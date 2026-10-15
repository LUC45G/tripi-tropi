# 04: Programar componentes desde el grafo con revisión y confirmación
Status: ready-for-agent
Execution: in-progress
Labels: graph-view, frontend
Blocked by: 02, 03
Commits: none
Verbosity: 1

## Estado inicial

### Qué construir

Conectar el componente aislado de 02 con el servicio terminado en 03. Entregar el flujo completo de revisar, confirmar, copiar o encolar su implementación y volver a programar manualmente tras una pausa. Seguir [la especificación](../spec.md) y reutilizar controles de sesión/cola y sus mensajes existentes, sin convertir al viewer en un editor o scheduler.

La revisión usa el componente completo, incluyendo tickets atenuados por filtros. El servidor determina elegibilidad y orden; el cliente presenta el resultado. El usuario conserva la posibilidad de inspeccionar el detalle y navegar a dependencias externas antes de decidir.

### Atomicidad

Empieza solo con exploración y servicio completos en 02 y 03. Entrega una interacción final de usuario con todas sus confirmaciones, resultados y pruebas, sin necesitar cambiar parcialmente otra dependencia a mitad del trabajo.

### Criterios de aceptación

- [x] Desde un componente aislado se revisa qué tickets se implementarán, en qué orden y cuáles ya están completados; la UI aclara que los filtros no recortan el conjunto. No se ofrece envío efectivo cuando el conjunto es inelegible o no tiene trabajo, y se explican los motivos.
- [x] Ante dependencias externas pendientes muestra `This ticket has an external dependency. The implementation flow will pause before completing the full set. Continue?`, lista afectados y bloqueantes, y espera confirmación explícita. Cancelar permite resolver dependencias antes; continuar autoriza solo el recorrido hasta la pausa, sin implementar tickets externos.
- [x] Confirmación, cancelación y revisión son accesibles, con foco administrado y textos en inglés. Un plan modificado desde disco exige nueva revisión; no se reutiliza una confirmación obsoleta ni se envía automáticamente tras actualizar snapshots.
- [x] Encolar entrega una sola instrucción al destino Codex visible, sin interrumpir el turno activo; muestra Sending/Queued/Error separado del estado real de los tickets y evita doble activación. No hay envío sin sesión vinculada ni reintentos automáticos.
- [x] Copiar permite pegar la instrucción en otra CLI, con feedback de éxito/error y sin enviar ni registrar entrega. La UI explica que las preguntas se responden en el agente y que cerrar el viewer no cancela trabajo entregado; no afirma ejecución real basándose en Queued.
- [x] Después de completar una parte y resolver la dependencia externa, una nueva acción manual revisa pendientes y omite completados según 03. Cambiar feature, filtros, aislamiento o destino no reutiliza un plan de otro contexto; las actualizaciones en vivo siguen reflejando estados reales.
- [x] E2E local con entrega/portapapeles simulados cubre componente con ramas, filtros atenuados, conjunto inelegible, cancelar/confirmar dependencia externa, revisión obsoleta, envío único, error, copia y reanudación. Verificar que nada escribe tickets, que lista/envío individual siguen funcionando y que no se envían órdenes reales durante tests; actualizar docs/testing.md y la documentación de uso correspondiente.

## Trabajo realizado

- Inicio: ticket aprobado y atómico; dependencias 02 y 03 releídas y completadas. Validación estricta de graph-view sin errores/advertencias.
- UI: diálogo nativo con orden/completados, consentimiento externo y confirmación de pausa sin preselección; invalidación por cambios relevantes/contexto, foco y enlaces de inspección. Copia y entrega separadas; ningún scheduler ni edición de tickets.
- Fixture: sesión simulada marcada threadSource user para respetar el filtro real del selector. Verificación final: `npm test` 74/74, 0 omitidos; catálogo 74/74 y validación estricta global 26 tickets sin errores/advertencias.
- Inspección: capturas de exploración y revisión local evaluadas, sin overflow horizontal y con endpoints de copia/envío bloqueados. README/API actualizados; viewer activo en http://127.0.0.1:65005. Agente y portapapeles simulados en E2E: no se probaron implementación, pausas ni preguntas de un agente real.

## Estado posterior

Pendiente.
