# Evidencias de Sprint 2

| Código ensayado | Archivo | Contenido |
| --- | --- | --- |
| `2758271ad96aa8735f35644efe42b2a02a9ff539` | [ci-remoto.json](2758271ad96aa8735f35644efe42b2a02a9ff539/ci-remoto.json) | Jest/verify/Compose/Sonar remotos aprobados; artifact confirmado y aviso Git Windows CLOSED/FIXED;8 avisos menores abiertos, Sonar0 % de cobertura nueva. |
| `2758271ad96aa8735f35644efe42b2a02a9ff539` | [verification.json](2758271ad96aa8735f35644efe42b2a02a9ff539/verification.json) | Candidato final de código: Jest38/38, node:test45/45, check, formato CRLF/diagnóstico y cobertura8,48 %. Endurecimiento de PATH incluido. |
| `b9809543a0c8ebc9acf9e1aa36fdc4232b200854` | [verification.json](b9809543a0c8ebc9acf9e1aa36fdc4232b200854/verification.json) | Candidato después de correcciones de scripts: Jest38/38, node:test45/45, check, formato CRLF/diagnóstico y cobertura8,48 %. |
| `addab5f9101a5d6288fb325d1adda395553d967c` | [verification.json](addab5f9101a5d6288fb325d1adda395553d967c/verification.json) | Jest38/38, node:test41/41, check, formato fallido CRLF/diagnóstico, cobertura por archivo y hashes SHA256. |
| `addab5f9101a5d6288fb325d1adda395553d967c` | [mutation-check.json](addab5f9101a5d6288fb325d1adda395553d967c/mutation-check.json) | Regresión node:test detecta doble descuento mediante módulo alterado solo en memoria; archivo productivo sin cambios. |

Resultados producidos por `node scripts/sprint02/record-tests.js`. El SHA corresponde al código/test/config ensayados; el commit documental posterior incorpora el manifiesto sin modificar esos archivos. Se conserva el manifiesto inicial `addab5f9`, no se atribuye su resultado a las correcciones posteriores. No sustituir un SHA por la cabeza actual sin comprobar igualdad del código. El timestamp identifica la ejecución, no el cierre del ensayo Android.

Artefactos HTML/LCOV: generados en `coverage/jest/` y job Jest de CI con nombre `jest-coverage-<head-SHA>`/retención14d. Los artifacts locales no se duplican en Git y los logs/JSON sin sanear quedan en `.local`. **Subida de Actions confirmada para2758271**; importación LCOV a Sonar pendiente. La retención temporal no se interpreta como conservación permanente del archivo.

Nuevas mediciones: directorio por SHA y entorno/corrida, con fechas, comandos exactos/exit codes, versiones/digests, CPU/RAM/almacenamiento, parámetros/dataset/cardinalidades, muestras y análisis, tanto en éxito como fallo. Publicar solo ficción revisada; nunca contraseñas, sesiones, claves, dumps, datos privados ni informes antivirus. No guardar un archivo vacío o una estimación en lugar de un resultado pendiente.

Las mediciones específicas PostgreSQL/Redis/k6 y la verificación física24h todavía **no se ejecutaron en esta preparación**. Las suites funcionales remotas del workflow sí se ejecutaron, según el registro CI; no equivalen a benchmarks. Las evidencias Android previas se enlazan desde [C](../../05-sprint01/incremento-C-android.md) y [D](../../05-sprint01/incremento-D-matriz-android.md), atribuidas a sus SHA originales; no se copiaron ni renovaron artificialmente.
