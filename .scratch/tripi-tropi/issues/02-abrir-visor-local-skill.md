# 02: Abrir el visor local desde la skill tripi-tropi
Status: ready-for-agent
Execution: in-progress
Labels: viewer, skill
Blocked by: 01
Commits: none

## Estado inicial

### Qué construir

Invocar tripi-tropi abre en segundo plano un visor local reutilizable con features, tabla y detalle Markdown, sin detener el trabajo del agente.

### Atomicidad

Todas las dependencias declaradas deben estar completadas antes de empezar. Este ticket entrega una capacidad verificable sin intercalar trabajo de otro ticket. Si aparece una dependencia parcial, revisar y dividir el alcance antes de implementarlo.

### Criterios de aceptación

- [x] Empaquetar la skill con aplicación incluida y metadatos; Node.js 24 y recursos locales sin CDN ni compilación obligatoria.
- [x] Lanzar en 127.0.0.1 con --repo, --port y --no-open; Windows sin ventana visible; reutilizar instancias por repo e indicar cómo detenerlas.
- [x] Mostrar tema oscuro e interfaz en inglés; conservar nombres, títulos y contenido de los archivos sin traducir.
- [x] Leer un archivo por ticket en .scratch/<feature>/issues; reconocer título con/sin número y metadatos simples/en negrita.
- [x] Mostrar sidebar, tabla Number/Name/Status/Detail y detalle Markdown sanitizado con encabezados, tablas, listas, enlaces, código y checkboxes no interactivos.
- [x] Mostrar resumen de feature y spec.md, o map.md como alternativa; cubrir ausencia de descripción, tickets y archivos ilegibles.
- [x] Mostrar hashes abreviados de Commits en cada ticket y detalle, sin inventarlos ni convertirlos en órdenes ejecutables.
- [x] Garantizar solo lectura del repo observado: sin endpoints de escritura ni edición; restringir rutas y enlaces fuera de .scratch.
- [x] Verificar apertura desde dos repos, aislamiento, Markdown y hashes sin modificar archivos observados.

## Trabajo realizado

Se empaquetó la skill tripi-tropi con instrucciones, metadatos, dependencias bloqueadas y aplicación local. El launcher abre el navegador, arranca el servidor desacoplado del agente, reutiliza una instancia por repo y permite detenerla. Registros y logs quedan en el directorio temporal del sistema.

La interfaz oscura en inglés incluye features, tabla, resúmenes y Markdown sanitizado completo. Conserva los nombres y contenido originales, muestra commits abreviados en tabla y detalle, y deshabilita checkboxes. El servidor solo permite lecturas del repo observado; el endpoint autenticado de parada controla exclusivamente su propio proceso.

Verificación: 11 pruebas pasando, incluida UI real en Edge headless, sanitización, hashes, Markdown, Refresh manual, rechazo de escritura/orígenes externos, separación de dos repos, reutilización y parada del servidor. El verificador oficial de skills devuelve «Skill is valid!». Revisión visual desktop y apertura real del visor local completadas.

## Estado posterior

Implementación verificada; pendiente registrar el commit para cerrar. Se corrigió el crecimiento vertical del layout para que el detalle tenga scroll propio. La actualización en vivo, filtros, navegación entre bloqueantes y cola de Codex corresponden a los tickets 03–05; esta entrega usa Refresh manual y estados explícitos.

