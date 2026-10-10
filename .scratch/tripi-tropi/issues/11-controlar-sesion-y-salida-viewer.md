# 11: Controlar la sesión Codex y cerrar el viewer
Status: ready-for-agent
Execution: pending
Labels: codex, viewer, controls
Blocked by: 05, 06
Commits: none

## Estado inicial

### Qué construir

El viewer muestra el destino Codex vinculado, pero actualmente no permite cambiarlo desde la interfaz ni cerrar el proceso que mantiene el viewer activo. Incorporar controles operativos seguros para seleccionar otra sesión disponible y salir del viewer actual.

### Atomicidad

El ticket entrega una capacidad completa y observable de control operativo del viewer: consultar sesiones disponibles, cambiar el destino de queue o desvincularlo, y detener el proceso actual desde un botón Exit. No implementa nuevas capacidades de queue ni modifica tickets. Todas las acciones pueden validarse juntas sin intercalar otro ticket; si una variante de publicación o integración externa fuera necesaria, debe dividirse antes de empezar.

### Criterios de aceptación

- [ ] Al hacer click en la sesión del header, abrir un dropdown accesible con las sesiones disponibles del índice local, mostrando nombre e ID cuando existan.
- [ ] Permitir seleccionar una sesión existente o dejar el viewer sin destino vinculado; el cambio actualiza el destino de queue sin crear sesiones ni cambiar permisos.
- [ ] Cerrar el dropdown con click exterior, Escape y después de seleccionar una opción.
- [ ] Agregar un botón `Exit` que detenga únicamente el proceso del viewer del repositorio actual mediante el control autenticado existente.
- [ ] Mostrar una confirmación visible después del cierre y un error accionable si el proceso ya terminó o no puede cerrarse.
- [ ] No cerrar Codex ni la pestaña del navegador, no modificar tickets y no escribir configuración del repositorio, de Codex o de otras skills.
- [ ] Mantener el comportamiento funcional cuando no existe índice de sesiones, no hay sesiones seleccionables o el viewer se inició sin destino Codex.
- [ ] Verificar la selección, desvinculación, cierre y casos de error en navegador y con pruebas del servidor; ejecutar la suite relevante y validar que los archivos observados no cambian.

## Trabajo realizado

Pendiente. El ticket 05 ya ofrece queue para la sesión vinculada y el 06 distribuye el paquete instalable. Este ticket agrega únicamente controles de la interfaz y del proceso local del viewer.

## Estado posterior

Pendiente de implementar después de 05 y 06. La interfaz seguirá siendo de solo lectura respecto de los tickets y el viewer continuará ejecutándose separado del trabajo activo del agente.
