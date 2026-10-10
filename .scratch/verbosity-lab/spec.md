# Verbosity lab

Feature experimental para comparar Verbosity 1, 2 y 3 sin modificar la skill, el parser ni las reglas del proyecto.

## Decisión posterior al lab

Se adoptan solo dos niveles de escritura: **1 — Minimal (predeterminado)** y **2 — Detailed**, con detalle proporcional a la complejidad. El nivel 3 y sus mediciones se conservan como evidencia histórica; no se renumeran ni alteran las salidas. La regla vigente está en la guía empaquetada de tickets; el protocolo y los niveles siguientes describen el experimento original. Esta decisión simplifica la elección y no demuestra ahorro total de tokens o costes.

## Estado de la prueba

Primera tanda ejecutada: **9 sesiones reales**, tres escenarios equivalentes por nivel, gpt-6.1-sol / medium. Se usa la guía final del ticket 12 y patches, sin modificar la skill ni la aplicación. Hay una salida actual representativa en `Comments → Salida actual del lab` de cada ticket; los ejemplos anteriores permanecen identificados como históricos. Los hashes de esos ejemplos históricos no son Commits de este repositorio.

## Resultados actuales

Totales de tres sesiones por nivel. Caché es un subconjunto de entrada; razonamiento es un subconjunto de salida. Total procesado = entrada + salida, no coste facturado ni cuota. Tokens del registro son promedios estimados con o200k_base, no un tokenizador confirmado del modelo.

| Nivel | Entrada | Caché | Salida | Razonamiento | Total procesado | Tokens del registro (estimación) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 49.550 | 25.088 | 759 | 0 | 50.309 | 56,33 |
| 2 | 49.071 | 37.632 | 963 | 137 | 50.034 | 72,33 |
| 3 | 50.508 | 37.632 | 1.072 | 0 | 51.580 | 160,67 |

**Observado:** nivel 1 generó 21,18% menos salida que nivel 2 y 29,20% menos que nivel 3. Si se excluye el razonamiento, la reducción frente a 2 es 8,11%. El registro escrito también fue menor. El total procesado fue 0,55% mayor que nivel 2 y 2,46% menor que nivel 3: **ahorro total no corroborado de forma general**.

Los nueve patches se aplicaron, preservaron alcance/metadatos, pasaron validación estricta y conservaron la evidencia obligatoria. Los casos de fallo retuvieron problema/solución; los casos con limitación retuvieron que overflow y precisión de enteros no seguros no fueron probados. Sin herramientas ejecutadas por los sujetos ni reintentos del runner. Revisión manual de las nueve salidas: se conserva el texto original; frases como `no known limitations` en casos sin una limitación explícita no demuestran cobertura numérica completa.

### Qué se midió y qué falta

- Se midió **generación del patch de cierre** sobre una implementación previamente verificada. El sujeto propuso texto en modo de solo lectura; el controlador aplicó el patch y validó. No es el CLI de cierre semántico descartado, ni una implementación completa del agente.
- Tres escenarios: cierre normal, fallo real de ruta de test introducido como control y cierre con límite explícito de cobertura. Una generación por nivel/escenario; no tres repeticiones independientes de cada escenario.
- Orden fijo 1 → 2 → 3, para implementar un ticket canónico por vez. Se pospuso la alternancia del protocolo original. El primer caso de 1 tuvo caché fría; no atribuir diferencias de entrada sin caché a verbosity.
- Los prompts explícitos coinciden salvo nivel y ruta, pero los contadores de entrada del host varían. Preparación, verificaciones del controlador, commits y esta conversación quedan fuera de los contadores de los sujetos. El tamaño de todo el ticket canónico, con historial/comentarios, tampoco es el tamaño del registro experimental medido.
- Para concluir sobre consumo total faltan más tareas, repeticiones por tarea, orden balanceado, condiciones de caché comparables y pruebas de creación/actualización/implementación. Esta tanda respalda menos documentación/salida, no una promesa de ahorro de cuota o dinero.

Métricas y salidas: `results/v1-r1` a `results/v3-r3`; resumen completo: `results/summary.json`. Los JSONL crudos quedan en `.cache/verbosity-lab/`, fuera de Git y del viewer, para conservar el contador original sin publicar rutas de usuario ni metadatos de sesión.

### Reproducir el análisis

```sh
python -m pip install --target .cache/verbosity-lab/tokenizer tiktoken==0.14.0
python .scratch/verbosity-lab/analyze.py --tokenizer-path .cache/verbosity-lab/tokenizer
```

Sin `--tokenizer-path`, el análisis conserva las métricas reales y omite estimaciones de texto. `run.py` rechaza sobrescribir mediciones existentes. Las sesiones se ejecutaron con `codex exec --ignore-user-config --model gpt-6.1-sol -c model_reasoning_effort="medium" --sandbox read-only --json`, autenticación existente y ningún bypass de permisos. Referencia: [modo no interactivo oficial](https://learn.chatgpt.com/docs/non-interactive-mode). Estas herramientas son del laboratorio, no forman parte del paquete instalado.

## Protocolo de referencia (definido antes de la tanda)

- Una tarea equivalente por nivel: verificar sumas de enteros positivos y negativos y rechazar fracciones. Mismo alcance, modelo, razonamiento, instrucciones, herramientas y verificaciones.
- Ejecutar secuencialmente en contextos frescos, alternando el orden de los niveles entre repeticiones. Usar patches; el CLI de cierre fue descartado.
- Guardar cada repetición fuera de los tickets, bajo results/, sin sobrescribir mediciones anteriores. Conservar una salida representativa por nivel en su ticket.
- Medir entrada, subconjunto cacheado, entrada sin caché, salida, llamadas, reintentos, tiempo y tokens del registro. No sumar caché a entrada ni razonamiento a salida. No atribuir ahorro total solo a menor texto.
- Verificar metadatos, criterios, alcance, dependencias, errores, limitaciones y hashes reales. Cada implementación necesita su commit y un commit posterior de registro, identificando feature y número.
- La muestra inicial de cierre no demuestra ahorro: nivel 1 = 193793 tokens totales; nivel 2 = 132612; nivel 3 = 131778. Una ejecución por nivel, usando el helper anterior, no permite concluir ni extrapolar al método de patches.

## Niveles experimentales históricos

1. Verificación mínima; sin resumen narrativo de cierre. Los fallos y limitaciones siempre se conservan. Mientras siga vigente la guía actual, Final state debe conservar al menos un resultado factual; no se habilita su omisión en producción.
2. Problema o tema: solución; verificación. Cierre breve. Nivel propuesto por defecto.
3. Cambios, decisiones relevantes, verificación, limitaciones y siguiente paso. Sin relleno ni problemas inventados.

Verbosity es metadata experimental; la UI todavía no tiene un control dedicado. Los labels verbosity-1, verbosity-2 y verbosity-3 permiten filtrar. Los tickets fueron aprobados como ready-for-agent al iniciar su implementación; completados ya no son encolables. Las reglas de producción no cambian: Final state sigue obligatorio, incluso en nivel 1.
