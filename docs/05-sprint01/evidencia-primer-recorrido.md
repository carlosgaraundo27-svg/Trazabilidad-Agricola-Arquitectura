# Evidencia del primer recorrido

Continuación: [arranque verificado en Windows, 2026-11-12](evidencia-arranque-windows.md). El registro siguiente se conserva como evidencia histórica de la sesión anterior.

Fecha de sesión: 2026-11-11 (America/Lima). Commit base revisado: 38a85e38b647729d4a122d4b35e6f8297103a2a4.

## Revisión del repositorio y PR #1

[PR #1](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/1): abierto, no draft, no fusionado, mergeable=true en consulta de GitHub. Base main 186b0d9e1af32c567bbbe21c7f91f321ec3d0dd3; rama docs/revision-arquitectura-c4-sprint01, head 38a85e38b647729d4a122d4b35e6f8297103a2a4. Una revisión documental: 13 archivos, +478/-479, un commit. No había reviews ni comentarios de conversación, estados de commit ni ejecuciones de Actions asociadas al head. Ausencia de checks no significa aprobación ni CI verde. No se fusionó ni publicó ningún cambio remoto.

Se leyeron actores, HU, RF, atributos, restricciones, drivers, ADR, estilo/límites, permisos, diseño interno/modelo conceptual, C1–C4 y revisión previa al Sprint 2. El repositorio era documental, con ejemplo conceptual; sin aplicación, migraciones ni tests anteriores.

## Decisiones y límites

La [especificación](../03-diseno-de-software/03-especificacion-primer-recorrido.md) se guardó antes de crear código. [ADR-009/010](../02-arquitectura/07-decisiones-primer-recorrido.md) explica la selección Express/React y los supuestos de permisos/unidades. La política general sigue pendiente; no se infirieron fórmulas, consolidación, certificaciones ni publicación QR. [Instrucciones reproducibles](../../tecnologia/primer-recorrido.md).

## Entorno de comprobación

Windows x64, Node 24.16.0, PostgreSQL nativo 18.6 (msvc-19.44.35228), pg en TCP loopback puerto 55432 y bases desechables distintas para integración y E2E. Binarios locales obtenidos de @embedded-postgres/windows-x64@18.6.0-beta.19, tarball verificado con SHA-512 del registro npm; no son dependencia de aplicación ni se versionan. initdb completó; pg_ctl start falló por token restringido del sandbox, por lo que se inició postgres.exe directamente con -h 127.0.0.1 -p 55432 y datos en .local/pg-data.

También se ejecutó la integración inicial con PGlite 0.5.16, diferenciada de la verificación nativa. Playwright 1.65.0 usó Chromium instalado en chromium-1228 mediante PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. La descarga al caché externo estaba restringida; el primer E2E falló por binario ausente. Un segundo intento detectó un selector de test demasiado estricto para un select con label envolvente; se corrigió a getByRole('combobox', {name, exact:true}). No se omitió el test. E2E final con servidor dedicado en puerto 3005; CI descarga la revisión Chromium correspondiente al lockfile.

## Resultados y archivos

Los logs finales se conservan en [evidence](evidence/README.md). La captura [primer-recorrido.png](evidence/primer-recorrido.png) muestra la UI luego de recargar y recuperar el pre-lote desde PostgreSQL. El E2E comprueba cuatro anchos (320, 768, 1024, 1440), sin overflow horizontal, y ausencia de errores JavaScript; esto no constituye auditoría WCAG completa ni medición de metas EQ.

CI inicial incluida para pull_request, push a main y workflow_dispatch: instalación con lockfile y scripts desactivados, audit, formato/contratos/imports, unitarias, integración PostgreSQL, build y E2E, con reportes como artifacts. No se ejecutó en GitHub porque no se publicaron cambios. Docker/Compose no estaban instalados y no se reportan como comprobados.

## Limitaciones Git y de aprobación

La carpeta inicial no contenía el repositorio. Git clone falló primero por TLS Schannel y luego por creación de referencias; git init también fue rechazado al escribir HEAD. Se recuperaron por HTTPS todos los archivos del árbol del commit exacto, manteniendo sus carpetas. El resultado es un snapshot local editable, no una rama ni un commit publicable ya creados. No se usaron credenciales remotas ni se modificó el PR #1. Para integrar, clonar normalmente, crear rama desde el head del PR #1 y trasladar estos archivos; revisar los añadidos documentales, ejecutar comprobaciones y abrir un PR dependiente cuando corresponda.

Ratificación docente, permisos de negocio, catálogo de unidades y demás pendientes de la revisión original siguen abiertos. El encargo autoriza esta implementación técnica; no sustituye aceptación académica.

## Resultado final registrado

- 4 pruebas unitarias aprobadas.
- 11 resultados de integración aprobados (10 subcasos y contenedor), con PostgreSQL nativo; incluye reversión down/up.
- 1 recorrido E2E aprobado, sin mocks, con recarga y cuatro anchos.
- Build, OpenAPI 3.1, YAML, imports y enlaces locales verificados.
- npm audit: cero vulnerabilidades reportadas al ejecutar.
- Mutación temporal de cantidad positiva (>0 → >=0): el test falló como se esperaba; se restauró el código antes de las comprobaciones finales.

Estas comprobaciones no acreditan CI remota, Docker, rendimiento EQ ni políticas de negocio definitivas.
