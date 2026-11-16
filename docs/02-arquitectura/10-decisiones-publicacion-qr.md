# ADR-013 — Publicación QR explícita y caché subordinada a PostgreSQL

2026-11-15/16. Adoptada para el prototipo académico por alcance explícito del usuario. Amplía ADR-005/ADR-008 y RF-08/RF-09; no supone aprobación docente ni validación agrícola.

## Decisión

La publicación es una proyección aprobada por una persona autorizada del centro. Es independiente de Calidad y no deriva automáticamente del historial operativo. Solo permite código de lote, etapas, fechas y descripciones públicas aprobadas; el usuario revisa que el texto libre no contenga información privada. UUID v4 público independiente del lote; QR por lote con PUBLIC_BASE_URL. Pallets fuera de este incremento.

Cada consulta pública verifica en PostgreSQL estado y versión bajo bloqueo compartido. Redis solo guarda DTO público estricto, con hash contrastado, clave por versión y TTL de 300 segundos. Actualización y retiro bloquean exclusivamente y cambian versión; después del commit intentan eliminar la clave anterior. La ausencia de esa eliminación nunca permite consultar un retirado. DB no disponible = 503; Redis no disponible = recuperar proyección aprobada desde DB. No hay caché negativa, CDN ni almacenamiento offline de datos públicos. Solicitudes admitidas antes del retiro pueden terminar y no se pueden revocar copias ya descargadas.

El puerto de caché pertenece al caso de uso; node-redis lo implementa en un adaptador. Redis no es requisito para el health de la aplicación. Compose usa una red interna sin publicar Redis al host y sin persistir caché. Consulta limitada a 60/min/IP mediante memoria local en una instancia B1; escalado horizontal/proxy exige diseñar límite compartido y confianza de proxy antes de ampliarlo.

## Alternativas y consecuencias

| Alternativa | Resultado |
| --- | --- |
| Solo TTL/DELETE Redis | Rechazada: un DELETE fallido conserva un dato retirado hasta expirar. |
| Estado de publicación también en Redis | Rechazada como autoridad: se necesita el mismo Redis que puede estar caído o desactualizado. |
| DB verifica estado/versión; Redis guarda proyección | Adoptada: conserva autoridad transaccional y permite caída de caché. |
| Servir caché cuando DB cae | Rechazada: no se puede verificar si hubo retiro. |

Existe una lectura de metadatos PostgreSQL en cada consulta y los lectores sostienen bloqueo mientras resuelven caché. Cada operación Redis tiene timeout de 150 ms, sin cola offline y con reconexión. Se acepta este coste para garantizar exposición controlada. No se afirma menor latencia, throughput superior ni reducción total de carga: requiere mediciones antes de modificar la política. Los beneficios descritos en ADR-005 son expectativas de arquitectura objetivo, no resultados medidos de este incremento.

Permisos `publication:read/publish/withdraw`, idempotencia, versión, revisión y auditoría transaccionales. No existe ruta de borrado de historia. [Especificación y PQ-01–13](../03-diseno-de-software/06-especificacion-publicacion-qr.md), [guía reproducible](../../tecnologia/publicacion-qr.md).
