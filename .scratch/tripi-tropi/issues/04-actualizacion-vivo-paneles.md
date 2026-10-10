# 04: Actualizar el visor en vivo y conservar el espacio de trabajo
Status: ready-for-agent
Execution: in-progress
Labels: viewer, realtime
Blocked by: 03
Commits: none

## Estado inicial

### Qué construir

Cambios externos aparecen en vivo mientras el usuario ajusta paneles y conserva su selección, filtros y posición de lectura.

### Atomicidad

Todas las dependencias declaradas deben estar completadas antes de empezar. Este ticket entrega una capacidad verificable sin intercalar trabajo de otro ticket. Si aparece una dependencia parcial, revisar y dividir el alcance antes de implementarlo.

### Criterios de aceptación

- [x] Observar creación, edición, renombrado, eliminación y guardados atómicos con Chokidar; agrupar eventos y publicar snapshots coherentes mediante SSE.
- [x] Reflejar cambios normalmente en menos de un segundo, incluidos Commits, descripción de feature, labels y estados de dependientes.
- [x] Reconectar automáticamente y recuperar snapshot completo; mostrar conexión perdida y errores sin perder selección.
- [x] Agregar dos separadores ajustables accesibles, sidebar inicial de 220 px y resto dividido en mitades; guardar tamaños por repo.
- [x] Conservar selección, filtros y scroll; navegar por URL con atrás/adelante; si desaparece el ticket volver a su feature.
- [x] Adaptar pantallas estrechas alternando listado/detalle; mantener accesibilidad básica sin implementar shortcuts de aplicación.
- [x] Verificar eventos, reconexión, persistencia y funcionamiento concurrente con el agente; logs/estado operativo fuera del repo observado.
- [x] Usar el SVG de la raíz como favicon empaquetado y mostrar cursor pointer en todos los controles clickeables habilitados.

## Trabajo realizado

Se incorporó Chokidar con agrupación de eventos y espera de escrituras completas. El servidor publica snapshots completos por SSE con instancia y revisión; observa tickets, descripciones y configuración de triage, sin escribir en el repositorio. El navegador reconecta automáticamente y conserva el último snapshot válido ante errores.

Se agregaron dos divisores con arrastre y controles de teclado propios del separador accesible. Tamaños, selección, filtros y scroll se guardan por repositorio en localStorage; las URLs admiten navegación atrás/adelante y enlaces directos. En pantallas estrechas se alterna Tickets/Detail. Se empaquetó una copia exacta de icon.svg como favicon y se aplicó cursor pointer a todos los elementos interactivos habilitados.

Verificación: 19 pruebas Node/Edge, incluyendo creación tardía de .scratch, guardados atómicos en menos de un segundo, renombrados, eliminación/recreación, cambios de labels/Commits/descripciones/triage y recálculo de dependientes; persistencia de paneles, scroll y filtros; historia, reinicio del servidor y reconexión; vista mobile, favicon y cursores. Las pruebas existentes comprueban que el visor no modifica archivos. El proceso sigue separado del agente y los registros operativos permanecen en el directorio temporal del sistema.

Problema encontrado y resuelto: en Windows, reemplazar temporalmente .scratch por un archivo y restaurarla dejaba observadores de descendientes desactualizados. Después de recuperar una lectura correcta se reconstruye la observación antes de publicar el snapshot; la prueba verifica el error, la recuperación y eventos posteriores. Validación estricta de los seis tickets sin errores ni advertencias; skill validada con el validador oficial.

## Estado posterior

Implementación verificada. Falta registrar el hash real del commit de implementación y cerrar el ticket mediante un commit de registro. El ticket 05 queda como siguiente trabajo; 06 depende de 04 y 05. Los shortcuts de aplicación siguen pendientes a futuro. La interfaz continúa siendo de solo lectura.

