# 02: Analizar acciones para pedir información y dividir tickets
Status: ready-for-agent
Execution: completed
Labels: research, product
Blocked by: none
Commits: 7d0a36357c48
Verbosity: 1

## Estado inicial

### Qué construir

Analizar dos acciones accesibles desde un ticket: pedir más información y solicitar su división en varios tickets atómicos. Entregar una propuesta revisable en `.scratch/mejoras-futuras/acciones-tickets.md`, sin implementar botones ni modificar tickets como parte de la investigación.

Decidir qué instrucción recibe el agente, qué información aporta el usuario, cómo se confirma la acción y cómo se presenta su resultado. Mantener el viewer de solo lectura: cualquier escritura eventual corresponde al agente y requiere un alcance autorizado explícito. Distinguir pedido de aclaraciones, propuesta de división y ejecución efectiva de una división.

### Atomicidad

La entrega es un análisis de estas dos acciones con decisiones y preguntas pendientes. No depende del informe general 01 ni de las políticas de labels o features; puede revisarse sin implementar ninguna propuesta.

### Criterios de aceptación

- [x] Describir problema y flujo propuesto para pedir información: destinatario, contexto enviado, preguntas al usuario, canal de respuesta y tratamiento de una solicitud ya pendiente.
- [x] Describir el flujo de división: propuesta y aprobación, atomicidad de los nuevos tickets, numeración, dependencias entrantes/salientes, trazabilidad del original y tratamiento de trabajo o commits existentes.
- [x] Analizar acciones sobre tickets pending, in-progress y completed, identificando restricciones y riesgos de dividir trabajo ya iniciado.
- [x] Proponer opciones de copiar instrucciones o encolarlas al agente, sus confirmaciones, revalidación y protección contra duplicados, sin convertir la UI en editor ni prometer integraciones inexistentes.
- [x] Registrar alternativas, recomendación, preguntas por resolver y criterios para una futura implementación. No implementar ni cambiar estados, dependencias o archivos de tickets durante el análisis.

## Trabajo realizado

- Aclaraciones: diseño de `Clarify ticket` confirmado con el usuario y registrado en [acciones-tickets.md](../acciones-tickets.md), incluyendo triage, nota opcional, aprobación previa a escrituras y liberación manual mediante `Allow new clarification`.
- Alcance restante: analizar `Split ticket`, estados y trabajo previo; no se implementaron controles ni se verificó ejecución con un agente real.
- División: revisión posterior resuelve el alcance restante con diseño confirmado de `Split ticket`, dependencias, estados y excepción obligatoria en progreso; documentadas alternativas, riesgos y verificación futura en el mismo informe.
- Verificación: validador estricto de la feature, enlaces locales del informe y cinco criterios documentados correctos; sin pruebas de aplicación porque no cambió código.

## Estado posterior

Análisis de ambas acciones completado y aprobado; controles e integración con agentes sin implementar ni probar.
