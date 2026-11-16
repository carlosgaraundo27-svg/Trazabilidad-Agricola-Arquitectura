# Fiabilidad de SonarCloud en main

2026-11-16. Base d7da0d691937e607e8258f37650b47fe7fd6af22. Corrección separada de Inventario, PR #6. No cambia reglas, Quality Gate, exclusiones ni estados manuales de hallazgos.

Diagnóstico reproducible obtenido mediante APIs públicas desde [job 133620678112](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/43958891612), debido a fallos de conexión directa locales. [Respuesta reducida](evidence/sonar-main/before.json). El workflow de diagnóstico temporal se retira antes de integrar.

| Hallazgo | Ubicación en base | Evaluación y corrección |
| --- | --- | --- |
| AaHg28XZGhjC-EaUtdT9, S2871 | web/intake/Intake.jsx:161 | Selección de UUID, no cantidades. El orden lexicográfico era intencional y correcto: no se reproduce el error de orden numérico que advierte la regla. Comparador explícito en inglés hace visible esa intención; no se marca ni oculta como falso positivo. |
| AaHg28agGhjC-EaUtdUK, S2871 | server/modules/traceability/domain.js:14 | UUID normalizados a minúsculas por Zod. Misma justificación; comparador explícito preserva la canonicalización/idempotencia y orden de bloqueo. Prueba de permutaciones, mayúsculas y ausencia de mutación. |
| AaHg28YJGhjC-EaUtdUF, S9011 | web/intake/ReceiptForm.jsx:114 | Envío implícito del formulario de recepción: se declara type=submit. |
| AaHg28YdGhjC-EaUtdUG, S9011 | web/intake/ReceiptList.jsx:111 | Envío implícito de revisión: se declara type=submit. Confirmación independiente usa type=button. |
| AaHagHp7GiVmDmX-BZXv, S9011 | web/main.jsx:64 | Acceso: type=submit. |
| AaHagHp7GiVmDmX-BZXx, S9011 | web/main.jsx:128 | Alta de productor: type=submit. |
| AaHagHp7GiVmDmX-BZXy, S9011 | web/main.jsx:167 | Alta de parcela: type=submit. |
| AaHagHp7GiVmDmX-BZX1, S9011 | web/main.jsx:336 | Alta de pre-lote: type=submit. Salida de sesión usa type=button. |

Los seis botones ya enviaban su formulario por el valor por defecto de HTML; no se atribuye un fallo de envío observado. La corrección elimina dependencia implícita y protege acciones al componer formularios. También se declara type=button para actualizar/consolidar. Se preserva el flujo existente.

El gate previo informa new_reliability_rating=4 (D), umbral máximo 1 (A), con periodo previous_version desde 2026-11-14; seguridad, mantenibilidad, duplicación y hotspots aprobaban. La regla CRITICAL S2871 explica la D aunque las listas contienen identificadores. Se corrige la expresión, sin rebajar umbral ni excluir archivos.

Verificación: [E2E rojo antes de declarar tipos](evidence/sonar-main/button-red.txt), 20 unitarias; recorrido de origen y los seis de acopio (7 E2E) verdes después; integración PostgreSQL en base nueva desechable; build, contratos y formato. La prueba de canonicalización también pasa antes: demuestra preservación de conducta, no se presenta como reproducción de un defecto inexistente en UUID. Evidencia final de CI y main tras merge se registrará tras finalizar los análisis. Sin afirmaciones de rendimiento ni validación docente/agrícola.
