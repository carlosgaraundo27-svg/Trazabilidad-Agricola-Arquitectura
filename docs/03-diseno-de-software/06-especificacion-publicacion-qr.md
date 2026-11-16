# Consulta pública QR y Redis

2026-11-15. Alcance adoptado por el usuario para prototipo académico. No supone aprobación docente ni validación agrícola. RF-08/RF-09, ADR-005/ADR-008. Base inicial: main 829f79e; PR #4 continúa bloqueado por SonarCloud, por lo que esta capacidad no depende de su integración ni interpreta sus resultados.

## Objetivo y capacidades

| Módulo | Responsabilidad | Dependencias |
| --- | --- | --- |
| publication | Aprobar una proyección pública, publicarla, actualizarla y retirarla | acceso por centro; identidad de lote de Trazabilidad |
| public-query | Consultar exclusivamente la proyección vigente | publication, puerto de caché |
| qr | Generar imagen con URL de entorno | identidad pública de publication |

Orden: contrato y estados → administración transaccional → lectura protegida/caché → QR y web → Compose, CI y evidencias. Son capacidades del mismo recorrido, con contratos separados. No se crean entidades ni eventos públicos a partir de eventos internos automáticamente.

## Permisos y estados

Concesiones explícitas `publication:read`, `publication:publish`, `publication:withdraw` por usuario, organización y centro. Un rol administrador, de Acopio o Calidad no concede ninguna implícitamente. Sesión activa y concesión se revalidan dentro de cada transacción, incluso antes de replay. CSRF y origen para comandos. Un recurso fuera del centro/organización responde 404. Listado sin concesión: 403. Usuario anónimo solo puede consultar la proyección publicada.

Sin fila de publicación = `unpublished`, versión 0, sin identificador/URL pública. Publicar exige revisión explícita de todos los campos; crea identidad UUID v4 aleatoria independiente del ID interno, versión 1, estado `published`. Publicar de nuevo reemplaza toda la proyección aprobada y aumenta versión. Retirar pasa a `withdrawn`, aumenta versión y conserva contenido/historia solo para administración. Republicar requiere aprobación explícita, conserva QR y aumenta versión. La versión esperada evita sobrescritura/cierre concurrente. El mismo usuario autorizado puede publicar y retirar. Publicar trazabilidad no aprueba calidad, no modifica estado de Calidad, masa, inventario ni despacho.

Publicación/actualización/retiro, revisión histórica inmutable, auditoría e idempotencia se confirman en una sola transacción. Un fallo revierte todo. Los históricos operativos permanecen intactos; migración aditiva 005, sin modificar 001–004. Sin borrado ni limpieza de historia en scripts de demo. Down solo en base desechable, nunca sobre demo.

## Contratos

DTO público explícito y estricto, construido por lista permitida:

```json
{
  "lotCode": "VV-DEMO-001",
  "stages": [
    { "stage": "harvest", "date": "2026-01-02", "description": "Cosecha ficticia documentada." },
    { "stage": "consolidation", "date": "2026-01-03", "description": "Consolidación ficticia del lote." }
  ]
}
```

`lotCode`: 1–80 caracteres alfanuméricos, guion o guion bajo. `stages`: 1–20 elementos; `stage`: harvest/reception/consolidation; `date`: fecha ISO válida, no futura; `description`: texto plano aprobado de 1–500 caracteres. No nombres/contactos de personas, ubicaciones precisas, finanzas, credenciales, IDs de usuarios ni notas privadas. El responsable revisa también el contenido semántico de textos libres antes de publicarlos; una lista de propiedades no detecta datos personales escritos dentro de una descripción. No se copia automáticamente texto operativo. React representa texto escapado; sin HTML ni enlaces arbitrarios.

| Ruta | Contrato |
| --- | --- |
| GET /api/v1/publications/lots?centerId=…&offset=… | Lista interna de hasta 100 lotes y estado de publicación; permiso read |
| GET /api/v1/publications/lots/:lotId | Estado/versión/proyección, URL, identificador público e historia interna; permiso read |
| POST /api/v1/publications/lots/:lotId | `{expectedVersion,lotCode,stages}`; aprobación y publicación explícitas; permiso publish |
| POST /api/v1/publications/lots/:lotId/withdrawal | `{expectedVersion}`; permiso withdraw; 409 si no está publicada |
| GET /api/v1/publications/lots/:lotId/qr | PNG del QR, solo publicada y permiso read; URL construida por servidor |
| GET /api/public/v1/lots/:publicId | Sin sesión, DTO público exacto, sin datos administrativos |
| GET /q/:publicId | Página móvil pública; consume API pública, sin sesión ni herramientas internas |

Comandos: Idempotency-Key UUID por intención, se conserva para reintentar respuesta perdida. Misma clave/operación/cuerpo devuelve respuesta original; otra combinación = 409. POST nuevo 201, replay 200. 401 sin sesión; 403 lista/CSRF/origen; 404 recurso interno inaccesible o público ausente/no publicado/retirado/ID inválido; 409 versión/estado; 422 entrada inválida; 429 límite; 503 PostgreSQL indisponible al validar exposición. Errores sin SQL, caché, IDs internos ni stack. Nunca lista pública ni búsqueda secuencial. La respuesta pública no incluye su publicId ni qualityResult.

`PUBLIC_BASE_URL` obligatorio para generar URL/QR; URL absoluta HTTP(S), sin usuario, contraseña, query ni fragmento, raíz sin subruta. HTTPS obligatorio en producción; HTTP solo desarrollo. No deriva de Host/X-Forwarded-Host ni de entrada del usuario. Ejemplo local: `http://localhost:3000/q/<uuid-v4>`. QR por pallet queda fuera.

## Redis: consistencia, expiración y fallos

Puerto `get(key)`, `set(key,value,ttlSeconds)`, `delete(key)`, `close()`. Adaptador node-redis, sin imports Redis desde dominio/aplicación. Caché sin autoridad sobre publicación. Clave `public:lot:v1:<publicId>:<version>`; TTL fijo 300 segundos, sin refresco en lectura. Solo contiene DTO público. Sin caché negativa ni almacenamiento de sesiones/contactos/notas privadas. El lector valida esquema estricto y hash SHA-256 del DTO contra la revisión vigente en PostgreSQL; dato corrupto o de otra versión es miss.

En **cada** consulta, incluso caliente: transacción PostgreSQL obtiene metadatos con bloqueo compartido; exige `published`; solo entonces lee Redis de la versión vigente. Miss/error: recupera proyección aprobada en DB y trata de guardarla. El bloqueo compartido dura hasta resolver lectura; un retiro/actualización obtiene bloqueo exclusivo y se serializa con lectores. Consulta admitida antes del retiro puede terminar; después de confirmar el retiro ninguna nueva consulta puede autorizarse con estado antiguo. No es posible revocar copias descargadas ni bytes ya en tránsito.

Tras commit de actualización/retiro se intenta eliminar la clave anterior. **Aunque DELETE falle, la lectura exige estado publicado y versión actual en PostgreSQL**: retirado devuelve 404 sin consultar Redis; actualización nunca lee clave anterior. Una carga fría concurrente solo puede escribir en su clave versionada. No hay mecanismo de invalidación que pueda volver a autorizar un retiro. Prueba obligatoria: caché caliente + DELETE fallido + consulta nueva = 404, conservando deliberadamente el valor viejo en el doble de caché.

Redis no configurado, desconectado, timeout, respuesta corrupta o error GET/SET/DELETE: se usa DB, sin fallar publicación/retiro ya confirmado. Operaciones de caché acotadas a 150 ms; sin cola offline; reconexión acotada. Log estructurado de degradación sin URL, claves, DTO ni secretos. Redis se recupera sin reiniciar aplicación y la siguiente consulta puede repoblar. Si DB no permite verificar publicación se falla cerrado con 503 y **no** se sirve Redis. Health operativo depende de DB; Redis es opcional para disponibilidad del recorrido.

`Cache-Control: no-store` para API y página pública; sin service worker/offline ni CDN de datos públicos. Página reconsulta al recuperar visibilidad y permite actualizar; no promete revocar capturas ya vistas. No exponer Redis a puertos del host en Compose normal. Redis sin persistencia: pérdida total equivale a caché fría. Redis en red de Compose; no bloquear arranque de app si cae Redis.

Límite: 60 consultas/minuto/IP para API pública y página; antes de consultar DB. Respuesta 429 con Retry-After. Almacén de límites en memoria, acotado por ventana, para **una instancia B1** del prototipo; no se afirma límite global multiinstancia. No se confía en cabeceras proxy del cliente. Despliegue con proxy/múltiples réplicas requiere definir proxy confiable y límite compartido antes de ampliarlo.

## Pruebas y aceptación

| Caso | Resultado exigido |
| --- | --- |
| PQ-01 | No publicado/ID inválido/desconocido/retirado = mismo 404 público |
| PQ-02 | Publicado = DTO exacto, fechas/etapas/descripciones aprobadas |
| PQ-03 | Rechazo de propiedades extra y aserción recursiva de ausencia de campos privados en API/caché/QR |
| PQ-04 | Fría carga DB/SET; caliente usa DTO de Redis tras guard de DB; actualizada usa nueva versión |
| PQ-05 | Retiro con fallo de invalidación conserva clave vieja pero consulta nueva = 404 |
| PQ-06 | GET/SET/DELETE Redis fallidos no exponen datos ni bloquean retiro; recuperación repuebla |
| PQ-07 | DB caída + Redis caliente = 503, nunca proyección sin comprobar |
| PQ-08 | Otro centro/organización, sesión inactiva, permiso revocado y replay = denegados |
| PQ-09 | Publicaciones concurrentes con misma versión: un ganador; historia y auditoría atómicas |
| PQ-10 | Respuesta perdida/replay no duplica historia; misma clave con cuerpo distinto = 409 |
| PQ-11 | E2E: publicar en administración, QR decodifica URL de entorno, consulta anónima móvil, actualizar y retirar |
| PQ-12 | Rate limit, texto escapado, no-store, ausencia de CORS abierto/identificadores operativos |
| PQ-13 | Redis real GET/SET/TTL/DELETE, Compose arranque/reinicio, CI limpio |

RF-08 / HU05/HU07: PQ-01/02/11/12, cobertura QR por lote; pallet excluido. RF-09 / HU07: PQ-05/08/09/10, revisión y auditoría inmutables sin exposición de historia interna. ADR-005 / DA03: PQ-04/06/07/13, caché con fallos definidos, sin beneficio de rendimiento afirmado. ADR-008 / DA06: PQ-01/03/05/07/08/12, autorización y DTO separado. No cubre reglas agrícolas, logística, validación docente, offline ni Datamart.

## Implementación y verificación reproducible

ES modules JS, Express 5, React 19, PostgreSQL 18. Puerto/aplicación en `server/modules/publication/`; HTTP en `server/publication-http.js`; Redis/QR en adaptadores; UI en `web/publication/`; unitarias `node:test`, integración PostgreSQL dedicada, E2E Playwright Chromium aislado. Estilo existente Prettier, SQL parametrizado, objetos Zod estrictos. Ejemplo: `publicDto.parse({lotCode: input.lotCode, stages: input.stages})`; nunca propagar `...lot` al público.

Comandos PowerShell: `npm.cmd ci --ignore-scripts`; `npm.cmd run format:check`; `npm.cmd run check`; `npm.cmd test`; `npm.cmd run test:integration` con DATABASE_URL exclusiva y TEST_ALLOW_DB_WRITE=true; `npm.cmd run build`; `npm.cmd run test:e2e`. En Unix usar `npm` equivalente. `npm.cmd run verify:compose -- --test` y `npm.cmd run test:compose` crean recorrido ficticio sobre volumen de pruebas. Guía y evidencia distinguirán lo ejecutado localmente de CI. No ejecutar down/up de integración contra demo.

Datos de ejemplo: código `VV-DEMO-001`, fechas enero 2026, descripciones que indiquen ficción; nueva cuenta `publicacion@example.test` autorizada solo en centro Norte. Cuenta Sur para prueba de aislamiento. Seed concede permisos a cuentas ficticias explícitas y nunca publica automáticamente. Las credenciales de demostración provienen del entorno. Conservar dependencias/lockfile y todas las pruebas anteriores; nunca omitir pruebas ni rebajar umbrales para quedar verde.
