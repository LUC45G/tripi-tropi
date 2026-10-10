# Verbosity lab

Feature experimental para comparar Verbosity 1, 2 y 3 sin modificar la skill, el parser ni las reglas del proyecto.

## Estado de la prueba

Los tickets contienen salidas reales de la prueba anterior como ejemplos en Comments. No son ejecuciones nuevas ni resultados de implementación de estos tickets. Los hashes mencionados en esos ejemplos pertenecen a repositorios temporales; no se registran como Commits de este repositorio.

## Protocolo propuesto

- Una tarea equivalente por nivel: verificar sumas de enteros positivos y negativos y rechazar fracciones. Mismo alcance, modelo, razonamiento, instrucciones, herramientas y verificaciones.
- Ejecutar secuencialmente en contextos frescos, alternando el orden de los niveles entre repeticiones. Usar patches; el CLI de cierre fue descartado.
- Guardar cada repetición fuera de los tickets, bajo results/, sin sobrescribir mediciones anteriores. Conservar una salida representativa por nivel en su ticket.
- Medir entrada, subconjunto cacheado, entrada sin caché, salida, llamadas, reintentos, tiempo y tokens del registro. No sumar caché a entrada ni razonamiento a salida. No atribuir ahorro total solo a menor texto.
- Verificar metadatos, criterios, alcance, dependencias, errores, limitaciones y hashes reales. Cada implementación necesita su commit y un commit posterior de registro, identificando feature y número.
- La muestra inicial de cierre no demuestra ahorro: nivel 1 = 193793 tokens totales; nivel 2 = 132612; nivel 3 = 131778. Una ejecución por nivel, usando el helper anterior, no permite concluir ni extrapolar al método de patches.

## Niveles experimentales

1. Verificación mínima; sin resumen narrativo de cierre. Los fallos y limitaciones siempre se conservan. Mientras siga vigente la guía actual, Final state debe conservar al menos un resultado factual; no se habilita su omisión en producción.
2. Problema o tema: solución; verificación. Cierre breve. Nivel propuesto por defecto.
3. Cambios, decisiones relevantes, verificación, limitaciones y siguiente paso. Sin relleno ni problemas inventados.

Verbosity es metadata experimental; la UI todavía no tiene un control dedicado. Los labels verbosity-1, verbosity-2 y verbosity-3 permiten filtrar. ready-for-human evita enviar accidentalmente estas pruebas a la cola de implementación habitual.
