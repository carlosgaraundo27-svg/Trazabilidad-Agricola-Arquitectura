# Incremento C — captura offline, outbox y sincronización

Especificación cerrada antes del código, 2026-11-19/20. Autorización técnica del propietario en esta sesión; no implica aprobación docente/agrícola. A mantiene su PUT/recibo/008; B aporta Keystore/sesión/SQLite y puertos transaccionales. Se desarrolla en rama propia, sin modificar demo001–007, herramientas verificadas o antivirus.

## Registro O1–O10

| Decisión | Estado y fundamento actual |
| --- | --- |
| O1 Flutter Android | Aprobada por implementación B y solicitud C; HONOR físico. iOS/PWA pendientes y fuera de C |
| O2 SQLite | Aprobada: captura/outbox atómicas, credenciales fuera de tablas, migración local aditiva conservando B |
| O3 Identidad | Aprobada explícitamente: UUID al primer guardado, estable al editar/reabrir; ID/cuerpo congelados al confirmar |
| O4 Ejecución | Aprobada: botón y retorno a primer plano, un envío a la vez; sin segundo plano |
| O5 Ventana | **Aprobada expresamente**:24h desde validación online+catálogo completo; independiente de cookie8h. Tras reboot sin revalidación bloquear nuevas confirmaciones, conservar consulta del perfil activo |
| O6 Sesión | Aprobada en B: HTTPS/cookie segura/CSRF, sin refresh o contraseña persistida;401 requiere reautenticar al mismo dueño |
| O7 Conflictos | Aprobada por alcance: solo draft editable; no cambiar/clonar ID/cuerpo confirmado/intentado para resolver incertidumbre; intervención conserva original |
| O8 Reintentos | **Aprobada expresamente**: inicial+5,2/4/8/16/30s,jitter0–20%,Retry-After mayor íntegro; contador/plazo durables; agotamiento pausa, manual abre otro ciclo sin cambiar identidad/historial |
| O9 Aislamiento | Aprobada: organización/actor, logout bloquea y conserva pendientes; solo login online del mismo dueño reabre tras logout; sin autoexpiración de cola |
| O10 Datos | Aprobada: parcelas asignadas descargadas, fecha con zona, decimal/unidades v1 existentes; sin conversiones, nuevas parcelas o correcciones silenciosas |

Siguen propuestas/fuera del alcance: iOS/PWA, worker en segundo plano, batch, corrección/anulación de hechos aceptados, sustitución de ID intentado, nuevas parcelas/unidades/tolerancias agrícolas, cifrado íntegro/exportación/backup entre dispositivos y SLA de50 registros/60s. No hay pregunta funcional bloqueante adicional tras las dos respuestas O5/O8.

## Contratos y fronteras

- GET autenticado `/api/v1/sync/catalog`: una instantánea mínima de parcelas asignadas (id/nombre), unidades kg/unidad y precisión v1, owner servidor y generatedAt UTC. Revalidar sesión/permiso prelot:create/asignación dentro de UoW. No productor/contactos/coordenadas/transporte. Respuesta limitada técnicamente a1000 parcelas; exceder devuelve error explícito y no habilita catálogo parcial/ventana. No cambia asignaciones ni límites de negocio.
- PUT existente `/api/v1/sync/pre-lots/{id}`: sesión vigente/CSRF/Idempotency-Key=id, mismo JSON canónico congelado;201 nuevo/200 replay. Revalidación servidor de usuario/rol/parcelas **antes del replay**, sin atajo para recuperar un recibo revocado. Validar respuesta/clientCaptureId/payload/IDs antes de guardar ACK+accepted en SQLite.
- Reloj Android: elapsedRealtime incluye suspensión y bootCount identifica continuidad; no prolongar ventana con reloj de pared o Stopwatch de proceso. Si no hay marcador fiable, confirmación offline bloqueada tras perder continuidad. Tiempo servidor ancla validación de fecha futura; el formulario conserva texto erróneo y muestra error, nunca reemplaza una fecha por ahora.
- Perfil activo cifrado fuera de SQLite conserva owner y referencia temporal/catálogo. Cookie expirada impide enviar, pero no extiende/recorta por sí sola la ventana O5.401 remoto bloquea nueva confirmación hasta revalidar; error de red conserva lectura/edición permitidas dentro de O5. Logout elimina autoridad local durable, no hechos; boot tras logout no monta archivos por conocer IDs.
- Origen HTTPS fijo, validación de cadena/hostname, sin redirecciones; sesión/cookie/CSRF nunca en tablas/logs. Usar misma autoridad/generación de B y lease original para toda operación; callback de A no abre/escribe B.

## Persistencia y estados

Migración SQLite2 aditiva a esquema1: catálogo/metadatos, campos de borrador, registro de ciclos/plazos/códigos y exclusión durable del envío. No reescribir migraciones servidor001–008 ni borrar bases para actualizar. Borrador admite campos incompletos como texto acotado; validación v1 al confirmar. Mostrar “Confirmado en este dispositivo; pendiente de aceptación” solo tras commit captura+outbox. Editar draft conserva UUID; confirmado no se edita.

Estados de interfaz: Borrador; Pendiente (incluye espera/resultado incierto con explicación); Enviando; Sincronizado (solo recibo persistido); Requiere autenticación; Conflicto/error (permiso/validación/reintentos agotados diferenciados). No eliminar filas por logout, caducidad o agotamiento. No hay botón que convierta una operación incierta en otra identidad.

Worker exclusivamente en primer plano, con guardia única de ejecución y claim SQLite antes de enviar. Incrementar intentos/persistir plazo antes de salir a red. Al abrir tras muerte de proceso, in_flight→uncertain; reconciliar mismo ID/cuerpo. Timer/backoff es ayuda de ejecución, SQLite es autoridad del contador/plazo. Un cambio de boot reancla conservadoramente la espera conocida y exige validación online; no acelerar Retry-After por reloj local cambiado. Cancelar request no revierte un commit remoto.

401→requiere autenticación/pausa;403/404 ámbito→intervención/invalidar parcela local;409→conflicto sin bucle;400/422→validación conservada;429→espera íntegra;timeout/corte/5xx→incierto/espera. Después de seis intentos por ciclo, pausa visible; manual inicia otro ciclo conservando intentos totales/ID/cuerpo. Primer plano vuelve a validar online antes de intentar sincronizar.

## Aceptación y evidencia

1. Catálogo solo del dueño/asignaciones actuales; vacío/error/descarga parcial no habilitan confirmación inexistente; otro usuario no accede a SQLite/cache de A.
2. Crear/editar draft sin red, UUID desde primer guardado y tras reabrir, cantidades como texto exacto y fecha/zona visibles; inválidos conservados con error; no conversiones.
3. Confirmación atómica y rollback real; cuerpo/ID congelados, guardar localmente distinto de aceptado remoto.
4. Ventana24h exacta con suspensión/reinicio app; reboot/tiempo incierto bloquea confirmación pero conserva datos;401 remoto suspende confirmación hasta revalidar; logout requiere login del mismo dueño.
5. Un worker pese a pulsaciones/resume simultáneos; intentos/plazos persistidos tras cierre; seis/ciclo y Retry-After sin truncar; agotamiento/manual sin borrar o renumerar.
6. HONOR real en modo avión (verificar estado y retirar reverse/red del fixture para que USB no mantenga la API accesible), captura y cierre/reapertura conservando pendientes; volver a conexión y una sola aceptación.
7. Fallo inyectado **después del commit servidor y antes de la respuesta**: reconciliar tras reinicio; contar exactamente una cosecha/pre-lote/recibo/audit y mismos IDs.
8. Mismo ID/cuerpo distinto409, no sobrescribir; expiración y revocación antes de replay, restaurar permiso y reconciliar original; A→B sin lectura/envío/callback ajenos.

Separar automatizadas Dart/SQLite/HTTP, automatizadas en Android, manipulación manual de modo avión y fallos inyectados del fixture. Registrar SHA núcleo/SHA servidor, versión SDK/HONOR/Android y conteos/IDs ficticios sin secretos. No sustituir Android por Chromium. Conservar fallos previos y no debilitar aserciones/gates.

Fuentes de implementación verificadas: [Android elapsedRealtime](https://developer.android.com/reference/android/os/SystemClock#elapsedRealtime()), [BOOT_COUNT](https://developer.android.com/reference/android/provider/Settings.Global#BOOT_COUNT), [lifecycle Flutter](https://api.flutter.dev/flutter/widgets/WidgetsBindingObserver/didChangeAppLifecycleState.html), [sqflite](https://pub.dev/packages/sqflite). Los resultados se registrarán en continuidad; esta especificación no declara las pruebas ejecutadas.
