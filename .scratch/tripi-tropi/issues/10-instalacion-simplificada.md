# 10: Simplificar la instalación mediante gestores de paquetes o plugin
Status: ready-for-agent
Execution: pending
Labels: installation, distribution, packaging
Blocked by: 06
Commits: none

## Estado inicial

### Qué construir

La instalación actual requiere clonar el repositorio y ejecutar un script local. Evaluar y entregar la vía más simple y reproducible para que otra persona instale `tripi-tropi`, priorizando una opción publicable mediante npm, pnpm o npx y/o un plugin de Codex compatible con la distribución de skills.

### Atomicidad

El ticket entrega un único resultado observable: una ruta de instalación simplificada, documentada y verificable para el paquete completo ya distribuible. La investigación de las alternativas, la elección de la ruta viable, su implementación, publicación de metadatos y la documentación pertenecen al mismo resultado y pueden terminarse sin intercalar otro ticket. Si npm/pnpm/npx y el plugin requieren paquetes o ciclos de publicación independientes, dividir esas rutas en tickets separados antes de implementar; no dejar una integración a medias para completar otra después.

### Criterios de aceptación

- [ ] Evaluar npm, pnpm, npx y plugin de Codex contra compatibilidad, mantenimiento, descubrimiento de skills y requisitos de publicación actuales; registrar la decisión y las alternativas descartadas.
- [ ] Ofrecer una única ruta recomendada que permita instalar la skill con un comando corto y reproducible, sin copiar `node_modules` del entorno de desarrollo ni modificar otras skills o la configuración del usuario.
- [ ] Si se publica en npm o se usa npx/pnpm, incluir metadatos de paquete, archivos incluidos, versión, dependencias e instrucciones de actualización; si se usa plugin, incluir el manifiesto y la estructura requerida para que Codex lo descubra.
- [ ] Mantener disponible la instalación desde checkout como fallback y documentar cuándo usarla.
- [ ] Verificar la instalación en un entorno aislado, un repositorio con espacios en la ruta y un repositorio distinto del de desarrollo; confirmar que el viewer abre tickets y sigue siendo solo lectura.
- [ ] Documentar descubrimiento, reinicio de Codex si corresponde, actualización, desinstalación y errores accionables.
- [ ] Validar el paquete publicado o empaquetado, ejecutar la suite relevante y registrar los resultados sin publicar credenciales, rutas personales, emails o claves.

## Trabajo realizado

Pendiente. La instalación desde checkout y el instalador local están cubiertos por el ticket 06. Este ticket aún no elige una tecnología de publicación.

## Estado posterior

Pendiente de implementar después de 06. La solución debe conservar el comportamiento actual del viewer, la separación del agente y la lectura estrictamente local de tickets.
