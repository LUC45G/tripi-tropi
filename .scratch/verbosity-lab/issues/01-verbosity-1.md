# 01: Comparar salida con Verbosity 1
Status: ready-for-agent
Execution: in-progress
Labels: experiment, tokens, verbosity-1
Blocked by: none
Commits: none
Verbosity: 1

## Initial state

### What to build
Medir una ejecución controlada de verificación de una suma de enteros, con Verbosity 1, siguiendo ../spec.md. Conservar su salida real y métricas para compararla con los otros niveles. No modificar la skill ni la aplicación.

### Atomicity
Una ejecución independiente, con datos y resultados propios; no requiere completar ni intercalar ningún otro ticket. El análisis agregado posterior no bloquea este resultado.

### Acceptance criteria
- [ ] Verificar sumas positivas, negativas y rechazo de fracciones con la misma tarea y controles que los otros niveles.
- [ ] Conservar métricas reales de la ejecución y evidencia de verificación, incluyendo fallos y limitaciones.
- [ ] Registrar una salida acorde con Verbosity 1 y los commits reales de esta implementación.

## Work performed

Pending. No se ejecutó esta prueba dentro de esta feature.

## Final state

Pending. El ejemplo siguiente pertenece a una prueba anterior, no demuestra ahorro ni completa este ticket.

## Comments

### Salida real anterior — referencia, no nueva ejecución

Fuente: prueba temporal cli-verbose1, modelo gpt-6.1-sol, razonamiento medium. Se conserva el texto original; sus hashes no pertenecen a este repositorio. El método de aquella prueba usaba un helper CLI descartado para la implementación futura.

#### Work performed

Verification: node --test sum.test.mjs passed all 3 tests; original scope preserved; implementation commit 8a8915e9606d verified. Helper invocation: two JSON quoting failures occurred before updating; corrected and retried.

## Final state
