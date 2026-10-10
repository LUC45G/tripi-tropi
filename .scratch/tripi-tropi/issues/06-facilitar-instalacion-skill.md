# 06: Facilitar la instalación de la skill tripi-tropi
Status: ready-for-agent
Execution: pending
Labels: installation, skill
Blocked by: 04, 05
Commits: none

## Estado inicial

### Qué construir

Una instalación sencilla y reproducible permite usar tripi-tropi desde cualquier repositorio sin copiar archivos manualmente ni reconstruir la aplicación. Incluir un comando de instalación y una guía breve para el usuario.

### Atomicidad

Las capacidades finales del visor y la integración con Codex deben estar terminadas antes de distribuir el paquete completo. Una vez resueltos 04 y 05, la instalación se implementa y verifica sin intercalar otro ticket.

### Criterios de aceptación

- [ ] Ofrecer un comando documentado que instale la skill completa y sus dependencias en el directorio de skills del usuario, con destino configurable.
- [ ] Comprobar Node.js y requisitos antes de instalar y explicar errores accionables sin dejar una instalación parcialmente activa.
- [ ] Conservar la configuración del usuario y skills ajenas; no sobrescribir silenciosamente una instalación existente.
- [ ] Permitir actualizar o reinstalar tripi-tropi de manera explícita y reproducible, sin copiar node_modules del desarrollador.
- [ ] Incluir instrucciones breves de instalación, descubrimiento de la skill, lanzamiento, parada y actualización.
- [ ] Instalar en un destino aislado y verificar que el paquete puede abrir tickets de dos repos distintos, incluidos directorios con espacios.
- [ ] Validar el paquete distribuido y documentar cualquier paso necesario para que Codex descubra la skill nueva.
- [ ] Crear al menos un commit de implementación del ticket y registrar su hash abreviado real en Commits antes de cerrar.

## Trabajo realizado

Pendiente. No se realizaron cambios ni verificaciones de implementación.

## Estado posterior

Pendiente de 04 y 05. Definir la mecánica de distribución al implementar, con base en el paquete final y las instrucciones oficiales vigentes de instalación de skills.
