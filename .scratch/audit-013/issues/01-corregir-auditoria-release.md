# 01: Corregir la auditoría y preparar la versión 0.1.3
Status: ready-for-agent
Execution: completed
Labels: security, bugs, release
Blocked by: none
Commits: 95a8b0a784ab
Verbosity: 1

## Estado inicial
### Qué construir
Una entrega 0.1.3 con los ocho hallazgos de ponytail-audit corregidos y verificados: Markdown que activa envíos, rollback destructivo, duplicados por alias de sesión, validación permisiva al enviar/copiar, bloqueantes contradictorios, filtros por feature que pierden dependencias, lectura HTTP Unicode y argumentos desconocidos del instalador.
### Atomicidad
Todos los cambios entregan una versión utilizable con los fallos auditados resueltos. No hay dependencias parciales ni trabajo intercalado; las regresiones se verifican sin enviar órdenes reales a agentes.
### Criterios de aceptación
- [x] Impedir acciones privilegiadas desde Markdown y conservar navegación legítima.
- [x] Preservar destinos ajenos en fallos de activación del instalador.
- [x] Normalizar alias de sesión a UUID para conservar protección contra duplicados.
- [x] Exigir estructura válida y Execution pending al enviar/copiar; mantener lectura de tickets heredados.
- [x] Rechazar ausencia de bloqueantes mezclada con referencias y resolver dependencias antes de filtrar features.
- [x] Decodificar correctamente peticiones Unicode mediante un lector compartido y rechazar opciones CLI desconocidas.
- [x] Sincronizar paquetes/lockfiles en 0.1.3, ejecutar regresiones y validar el paquete distribuible.
## Trabajo realizado
Auditoría: ocho fallos corregidos; transporte HTTP compartido, validación estricta de acciones y migración de intentos por nombre a UUID. Paquetes y lockfiles sincronizados en 0.1.3.

Verificación: npm test 47/47; regresiones finales de cola/auditoría 18/18; validación estricta 19 tickets sin errores/avisos; npm pack --dry-run verifica CLI, skill y exclusión de archivos de desarrollo. No se enviaron órdenes reales ni se verificó macOS/Linux.
## Estado posterior
Completado; implementación 95a8b0a784ab. Versión 0.1.3 preparada para publicación en npm.
