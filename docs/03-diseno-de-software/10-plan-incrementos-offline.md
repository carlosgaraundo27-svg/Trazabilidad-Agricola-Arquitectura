# Plan del prototipo offline — 2026-11-19

**Estado posterior a publicación manual:** [#7 y #8, checks aprobados por SHA y respaldo pendiente de aceptación](../05-sprint01/publicacion-inventario-offline-A.md). A publicado en ce9c3f6, base dd18ced; ambos PR abiertos, sin fusionar. [Preparación concreta de B](../05-sprint01/preparacion-offline-B.md): contratos nativos/SQLite y pruebas diseñadas, sin ejecución del SDK señalado ni cliente Android implementado. Las notas inferiores de bloqueo de publicación son históricas.

RF-03/DA01, sobre PR #7. Autorización actual: implementar/probar **A en rama separada**; O1–O10 son base de propuesta académica, no aprobación docente/agrícola ni autorización para ejecutar el SDK señalado. Rama `feat/offline-servidor-recibos`, base `dd18ced` (incluye 19b291d/0256966). No fusionar #7 ni aplicar migraciones a la demo. El respaldo/restauración de la demo continúa pendiente sin resultado nuevo verificable; no bloquea tests en bases NUEVAS aisladas.

## A — Contrato y servidor

PUT `/api/v1/sync/pre-lots/{clientCaptureId}`, sesión cookie/CSRF vigentes, Idempotency-Key UUID igual al ID de ruta. Body estricto schemaVersion=1, parcelId, harvestedAt con zona y hasta milisegundos, quantity decimal positiva como texto hasta tres decimales y unit kg/unidad. Mantener límites del alta actual, sin modificar ese endpoint ni sus históricos.

Canonización: UUID minúscula, instante UTC con milisegundos, cantidad rellenada a tres decimales por texto (sin Number/redondeo), orden propio de propiedades. 37.1 y 37.100 son equivalentes; 37.1000 se rechaza. SHA-256 calculado en servidor. Headers de sesión no son contenido de negocio.

Identidad `(organization_id, client_capture_id)` con dueño actor inmutable. Misma identidad/cuerpo: 201 inicial y 200 replay con los mismos IDs/payload/acceptedAt; distinto contenido u otro dueño: 409 genérico sin filtrar el recibo. Organizaciones distintas tienen espacios distintos. No generar sustitutos ni corregir capturas confirmadas. Repetir PUT reconcilia respuestas perdidas; no hace falta GET adicional.

Sesión, usuario activo/rol actual y asignación de parcela se comprueban **dentro de la misma transacción antes del replay**, con bloqueos mantenidos hasta commit. Serialización por identidad mediante bloqueo transaccional y UNIQUE como garantía declarativa. Alta cosecha/pre-lote, audit y recibo comparten UoW, sin transacciones anidadas. Nueva clave interna aleatoria para el alta online evita colisiones entre sus claves y las identidades sync. Sin evento de negocio inventado: H tiene auditoría existente, no un evento obligatorio nuevo.

Migración aditiva 008: recibos inmutables y FK compuesta que conserva organización, propietario y origen. Sin backfill; históricos quedan sin recibo. Down solo con tabla vacía, bloqueado si hay recibos. No TTL ni borrado automático. Nuevo límite por IP de 60 PUT/minuto, en memoria para esta instancia; 429 con Retry-After. No cambia cuotas de rutas existentes ni demuestra escalabilidad.

Amenazas: suplantar actor/org en body (rechazo estricto), consultar recibo ajeno (permiso/owner antes de respuesta), cambiar contenido con UUID aceptado (409), duplicar por carrera/pérdida de respuesta (lock+UNIQUE+transacción), revocación concurrente (bloqueos S/P), éxito parcial (rollback), abuso de reintentos (límite de ruta). Locks y FK: [PostgreSQL 18](https://www.postgresql.org/docs/18/explicit-locking.html), [constraints](https://www.postgresql.org/docs/18/ddl-constraints.html). No hay garantías frente a un administrador DB que desactive controles.

| Criterio A | Aceptación verificable |
| --- | --- |
| A-01 | Primera aceptación crea una cosecha/pre-lote/recibo/audit; DTO explícito sin actor, organización o credenciales |
| A-02 | Replay/carrera/respuesta descartada y nuevo proceso de aplicación mantienen IDs/cuerpo/acceptedAt; una sola alta |
| A-03 | Cambio de cualquier campo aceptado o actor con mismo UUID produce409 sin alterar hechos |
| A-04 | Sesión vencida/revocada, usuario inactivo/rol revocado, parcela no asignada o ajena impiden alta y replay |
| A-05 | Fallos SQL reales en alta, auditoría o recibo revierten todos los efectos; se puede reintentar el mismo ID |
| A-06 | Validación de precisión, fechas, contrato estricto y claves; CSRF/Origin/401 existentes y 429 conservados |
| A-07 | Upgrade001–007→008 conserva históricos sin recibos; down vacío funciona y down con datos se bloquea; migración fallida revierte |
| A-08 | Demo001–007 y datos existentes no se modifican. Pruebas en DB nueva y comandos reproducibles; CI del SHA publicado se identifica aparte |

## B — Flutter: sesión nativa y SQLite

Condición de entrada: SDK de procedencia verificable y resolución del incidente, sin ejecutar/restaurar el SDK detectado ni modificar antivirus. No hay app Flutter versionada. Conservar Android primero como propuesta O1, no sustituir por PWA.

Primero NA-01–08 de [O6](08-especificacion-offline-cosecha.md): HTTPS válido, jar explícito y seguro, Path/dominio/Secure/caducidad, sesión8h, CSRF de login/me, logout/expiración y aislamiento de callbacks. Luego prueba SQLite captura+outbox atómicas, cierre forzado y reinicio real. Credenciales en almacén nativo, sin guardar contraseña; SQLite privada no equivale a cifrado completo. Salida: prueba Android identificada, no Node/Chrome como sustituto.

## C — Captura, outbox y sincronización

Depende de A+B probados y decisiones pendientes confirmadas. Pantallas mínimas: parcelas descargadas, borrador, confirmación inmutable, pendientes/resultado/intervención. Cola durable por organización/actor, un worker en primer plano, ID/cuerpo estables, mapping de recibo en una transacción local.

O5 propone ventana24h local, distinta de sesión8h; solo parcela/fecha/cantidad/unidad. Guardar no es aceptación remota; revalidar sesión/permisos/asignación al enviar. Tras reboot sin continuidad temporal, conservar filas y bloquear nuevas confirmaciones hasta validar online. O8: inicial+cinco reintentos, backoff/jitter/Retry-After persistidos; agotarlos no borra. O9: logout bloquea espacio, limpia credenciales y conserva pendientes; solo mismo dueño online lo reabre. Confirmar estas consecuencias antes de C; no implementadas por A.

## D — Pruebas de fallo y recorrido Android

Depende de B/C. Matriz real en Android: desconexión antes/durante envío, servidor confirma y respuesta se pierde, proceso muere antes de guardar ACK, reboot, suspensión/reloj, mismo ID con contenido distinto, expiración/revocación antes de replay, A→B con callback tardío, cinco reintentos y reintento manual. Comparar conteos y recibos del servidor y la outbox local sin secretos. No borrar datos para reparar tests ni ampliar timeouts globales. Adjuntar versiones/dispositivo anonimizado, comandos y evidencias. No declarar RF-03/DA01 completo hasta este recorrido.

## Publicación y continuidad

#7 debe recibir 19b291d, 0256966 y dd18ced por avance directo antes de publicar A como incremento dependiente. Esta sesión intentó push normal: Schannel sin credenciales y OpenSSL con wincredman inaccesible; sin force, sin cambiar almacén/configuración. Se solicitó ejecución desde PowerShell normal. No recrear commits con SHA/autor distintos para simular preservación. Verificar cabeza y CI remotas cuando exista respuesta.

Los 20 avisos Sonar/nueve críticos DDL de #7 continúan abiertos. Gate aprobado no los resuelve. Auditoría completa actual de dd18ced aprobó; fallo histórico22c6e4f se conserva como histórico. Pruebas y seguridad de A se documentarán por su SHA, sin atribuirlas a #7 o a la demo. D: permanece pospuesto y su kit intacto.
