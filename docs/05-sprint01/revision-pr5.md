# Revisión técnica del PR #5 — QR y Redis

2026-11-16. El usuario autoriza integrar conservando commits únicamente sin bloqueos técnicos y con las comprobaciones pertinentes aprobadas. Esta autorización sustituye la indicación previa de dejar #5 abierto. No constituye aprobación docente, validación agrícola ni autorización de despacho.

## Revisión de código y contratos

Base revisada: b14120c0cd1a6a6cda332d4409bb2aa107a379f6, main b664fee. verify, compose y SonarCloud estaban success en esa cabeza. Se comprobaron también reviews y comentarios: sin solicitudes de cambio ni comentarios técnicos pendientes.

- Publicación/retiro: comandos explícitos con versión y clave por intención. Identidad de lote bloqueada para serializar creaciones/actualizaciones/retiros; snapshot, revisión histórica, auditoría e idempotencia comparten transacción. No se publica automáticamente historia operativa ni se modifica Calidad/inventario.
- Lectura pública: estado/versión/hash en PostgreSQL bajo FOR SHARE antes de Redis. Snapshot público estricto; propiedad desconocida o hash incompatible produce miss y recuperación desde DB. Clave por UUID público/versión y TTL 300 s. Retirado = 404, incluso con una clave antigua que no se pudo eliminar. Redis caído usa DB; DB no verificable = 503 sin servir caché.
- Permisos: concesiones por acción/organización/centro y sesión dentro de transacción, antes del replay. Administrador/Acopio/Calidad no heredan publicación. Recurso ajeno no se filtra; comandos protegidos por sesión, CSRF y origen. Transporte no pertenece al DTO público.
- QR y página: URL de entorno, UUID v4 distinto del lote interno, sin Host del cliente; PNG decodificado en E2E. Página anónima, texto escapado y no-store. No hay lista pública ni datos internos en DTO/caché/QR. El texto libre sigue requiriendo revisión humana semántica.
- Migración 005 aditiva, FK de identidad/centro, versión, triggers de no borrado y revisión/solicitud inmutables; 001–004 intactas. SQL parametrizado. Puerto de caché inyectado, adaptador sin cola offline y con timeout. Dependencias/lockfile y gates conservados.

## Hallazgos y correcciones de verificación

**Required — cobertura de concurrencia:** los casos anteriores verificaban retiro y dos publicaciones, pero no coordinaban una consulta en curso con un retiro real. Se añadió un caso HTTP/PostgreSQL con barrera en caché: comprueba bloqueo NOWAIT, observa el retiro esperando en pg_stat_activity, libera la consulta y exige 404 en toda consulta posterior, manteniendo la clave vieja por fallo de DELETE. Una solicitud admitida antes de confirmar el retiro puede terminar; no se afirma revocación de bytes ya descargados.

**Required — integridad de caché:** existía prueba de campos extra, pero faltaba un DTO de forma válida con contenido alterado. Se añadió caso con código de lote distinto y hash incompatible que exige devolver la revisión aprobada desde DB.

**Required — permisos por acción:** se añadió retiro sin su concesión específica y replay tras revocarla, manteniendo las demás concesiones. Ambos deben fallar antes de efectuar o repetir la operación.

Las reglas de producción resultaron coherentes en estos casos; **no fue necesario alterar código productivo ni migraciones**. Se corrigieron vacíos de verificación, sin eliminar aserciones, omitir tests, modificar umbrales ni desactivar SonarCloud. Eliminar FOR SHARE hace fallar la prueba coordinada; omitir la comparación de hash hace fallar el caso de contenido alterado. Código restaurado y pruebas verdes. [Evidencias de revisión](evidence/revision-pr5/README.md).

**Optional:** el historial administrativo completo no está paginado. La respuesta pública está acotada a 20 etapas y no incluye ese historial. Evaluar paginación interna y retención de respuestas idempotentes antes de ampliar el volumen del prototipo; sin declarar impacto cuantificado ni eliminar hechos históricos.

## Validación y alcance

Local: 19 unitarias, 53 resultados de integración PostgreSQL en base nueva, build, formato y validación de OpenAPI/imports/enlaces aprobados; audit sin vulnerabilidades reportadas. Docker local no está disponible por permisos; Redis real/Compose y los 13 E2E se vuelven a comprobar en CI sobre la cabeza publicada de revisión. Los checks del commit original no se atribuyen a los nuevos commits: la integración se condiciona a los checks efectivos del último SHA, registrados en la continuidad de la siguiente especificación.

Sin ensayo k6, comparación de latencia ni prueba de carga representativa. Configurar/probar funcionalmente Redis no demuestra rendimiento mejorado ni escalabilidad. Límite actual 60 consultas/min/IP por instancia; múltiples réplicas/proxy requieren diseño adicional. No hay despliegue continuo ni DNS/CDN productivos demostrados.
