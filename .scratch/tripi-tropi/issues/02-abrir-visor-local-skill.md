# 02: Abrir el visor local desde la skill tripi-tropi
Status: ready-for-agent
Execution: pending
Labels: viewer, skill
Blocked by: 01
Commits: none

## Estado inicial

### Qué construir

Invocar tripi-tropi abre en segundo plano un visor local reutilizable con features, tabla y detalle Markdown, sin detener el trabajo del agente.

### Atomicidad

Todas las dependencias declaradas deben estar completadas antes de empezar. Este ticket entrega una capacidad verificable sin intercalar trabajo de otro ticket. Si aparece una dependencia parcial, revisar y dividir el alcance antes de implementarlo.

### Criterios de aceptación

- [ ] Empaquetar la skill con aplicación incluida y metadatos; Node.js 24 y recursos locales sin CDN ni compilación obligatoria.
- [ ] Lanzar en 127.0.0.1 con --repo, --port y --no-open; Windows sin ventana visible; reutilizar instancias por repo e indicar cómo detenerlas.
- [ ] Mostrar tema oscuro e interfaz en inglés; conservar nombres, títulos y contenido de los archivos sin traducir.
- [ ] Leer un archivo por ticket en .scratch/<feature>/issues; reconocer título con/sin número y metadatos simples/en negrita.
- [ ] Mostrar sidebar, tabla Number/Name/Status/Detail y detalle Markdown sanitizado con encabezados, tablas, listas, enlaces, código y checkboxes no interactivos.
- [ ] Mostrar resumen de feature y spec.md, o map.md como alternativa; cubrir ausencia de descripción, tickets y archivos ilegibles.
- [ ] Mostrar hashes abreviados de Commits en cada ticket y detalle, sin inventarlos ni convertirlos en órdenes ejecutables.
- [ ] Garantizar solo lectura del repo observado: sin endpoints de escritura ni edición; restringir rutas y enlaces fuera de .scratch.
- [ ] Verificar apertura desde dos repos, aislamiento, Markdown y hashes sin modificar archivos observados.

## Trabajo realizado

Pendiente. No se realizaron cambios ni verificaciones de implementación.

## Estado posterior

Pendiente de implementación y verificación. Registrar resultados, problemas, soluciones y pendientes antes de completar.

