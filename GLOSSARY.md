# Tripi-tropi

Vocabulario para explorar tickets locales y delimitar el trabajo que se solicita al agente.

## Language

**Ticket objetivo / Target ticket**:
El ticket seleccionado que se desea completar junto con sus prerrequisitos.
_Avoid_: Nodo padre, raíz (el objetivo puede tener dependencias).

**Conjunto de dependencias / Dependency set**:
El ticket objetivo y todos sus prerrequisitos transitivos dentro de la misma feature, incluyendo los completados como contexto. Excluye descendientes, ramas hermanas y trabajo de otras features.
_Avoid_: Componente conexo, componente fuertemente conexo, cadena (puede haber varias ramas de prerrequisitos).
