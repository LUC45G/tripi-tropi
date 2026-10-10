# 04: Actualizar el visor en vivo y conservar el espacio de trabajo
Status: ready-for-agent
Execution: pending
Labels: viewer, realtime
Blocked by: 03
Commits: none

## Estado inicial

### Qué construir

Cambios externos aparecen en vivo mientras el usuario ajusta paneles y conserva su selección, filtros y posición de lectura.

### Atomicidad

Todas las dependencias declaradas deben estar completadas antes de empezar. Este ticket entrega una capacidad verificable sin intercalar trabajo de otro ticket. Si aparece una dependencia parcial, revisar y dividir el alcance antes de implementarlo.

### Criterios de aceptación

- [ ] Observar creación, edición, renombrado, eliminación y guardados atómicos con Chokidar; agrupar eventos y publicar snapshots coherentes mediante SSE.
- [ ] Reflejar cambios normalmente en menos de un segundo, incluidos Commits, descripción de feature, labels y estados de dependientes.
- [ ] Reconectar automáticamente y recuperar snapshot completo; mostrar conexión perdida y errores sin perder selección.
- [ ] Agregar dos separadores ajustables accesibles, sidebar inicial de 220 px y resto dividido en mitades; guardar tamaños por repo.
- [ ] Conservar selección, filtros y scroll; navegar por URL con atrás/adelante; si desaparece el ticket volver a su feature.
- [ ] Adaptar pantallas estrechas alternando listado/detalle; mantener accesibilidad básica sin implementar shortcuts de aplicación.
- [ ] Verificar eventos, reconexión, persistencia y funcionamiento concurrente con el agente; logs/estado operativo fuera del repo observado.

## Trabajo realizado

Pendiente. No se realizaron cambios ni verificaciones de implementación.

## Estado posterior

Pendiente de implementación y verificación. Registrar resultados, problemas, soluciones y pendientes antes de completar.

