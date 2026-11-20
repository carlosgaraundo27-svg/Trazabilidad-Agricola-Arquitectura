# Evidencias de Sprint 2

| Código ensayado | Archivo | Contenido |
| --- | --- | --- |
| `addab5f9101a5d6288fb325d1adda395553d967c` | [verification.json](addab5f9101a5d6288fb325d1adda395553d967c/verification.json) | Jest38/38, node:test41/41, check, formato fallido CRLF/diagnóstico, cobertura por archivo y hashes SHA256. |
| `addab5f9101a5d6288fb325d1adda395553d967c` | [mutation-check.json](addab5f9101a5d6288fb325d1adda395553d967c/mutation-check.json) | Regresión node:test detecta doble descuento mediante módulo alterado solo en memoria; archivo productivo sin cambios. |

Resultados producidos por `node scripts/sprint02/record-tests.js`. El SHA corresponde al código/test/config ensayados; el commit documental posterior incorpora el manifiesto sin modificar esos archivos. No sustituir este SHA por la cabeza actual sin comprobar igualdad del código. El timestamp identifica la ejecución, no el cierre del ensayo Android.

Artefactos HTML/LCOV: generados en `coverage/jest/` y job Jest de CI con nombre `jest-coverage-<head-SHA>`/retención14d. Los artifacts locales no se duplican en Git y los logs/JSON sin sanear quedan en `.local`. **Subida/importación remota pendiente hasta comprobar Actions**; generar LCOV no prueba ingestión por Sonar.

Nuevas mediciones: directorio por SHA y entorno/corrida, con fechas, comandos exactos/exit codes, versiones/digests, CPU/RAM/almacenamiento, parámetros/dataset/cardinalidades, muestras y análisis, tanto en éxito como fallo. Publicar solo ficción revisada; nunca contraseñas, sesiones, claves, dumps, datos privados ni informes antivirus. No guardar un archivo vacío o una estimación en lugar de un resultado pendiente.

PostgreSQL/Redis/k6 y verificación física24h todavía **no ejecutados en esta preparación**. Las evidencias Android previas se enlazan desde [C](../../05-sprint01/incremento-C-android.md) y [D](../../05-sprint01/incremento-D-matriz-android.md), atribuidas a sus SHA originales; no se copiaron ni renovaron artificialmente.
