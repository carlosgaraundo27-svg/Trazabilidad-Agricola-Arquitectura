# Continuidad: implementación de Calidad en progreso

2026-11-15. Q1–Q9 adoptadas por el usuario exclusivamente para el prototipo académico. Sin aprobación docente ni validación agrícola. [Especificación actualizada](../03-diseno-de-software/05-especificacion-calidad-lote.md), [ADR-012](../02-arquitectura/09-decisiones-calidad.md).

## Integración de Acopio y conservación

PR #3 integrado con merge commit 829f79e976967097554543c51855135e0e1c193b, conservando los 13 commits. Cabeza d09d8be comprobada nuevamente: mergeable, sin reviews/hilos y verify/compose success en Actions #9 (43612344618). Segunda revisión focalizada sin bloqueos nuevos; cinco unitarias Acopio aprobadas. La autorización del usuario de esta sesión permite esta integración. No se forzó ni se usó squash/rebase.

main local actualizado a origin/main 829f79e. Nueva rama feat/calidad en repo-calidad/, creada desde main; cherry-pick 399733a conserva la especificación documental original (0481740). La rama docs/especificacion-calidad y el worktree repo-calidad-spec/ permanecen intactos. Git de red funciona con `git -c http.sslBackend=openssl fetch origin`; la configuración global no se cambió. Mutaciones de GitHub se realizaron por conector.

## Regla pendiente y trabajo que depende de ella

El usuario debe definir **si cerrar exige temperatura documentada de cada recepción aportante, o si permite cerrar con lectura posterior completa dejando explícita la cobertura parcial de RF-06 cuando falten originales**. Pregunta enviada mediante consulta asíncrona; sin respuesta aún. El paso del tiempo no es decisión. No implementar la política de cierre ni declarar completado el incremento antes de recibirla. Nunca fabricar temperaturas. Cada original ya se vincula por sourceReceiptId a una recepción del lote; posteriores quedan separados, sin promedio/reemplazo.

El endpoint de cierre no está implementado todavía; el formulario y OpenAPI están preparados para el recorrido final, sin publicar ni declarar contrato ejecutado de cierre. Faltan implementación/pruebas de cierre, concurrencia de cierre, protección closed verificada end-to-end, contrato con muestras reales, C4 final, instrucciones finales y PR de Calidad. No hay PR de Calidad abierto ni publicado. La autorización para abrirlo sin fusionar sigue vigente.

## Incrementos implementados y comprobados

- Dominio: unidades g/fruto, %, frutos, °C; decimales hasta dos posiciones, conteos coherentes, fecha/observador/procedencia/método por observación, porcentaje informativo con enteros exactos. Sin categorías ni umbrales agrícolas.
- Migración 003 aditiva, sin cambiar 001/002: calidad propia dentro de Q, evaluación única por lote, versión, eventos antes/después y claves idempotentes. Triggers de inmutabilidad de historia y de closed.
- API draft: listado por centro, creación, consulta y reemplazo de captura con versión. Permiso/sesión revalidados antes del replay; lectura de captura e historia bajo bloqueo compartido. Referencias/etapas/momentos de temperaturas verificadas contra lote T1 por contrato.
- UI: listado paginado, captura incompleta sin ceros ficticios, mediciones, reintento con misma intención, consulta del servidor y resultado preparado. Acopio etiqueta pending_quality como histórico al consolidar. Componente separado para cada grupo de observaciones. Corrección de milisegundos y actualización de lista tras creación concurrente.

Pruebas hasta este punto: 13 unitarias completas, 8 resultados integración Calidad PostgreSQL real, 2 E2E Chromium de draft, replay, conflicto de creación, aislamiento de centro y móvil/teclado. Build, check (sintaxis/imports/OpenAPI/enlaces) y format:check aprobados. Fallos SQL reales en eventos/auditoría prueban rollback del draft. Un ensayo rojo reproduce pérdida de milisegundos antes de corregir. No son evidencias de cierre aún. [Evidencias parciales](evidence/calidad/README.md).

## Entorno de continuación

Cluster nativo de pruebas existente .acopio-runtime/pg-data iniciado en 55434, oculto, logs quality.stdout.log/quality.stderr.log. pg_ctl falló por restricted token (87); postgres.exe directo inició correctamente. Se crearon bases nuevas exclusivas quality_int_* y quality_e2e_*; nombres en repo-calidad/.local/quality-databases.json, credencial leída del archivo ignorado existente. Sin seed ni cambios sobre demo o bases Acopio anteriores. node_modules es junction al snapshot repo/node_modules; dependencias/lockfile sin cambios lógicos.

Runner ignorado .local/quality-db.mjs: `node .local/quality-db.mjs integration tests/integration/quality.test.js`, `node .local/quality-db.mjs e2e tests/e2e/quality.spec.js`; servidor E2E sirve dist, ejecutar build tras cambiar UI. Los logs se guardan redactados en .local/results/. El checkout de Windows introduce CRLF; normalizar a LF para format:check sin cambios lógicos, revisar diff antes de commit. La última normalización solo afecta representación local; no versionar cambios ajenos.

Retomar la misma rama, resolver exclusivamente la regla pendiente con la respuesta del usuario y completar los pasos autorizados. No fusionar el PR de Calidad.
