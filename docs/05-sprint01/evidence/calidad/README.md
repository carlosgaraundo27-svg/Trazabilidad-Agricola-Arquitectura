# Evidencias parciales de Calidad — 2026-11-15

Alcance académico Q1–Q9, sin validación agrícola ni aprobación docente. **No acreditan cierre: falta decidir cobertura de temperaturas de recepción para cerrar.**

- unit-red.txt: ausencia inicial del dominio, antes de implementarlo. Después pasan 4 unitarias Calidad; suite total 13.
- integration-red.txt: ausencia inicial de usuario/calidad antes de migración/API. integration-draft.txt: 8 resultados aprobados de creación, captura, ámbito, concurrencia de edición, rollback SQL e invariancia de cantidades.
- milliseconds-red.txt: regresión UI que reproduce truncamiento de milisegundos. e2e-draft.txt: 2 E2E aprobados después de corregir, también replay tras respuesta perdida, conflicto de creación y centro ajeno.
- draft-mobile.png: captura Chromium de borrador a 320 px; verificada visualmente, sin overflow, con foco por teclado.

Build, check de sintaxis/límites/OpenAPI/enlaces y format:check aprobaron. El primer format:check detectó CRLF del checkout Windows en archivos ajenos; la normalización local a LF resolvió el formato sin cambio lógico. Las pruebas usan nuevas bases PostgreSQL 18.6 dedicadas y datos ficticios, sin tocar demo. No se han ejecutado aún cierre/concurrencia de cierre/reinicio para este incremento. No presentar logs parciales como CI de una cabeza publicada.
