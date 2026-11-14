# Revisión del PR #3 de Acopio

Fecha: 2026-11-14. Alcance académico D1–D7, sin validación agrícola ni aprobación docente. [PR #3](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/3), sin fusionar.

## Base y contraste

Cabeza inicial 9e3a39f, base main 94d3eab. Se volvieron a consultar los checks de [Actions #7](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/43609917136): verify y compose success. Sin reviews ni hilos pendientes. Se revisaron especificación, ADR-011, código, SQL, OpenAPI, UI y evidencias, además de una segunda revisión independiente.

| Decisión | Evidencia y resultado                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1       | UNIQUE pre_lot_id y centro/referencia; recepción completa, sin cantidades parciales.                                                             |
| D2       | BigInt en milésimas, numeric y neto generado; declaración separada y sin conversión implícita.                                                   |
| D3       | Compatibilidad productor/parcela/fecha Lima/organización/centro, bloqueo ordenado y aporte completo. UUID corregidos.                            |
| D4       | pending_review y aprobador distinto del capturador en aplicación y trigger; confirmación separada. Sin tolerancias ni merma inferida.            |
| D5       | Sin rutas de reparto/división/reapertura; lote cerrado sin nuevos aportes.                                                                       |
| D6       | H = neto confirmado, calidad pendiente y despacho false.                                                                                         |
| D7       | Concesión por acción/organización/centro, sesión activa y permiso revalidados antes del replay; sin herencia por rol. Hechos/eventos inmutables. |

Migraciones: 001 intacta, 002 aditiva; runner serializa versiones dentro de una transacción y preserva funciones SQL mediante delimitadores. FK compuestas respaldan ámbito. El down/up anterior fue exclusivamente en DB desechable. Estas correcciones no cambian migraciones, permisos concedidos, dependencias, lockfile, workflow ni datos de demo.

Escrituras: operación, evento, auditoría y resultado idempotente usan la misma conexión/transacción. Advisory lock y UNIQUE por actor serializan reintentos; bloqueo ordenado y UNIQUE(receipt_id) impiden doble consumo. Fallos reales de evento/auditoría y concurrencia permanecen cubiertos. No se encontraron otras regresiones de escritura o autorización.

## Hallazgos y correcciones

1. **P2 — UUID equivalentes tratados como distintos.** La entrada preservaba mayúsculas; PostgreSQL devuelve minúsculas. Un centro válido podía provocar 404 al consolidar; cambiar el caso eludía Set o causaba 409 en replay. Se normalizan UUID de body/query/path/key antes de deduplicar, ordenar, comparar, hash y lock. La referencia comercial sigue sensible a mayúsculas. Regresiones de duplicado, centro con letras, rutas y replay secuencial/concurrente.
2. **P2 — lectura de saldo mezclaba snapshots.** READ COMMITTED podía leer estado weighed y después un aporte confirmado de 100 kg por otra solicitud: H=0 y A=100. No duplicaba masa persistida, pero la respuesta era inconsistente. La lista compuesta usa REPEATABLE READ antes de su primera consulta; las escrituras conservan sus bloqueos. Un test determinista confirma y consolida realmente entre las SELECT, y comprueba respuesta anterior coherente y siguiente lectura actualizada.

La hipótesis inicial de terminadores de línea en kg se descartó al reproducirla: el patrón existente los rechaza. No se cambió el pesaje ni se presenta esa hipótesis como error corregido.

La primera CI de la corrección, [Actions #8](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/43611910150), aprobó unitarias/integración/build y compose, pero falló un E2E: el helper navegaba al nuevo login después de hacer clic en logout, antes de terminar la revocación y la transición de pantalla. Se exige ahora que la pantalla de inicio de sesión esté visible antes de continuar. No se ampliaron timeouts ni se quitaron aserciones. Las lecturas que compiten con revocaciones pueden abortar transitoriamente con 40001 y respuesta segura genérica; no se añaden reintentos de escritura ni se relaja la autorización.

Base técnica: [aislamiento PostgreSQL](https://www.postgresql.org/docs/18/transaction-iso.html) y [SET TRANSACTION](https://www.postgresql.org/docs/18/sql-set-transaction.html). El snapshot aplica solo a esa transacción, sin modificar la configuración de sesión del pool.

## Verificación proporcional

Ambos errores quedaron reproducidos en rojo antes de corregirse. Después pasaron 5 unitarias del archivo afectado y 15 resultados de integración HTTP/PostgreSQL de Acopio (14 subcasos y contenedor), sin omisiones. Se comprobaron sintaxis/imports/OpenAPI/enlaces y formato. [Evidencia focalizada](evidence/revision-pr3/README.md).

No se repitieron manualmente suites ajenas, build, E2E, auditoría npm o reinicio ya aprobados sin cambios que lo justificaran. El workflow automático verifica la nueva cabeza completa al publicarla; sus resultados finales quedan registrados en la descripción del PR y en CONTINUIDAD_ACOPIO.md del workspace.

## Conclusión técnica

Con las correcciones, listo para integrar **el alcance académico** si verify y compose aprueban en la cabeza publicada final y no aparecen conflictos nuevos. Los checks antiguos no sustituyen los nuevos. La autorización de merge sigue pendiente y esta revisión no fusiona el PR. No implica aceptación docente ni aptitud productiva. La siguiente especificación de calidad se prepara en rama documental separada, sin funciones de calidad en este PR.
