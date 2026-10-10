# 06: Facilitar la instalación de la skill tripi-tropi
Status: ready-for-agent
Execution: completed
Labels: installation, skill
Blocked by: 04, 05
Commits: a24a1fe6af60

## Estado inicial

### Qué construir

Una instalación sencilla y reproducible permite usar tripi-tropi desde cualquier repositorio sin copiar archivos manualmente ni reconstruir la aplicación. Incluir un comando de instalación y una guía breve para el usuario.

### Atomicidad

Las capacidades finales del visor y la integración con Codex deben estar terminadas antes de distribuir el paquete completo. Una vez resueltos 04 y 05, la instalación se implementa y verifica sin intercalar otro ticket.

### Criterios de aceptación

- [x] Ofrecer un comando documentado que instale la skill completa y sus dependencias en el directorio de skills del usuario, con destino configurable.
- [x] Comprobar Node.js y requisitos antes de instalar y explicar errores accionables sin dejar una instalación parcialmente activa.
- [x] Conservar la configuración del usuario y skills ajenas; no sobrescribir silenciosamente una instalación existente.
- [x] Permitir actualizar o reinstalar tripi-tropi de manera explícita y reproducible, sin copiar node_modules del desarrollador.
- [x] Incluir instrucciones breves de instalación, descubrimiento de la skill, lanzamiento, parada y actualización.
- [x] Instalar en un destino aislado y verificar que el paquete puede abrir tickets de dos repos distintos, incluidos directorios con espacios.
- [x] Validar el paquete distribuido y documentar cualquier paso necesario para que Codex descubra la skill nueva.
- [x] Crear al menos un commit de implementación del ticket y registrar su hash abreviado real en Commits antes de cerrar.

## Trabajo realizado

Se implementó scripts/install-skill.mjs: destino predeterminado ~/.agents/skills, opción --skills-dir, comprobación de Node 24+ y npm, copia explícita del paquete sin node_modules del desarrollador e instalación reproducible con npm ci usando el lockfile. El paquete se prepara sin SKILL.md activo, se verifica y luego se activa. Un bloqueo serializa instalaciones; --update exige una instalación administrada y conserva la anterior ante fallos de preparación. No se modifican configuración de Codex ni skills ajenas.

README.md documenta instalación desde checkout, selección de commit/tag, descubrimiento, ejecución desde cualquier directorio, parada, actualización y errores accionables. Se confirmó el directorio de usuario y el descubrimiento automático contra la documentación oficial de Codex: https://learn.chatgpt.com/docs/build-skills. Si no aparece, se indica reiniciar Codex; destinos personalizados deben ser ubicaciones reconocidas o usarse por lanzamiento directo.

Verificación: 25 pruebas Node/Edge pasan, sin omisiones. La prueba nueva instala y actualiza en un destino temporal con espacios, abre y detiene tickets originales de dos repositorios, comprueba assets y dependencias servidos y ausencia de modificaciones a tickets. Comprueba rechazo de reemplazos implícitos y carpetas ajenas, conservación de configuración y otra skill, fallos de descarga/paquete incompleto, primera instalación fallida sin paquete activo, bloqueo concurrente y rechazo de destino superpuesto al código fuente. La skill fuente y una copia distribuida instalada en .cache/installation-check pasan el validador oficial. Los nueve tickets pasan validación estricta sin errores ni advertencias.

## Estado posterior

Completado y verificado. Implementación a24a1fe6af60; hash registrado mediante este cierre separado. No se instaló globalmente en el perfil del usuario. La descarga requiere acceso al registro npm; Node.js 24+ con npm es obligatorio. Los shortcuts y los tickets 07, 08 y 09 conservan su alcance y estado.
