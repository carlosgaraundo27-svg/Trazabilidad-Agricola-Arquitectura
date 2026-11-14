# Acopio: implementación académica y continuidad

Fecha: 2026-11-14. D1–D7 adoptadas por el usuario solo para prototipo académico. **Sin validación agrícola ni aprobación docente.** Se implementó recepción, pesaje, revisión independiente, confirmación/habilitación y consolidación. Calidad y despacho siguen fuera del corte.

## Integración autorizada

- PR #1 integrado con merge `81531e692268b32200ce000fc951010da9b554d1`, conservando `38a85e3`.
- PR #2 cambió su base a main. Actualización con merge `89d749c13ea6da1e02f483261efd755432363b7b`, padres `ba006eb` y `81531e6`; árbol idéntico a ba006eb y diff de 126 archivos sin cambios funcionales introducidos al actualizar.
- [Actions #5](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/43605686557): verify y compose success en esa nueva cabeza. Sin conflictos ni checks fallidos omitidos. PR #2 integrado con merge `94d3eab1a92856334b4a371d65718ba130088f4c`.
- `feat/acopio` se creó sobre ese main y recibió mediante merge `docs/especificacion-acopio`, conservando ab1906d, d29d056 y 62c37da. La rama documental original permanece local e intacta.

El push por Git fue bloqueado por el almacén de credenciales Windows; las operaciones remotas se realizan por el conector GitHub, sin force-push. Se mantienen los commits locales originales y se verifica igualdad de árboles al publicar. El PR de Acopio no se fusiona.

## Implementación

[Especificación/AC-01–16](../03-diseno-de-software/04-especificacion-acopio-consolidacion.md), [ADR-011](../02-arquitectura/08-decisiones-acopio.md), [guía](../../tecnologia/acopio.md) y [C4](../04-modelo-c4/modelo-c4.md).

Acceso posee concesiones explícitas por acción/centro. Sesión activa y permisos se revalidan con bloqueos compartidos antes de reintentos. Pesaje, revisión y confirmación son hechos separados e inmutables. Capturador y aprobador deben ser personas distintas. Neto confirmado habilitado íntegro; sin tolerancias ni merma automática. Fecha local fija Lima y tres decimales son supuestos técnicos del prototipo, sin atribuirlos a una balanza.

Acopio coordina la misma transacción con Trazabilidad, que posee lote, aportes y evento. Bloqueo ordenado y UNIQUE por recepción impiden doble consumo. Cualquier fallo de evento/auditoría revierte también aportes y resultado idempotente. Los totales y saldos se derivan, sin otro inventario mutable. El lote está pendiente de calidad y sin despacho.

La revisión adicional no encontró bloqueos en API. Sus refuerzos incorporados: fallo real de auditoría al consolidar, FK de eventos por organización y lectura de orígenes por lote. Detectó una selección UI obsoleta después de perder una carrera: se reprodujo con E2E rojo y se corrigió limpiando selección tras actualizar. El test espera que termine la carga antes de comprobar el botón, evitando un falso positivo por disabled temporal.

## Verificación ejecutada

| Comprobación                | Resultado y límite                                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitarias                   | 8 aprobadas; mutación de compatibilidad detectada y código restaurado.                                                                                                                            |
| Integración PostgreSQL real | 25 resultados aprobados, sin omisiones: primer recorrido, 12 subcasos de Acopio, contenedores de test y ciclo de servidor.                                                                        |
| E2E Chromium                | 7 aprobados: primer recorrido; Acopio correcto, mezcla incompatible, discrepancia/autoaprobación, otro centro, dos interfaces concurrentes y respuesta perdida con replay desde formulario.       |
| OpenAPI 3.1                 | Estructura validada y 99 respuestas/resultados idempotentes reales contrastados con esquemas. Ajv de verificación sin validación de formatos; UUID/fechas están cubiertos en servidor/pruebas.    |
| Persistencia                | Reinicio real de PostgreSQL nativo de pruebas, mismo directorio, sin migrate/seed entre snapshots: 7 recepciones, 1 revisión, 6 confirmaciones, 3 lotes, 4 aportes y 3 eventos de lote idénticos. |
| UI                          | Captura revisada; sin errores de ejecución JS en caso correcto; sin overflow a 320/768/1024/1440. No equivale a auditoría WCAG completa.                                                          |

Los fallos HTTP de escenarios negativos son esperados; no se contabilizan como éxito de operaciones prohibidas. La pérdida de respuesta se inyecta después de confirmar el POST real en servidor, y el replay devuelve 200 sin duplicar. Logs Node pueden incluir avisos de color del runner; no se detectaron errores de ejecución de página en el recorrido correcto.

[Evidencia saneada](evidence/acopio/README.md). Integración y E2E usan bases nuevas separadas en un cluster nativo dedicado (loopback 55434), ajeno a la demo anterior. La demo y sus dos pre-lotes no se migraron ni modificaron. No se presentan los resultados nativos como Docker Windows. La CI del PR comprobará verify/compose sobre la publicación; registrar su estado real en el PR.

Calidad est?tica y build: sintaxis/imports/enlaces, formato y build aprobados; npm audit report? cero vulnerabilidades. Migraci?n 001, dependencias/lockfile y workflow existentes sin cambios.

## Continuidad

- `repo-acopio/`: trabajo de Acopio sobre main integrado. `repo-acopio-spec/`: rama documental original. `repo-github/`: clon del primer recorrido; conserva también sus merges locales de actualización, sin pérdida de historia. `repo/`: snapshot anterior, no rama Git.
- Nuevos módulos: `server/modules/intake/`, `server/modules/traceability/`; adaptador `server/intake-http.js`; contratos inyectados en `server/composition.js`.
- Datos: `migrations/002_intake.*.sql`; 001 intacta. Fixtures `scripts/seed-intake.js`; sin UI administrativa.
- UI: `web/Workspace.jsx`, `web/intake/`; pruebas `tests/unit/intake.test.js`, `tests/integration/intake.test.js`, `tests/e2e/intake.spec.js`.
- Contrato: `docs/03-diseno-de-software/openapi.json`. C4 canónico actualizado; objetivo conserva sus capacidades todavía propuestas.
- Pendientes externos: validación agrícola real de D1–D7/supuestos y aceptación docente del corte. Pendientes funcionales fuera del prototipo: calidad, despacho, reparto/división/reapertura/corrección, administración productiva de permisos y operación/restauración real.
- Siguiente paso del mantenedor: revisar el PR de Acopio y sus checks. No fusionarlo sin nueva autorización. Una nueva regla que cambie cantidades, integridad o permisos exige explicar y registrar el cambio antes de implementarlo.
