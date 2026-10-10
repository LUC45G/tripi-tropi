# 10: Simplificar la instalación mediante gestores de paquetes o plugin
Status: ready-for-agent
Execution: completed
Labels: installation, distribution, packaging
Blocked by: 06
Commits: ed4ddbc13252

## Estado inicial

### Qué construir

La instalación actual requiere clonar el repositorio y ejecutar un script local. Evaluar y entregar la vía más simple y reproducible para que otra persona instale `tripi-tropi`, priorizando una opción publicable mediante npm, pnpm o npx y/o un plugin de Codex compatible con la distribución de skills.

### Atomicidad

El ticket entrega un único resultado observable: una ruta de instalación simplificada, documentada y verificable para el paquete completo ya distribuible. La investigación de las alternativas, la elección de la ruta viable, su implementación, publicación de metadatos y la documentación pertenecen al mismo resultado y pueden terminarse sin intercalar otro ticket. Si npm/pnpm/npx y el plugin requieren paquetes o ciclos de publicación independientes, dividir esas rutas en tickets separados antes de implementar; no dejar una integración a medias para completar otra después.

### Criterios de aceptación

- [x] Evaluar npm, pnpm, npx y plugin de Codex contra compatibilidad, mantenimiento, descubrimiento de skills y requisitos de publicación actuales; registrar la decisión y las alternativas descartadas.
- [x] Ofrecer una única ruta recomendada que permita instalar la skill con un comando corto y reproducible, sin copiar `node_modules` del entorno de desarrollo ni modificar otras skills o la configuración del usuario.
- [x] Si se publica en npm o se usa npx/pnpm, incluir metadatos de paquete, archivos incluidos, versión, dependencias e instrucciones de actualización; si se usa plugin, incluir el manifiesto y la estructura requerida para que Codex lo descubra.
- [x] Mantener disponible la instalación desde checkout como fallback y documentar cuándo usarla.
- [x] Verificar la instalación en un entorno aislado, un repositorio con espacios en la ruta y un repositorio distinto del de desarrollo; confirmar que el viewer abre tickets y sigue siendo solo lectura.
- [x] Documentar descubrimiento, reinicio de Codex si corresponde, actualización, desinstalación y errores accionables.
- [x] Validar el paquete publicado o empaquetado, ejecutar la suite relevante y registrar los resultados sin publicar credenciales, rutas personales, emails o claves.

## Trabajo realizado

Se eligió npm como formato publicable, con `npx tripi-tropi` como ruta recomendada y `pnpm dlx tripi-tropi`/`npm exec tripi-tropi` como equivalentes. El paquete raíz dejó de ser privado, tiene binario ejecutable, versión 0.1.1 y una lista explícita de archivos. `.npmignore` excluye node_modules, tests, cachés, tickets locales y metadatos del repositorio. El binario reutiliza el instalador transaccional del ticket 06.

Se evaluó el plugin de Codex: la distribución directa de una skill ya funciona desde el paquete instalado en `~/.agents/skills`, mientras que un plugin agrega manifiesto y ciclo de publicación sin aportar una ruta más corta para este viewer. Se conserva el checkout como fallback para desarrollo y versiones fijadas.

Verificación: `npm pack --dry-run` produce `tripi-tropi@0.1.1` sin `node_modules` de desarrollo; el binario responde a `--help`; la instalación aislada abre y detiene el viewer en dos repositorios, incluido uno con espacios, y confirma que los archivos observados no cambian. Validación estricta: 12 tickets sin errores ni advertencias.

## Estado posterior

La ruta npm/npx está implementada y verificada. La publicación en el registro npm requiere una acción posterior con credenciales del mantenedor y no se ejecuta automáticamente.
