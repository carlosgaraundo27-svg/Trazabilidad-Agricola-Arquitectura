# Revisión de A posterior a publicación — 2026-11-19

[PR #8](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/8), base [#7](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/7) en dd18ced. Se revisan los commits de servidor ya publicados y las correcciones de esta tarea; ambos PR permanecen abiertos y sin fusionar. La rama A recibe las herramientas de verificación del respaldo y su documentación, sin añadir código Android o el incremento offline a Inventario.

| Dimensión | Resultado de revisión |
| --- | --- |
| Identidad | UUID de ruta e Idempotency-Key deben coincidir; namespace organización/ID y dueño actor inmutable. Canonización determinista de UUID/instante/decimal textual; sin redondeo ni claves online reutilizadas |
| Autorización antes del replay | Después de esperar el lock de identidad se consulta sesión activa con clock_timestamp y FOR SHARE; se revalida rol, asignación y parcela antes de consultar/devolver recibo. No se usa el actor HTTP como autorización definitiva |
| Recibo inmutable | PK por organización/ID, FK compuesta a pre-lote/cosecha/organización/actor; UPDATE/DELETE/TRUNCATE rechazados por triggers. Down008 bloqueado si hay recibos. Sin backfill/TTL |
| Concurrencia | Lock transaccional por identidad y UNIQUE declarativo; misma intención obtiene201/200, distinta obtiene201/409. Colisiones del hash advisory pueden serializar identidades diferentes, no aceptar contenido equivocado; no se afirma rendimiento medido |
| Conflictos | Dueño distinto o cambio de hash/campos:409 genérico sin IDs ajenos. Organización distinta no hereda recibos. Los permisos se vuelven a comprobar para replay |
| Atomicidad | UoW compartida por alta cosecha/pre-lote, auditoría y recibo, sin transacción anidada. Fallos reales SQL revierten las cuatro escrituras; lock y permisos se retienen hasta commit |

No se detectó defecto funcional nuevo que requiera cambiar ese flujo. Se ejecutaron solo los tres archivos de integración propios de A en una base nueva offline_a_*: **15 resultados aprobados**, incluyendo carreras, expiración durante lock, revocaciones, respuesta perdida postcommit, nuevo proceso Node, migración/inmutabilidad/rollback. La primera invocación del lanzador rechazó una etiqueta con dígito antes de ejecutar tests; se conservó la base vacía creada y se usó una etiqueta válida. No se modificaron aserciones o timeouts. Demo sin mutaciones.

Sonar había informado dos recomendaciones (`AaH0ksqFZIP8Y-tWH56o` y `AaH0ksqFZIP8Y-tWH56p`) para las dos apariciones de `[0-9]` en la expresión de cantidad. Se sustituyen por `\d`, equivalente ASCII en esta expresión ECMAScript. La restricción inicial `[1-9]`, límites de dígitos y precisión quedan iguales. Tres unitarias focalizadas aprobadas: equivalencias/rechazos existentes y cobertura adicional de dígitos no ASCII, espacios y terminadores. No se cambia el contrato ni se ensancha validación.

Los20 avisos/nueve críticos DDL de #7 siguen documentados en [revision-pr7.md](revision-pr7.md). No se alteraron migraciones001–008, gates, perfiles o exclusiones para resolver recomendaciones. El análisis del SHA final debe confirmar su estado; no se presume resuelto remotamente por editar código. [Checks y publicación por SHA anteriores](publicacion-inventario-offline-A.md), [revalidación del respaldo](revision-respaldo-check.md). Los checks del HEAD de esta revisión se enlazan en el PR/entrega tras publicar; no se trasladan los de ce9c3f6.
