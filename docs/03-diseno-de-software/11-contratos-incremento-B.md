# Contratos de B — sesión Android y persistencia SQLite

2026-11-19. Requisitos de ingeniería autorizados por el usuario para B; **implementación y aceptación nativa pendientes** por incidente SDK sin resolución verificable. Base de servidor: main6f0294d, que conserva Inventario y A. No añade endpoints ni cambia autenticación servidor. La selección de plugins/versiones Flutter se hará después de verificar las herramientas, no por ejecutar el SDK señalado. [Preparación/NA/SB](../05-sprint01/preparacion-offline-B.md), [API existente](openapi.json).

## Puertos y resultados

| Puerto / operación | Entrada y salida | Obligaciones |
| --- | --- | --- |
| SessionPort.boot | Sin contraseña; Locked o Unverified | Cargar vault seguro; nunca habilitar sync solo por cookie persistida. Un error del vault deja Locked y conserva SQLite |
| SessionPort.login | Email/contraseña transitorios; OnlineValidated(owner, generation) o fallo tipado | POST login y GET me en origen HTTPS fijo. El owner procede del servidor, no del formulario o payload. La UI no recibe cookie/CSRF. Limpiar contraseña al completar/cancelar |
| SessionPort.validate | Sesión cargada; OnlineValidated o NeedsLogin | GET me verifica actor/org/rol, recupera CSRF. 401 bloquea envío; no refresca ficticiamente TTL ni cambia capturas |
| SessionPort.logout | Sesión activa; Locked con remoteRevocation=confirmed/unconfirmed | Invalidar generation/cancelar worker antes de otra operación; eliminar credenciales de forma durable. En online enviar logout con copia transitoria de cookie/CSRF y comprobar204. Error/red/offline no permite afirmar revocación remota. No guardar una solicitud con credenciales en SQLite ni prometer revocación futura sin credencial |
| CredentialVault | Jar cifrado y metadatos del origen; lectura/escritura/borrado atómicos | Clave protegida por Keystore; cookie/CSRF fuera de SQLite y logs, sin contraseña persistida. Excluir credenciales de backups y transferencia Android y probar restauración sin clave. No afirmar cifrado completo de SQLite |
| WorkspaceStore.open | Owner validado online; conexión privada al archivo de ese owner | Verificar singleton owner del archivo antes de leer/escribir. Cuenta B nunca abre la DB de A. Archivo privado sin backup automático mientras no exista política de exportación/recuperación acordada |
| WorkspaceStore.confirm | generation vigente, draft y payload v1 válido; ID confirmado estable | En una transacción: validar lease/owner, congelar payload canónico textual y pasar a confirmed, insertar outbox. Fallo revierte ambas escrituras; no genera sustituto tras intento |
| WorkspaceStore.recordAck | Lease original, ID y recibo validado; accepted o conflicto local | Revalidar generation/owner antes del commit; insertar recibo y pasar outbox a accepted juntos. Callback antiguo no escribe en B ni reabre A. Con lease obsoleta conservar uncertain y reconciliar al volver a autenticar al dueño |

Errores mínimos: InvalidCredentials, NeedsLogin, PermissionDenied, NetworkUnavailable, ContentConflict, StorageUnavailable y StaleGeneration. No convertir 403/404/409 en éxito o borrado de cola. El servidor revalida permisos en el PUT incluso después de un me válido. Repetición de ACK idéntico es idempotente; ACK distinto para el mismo ID se bloquea sin sustituir el anterior.

## HTTP y seguridad de sesión

Login200 y me200 entregan user y csrfToken según el contrato actual. Login no requiere un CSRF previo inexistente; todas las escrituras autenticadas usan X-CSRF-Token. Cookie session: HttpOnly, SameSite=Strict, Path=/api/v1, host-only y Max-Age8h; Secure obligatorio en el entorno nativo HTTPS de aceptación. No desactivar protección CSRF ni modificar CORS para Android.

Transporte fijado a scheme HTTPS, host y puerto configurados; Path coincide con /api/v1 o descendientes separados por /, nunca /api/v1evil. No seguir redirecciones automáticamente ni reenviar cookie/CSRF a otro origen, /q o /api/public/v1. Conservar validación de certificados/cadena/hostname; sin trust-all, downgrade HTTP o reloj del SO alterado. La expiración local solo restringe envío: no puede conceder autorización ni extender las8h del servidor. La política local24h de captura es otro requisito de C, pendiente.

Logout offline bloquea el espacio y borra credenciales, pero conserva capturas y recibos; revocación remota no confirmada se informa como tal. Un nuevo login no revoca por sí mismo una sesión antigua. Reinicio/cambio de cuenta produce otra generation; reabrir el mismo owner requiere login/me online, sin montar pendientes ajenos.

## Esquema SQLite de contrato, no migración operativa

Diseño mínimo por archivo de owner; SQL parametrizado desde el adaptador. El singleton workspace se crea con IDs del me validado. El archivo de negocio contiene **ninguna contraseña, cookie, CSRF o clave de Keystore**. payload_v1 guarda decimal como texto dentro del body, no REAL. El validador v1 existente se aplica antes de confirmar; SQLite no reemplaza esa validación.

```sql
PRAGMA foreign_keys = ON;
CREATE TABLE workspace (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  organization_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK (schema_version = 1)
);
CREATE TABLE captures (
  client_capture_id TEXT PRIMARY KEY NOT NULL,
  workspace_id INTEGER NOT NULL DEFAULT 1 CHECK (workspace_id = 1),
  phase TEXT NOT NULL CHECK (phase IN ('draft', 'confirmed')),
  payload_v1 TEXT NOT NULL CHECK (length(payload_v1) > 0),
  FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  UNIQUE (client_capture_id, phase)
);
CREATE TABLE outbox (
  client_capture_id TEXT PRIMARY KEY NOT NULL,
  capture_phase TEXT NOT NULL DEFAULT 'confirmed' CHECK (capture_phase = 'confirmed'),
  state TEXT NOT NULL CHECK (state IN ('pending', 'in_flight', 'uncertain', 'accepted', 'needs_login', 'intervention')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  FOREIGN KEY (client_capture_id, capture_phase) REFERENCES captures(client_capture_id, phase)
);
CREATE TABLE receipts (
  client_capture_id TEXT PRIMARY KEY NOT NULL REFERENCES outbox(client_capture_id),
  pre_lot_id TEXT NOT NULL UNIQUE,
  harvest_id TEXT NOT NULL UNIQUE,
  accepted_at TEXT NOT NULL,
  result_json TEXT NOT NULL
);
CREATE TRIGGER confirmed_no_update BEFORE UPDATE ON captures
WHEN OLD.phase = 'confirmed'
BEGIN SELECT RAISE(ABORT, 'confirmed capture is immutable'); END;
CREATE TRIGGER confirmed_no_delete BEFORE DELETE ON captures
WHEN OLD.phase = 'confirmed'
BEGIN SELECT RAISE(ABORT, 'confirmed capture is immutable'); END;
CREATE TRIGGER capture_id_no_update BEFORE UPDATE OF client_capture_id ON captures
BEGIN SELECT RAISE(ABORT, 'capture identity is immutable'); END;
```

El adaptador debe verificar foreign_keys=ON en cada conexión y configurar journal/synchronous durables (WAL/FULL si el plugin/dispositivo lo soporta); nunca OFF/MEMORY o synchronous=OFF. No borrar journal/WAL para recuperarse de un cierre. Confirmación y ACK son dos transacciones distintas con sus respectivas parejas atómicas. No hay garantía frente a un administrador que deshabilite controles. Los recibos remotos son la autoridad; su espejo local se valida y no se modifica por edición ordinaria. No existe todavía worker ni política de reintentos de C implementada.

## Entorno aislado y salida verificable

Antes de pruebas Android, provisionar una **DB nueva android_b_dev_*** con001–008 y fixtures ficticios, conexión privada propia, API HTTPS con certificado confiable y puerto distinto de3026. Rechazar cualquier URL a inventory_demo_20261118_151800 y no reutilizar demo.env. La provisión y despliegue del fixture se ejecutarán al disponer del cliente/dispositivo, no contra la demo para anticiparlos.

B se acepta solo con NA-01–08 y SB-01–06 ejecutados en Android identificado: login/me; flags de cookie y rechazo TLS/CSRF; force-stop/reinicio; expiración por fixture servidor; logout remoto y offline; cambio A→B/callback tardío; rollback captura/outbox y recibo/ACK; reinicio con pendientes y vault inaccesible. Registrar SHA cliente/servidor, versiones SDK/plugins/Android/dispositivo, status/IDs/conteos sin secretos y resultado de cada caso. Conservar filas ante fallo y evidenciar los rechazos, no solo éxitos.

Compilar este esquema en SQLite de escritorio solo verifica el contrato SQL; no prueba Keystore, jar nativo, durabilidad Android o aceptación de B. No se sustituye el recorrido nativo por Chromium/Node. Ningún caso nativo se declara ejecutado mientras falte el desbloqueo de herramientas descrito en la preparación.

Comprobación de esta revisión: SQLite3.49.1 del Python firmado compiló este bloque en memoria y verificó FK draft/outbox, rollback confirmación, inmutabilidad de ID/cuerpo confirmado, rollback/commit recibo-ACK y ausencia de columnas de credenciales. Evidencia privada sqlite-contract.json bajo .local/integracion-20261119; no hubo conexión PostgreSQL ni ejecución Android. Este resultado no cambia la condición pendiente de los casos nativos.
