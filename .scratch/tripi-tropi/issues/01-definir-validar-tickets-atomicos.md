# 01: Definir y validar la escritura de tickets atómicos
Status: ready-for-agent
Execution: in-progress
Labels: documentation, validation
Blocked by: none
Commits: none

## Estado inicial

### Qué construir

Una guía obligatoria y un comando de validación de solo lectura permiten crear y revisar tickets completos, con metadatos consistentes y commits trazables. Compatibilidad con to-tickets y los ejemplos de qr-wedding.

### Atomicidad

Todas las dependencias declaradas deben estar completadas antes de empezar. Este ticket entrega una capacidad verificable sin intercalar trabajo de otro ticket. Si aparece una dependencia parcial, revisar y dividir el alcance antes de implementarlo.

### Criterios de aceptación

- [ ] Documentar la guía obligatoria y enlazarla desde AGENTS.md y el tracker; incluir la guía reutilizable en el paquete tripi-tropi.
- [ ] Exigir un resultado completo por ticket y dependencias resueltas antes de comenzar; dividir cualquier ejecución intercalada en tickets separados.
- [ ] Definir Status, Execution, Labels, Blocked by y Commits, más objetivo, atomicidad, aceptación, trabajo realizado y estado posterior.
- [ ] Exigir al menos un commit por ticket, identificándolo por número; nunca mezclar dos tickets en un commit y no hacer push sin instrucción.
- [ ] Registrar hashes abreviados reales en Commits; explicar el commit posterior de registro para evitar autorreferencia.
- [ ] Validar por CLI campos, estructura, identidad única, estados, hashes, referencias y ciclos sin escribir archivos; aceptar formato heredado con avisos.
- [ ] Probar ejemplos aislados de to-tickets y qr-wedding, errores y ausencia de mutaciones; separar validación estructural de revisión semántica de atomicidad.

## Trabajo realizado

Se publicó la guía obligatoria reutilizable y sus enlaces desde AGENTS.md y el tracker. Se implementaron el lector y el validador CLI de solo lectura, con formato estricto y compatibilidad heredada, validación de commits y grafo de dependencias.

Verificación: 8 pruebas pasando; los cinco tickets de tripi-tropi pasan validación estricta sin errores ni avisos. Los 14 tickets de qr-wedding se leen sin errores, con 64 avisos de campos/secciones heredados. Se corrigió la interpretación de comas dentro de títulos de dependencias. Las pruebas verifican que la lectura y CLI no alteren los archivos observados.

## Estado posterior

Implementación y verificaciones completadas. Pendiente registrar el commit de implementación antes de cerrar. La atomicidad semántica y la veracidad de los registros requieren revisión del agente; el validador no las demuestra automáticamente.

