# Revisión ROP-01 sobre28962fe

PR #11 abierto y sin fusionar; referencia recibida coincide exactamente con28962fec05bc9063f19a9522c454863f64872df6. Verify/Compose/Sonar aprobados y ninguna revisión bloqueante publicada. No se modifica su lógica por el contador Sonar.

Revisión de permisos: autenticación HTTP y revalidación de sesión/concesión antes del SELECT; actor.organizationId procede de sesión; grants, usuario, centro y organización se comprueban juntos. Todos los joins del reporte conservan organización/centro, y no se aplica bypass por nombre de rol. Pruebas incluyen centro propio vacío, centro/organización ajenos, administrador sin concesión, revocación entre páginas y expiración.

Precisión: cantidades numeric se proyectan como texto y kg según contrato existente. Duración EXTRACT(EPOCH)::numeric(18,3)::text, sin coma flotante ni hora actual para entregas pendientes. Ventana de salida inclusiva/exclusiva, UTC explícito, máximo31 días, validación de milisegundos/años/cursor y rechazo de filtros desconocidos. Cursor exclusivo sobre (departed_at,id) con el mismo orden: empate temporal recorre todas las filas una sola vez. PK/FK y joins0..1 evitan multiplicación; no se unen eventos/movimientos. La lectura no cambia hechos ni se anuncia snapshot global entre páginas concurrentes.

Verificación pertinente nueva: **7 resultados aprobados** (2 unitarios de filtros y5 de integración ROP en base PGlite nueva). El E2E/CI completos del SHA recibido permanecen evidencia identificada; no se repiten suites ajenas sin cambio. No se encontró defecto funcional o de seguridad que requiera modificar la implementación en esta revisión.

Nueve avisos Sonar revisados, todos CODE_SMELL:8 S9382 en scripts/reports-fixture.js, líneas17/21/33/45/64/67/78/94 (operaciones dependientes del fixture, se preserva secuencia);1 S6845 en web/reports/ReportTable.jsx:9 (foco de región desplazable con nombre accesible, comprobado por E2E de teclado). No son nuevas vulnerabilidades/BUG ni se aceptan/suprimen. La vulnerabilidad abierta S4036 de main se atiende en una rama/PR separado, sin mezclarla con ROP.

Esta actualización corrige instrucciones documentales: CSV Kaspersky ya recibido/analizado y conservado privado; el pendiente es presentar el caso al soporte, no reexportarlo. Los eventos y rutas privadas del informe no se publican. La preparación del SDK independiente se registra aparte con los controles previos a cualquier ejecución. B no se declara implementado ni probado en Android por esta revisión web.
