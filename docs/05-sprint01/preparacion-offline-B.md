# Preparación B — sesión nativa Android y SQLite

2026-11-19. #7 y #8 integrados con merges c8676b6 y6f0294d; commits conservados. **B no es un cliente implementado ni una prueba Android ejecutada.** La autorización actual incluye preparar sesión nativa Android, cookies seguras/CSRF, expiración/logout/aislamiento y SQLite privado; ejecutarlo e implementarlo depende de disponer de herramientas verificadas y resolver el incidente. Rama actual docs/preparacion-B-tras-integracion, desde main6f0294d; no contiene código Dart/Android. [Integración y checks](integracion-inventario-offline-A.md), [contratos cerrados de B](../03-diseno-de-software/11-contratos-incremento-B.md), [plan A–D](../03-diseno-de-software/10-plan-incrementos-offline.md). O5/retención/reintentos de C no se aprueban por silencio ni implican aprobación docente.

## Herramientas observadas, sin ejecutar SDK

| Herramienta | Evidencia local de esta revisión | Consecuencia |
| --- | --- | --- |
| Node | v24.16.0; node.exe con Authenticode válido de OpenJS Foundation | Sirve para contratos/servidor; no acredita Android |
| Python | 3.12.10; python.exe con Authenticode válido de Python Software Foundation | Inspección de evidencia sin Docker |
| SQLite de Python | 3.49.1 obtenido con stdlib del Python verificado | Permite experimentar con SQL; no verifica el plugin ni filesystem Android |
| Java | java.exe de JDK26.0.1 y ejecutable javapath con firmas válidas de Oracle; versión26.0.1.0 leída del archivo, sin ejecutar Java | No se ha demostrado compatibilidad con AGP/Gradle/Flutter; no elegirlo automáticamente |
| Flutter, Dart, adb, emulator, sqlite3 CLI | No encontrados en PATH de esta sesión | No ejecutar comandos antiguos de bootstrap ni asumir que estén instalados |
| Android Studio / SDK | Rutas habituales Program Files/Android/Android Studio y LocalAppData/Android/Sdk ausentes; ANDROID_HOME/ANDROID_SDK_ROOT/JAVA_HOME no definidos aquí | Inspección acotada; no demuestra ausencia en todo el disco |

El ZIP/hash registrado de Dart es evidencia de transferencia, no de seguridad. No se ejecutó/restauró el SDK señalado ni se cambiaron exclusiones, cuarentena o antivirus. No existe informe del proveedor que cierre el incidente en la evidencia revisada.

Revisión posterior a integrar: Kaspersky Service21.27 observado Running;21.26 Stopped. No se encontró un dictamen de cierre en las evidencias privadas previstas ni SDK alternativo en PATH, las rutas Android habituales, C:/src, C:/tools, C:/flutter, el directorio development del perfil o las herramientas del contenedor recuperado. Es una búsqueda acotada, no un inventario de todo C:. La consulta de SecurityCenter2 no entregó estado utilizable; no se interpreta como análisis aprobado. No se ejecutó ni analizó un SDK alternativo porque no se identificó uno verificable.

**Único paso manual para desbloquear esta fase:** tramitar con soporte de Kaspersky el evento exacto de Dart (producto/firmas, detección, ruta, hash y origen oficial), obteniendo un identificador de caso y dictamen que pueda revisarse localmente. Conservar evento/dictamen privados; no restaurar cuarentena ni crear exclusiones. Un servicio activo o checksum coincidente no sustituyen ese dictamen. La futura adquisición/verificación de herramientas y el análisis antivirus del artefacto alternativo se realizarán después, antes de cualquier ejecución. No repetir la recuperación del repositorio ni del SDK señalado.

El [procedimiento del proveedor](https://support.kaspersky.com/common/error/other/15332) solicita evento, versión y origen. No se envió ninguna consulta/muestra desde esta sesión ni se accedió a cuarentena. El paso anterior es la acción manual actual; el flujo siguiente queda condicionado al desbloqueo.

Después de resolverlo: adquirir una distribución oficial verificada y sin detección activa; registrar URL, versión, SHA y resultado del análisis. Usar una ubicación de herramientas separada del SDK señalado, en C:, sin duplicar este repositorio. Preparar Android SDK/platform-tools y JDK compatible según la versión seleccionada; revisar licencias personalmente. Solo entonces ejecutar doctor y devices y registrar dispositivo/Android y herramientas. [Instalación Flutter](https://docs.flutter.dev/install/manual), [entorno Android](https://docs.flutter.dev/platform-integration/android/setup). No se ejecuta hoy ese flujo.

## Contrato nativo de sesión, sobre la API existente

Fuente comprobada: server/http.js, server/modules/access/application.js y repository.js; OpenAPI existente. No requiere endpoint de refresh ni cambiar autenticación del servidor.

| Operación | Contrato que debe cumplir B |
| --- | --- |
| POST /api/v1/auth/login | Email/contraseña solo durante la petición. 200 entrega user y csrfToken; Set-Cookie session. Login público no exige un CSRF previo; si se envía Origin, debe coincidir con el origen del servidor. No almacenar contraseña |
| Cookie session | HttpOnly, SameSite=Strict, Path=/api/v1, sin Domain explícito, Max-Age8h; Secure depende de production. El entorno nativo de aceptación debe ser HTTPS y exigir Secure. Rechazar cookies de origen ajeno y paths no autorizados; SameSite no sustituye una política explícita en un cliente nativo |
| GET /api/v1/auth/me | Enviar cookie del jar permitido; 200 recupera actor/org/rol y csrfToken. 401 bloquea envío y exige login; no crea refresh ni renueva TTL ficticiamente |
| POST /api/v1/auth/logout | Cookie + X-CSRF-Token correcto:204 e invalidación remota, cookie eliminada. Token ausente/incorrecto:403 con sesión aún activa. Origin ajeno:403. En modo sin red solo puede afirmarse cierre local, no revocación remota |
| Escrituras autenticadas | X-CSRF-Token, cookie y destino HTTPS autorizado. CSRF no se imprime ni se incluye en SQLite de negocio. Una cookie con expiración local vigente no evita que el servidor rechace por revocación |

Puertos/adaptadores propuestos, sin escoger paquetes aún: SessionTransport.login/me/logout con destino HTTPS fijo y sin redirecciones automáticas; CredentialVault guarda el jar cifrado con clave protegida por Android Keystore; WorkspaceStore abre solo el namespace org/actor validado por me. Cada petición lleva un identificador local de generación de sesión: al cambiar cuenta/logout, cualquier callback anterior solo puede afectar a su espacio original, nunca al activo. Un fallo de lectura del almacén seguro bloquea el envío, sin crear credenciales sustitutas.

Al reabrir: cargar credencial segura, descartar expiradas, validar me online antes de habilitar sync. Offline se conserva el espacio bloqueado y la cola; no se interpreta una cookie guardada como autorización actual. Tras logout borrar credenciales, detener worker e invalidar callbacks; conservar datos pendientes por propietario y reabrir únicamente tras login online del mismo dueño. El borrado local debe ser durable incluso si la llamada remota falla; mostrar revocación pendiente cuando no se pudo confirmar logout remoto.

Keystore protege **claves**, no almacena por sí solo cookies arbitrarias ni cifra toda SQLite. Diseñar credenciales cifradas fuera de tablas de negocio y excluirlas de backup/restauración de Android; verificar también la política de transferencia entre dispositivos. SQLite privada no equivale a cifrado. Fuentes: [Keystore](https://developer.android.com/privacy-and-security/keystore), [Auto Backup](https://developer.android.com/identity/data/autobackup).

## Contrato SQLite propuesto, independiente del SDK

Un archivo privado por namespace organizationId/actorId validado online. Verificar metadatos de propietario al abrir; nunca derivar el dueño del body de captura. PRAGMA foreign_keys=ON por conexión; usar transacciones reales y journal durable, sin journal_mode=OFF/MEMORY ni synchronous=OFF. La selección final de plugin/journal/cifrado requiere revisar versiones, mantenimiento y comportamiento Android antes de fijar dependencias.

| Entidad mínima | Invariantes |
| --- | --- |
| workspace | schemaVersion local, organizationId y actorId; sin password/cookie/CSRF |
| capture | clientCaptureId UUID, payloadV1 canónico en texto (cantidad decimal, no float), estado draft/confirmed; dueño fijado por workspace |
| outbox | FK única a capture, payload confirmado exacto e ID estables, estado pending/inFlight/uncertain/accepted/needsLogin/intervention; intento/fecha de próximo intento y último código sin secretos |
| receipt | Un recibo por capture con preLotId, harvestId, acceptedAt y payload aceptado; no convertir 409 en éxito ni crear ID sustituto |

Confirmar ejecuta en **una transacción local**: validar/guardar captura inmutable y crear outbox. Si falla cualquiera, no puede quedar confirmación sin cola ni cola huérfana. Después del commit, errores de red/proceso no cambian ID/cuerpo. Guardar ACK actualiza recibo y outbox en otra transacción, condicionada por namespace, generación e identidad originales. Muerte tras commit servidor y antes de guardar ACK conserva uncertain y reconcilia el mismo PUT de A. Logout no hace DELETE de pendientes. B solo prueba esta durabilidad mínima; pantallas completas, worker/reintentos de C y fallos completos de D siguen pendientes.

La atomicidad del motor necesita probarse con el plugin/filesystem Android real; no se deduce de una simulación en escritorio. [SQLite, atomic commit](https://www.sqlite.org/atomiccommit.html).

## Plan de aceptación Android

API HTTPS **aislada**, DB nueva001–008, cuentas A/B y datos ficticios; jamás demo.env ni inventory_demo_20261118_151800. Fijar dispositivo/Android/build, SHA servidor, SHA cliente y versiones. Registrar status/IDs/conteos anonimizados, sin cookies/CSRF/password ni volcados de vault. Estos casos están diseñados, **no ejecutados**.

| Caso | Ejecución y comprobación |
| --- | --- |
| NA-01 | Login nativo; inspeccionar atributos permitidos sin valores; me devuelve mismo dueño/rol y CSRF. Falla con HTTP/certificado no válido; no se admite trust-all |
| NA-02 | Logout sin CSRF y con CSRF erróneo:403; me aún200. Logout con Origin ajeno:403 |
| NA-03 | Forzar cierre real y reabrir antes de8h; me200 del mismo dueño desde vault, sin password persistida |
| NA-04 | Fixture de expiración en DB desechable:me401; se conserva SQLite y se bloquea envío; login mismo dueño crea sesión nueva. No tocar reloj del SO ni reducir TTL productivo |
| NA-05 | Logout válido204; cookie anterior contra me401, vault vacío y workspace bloqueado; reabrir app no recupera la credencial |
| NA-06 | Petición/redirección a otro host/puerto, /q o /api/public/v1; no enviar cookie/CSRF. Rechazar downgrade HTTP/TLS inválido. Verificar host-only, Path y Max-Age; redirecciones no se siguen automáticamente |
| NA-07 | Login B con outbox A y callback A tardío; B no monta/envía A y ACK no se escribe en B. Repetir logout offline, kill/reopen y fallo de borrado seguro |
| NA-08 | Respuesta perdida tras commit, expiración y reinicio; mismo ID/cuerpo tras login del dueño, recibo original, una sola alta. La implementación de A es la referencia; smoke nativo no prueba C/D completos |
| SB-01 | Fallo SQL entre capture y outbox:rollback de ambas; sin registro parcial |
| SB-02 | Kill real antes/durante/después del commit local; al reabrir hay0 o1 parejas completas, nunca medias |
| SB-03 | UUID duplicado y cambio de payload confirmado:rechazo, filas y cuerpo originales iguales |
| SB-04 | Fallo entre recibo y actualización outbox:rollback; replay del mismo PUT recupera el recibo sin duplicar |
| SB-05 | Logout/cambio A→B/expiración/reboot conservan pendientes A y bloquean envío indebido; reboot no concede ventana local nueva |
| SB-06 | Vault inaccesible o copia/restauración Android sin clave:sin envío y sin pérdida silenciosa de datos; no asumir que SQLite restaura credenciales |

Orden de implementación tras desbloqueo: smoke NA-01–06 sin cola → aislamiento NA-07–08 → persistencia SQLite SB-01–06. Archivo previsto integration_test/native_session_smoke_test.dart, todavía inexistente; se ejecutará en dispositivo Android identificado, no Chrome/Node. Mantener gates, timeouts y aserciones; cualquier fallo bloquea la aceptación de B.
