# Continuidad: Calidad académica implementada

2026-11-15. Q1–Q9 y cierre con original de cada recepción adoptadas por el usuario, sin aprobación docente ni validación agrícola. [Especificación](../03-diseno-de-software/05-especificacion-calidad-lote.md), [ADR-012](../02-arquitectura/09-decisiones-calidad.md), [guía](../../tecnologia/calidad.md), [implementación/evidencia](calidad-implementacion.md).

PR #3 se integró con merge 829f79e976967097554543c51855135e0e1c193b, preservando commits tras revisar d09d8be y verify/compose success en Actions #9. main local/origin sincronizado en esa base al crear feat/calidad en repo-calidad/. La especificación documental original 0481740 permanece en docs/especificacion-calidad y repo-calidad-spec/; cherry-pick 399733a la conserva también en la nueva rama. No se fuerzan integraciones ni se fusionará Calidad.

## Regla resuelta y comportamiento

Cada recepción aportante exige original documentada en °C, instante, procedencia y responsable de registro. Nueva captura opcional aditiva en recepción, con observador/método y actor/fecha del servidor; original, recepción, evento y auditoría atómicos. Omitirla conserva recepción válida pero bloquea Calidad. Originales inmutables; migración 004 no rellena históricos y rechaza incorporaciones después del evento received. Calidad solo captura posteriores, que nunca sustituyen originales.

Una evaluación por lote, draft editable con versión y closed protegido. El backend bloquea cualquier resultado si falta una original; la UI identifica exactamente referencias/IDs pendientes. Cierre con datos completos, decisión humana y motivo obligatorio, lock/version y transacción que incluye evento con originales, auditoría y clave. Permisos por acción/centro y sesión revalidados antes del replay. D4 de discrepancias conserva otra persona autorizada. Sin cambios en masa, aportes, inventario ni despacho. RF-06/RF-07 parciales frente al objetivo productivo.

No hay procedimiento histórico habilitado. Una incorporación desde evidencia original requiere diseño y autorización explícitos, evidencia conservada y hecho adicional auditado; no SQL informal, sobreescritura ni desactivar triggers. Si no existe evidencia, no se inventa dato y el cierre sigue bloqueado.

## Verificación y publicación

13 unitarias, 42 resultados integración HTTP/PostgreSQL y 12 E2E Chromium aprobados sin omisiones; build, check y formato comprobados. OpenAPI validado contra 238 muestras reales. Mutación del guard de originales detectada, restauración con 15 resultados Calidad aprobados. Reinicio sin seed conserva hashes y conteos de ocho tablas. [Índice de evidencia](evidence/calidad/README.md). Revisión independiente sin bloqueo de integridad nuevo; hallazgos de precisión/accesibilidad y cobertura de tres resultados corregidos y probados.

La publicación y URL/cabeza/checks del PR se registrarán en el PR y en el índice de evidencia al abrirlo. Las pruebas locales no se presentan como CI de una cabeza remota. No fusionar el PR de Calidad.

## Entorno local conservado

Cluster dedicado .acopio-runtime/pg-data, puerto 55434; bases nuevas quality_int_* y quality_e2e_* en .local/quality-databases.json. Reiniciado sin seed para persistencia, logs quality-restart.*. Sin tocar demo ni bases anteriores de Acopio. Credencial local ignorada; node_modules junction al snapshot existente, sin cambios de dependencias/lockfile. Runner ignorado .local/quality-db.mjs permite integración, e2e o script con entorno dedicado y salida redactada. E2E sirve dist: compilar tras cambios UI. Fixtures internos evitan consumir login HTTP; límite productivo intacto.

Historial local de incrementos preservado. Publicación mediante conector debe contrastar árboles con los commits locales y conservar mapa de SHA si difieren, sin force-push. Git fetch funciona con -c http.sslBackend=openssl; no se cambió configuración global. Los checkouts CRLF de Windows se normalizan a LF solo para formato, verificando que no haya cambios lógicos ajenos.
