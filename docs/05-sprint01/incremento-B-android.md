# Incremento B: evidencia Android y alcance

2026-11-19, Lima. Rama feat/android-sesion-sqlite desde main18d57e9, independiente de ROP/#11 y corrección Docker/#12. PR9 permanece en borrador documental; este cliente no se atribuye a ese PR. Demo001–007 intacta; backend B con base privada nueva android_b_dev_20261119, PGlite001–008 y usuarios ficticios, HTTPS3042/ADB reverse.

## Implementado y comprobado

SessionController usa generaciones para invalidar callbacks y serializa operaciones del vault/workspace. Boot con cookie persistida queda Unverified sin abrir SQLite hasta me online;401 bloquea y no inventa refresh. Expiración local invalida el lease; resume revalida online.403/409 se mantienen como errores, no éxito/borrado. Contraseña transitoria y limpiada; ninguna credencial en SQLite o logs.

Transporte HTTPS fija scheme/host/puerto y frontera /api/v1, rechaza destinos ajenos, redirecciones y certificados no confiables. Cookie Secure/HttpOnly/Strict/host-only/Path/api/v1 y MaxAge<=8h obligatorios; CSRF de me para logout. Debug CA únicamente loopback, release lo rechaza. No se altera CSRF/CORS del servidor.

Vault Android: AES256-GCM con IV aleatorio del proveedor, clave no exportable Android Keystore, AAD/formato versionado. AtomicFile con fsync antes de confirmar escritura, fuera de SQLite/en no_backup. Logout marca cierre durable antes de intentar revocación remota; si falla el almacenamiento no anuncia cierre correcto. Archivo corrupto falla cerrado y no se reinicia silenciosamente. No se afirma hardware backing o resistencia a un administrador comprometido. Se descartó flutter_secure_storage11.2 porque write/delete usan apply asíncrono y este contrato exige confirmar persistencia antes de responder; no se modificó el paquete ni el SDK.

SQLite: archivo privado por organización/actor del servidor, singleton owner validado, FK por conexión, WAL/FULL verificados, cuatro tablas de contrato, decimales como texto e inmutabilidad de capturas confirmadas/recibos. Logout bloquea/cierra el archivo, no borra filas. Backup/transferencia excluidos en manifest/reglas. No se afirma cifrado completo de SQLite.

## Pruebas ejecutadas realmente

HONOR X6b Plus Android16/API36, Flutter3.50.0/Dart3.14.0, Java26.0.1, Gradle9.5.0, SDK36/NDK28.2. Identificador/direcciones y credenciales solo en evidencia privada. [Preparación y límites de antivirus](sdk-android-independiente.md).

| Prueba | Evidencia / resultado |
| --- | --- |
| Login UI nativa, cookie recuperable, HTTPS y CSRF | Android: UI login y limpieza del campo, vault real, logout sin CSRF403/sesión vigente, certificado no confiable rechazado, logout válido204/cookie anterior401 |
| Recuperación/expiración servidor | Android: otro controlador boot Unverified, me abre mismo owner sin extender expiry; fixture expira sesión en servidor y me401 bloquea/borrado de credencial |
| Logout sin respuesta | Android: fixture corta un socket TLS de logout, credencial local eliminada, revocación unconfirmed, filas SQLite intactas |
| Respuesta me tardía A→B | Android: me retrasado/cancelación real, login B en otra organización, callback anterior no reabre A ni reemplaza B |
| Archivo cifrado ilegible | Android: corrupción controlada del archivo exclusivo de B, error nativo/vault Locked, archivo y filas conservados; solo login explícito reemplaza el registro |
| SQLite/aislamiento | Android: FK/WAL/FULL, rollback captura/outbox, payload textual exacto, confirmado inmutable, ninguna columna de credenciales; B no encuentra filas de A y volver a A recupera conteo |
| Cierre/reinicio con sesión | Android, procesos separados sin desinstalar: boot Unverified, me Online, pending/decimal/FK conservados |
| Cierre/reinicio tras logout | Android, otro proceso: Locked, vault null, pendientes/FK conservados |

Nueve casos de aceptación nativos aprobados y un caso preparatorio de reinicio. Diez unitarias Dart aprobadas: política destino/cookie, expiración, errores de vault, logout no exitoso ante clear fallido y carreras. Mutación temporal que quitaba la guarda HTTPS fue detectada; archivo restaurado/regresión aprobada. Analyze sin avisos; APK debug compilado. CI servidor y estas ejecuciones nativas son evidencias distintas: no acreditar Android con CI web.

Fallos conservados privadamente: primer test interrumpido sin implementación; fixture con controles detrás del404 (corregido), intento de reinicio con desinstalación automática (corregido usando opción oficial --no-uninstall), NDK/licencia faltante (preparado y analizado antes de ejecutar). Ninguna aserción, protección o gate fue debilitado. Flutter doctor confirma toolchain Android/licencias/teléfono; avisos restantes PATH intencionadamente no global y carga C++ de Windows ausente, ajena a Android.

## Puertos locales B adicionales

Noveno caso nativo aprobado: los métodos reales del adaptador confirman captura+outbox y recibo+estado accepted en transacciones distintas, con rollback de ambas escrituras al inyectar fallos SQLite. Cuerpo/ID confirmado y recibo permanecen inmutables; repetición idéntica es idempotente, recibo diferente se rechaza y una capacidad de sesión anterior no accede al nuevo archivo. Validación/canonicalización v1 basada en sync-domain.js, con tres regresiones Dart adicionales (incluidas fechas/decimales/UUID/campos extra). No existe UI de captura ni worker.

## Límites que permanecen

No se declara implementado todo offline ni cubiertos en su totalidad NA-01–08/SB-01–06 del diseño. No se probaron restauración/transferencia real entre dispositivos, pérdida de clave física Keystore, respaldo ante pérdida del teléfono o garantías de corte de energía del hardware. El rechazo de archivo cifrado ilegible sí se probó. Los adaptadores B saveDraft/confirm/recordAck se ejercitaron realmente en Android: rollback ante trigger de fallo en outbox/ACK, confirmación repetida, recibo igual idempotente/distinto rechazado y lease antiguo tras cambiar A→B. El cuerpo v1 conserva las reglas del servidor y decimales como texto; no incorpora reglas agrícolas nuevas. UI/worker/replay/políticas O5 de C siguen pendientes: estos puertos no equivalen a captura/sincronización implementada. No aplicar008 a la demo para ampliarlos.

B aporta sesión Android y persistencia privada verificadas en este dispositivo; la aceptación del alcance offline completo y las políticas agrícolas siguen separadas. Antes de ampliar C, revisar este incremento y sus límites. No fusionar PR en esta tarea.

## Continuidad y soporte

CSV anterior exportado/analizado y original/copia privados conservados, sin otra exportación o envío. Borrador privado de soporte actualizado con los SDK/análisis nuevos y su versión anterior preservada. Incidente anterior sin dictamen ni confirmación de eliminación tras reinicio; nuevo análisis negativo no lo resuelve. Siguiente acción manual del incidente: presentar el caso al soporte por canal privado y conservar identificador/respuesta. No restaurar cuarentena, ejecutar SDK señalado o cambiar antivirus.
