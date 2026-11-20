# Android B/C — sesión, captura offline y outbox

Cliente Flutter Android dentro del repositorio existente. B conserva login/Keystore/cookie/CSRF/SQLite privado; C añade catálogo asignado, drafts con UUID estable, confirmación/outbox atómica, sincronizador manual/foreground único, reintentos durables y reconciliación idempotente. [Contrato O1–O10](../../docs/03-diseno-de-software/13-incremento-C-captura-offline.md), [evidencia, límites y prueba breve](../../docs/05-sprint01/incremento-C-android.md).

**Entorno C existente:** HTTPS127.0.0.1:3043, `node tests/android/c-backend-fixture.js` desde raíz únicamente si no existe proceso/puerto activo. Base privada `.local/android-c-fixture/android_c_dev_20261120`, ficticia001–008; no lee demo.env ni DATABASE_URL. Reutiliza certificado B ya verificado, no genera otro ni cambia confianza global. Usuario campo-c@example.test; contraseña/config solo en `.local/android-c-fixture/credenciales.txt` y config.json ignorados. No publicar certificados, config, APK o informes privados.

SDK oficial independiente ya analizado, Android autorizado y rutas explícitas existentes; no reinstalar ni usar SDK señalado. ADB reverse tcp:3043 tcp:3043. Desde clients/android_b:

```text
flutter analyze --no-pub
flutter test --no-pub
flutter test integration_test/c_storage_test.dart --no-pub --no-uninstall -d <Android-autorizado>
flutter test integration_test/c_migration_test.dart --no-pub --no-uninstall -d <Android-autorizado>
flutter test integration_test/c_sync_test.dart --no-pub --no-uninstall -d <Android-autorizado> --dart-define-from-file=../../.local/android-c-fixture/config.json
```

c_airplane_test.dart se ejecuta en cuatro procesos con `--dart-define=AIRPLANE_PHASE=prepare|capture|reopen|sync` (un valor/fase). Entre prepare/capture activar modo avión y quitar solo reverse3043; mantenerlo en reopen; antes de sync restaurar el estado anterior y reverse. No basta modo avión si ADB reverse mantiene loopback. c_lost_restart_test.dart usa dos procesos con `--dart-define=LOST_PHASE=drop|replay`; no desinstalar/limpiar datos. Los controles __fixture solo se incluyen en este servidor ficticio loopback, nunca en app/API de producción.

Compilar app debug normal con `flutter build apk --debug --no-pub --dart-define-from-file=../../.local/android-c-fixture/config.json`; APK privado, no distribuir release. No se ha cambiado validación TLS, hostname o certificados; CA debug solo loopback, release la rechaza. La demo001–007 y su base no participan.

## Referencia B conservada (histórica respecto del alcance C)

# Android B: sesión nativa y SQLite privado

Implementa login/me/logout sobre la API existente, HTTPS/origen fijo sin redirecciones, cookies cifradas con Android Keystore y archivos SQLite por organización/actor validado online. No incluye captura, worker, replay o sincronización C. No hay contraseña/cookie/CSRF en las tablas de negocio. La cookie se conserva en no_backup mediante AES-GCM y AtomicFile con fsync; logout escribe una marca durable y conserva SQLite.

Los contratos de referencia son [PR9, solo documentación](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/blob/6e1642b73bf517f14ad04108f685e0eab26091a6/docs/03-diseno-de-software/11-contratos-incremento-B.md). El esquema local prepara sus invariantes; los puertos SQLite de confirmación/ACK están implementados con lease original, transacciones e identidad inmutable; no hay interfaz de captura ni envío C. [Resultados y límites](../../docs/05-sprint01/incremento-B-android.md), [herramientas verificadas](../../docs/05-sprint01/sdk-android-independiente.md).

## Desarrollo aislado

Usar únicamente el SDK independiente analizado, no el SDK señalado. Las rutas locales de herramientas se documentan en el enlace anterior; no dependen de PATH global. Requiere Android físico autorizado y SDK/Java/licencias ya verificados. No repetir instalaciones o generar otro certificado si existe el fixture.

Desde la raíz del repositorio, solo si todavía no existe `.local/android-b-fixture`: `node tests/android/prepare-fixture.js`. Después `node tests/android/backend-fixture.js`. El primero usa criptografía Windows para un certificado de desarrollo; no cambia el almacén de confianza del sistema. El segundo usa exclusivamente `.local/android-b-fixture/android_b_dev_20261119`, PGlite nuevo001–008/semillas ficticias, HTTPS127.0.0.1:3042; rechaza redirecciones, entorno production o puerto ocupado antes de abrir DB. No lee demo.env o DATABASE_URL. Certificado, claves y config.json privados/excluidos de Git. Si el fixture existe, reutilizarlo; no sobrescribirlo para superar un error.

ADB reverse `tcp:3042 tcp:3042` conecta ese puerto al teléfono. Configuración debug: `.local/android-b-fixture/config.json`. El backend genera contraseña/clave aleatorias sin imprimirlas. La CA solo se acepta para loopback y build debug; sigue validando cadena/hostname, rechaza certificado ajeno y no instala CA global. Release rechaza DEBUG_CA_BASE64 y requiere un origen HTTPS propio. No hay callback trust-all ni downgrade.

## Pruebas

Desde clients/android_b, ejecutar mediante la ruta explícita del Flutter verificado:

```text
flutter analyze
flutter test test/session_test.dart
flutter test integration_test/session_native_test.dart -d <Android-autorizado> --no-uninstall --dart-define-from-file=../../.local/android-b-fixture/config.json
flutter test integration_test/prepare_restart_native_test.dart -d <Android-autorizado> --no-uninstall --dart-define-from-file=../../.local/android-b-fixture/config.json
```

Después de que el proceso anterior se cierre, comprobar `adb shell am force-stop org.trazabilidad.trazabilidad_android_b` y ejecutar restart_native_test.dart con los mismos argumentos. Esta prueba recupera la sesión y los pendientes y termina con logout confirmado. Repetir el cierre únicamente de B y ejecutar logout_restart_native_test.dart: debe quedar Locked y conservar pendientes. **--no-uninstall es obligatorio entre fases**: Flutter3.50 desinstala y elimina los datos al terminar si se omite. No usar adb clear/uninstall para simular un reinicio.

Los controles /__fixture son exclusivos del servidor de pruebas loopback, protegidos por clave aleatoria privada: expiran sesiones ficticias, cortan una conexión de logout o retrasan un me. No son endpoints de producción ni se incorporan a OpenAPI; B no añade endpoints públicos. Las inserciones SQL del test son fixtures del motor local, no captura/sincronización implementada.

## Probar la app normal

Compilar `build apk --debug --dart-define-from-file=../../.local/android-b-fixture/config.json` y reinstalar con `adb install -r` para conservar los datos. Usuario ficticio autorizado: **campo@example.test**; otra organización: **otro@example.test**. Contraseña únicamente en `.local/android-b-fixture/credenciales.txt`, nunca en chat, código o reportes públicos.

Abrir Trazabilidad B, iniciar sesión, verificar sesión y cerrar/reabrir. Tras logout se bloquea el espacio y se conservan las filas de prueba. Un fallo de red distingue cierre local de revocación remota. No hay pantalla de captura/envío en este incremento. El servicio debe estar activo en3042; no confundir esta URL con la demo3026 o ROP3041.
