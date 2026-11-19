# Propuesta — Captura offline y sincronización de cosecha/pre-lotes

**Corte 2026-11-19:** el usuario autoriza implementar/probar únicamente el servidor **A**, en rama separada dependiente de #7. [Plan A–D y aceptación A-01–08](10-plan-incrementos-offline.md). A implementa PUT/recibo/idempotencia y migración008 en bases nuevas de prueba; se registra en OpenAPI. No aplica008 a la demo, crea Flutter ni adopta por silencio las políticas locales O5/O6/O8/O9. B–D y las partes móviles de O1–O10 siguen propuestas. Las afirmaciones históricas de ausencia total de endpoints/migración corresponden al corte previo a A.

Estado: **especificación para decisión, sin implementación**. Fecha 2026-11-16. No se autoriza automáticamente ningún valor recomendado. Traza RF-03/RF-04, HU02, DA01, RC01, EQ-02, ADR-003 REST, ADR-004 PostgreSQL y ADR-008 seguridad. [Requisitos](../01-analisis-de-sistema/03-requisitos-funcionales.md), [drivers](../01-analisis-de-sistema/06-drivers-arquitectonicos.md), [primer recorrido actual](03-especificacion-primer-recorrido.md). ADR-015 queda [propuesta](../02-arquitectura/12-propuesta-offline-movil.md).

## Objetivo y alcance inicial propuesto

Recolector previamente identificado y con parcelas descargadas puede registrar cosecha sin red, confirmar guardado durable, cerrar/reiniciar app/dispositivo y sincronizar después sin duplicar un pre-lote aunque se pierda la respuesta. Distinguir siempre guardado local de aceptado por el servidor.

Un registro produce una cosecha y un pre-lote según el adaptador actual; no inventa consolidaciones, inventario ni movimientos. Solo altas: correcciones de hechos ya sincronizados requieren otro incremento. Sin fotos, mapas offline, nuevas parcelas/productores offline, sincronización de Acopio/Calidad/Logística/QR ni edición colaborativa. kg/unidad y precisión siguen el catálogo actual, sin conversiones. No se fija carga/SLA por inferencia: EQ-02 propone 50 registros/60 s, aún por acordar y medir.

Capacidades del mismo recorrido: M1 captura/pantallas → L1 SQLite/outbox durable → sincronizador → S autenticación vigente + P asignaciones + H alta transaccional en O1. L1 no autoriza en el servidor. Implementar primero persistencia/reinicio, después contrato/idempotencia y finalmente reintentos/conflictos y demo de extremo a extremo.

## Estado real del cliente móvil y Flutter

- Existe web React/Vite: web/main.jsx, función Harvest, formulario conectado a /pre-lots. El intento usa useRef con UUID mientras vive la página; no se conserva al cerrar/recargar.
- No hay pubspec.yaml, archivos .dart, proyecto Android/iOS, base local de capturas/outbox ni worker de sincronización en el repositorio revisado. La UI adaptable no es una app Flutter ni acredita offline.
- Flutter aparece como tecnología móvil de referencia en arquitectura técnica y M1 objetivo; ADR-003 acepta REST, no implementa por sí sola M1/L1. ADR-009 delimita expresamente el primer corte en línea, sin sustituir RF-03 completo.
- Para cumplir RF-03/DA01 con esa dirección hay que crear cliente Flutter, almacenamiento local, migraciones SQLite, autenticación de móvil, caché mínima de asignaciones, sincronizador y pruebas de reinicio/red/conflictos sobre un dispositivo o emulador, además del adaptador backend.
- Una PWA/web offline es una **alternativa propuesta**, no sustitución adoptada. Requeriría decisión expresa y ADR que cambie M1/L1, evalúe persistencia/evicción, autenticación, segundo plano y límites del navegador. No se implementa ni se presenta como Flutter.

La guía oficial Flutter recomienda repositorios que coordinan servicio local/remoto y explica escrituras offline y sincronización: [offline-first](https://docs.flutter.dev/app-architecture/design-patterns/offline-first), [persistencia SQL](https://docs.flutter.dev/app-architecture/design-patterns/sql). Son referencias para la propuesta; no demuestran una implementación en este repositorio.

## Decisiones pendientes — opciones y recomendación

Resumen anterior: los valores y condiciones quedan precisados por la sección final «Propuesta concreta para aprobar O1–O10». Para decidir usar esa sección; ninguna recomendación está adoptada.

| ID | A (recomendada) | B | C / ejemplo y consecuencia |
| --- | --- | --- | --- |
| O1 Cliente y plataforma | Mantener Flutter, empezar Android y contrato reutilizable; iOS diferido | Flutter Android+iOS desde inicio, más infraestructura y pruebas | PWA/web offline: requiere aprobación expresa de sustitución y ADR. Ej.: demostrar 3 capturas tras reiniciar Android; un navegador responsive no acredita esa demo |
| O2 Persistencia local | SQLite privada de app con captura + outbox en una transacción; claves de sesión en almacén seguro del SO | Base embebida no SQL, justificando transacciones/migraciones | No usar memoria/preferencias para la cola. Ej.: 37.125 kg guardados localmente deben sobrevivir cierre forzado |
| O3 Identificación | clientCaptureId UUID generado una vez al primer guardado local y congelado con el cuerpo al confirmar, mapeado a preLotId servidor; conservar ambos | preLotId elegido por cliente como ID final, requiere extender contrato e identidad histórica | A conserva UUID servidor vigente. Dos envíos del mismo captureId producen una cosecha/pre-lote; mismo ID con 38.000 en vez de 37.125 da 409 |
| O4 Cuándo sincronizar | Botón y al abrir/recuperar app con red; reintento secuencial en primer plano | Añadir ejecución periódica en segundo plano y política de batería/red por plataforma | A no promete trabajo con app cerrada. Ej.: 10 pendientes permanecen guardados al apagar; se reanudan al abrir |
| O5 Identidad/asignaciones offline | Primera sesión online y descarga de parcelas; permitir captura local con perfil conocido y desbloqueo del dispositivo, avisando que no es permiso servidor | Exigir sesión aún no vencida para guardar; más restrictivo en jornadas sin red | Definir retención local/validez del catálogo antes de implementar. Recomendación inicial: mostrar fecha de descarga y advertir catálogo vencido, nunca borrar cola ni inferir autorización vigente. Revocado al volver: bloquear sincronización |
| O6 Sesión móvil | Reutilizar sesión cookie + CSRF en jar nativo persistido de forma segura; reautenticación al vencer (sin contraseña guardada) | Nuevo flujo token/refresh por dispositivo con revocación y almacenamiento seguro, requiere ADR/endpoints propios | A reduce cambio de backend; probar HTTPS, cookie, CSRF, logout y expiración real, sin abrir CORS ni desactivar Origin |
| O7 Conflictos/correcciones | Captura editable solo en draft; confirmar congela cuerpo/ID; conflictos se muestran y resuelven manualmente | Editar lo pendiente solo si nunca se intentó; exige control de estado adicional | Nunca last-write-wins para cantidad/origen. Una respuesta perdida impide clonar automáticamente con ID nuevo |
| O8 Reintentos y tamaño | Un registro por petición, secuencial; backoff 2/4/8/16/30 s con jitter, respeta Retry-After; botón reintentar | Batch con resultados por elemento y transacciones independientes; más contrato | A: 25.500 y 17.125 son dos altas independientes, sin transacción global ficticia. Tras cinco reintentos automáticos fallidos (seis intentos por ciclo) pausar y mostrar acción; no borrar registro |
| O9 Datos locales/logout | Espacios por organización/actor; conservar pendientes bloqueados y exigir el mismo usuario al volver; borrado solo explícito con advertencia de pérdida local | Borrar al salir, requiere decisión y confirmación que identifica pendientes no enviados | No enviar cola de A como usuario B. Al cambiar cuenta, ocultar su detalle; DB privada y bloqueo SO no equivalen a cifrado completo |
| O10 Catálogo/límites de jornada | Parcelas asignadas descargadas online; límites de cantidad/unidades iguales al contrato actual; fecha capturada y recibida separadas | Permitir nuevas parcelas offline o futuras tolerancias de reloj, requiere reglas adicionales | Recomendación: no inventar ID de parcela ni corregir reloj silenciosamente; futuro según servidor→validación, conservar dato para resolución |

La propuesta concreta al final fija para aprobación una ventana de captura O5 de 24 h, separada de la retención O9 sin autoexpiración de pendientes. Esos valores no están adoptados ni implementados. Recomendación transversal: no admitir primer inicio completamente desconectado sin identidad/catálogo conocido.

## Persistencia local propuesta

Tablas nuevas dentro del sandbox privado de M1, con migraciones locales versionadas y transaccionales (no existen aún):

- profiles: organizationId/actorId, identidad mínima, fecha de autenticación, versión del catálogo; sin contraseña.
- assigned_parcels: UUID/origen mínimo autorizado, versión/descargadoEn. No copiar contactos, finanzas, transportes ni notas internas.
- captures: clientCaptureId, organizationId/actorId dueño, schemaVersion, payload normalizado, capturedAtDevice, estado, preLotId/harvestId remotos tras ACK.
- outbox: mismo captureId/owner, cuerpo congelado, hash/versión de canonización, estado, attempts, firstAttemptAt, nextAttemptAt, último código/error seguro. Índice único por captureId/owner; no generar otro ID al reintentar.
- sync_receipts: IDs remotos y contenido canónico/hash confirmado; guardar ACK y cambio de estado juntos.

Guardar captura confirmada y outbox en **una transacción SQLite**; mostrar “Guardado en este dispositivo” solo después del commit durable. Si disco lleno/escritura/migración falla, conservar formulario y comunicar “No guardado”. No prometer supervivencia a desinstalación, borrado de datos del SO o pérdida del dispositivo: backup/exportación cifrada es decisión separada. Guardar un draft puede ser automático, pero no equivale a confirmación ni inserta outbox.

Al iniciar: ejecutar migraciones locales conservando filas, cargar pendientes; sending sin ACK pasa a uncertain con el mismo ID/cuerpo. Si el proceso muere tras ACK remoto y antes del commit local, repetir exactamente la intención. Evitar dos workers mediante exclusión transaccional local y lease de ejecución recuperable; esta lease no borra la captura ni su identidad.

## Estados y transiciones propuestos

| Estado local | Significado y transiciones |
| --- | --- |
| draft | Editable, guardado local sin enviar; confirmar→pending con ID/cuerpo congelados; descartar exige acción explícita |
| pending | Listo para primer intento; sending si sesión/catálogo y red permiten; no significa recibido |
| sending | Intento en curso exclusivo; 201/200 válido→synced; timeout/corte→uncertain; fallo temporal→retry_wait |
| uncertain | Resultado remoto desconocido: pudo haber commit. Repetir mismo ID/cuerpo; no editar, borrar como “cancelado” ni crear sustituto automático |
| retry_wait | Sin aceptación confirmada, reintento programado; se conserva ID/cuerpo; red disponible no demuestra servidor disponible |
| auth_required | 401/sesión vencida; pausar y solicitar login del mismo actor; después pending/uncertain según intento previo |
| forbidden | 403 o 404 de ámbito: servidor no autoriza actualmente. Conservar para gestión, sin cambiar owner, forzar permiso ni reintentar en bucle |
| validation_error | 400/422: dato o versión no aceptados; conservar cuerpo/código y ofrecer resolución, sin redondear/corregir automáticamente |
| conflict | 409 mismo ID/contenido distinto o captura ya vinculada incompatiblemente; mostrar comparación mínima autorizada, no sobreescribir |
| synced | ACK persistido localmente con IDs remotos; inmutable en este alcance. Puede consultarse offline; reenvío accidental idéntico obtiene mismo recurso |

**Pendiente adicional dentro de O7:** definir si un registro bloqueado puede sustituirse por uno corregido y con qué prueba de no aceptación. Recomendación para el primer incremento: ningún sustituto tras un intento; conservarlo y escalar a gestión manual. Alternativa: protocolo posterior que cierre atómicamente el ID original en servidor y autorice un sustituto enlazado; necesita contrato y pruebas propios. Un 400/401/403 reciente no demuestra que un intento anterior con respuesta perdida no haya sido aceptado. No clonar ni editar ID/cuerpo uncertain, validation_error, forbidden o conflict para eludir esta duda.

Cancelar localmente una captura nunca intentada puede sacar outbox conservando tombstone/auditoría local, si se adopta O7. Una captura enviada o uncertain no tiene cancelación segura en el contrato actual: no se afirmará que desapareció del servidor. No hay corrección/anulación de cosechas ya sincronizadas en este incremento.

## Contrato backend A (registrado en OpenAPI en la rama del incremento)

O3=A: **PUT /api/v1/sync/pre-lots/{clientCaptureId}**, sesión vigente y CSRF; Idempotency-Key igual a clientCaptureId. No requiere ID de dispositivo como identidad de usuario. schemaVersion=1. Ejemplo ficticio:

~~~json
{
  "schemaVersion": 1,
  "parcelId": "40000000-0000-4000-8000-000000000001",
  "harvestedAt": "2026-11-16T13:00:00.000Z",
  "quantity": "37.125",
  "unit": "kg"
}
~~~

No aceptar organizationId/actorId/status/receivedAt/preLotId del cliente. Obtener organización/actor desde sesión; normalizar UUID, instante ISO UTC y decimal exacto sin Number/redondeo silencioso. Definir hasta 3 decimales de segundo en v1 y rechazar precisión extra; no modificar retrospectivamente el endpoint online ni sus históricos. Retener texto normalizado congelado, no convertir según locale.

- 201 primera aceptación: clientCaptureId, preLotId, harvestId, status servidor, acceptedAt y payload canónico mínimo. 200 repetición idéntica: mismos IDs y hechos, sin segunda auditoría/alta; replay indicador explícito.
- 409 SYNC_ID_CONTENT_CONFLICT: mismo ID ya aceptado con contenido distinto. Mensaje comprensible; no devolver contenido ajeno. No actualizar registro existente.
- 401 UNAUTHENTICATED (el futuro cliente lo mapea a auth_required); 403/404 según convención vigente; 400 clave ausente/distinta/inválida; 422 contrato/esquema/dato/precisión inválidos; 413 cuerpo demasiado grande; 429 límite con Retry-After; 500 temporal, resultado incierto que se reconcilia sin cambiar ID/cuerpo. A conserva los errores del adaptador HTTP existente.
- Timeout/5xx con commit incierto **siempre** se tratan como uncertain y se reintentan con ID/cuerpo idénticos. No deducir “no guardado” de una respuesta ausente.
- Sesión, usuario activo, permiso prelot:create y asignación vigente de parcela **se revalidan antes de replay**, bajo bloqueos de autorización; revocación impide leer la respuesta histórica por esa vía. No confiar en permisos ni reloj descargados.
- Mismo captureId usado por otro actor/organización no da acceso al recurso. Ámbito propuesto: UUID aleatorio generado localmente, unicidad efectiva (organization_id, client_capture_id) y dueño actor inmutable; otra organización no comparte identidad ni recibo; devolución pública de conflicto sin revelar propietario. Cualquier colisión se resuelve manualmente, sin reasignar identidad.

Canonización versionada incluye parcelId, harvestedAt, quantity y unit, más schemaVersion; hash servidor calculado desde objeto canónico propio, nunca confiar en hash enviado. Orden de propiedades/UUID mayúscula/37.1 frente a 37.100 no generan altas distintas: definir equivalencias con ejemplos en pruebas antes de implementar (v1 propone rechazar más de 3 decimales, incluido cero adicional). Nota: cambiar un campo legítimo bajo el mismo ID tras aceptación es conflicto, no “actualización”.

Un GET de recibo podría ayudar a reconciliar, pero no es necesario para A: el PUT repetible devuelve el resultado con permisos vigentes. Proponerlo solo si existe consumidor/caso no cubierto.

## Migraciones servidor y compatibilidad de A

Migración **008_harvest_sync**, sin editar 001–007 ni inventar captureId para históricos. Implementa las reglas siguientes; solo probada en bases nuevas, no aplicada a la demo:

1. Tabla de recibos H (nombre tentativo harvest.sync_receipts), UUID del cliente, dueño/organización, schemaVersion/canonización, hash, cuerpo mínimo, IDs remotos y acceptedAt; FK compuestas, UNIQUE organización/captureId y hechos inmutables.
2. Serializar clave/identidad por transacción; revalidar S/P, consultar recibo. Si coincide, devolver mismos IDs; distinto→409. Primera aceptación crea cosecha/pre-lote, audit y recibo en **una** UoW; fallo de evento/recibo/auditoría revierte todo.
3. Reutilizar caso de uso de H mediante contrato explícito dentro de UoW; no llamar un servicio que abra una transacción anidada independiente. El endpoint online actual conserva contrato/IDs.
4. Registros históricos sin recibo quedan sin recibo. No recrearlos, renumerarlos ni insertar movimientos para “sincronizarlos”.
5. Probar instalación limpia, upgrade desde versión previa con filas reales ficticias, rollback de migración fallida y no alteración de cantidades/orígenes existentes. Down con datos aceptados requiere estrategia de conservación, no borrar historia para hacer verde.

A usa harvest.sync_receipts y el permiso existente prelot:create, sin ampliar roles/concesiones. Conserva esquema/contrato online: nuevo puerto interno record comparte UoW sin otra transacción. El recibo completo queda almacenado inmutable; replay no reconstruye una respuesta cambiante. Idempotency-Key es la identidad sync, distinta de la clave aleatoria interna del alta online para impedir colisiones entre protocolos. Scope organización/captura con dueño inmutable. Bloqueo identidad→revalidación sesión/rol actual→asignación→recibo/alta, comprobando expiración después de la espera; sesiones y asignaciones se protegen con bloqueos hasta commit. Límite propio60 PUT/minuto por IP, con Retry-After, sin cambiar rutas anteriores ni afirmar límites compartidos entre instancias. Down con recibos se bloquea para conservar hechos.

## Pantallas propuestas

- Inicio/identidad: último login/catálogo, modo local, owner; autenticación online/revalidación, ningún login ficticio offline.
- Captura: parcela previamente descargada, fecha/hora con zona visible, cantidad/unidad; guardar local y confirmar cola como acciones claras.
- Pendientes: número por estado, última tentativa, reintentar/abrir error, aviso de incertidumbre; contenido no cambia al reintentar.
- Conflicto: ID, dato local y respuesta mínima autorizada, razón comprensible; gestionar con responsable. Prohibido resolver sobreescribiendo origen/cantidad remota.
- Detalle sincronizado: ID local estable y preLotId servidor, fecha de aceptación; local/servidor claramente diferenciados.
- Cambio de cuenta/logout: conteo de pendientes del propietario, retención/bloqueo según O9; no enviar con otra identidad.

## Aceptación y pruebas propuestas

| ID | Prueba / resultado requerido |
| --- | --- |
| OF-01 | Tres capturas sin red (37.125 kg, 25.500 kg y 12 unidades); confirmar localmente, matar proceso y reiniciar dispositivo: mismos IDs/cuerpos/estados, unidades sin conversión |
| OF-02 | Fallo/disco lleno al commit local: ninguna confirmación falsa; captura/outbox nunca quedan a medias |
| OF-03 | Migración local con filas pendientes y cierre durante migración: conserva hechos o rollback seguro, sin vaciar DB |
| OF-04 | Primera sync y replay idéntico: una cosecha, un pre-lote, un recibo y una auditoría; IDs idénticos |
| OF-05 | Servidor confirma y se pierde respuesta; reiniciar app antes del ACK local: replay con mismo ID, sin duplicación |
| OF-06 | Dos workers/reintentos concurrentes y dos dispositivos con mismo ID/cuerpo: un único resultado; conexión recuperada no genera ID nuevo |
| OF-07 | Mismo ID con 37.125 vs 38.000, otra parcela/unidad/fecha: 409, original intacto y conflicto persistido localmente |
| OF-08 | Cuenta inactiva/asignación revocada/sesión vencida durante desconexión: servidor rechaza según caso antes de replay, cola retenida y visible solo a su dueño |
| OF-09 | Otro actor/organización y login B con cola A: sin acceso ni envío bajo B; no filtrar recibos ajenos |
| OF-10 | 429/Retry-After, 503, timeout, corte y red intermitente: backoff acotado, sin bucle infinito, misma intención conservada tras reinicio |
| OF-11 | Respuesta inválida/ID no coincide: no marcar synced; error visible y recuperación sin perder cuerpo |
| OF-12 | Fallo real en cosecha/pre-lote/recibo/evento si existe/auditoría: ninguna aceptación parcial ni clave consumida; replay posterior correcto |
| OF-13 | Draft editable y pendiente congelado; uncertain no se edita ni se clona automáticamente; sincronizado no se sobrescribe |
| OF-14 | Cliente fuerza catálogo vencido, futuro o precisión inválida: servidor valida actual, no inventa correcciones ni cantidad |
| OF-15 | UI accesible/móvil: distinguir local/pendiente/servidor, recuperación de error y no pérdida al navegar; prueba sobre Flutter Android si O1=A |
| OF-16 | Upgrade PostgreSQL desde esquema anterior con históricos sin IDs locales: conserva identidad/cantidad y no crea recibos/movimientos inventados |

Pruebas futuras: Dart unit/widget, integración SQLite real con migraciones/fallo/reinicio; PostgreSQL/HTTP con barreras y fallos reales; E2E en emulador/dispositivo con modo avión y pérdida de respuesta. CI con emulador es evidencia automatizada, no instalación demostrada en un dispositivo de campo ni CD. Medir EQ-02 únicamente tras acordar entorno/carga; no prometer ≤60 s sin medición.

Comandos **previstos**, condicionados a crear el proyecto/decidir dependencias: flutter pub get; flutter analyze; flutter test; flutter test integration_test/offline_sync_test.dart -d <dispositivo>. Hoy no son ejecutables porque el cliente no existe. Los checks actuales npm.cmd run check, npm.cmd test y npm.cmd run test:integration verifican el corte vigente, no acreditan OF-01–16.

## Entrega para decisión

Responder O1–O10 o indicar cambios concretos. Recomendación: Flutter Android + SQLite, identidad local estable mapeada al UUID servidor, sync secuencial en primer plano, sesión segura vigente al sincronizar y resolución manual sin sobreescritura. Definir retención/catálogo/logout antes de implementar. No se sustituyen tecnologías, crean migraciones/endpoints ni reglas offline hasta esa respuesta.
## Revisión de decisiones O1–O10 — 2026-11-17

Cuadro de dependencia inicial; la propuesta concreta posterior lo precisa y sustituye cualquier plazo/contador anterior.

Siguen **sin adoptar ni implementar**. La columna de dependencia indica qué se puede reutilizar y qué falta; no convierte una recomendación en autorización.

| ID / pregunta para decidir | Recomendación | Consecuencia | Dependencia con lo implementado |
| --- | --- | --- | --- |
| O1 ¿Mantener Flutter solo Android, Android+iOS o proponer PWA? | Mantener Flutter y comenzar Android; iOS diferido | Hay que crear la app; PWA sería una sustitución que necesita decisión expresa y ADR | Backend REST y web React existen; no hay cliente Flutter/Android versionado. La web no cubre RF-03/DA01 |
| O2 ¿Qué almacenamiento conservará capturas y cola tras reinicio? | SQLite privada, captura/outbox en una transacción; sesión en almacén seguro del SO | Guardado durable y migraciones locales; no prometer supervivencia a desinstalación | PostgreSQL conserva datos remotos; no existe DB local ni outbox. useRef de la web se pierde al cerrar |
| O3 ¿ID local mapeado al UUID servidor o ID final elegido por cliente? | UUID local desde primer guardado, estable, mapeado al preLotId servidor | Conservar dos IDs; mismo ID/cuerpo devuelve el mismo resultado; otro contenido→409 | H genera UUID servidor y tiene idempotencia por actor/clave; falta recibo/contrato sync, sin renumerar históricos |
| O4 ¿Sincronizar en primer plano o también en segundo plano? | Botón y apertura/recuperación de app, secuencial en primer plano | No se promete envío con la app cerrada; la cola sí persiste | Hay API online; no hay worker móvil ni política de ejecución/batería Android |
| O5 ¿Qué identidad/catálogo permite guardar sin red y cuánto se conserva? | Primera autenticación/descarga online, perfil conocido y fecha de catálogo visible; confirmar retención/validez | Guardar local no garantiza autorización remota; catálogo obsoleto puede bloquear sync | S valida sesión y P asignación al operar; aún faltan caché local y política de retención. No se adopta un plazo por omisión |
| O6 ¿Reutilizar cookie+CSRF o introducir token/refresh móvil? | Cookie+CSRF en jar nativo seguro y login al vencer, sin guardar contraseña | Probar persistencia/expiración/logout/HTTPS y Origin; no relajar controles web | Sesiones/cookies/CSRF/Origin existen; falta el adaptador nativo. Tokens requerirían otro contrato/ADR |
| O7 ¿Cuándo se edita, corrige o sustituye una captura? | Solo draft editable; confirmar congela ID/cuerpo; tras intento no crear sustituto en el incremento inicial | Respuesta perdida deja uncertain; conservar y gestionar sin sobrescribir ni clonar. Autorizar sustitutos exige decidir reconciliación/cierre seguro del ID | Alta online es inmutable y replay con distinto contenido da conflicto; no hay protocolo de sustitución ni corrección remota |
| O8 ¿Petición individual o batch y qué política de reintento? | Un registro/petición, secuencia y backoff propuesto con jitter/Retry-After; pausar tras fallos y mostrar acción | Reintentar conserva intención; nunca borrar datos por alcanzar el límite. Los tiempos y umbral del cuadro anterior requieren respuesta | Existe idempotencia online y límites HTTP; no hay scheduler durable ni recibos sync. No desactivar límites para sincronizar |
| O9 ¿Qué pasa con pendientes al salir o cambiar de usuario? | Conservarlos aislados por organización/actor y bloquearlos hasta volver con el mismo usuario | B no envía ni ve la cola de A; borrado explícito advertido, retención pendiente | Backend separa organizaciones/actores; el almacenamiento local y su política de borrado no existen |
| O10 ¿Qué catálogos/unidades y reglas de reloj se permiten offline? | Solo parcelas descargadas asignadas y contrato actual kg/unidad; separar captura/recepción; no corregir reloj en silencio | Parcela nueva offline o tolerancia especial requieren otra decisión; cantidades no se convierten ni redondean | P/H validan parcela, unidades/cantidad y fecha en servidor; falta catálogo local y manejo de rechazo al sincronizar |

## Verificación real y preparación para Android

Revisión del árbol versionado en f8b386f: **sin pubspec.yaml, .dart ni proyecto Android/iOS**. Get-Command flutter,adb,emulator no encontró ejecutables en PATH de esta sesión; esto no prueba que no haya un SDK fuera de PATH. No se ejecutó flutter doctor, compilación, emulador ni prueba Android. No se instaló software ni se creó un proyecto.

Para poder probar RF-03/DA01 en Android, después de responder las decisiones:

1. Preparar Flutter SDK en PATH, Android SDK/herramientas y un emulador o dispositivo; validar toolchain/dispositivo. La aceptación de licencias corresponde a quien configure ese entorno. [Configuración oficial Android](https://docs.flutter.dev/platform-integration/android/setup).
2. Crear el cliente Flutter y desarrollar captura/SQLite/outbox, autenticación segura y sincronizador, junto con el contrato/recibo transaccional backend. La API online actual no resuelve por sí sola pérdida de respuesta tras reinicio.
3. Crear pruebas Dart/widget y de integración en Android. [Guía oficial de integración](https://docs.flutter.dev/testing/integration-tests). Reutilizar en backend las pruebas de ámbito/idempotencia/rollback, ampliándolas al nuevo contrato.
4. Demostrar modo avión, guardado local, cierre forzado/reinicio, recuperación de red y respuesta perdida; contrastar IDs y conteos en PostgreSQL. Probar también rechazo por revocación/conflicto y cola aislada al cambiar cuenta, sin duplicados ni pérdida.

Comandos de comprobación **previstos, no ejecutados**, una vez exista el proyecto/SDK y dispositivo:

~~~powershell
flutter doctor -v
flutter devices
# Desde el proyecto Flutter que se decida crear:
flutter pub get
flutter analyze
flutter test
flutter test integration_test/offline_sync_test.dart -d <android-id>
~~~

El último archivo es un nombre de prueba propuesto y aún no existe. No se atribuye a Android la ejecución E2E Chromium actual. Registrar versión de app/SHA, Android/dispositivo, dataset, pasos y resultados cuando se ejecute. No sustituir la app por web offline ni afirmar cumplimiento RF-03/DA01 por haber escrito esta especificación.
## Propuesta concreta para aprobar O1–O10 — 2026-11-17

**Estado: propuesta académica pendiente de aprobación; nada implementado.** Esta sección concreta y actualiza las recomendaciones anteriores. Los plazos/reintentos son opciones del prototipo, no requisitos docentes o agrícolas. Se recomienda aprobar el paquete A siguiente, con las salvedades O5/O6/O7 descritas.

Supuestos: datos ficticios, dispositivo Android de prueba con bloqueo del SO y sin root, primera preparación online; API propia HTTPS, actor/organización fijos por perfil. No se pretende administrar permisos remotamente mientras el dispositivo está desconectado. No hay Flutter/SQLite/outbox/adaptador nativo/endpoint sync en el repositorio actual.

| Decisión | Opción A recomendada para aprobar | Alternativa y consecuencia |
| --- | --- | --- |
| O1 Cliente | Flutter Android primero; conservar web React operativa; iOS diferido | Android+iOS aumenta preparación/pruebas; PWA requiere sustitución expresa y ADR, no se adopta implícitamente |
| O2 Persistencia | SQLite privada de app: captura + outbox en una transacción; IDs y cuerpo congelados al confirmar; credenciales fuera de SQLite en almacenamiento seguro nativo | Otra DB exige probar transacciones/migraciones/reinicio equivalentes. No usar memoria/preferencias como cola |
| O3 Identidad | UUID local desde el primer guardado; clave efectiva organización/captureId y dueño actor inmutable; mapping a UUID servidor | UUID final elegido por cliente exige otra evolución de identidad. No renumerar históricos |
| O4 Ejecución | Sync manual y al abrir/recuperar app; un worker y una petición a la vez, solo en primer plano | Segundo plano necesita política Android/batería y pruebas adicionales. No se promete envío con app cerrada |
| O5 Habilitación local | 24 h desde última validación online exitosa de identidad + catálogo; solo los campos enumerados abajo; bloquear nuevas confirmaciones al vencer o perder continuidad del reloj | Exigir sesión servidor aún vigente limita a 8 h; permitir nuevas capturas tras reiniciar dispositivo sin red requiere otra política de tiempo menos estricta, explícita |
| O6 Sesión | Conservar cookie de sesión de 8 h y CSRF existentes mediante jar nativo explícito/seguro, sin refresh token ni guardar contraseña; prueba NA-01–08 antes de integrar móvil | Token/refresh es otro diseño de autenticación y necesita ADR/endpoints y revisión propios |
| O7 Contenido/reconciliación | Editar solo draft; al confirmar, ID y cuerpo inmutables. Repetir la misma operación para reconciliar; ningún sustituto tras un intento en el primer incremento | Sustituir una captura exige cierre/tombstone transaccional del ID original en servidor y contrato de corrección; se difiere |
| O8 Reintentos | Un envío inicial + hasta cinco reintentos automáticos a 2/4/8/16/30 s, jitter 0–20 %, respetando Retry-After; después pausa visible | Batch/segundo plano más complejo. Un reintento manual reinicia el ciclo de espera, no el ID/cuerpo ni el historial de intentos |
| O9 Cuentas y retención | Espacio SQLite separado por organización/actor; logout bloquea el espacio y borra credenciales, conserva pendientes sin vencimiento automático; reabrir tras login online del mismo propietario | Borrar al salir puede perder hechos no enviados; no se recomienda. Cifrado completo de DB requiere seleccionar/verificar implementación antes de afirmar esa garantía |
| O10 Catálogo/datos | Solo parcelas descargadas asignadas, kg/unidad y precisión actual; capturadoEn y recibidoEn separados; no corregir reloj ni convertir cantidades | Nuevas parcelas/unidades/tolerancias offline requieren otras reglas. El servidor valida sus datos y permisos vigentes |

### O5 — datos, 24 horas y revocación

Datos capturables: parcela UUID descargada, fecha/hora de cosecha con zona, cantidad decimal positiva como texto y unidad kg o unidad. El cliente añade captureId, schemaVersion, capturedAtDevice y dueño local (organización/actor conocidos). Los IDs de dueño no se aceptan como identidad enviada por el cliente al servidor. No se capturan contactos, finanzas, credenciales, notas privadas libres, transporte, Calidad ni inventario. No se crean parcelas/productores nuevos offline.

La ventana de **24 h habilita confirmar nuevas capturas locales**, no autoriza escrituras remotas ni prueba autorización en la fecha de cosecha. Se inicia después de autenticar online y terminar la descarga válida de parcelas asignadas. Solo un nuevo ciclo online completo la renueva; guardar, reintentar o reabrir app no la prolonga. La sesión servidor sigue caducando a las 8 h: entre las horas 8 y 24 puede guardarse localmente si sigue vigente la ventana, pero sincronizar requiere una nueva sesión válida.

Propuesta conservadora de tiempo: registrar tiempo servidor de referencia, contador monotónico Android elapsedRealtime y marcador fiable del mismo arranque. elapsedRealtime incluye suspensión; no usar Stopwatch de proceso ni uptimeMillis para prolongar la ventana al dormir. [Referencia Android](https://developer.android.com/reference/android/os/SystemClock). Reabrir la app conserva el contador/deadline si se acredita el mismo arranque. Si el dispositivo se reinicia, el marcador no es fiable o no puede verificarse continuidad, exigir validación online **antes de confirmar nuevas capturas**; no inventar tiempo transcurrido con el reloj de pared. Cambiar la fecha del SO no renueva derechos.

**Límite que requiere aprobación expresa de O5:** tras reiniciar el teléfono sin red, se conservan y pueden consultarse los registros previos del perfil activo desbloqueado, pero no se confirman capturas nuevas hasta revalidar online. La persistencia tras reinicio sí debe probarse; esta política no demuestra toda la disponibilidad offline deseable para campo. Alternativa: permitir captura tras reboot con hora local y marca “tiempo no verificado”; esa alternativa aumenta incertidumbre y no se adopta sin respuesta.

Al vencer la ventana, conservar capturas/cola; no borrar ni mutar cuerpo, no cancelar envíos inciertos. El perfil activo puede leer lo propio con bloqueo del dispositivo; crear/editar/confirmar nuevas capturas queda bloqueado hasta revalidación. Logout/cambio de cuenta aplica además el bloqueo de O9.

Una revocación remota no puede conocerse instantáneamente sin conexión. Durante esa desconexión podría haber capturas locales dentro de la ventana; no se afirma que estén autorizadas en servidor. Al sincronizar se revalidan usuario activo, sesión, permiso y asignación actual antes de consultar replay/crear hechos:
- 403/404 de ámbito: bloquear esa captura y deshabilitar localmente la parcela afectada hasta refresco autorizado, sin revelar datos ajenos ni eliminarla.
- 401: suspender sync y requerir login del mismo actor; una respuesta 401 recibida también suspende nuevas confirmaciones locales hasta revalidación, sin interpretar su causa como prueba específica de revocación.
- Permiso revocado incluso tras un intento aceptado con respuesta perdida: no saltarse la autorización para recuperar el recibo; conservar uncertain/forbidden y escalar, sin clonar.
- Permiso restaurado: volver a intentar con idénticos ID/cuerpo bajo el mismo actor. Nadie recibe permiso por la antigüedad de la captura.

### O6 — adaptador nativo de cookie/CSRF y sesión de 8 h

Contrato actual comprobado en server/http.js y access/application.js: POST /api/v1/auth/login devuelve usuario y csrfToken, y Set-Cookie session; cookie HttpOnly, SameSite=Strict, Path=/api/v1, Max-Age=8 h, Secure en producción. GET /api/v1/auth/me exige sesión y devuelve identidad/CSRF; mutaciones posteriores exigen X-CSRF-Token. Logout elimina sesión servidor. No existe refresh token ni renovación deslizante por llamar me.

Adaptador propuesto, sin implementarlo:
1. API_BASE_URL HTTPS fija por entorno, host permitido único; evitar URLs arbitrarias/QR como destinos de sesión. Usar cliente HTTP nativo tras interfaz, por ejemplo package:http/IOClient con jar explícito. No asumir que una instancia HTTP o el navegador embebido persisten correctamente las cookies. [API Dart](https://api.dart.dev/dart-io/HttpClient-class.html).
2. Procesar Set-Cookie con parser probado; respetar host-only/dominio, path, Secure y caducidad. Credencial persistida de forma segura con protección Android Keystore, nunca contraseña, preferencias simples, SQLite de negocio, logs o URLs. Keystore protege claves; no se atribuye automáticamente cifrado completo de la DB. [Android Keystore](https://developer.android.com/privacy-and-security/keystore).
3. Antes de sync y después de reabrir con red, recuperar sesión desde almacén seguro y ejecutar me. Validar que actor/organización coinciden con dueño de la cola. CSRF solo en memoria, recuperado por login/me; enviar Cookie + X-CSRF-Token en cada mutación, y Origin igual al APP_ORIGIN configurado. El backend hoy tolera ausencia de Origin, pero el adaptador propuesto lo enviará explícitamente. No tratar Origin como autorización ni depender de SameSite del navegador en Android.
4. No seguir redirecciones autenticadas hacia otro origen ni enviar cookie/CSRF fuera de API_BASE_URL, fuera de Path o por HTTP. Rechazar TLS inválido; no instalar callbacks que acepten todos los certificados ni desactivar Origin/CSRF/CORS. La prueba requiere HTTPS válido del entorno de pruebas. [Comunicaciones Android](https://developer.android.com/privacy-and-security/risks/cleartext-communications).
5. Al cumplir 8 h, o recibir 401 antes, eliminar credencial local inválida y pausar sync; no borrar pendientes. Reautenticar online al mismo propietario y obtener nueva cookie/CSRF. No alargar la sesión usando la ventana local O5.
6. CSRF_REJECTED: permitir un me y un reintento con CSRF actual, misma operación/ID/cuerpo; si vuelve a fallar, bloquear y mostrar error. ORIGIN_REJECTED es error de configuración, no se corrige retirando controles. 403/404 de permisos no se resuelven reautenticando en bucle.

**Prueba pequeña propuesta NA-01–08, todavía no ejecutada.** No existe cliente Flutter ni SDK/herramientas disponibles en PATH. Diseñar/ejecutar este smoke tras aprobar O6, antes de implementar toda la cola; no se presenta una prueba Node/Chromium como prueba nativa. Archivo futuro integration_test/native_session_smoke_test.dart, datos ficticios y API HTTPS aislada:

| Caso | Acción | Resultado esperado |
| --- | --- | --- |
| NA-01 | Login nativo y me con cookie recuperada | Mismo actor/org; flags de cookie y CSRF válidos; ningún secreto registrado |
| NA-02 | POST logout con CSRF ausente/erróneo; luego me | 403 y sesión sigue activa; demuestra que no se desactiva CSRF para Android |
| NA-03 | Cerrar proceso, reabrir antes de expirar, restaurar jar y llamar me | Mismo actor/org, CSRF recuperado; no usa una contraseña persistida |
| NA-04 | Forzar expiración solo mediante fixture en DB desechable del servidor; me y nuevo login | 401; cola simulada preservada; nueva sesión del mismo actor, sin refresco ficticio ni esperar 8 h |
| NA-05 | Logout correcto con CSRF; volver a usar la cookie anterior contra me | 204 y después 401; almacén local sin credencial |
| NA-06 | Redirección/URL ajena, /q y /api/public/v1, o intento HTTP | Cookie/CSRF no salen del origen/path permitido; HTTP/TLS inválido rechazados |
| NA-07 | Login B con recibos/cola simulada A y callback tardío A | No monta ni envía cola A con cookie B; callback se liga a A, sin contaminar B |
| NA-08 | Error de red tras una petición y expiración/reinicio | Estado incierto retenido; no cambia la identidad de la operación al obtener sesión nueva |

Fixture de expiración solo para test, sin reducir TTL/configuración productiva ni modificar reloj del SO. La cola de NA se simula; el test no acredita todavía persistencia/outbox offline completa. Comando previsto, no ejecutado: flutter test integration_test/native_session_smoke_test.dart -d <android-id>. Debe registrarse versión/SHA, dispositivo/Android, resultados y ausencia de fuga de credenciales; si falla, O6 no está técnicamente validada para integrar móvil.

### O7/O8 — reconciliación y reintentos sin duplicar

1. Guardar draft con UUID estable. Confirmar normaliza y congela schemaVersion/parcelId/harvestedAt/quantity/unit, dueño y captureId dentro de la transacción captura/outbox. Encabezados de sesión/CSRF cambian al reautenticar; **no forman parte del contenido de negocio** ni cambian su hash.
2. Primer envío usa PUT /api/v1/sync/pre-lots/{captureId} e Idempotency-Key=captureId. Endpoint **propuesto, no existente**. Contrato servidor: permiso actual → bloqueo por identidad → recibo; mismo cuerpo canónico produce 200 con mismos IDs/acceptedAt, primera aceptación 201, distinto cuerpo 409. Alta cosecha/pre-lote, recibo y auditoría comparten transacción; si existe evento crítico también participa, sin éxito parcial.
3. Corte/timeout/5xx/ACK malformado o proceso muerto antes de persistir ACK → uncertain. Servidor pudo confirmar. No declarar “no guardado”, borrar intención, regenerar UUID ni editar payload. Al reiniciar, sending sin ACK se recupera como uncertain.
4. Con red/sesión válida del mismo dueño, repetir **el mismo PUT** para consultar/reconciliar por idempotencia, sin necesitar un GET nuevo que confunda ausencia con una operación aún en vuelo. Validar captureId, payload canónico e IDs de la respuesta antes de commit local synced + mapping.
5. Dos requests concurrentes del mismo ID/cuerpo deben serializarse en DB y obtener un único resultado; la exclusión local es ayuda, no la garantía de servidor. Prueba de pérdida de respuesta: servidor confirma, cliente no recibe, reinicia y reenvía; contar exactamente una cosecha/pre-lote/recibo/audit.
6. Mismo ID con contenido distinto → conflict, conservar original y respuesta mínima autorizada; no last-write-wins. Un 400/401/403 de un intento posterior no prueba que el anterior nunca se aceptó. En este incremento no se permite sustituir una operación ya intentada; resolución manual significa revisar/escalar, no crear otra captura equivalente con ID nuevo. Un contrato futuro de corrección/cierre sería otra decisión.
7. Planificar cinco reintentos automáticos tras el envío inicial: 2/4/8/16/30 s más jitter 0–20 %. Son **seis intentos como máximo por ciclo**. Si Retry-After es mayor, esperar ese plazo sin truncarlo a 30 s. Después del quinto reintento fallido: pausa visible y botón de reintento, nunca pérdida de la fila.
8. Persistir estado, contador total, ciclo, nextAttemptAt y cuerpo. Reiniciar app no reinicia el contador ni el ID. Un reintento manual puede abrir otro ciclo de espera con el mismo ID/cuerpo; conservar historial. Tras reboot o tiempo incierto, no acelerar un Retry-After; esperar/revalidar online y reconciliar.
9. 401→auth_required; 403/404→forbidden y pausa; 409→conflict sin bucle; 400/422→validation_error conservado; 429→espera; timeout/5xx→uncertain/retry_wait. No hay reemplazo automático de capturas bloqueadas. Las peticiones se mantienen de una en una en primer plano.

Ejemplo ficticio: ID X, 37.125 kg, respuesta perdida. Reenviar X+37.125 obtiene el preLotId original. X+38.000 da 409 y no altera 37.125. Y+37.125 no es “reintento”; el cliente tiene prohibido generarlo para resolver incertidumbre de X.

### O9 — aislamiento, logout y cambio de cuenta

- Montar un espacio SQLite privado por (organizationId, actorId), con owner también en filas/outbox/recibos; ninguna consulta, contador visible, worker o caché UI reutiliza el espacio de A al entrar B. La coincidencia del owner se verifica con me/login antes de sync.
- Al salir: bloquear primero el perfil local y detener nuevos envíos; invalidar la generación de sesión del worker. Si hay red, intentar logout con cookie/CSRF; limpiar jar persistido y CSRF de memoria. Si no hay red, el cierre es local: no se afirma revocación inmediata en servidor; su sesión caduca a las 8 h. No persistir un token solo para enviarlo más tarde.
- Una petición en vuelo puede haber llegado al servidor. Cancelarla localmente no revierte commit: su intención queda uncertain y ligada a A. Un callback tardío solo puede persistir su ACK en el espacio A bajo lock/transacción; nunca actualizar B ni disparar nuevos envíos. Si el almacén A ya está cerrado, conservar uncertain y reconciliar al volver A.
- Cerrar sesión/cambiar cuenta **no borra** capturas pendientes. No hay vencimiento automático de la cola; caducar O5/O6 no caduca los hechos guardados. Un borrado explícito requiere al mismo propietario autenticado y advertencia con cantidad de pendientes; enviar/uncertain no se muestra como cancelación de hechos remotos.
- Después de logout, ni leer ni enviar el espacio A se habilita solo por conocer un ID o desbloquear el teléfono: A debe volver a autenticarse online. B no recibe permiso aunque use el mismo dispositivo. El perfil todavía activo sin logout puede leer sus propios datos tras reiniciar/desbloquear el dispositivo, aunque su ventana de nuevas capturas haya vencido.
- Datos ficticios y mínimos; SQLite privada no se describe como cifrado completo. Credenciales se protegen en almacén nativo/Keystore; si se requiere cifrar toda la DB o usar datos personales reales, seleccionar y probar ese mecanismo antes de ampliar el alcance. No se afirma protección frente a root/modificación de la app.

### Aceptación propuesta y respuesta requerida

Añadir a OF-01–16: límite 24 h exacto con suspensión/reinicio de app; reboot sin red conserva filas pero bloquea nueva confirmación; revocación durante desconexión y antes de replay; seis intentos/ciclo y Retry-After; logout offline sin falsa revocación remota; A→B con ACK tardío; NA-01–08 reales en Android. Ninguna de estas pruebas se declara ejecutada.

Respuesta para adoptar: aprobar O1=A … O10=A **incluyendo explícitamente** O5 (24 h y bloqueo de nuevas capturas tras reboot sin validación online), O6 (smoke nativo como condición antes de integración), O7 (sin sustitución tras intento) y O9 (retención sin autoexpiración, login online del propietario tras logout), o indicar qué alternativa cambiar. La aceptación sigue siendo académica; no hay aprobación docente/agrícola inferida. Para seguridad/CI, consultar el [estado posterior de reactivación](../05-sprint01/reactivacion-demo-C.md): retirada de la advisory documentada el18nov no equivale a parche ni a verify remoto aprobado.

**Revisión del 18nov tras recuperación:** O1–O10 continúan propuestas completas de la sección final, sin aprobación por silencio ni implementación. `git ls-files` no encuentra `pubspec.yaml`, archivos Dart o cliente Android versionados. No se ejecutó el SDK señalado por Kaspersky ni se retoma su preparación. Hay que disponer de herramientas de procedencia verificable y ejecutar NA-01–08 realmente en Android antes de validar O6; Chrome/Node no sustituyen esa prueba. La ventana24h es supuesto académico; guardar localmente no es aceptación del servidor. Revalidar sesión/permisos/asignación al sincronizar, conservar filas tras reinicio y aislar propietario, mantener ID/cuerpo tras respuesta perdida y conservar registros al agotar cinco reintentos. Sin offline nuevo, cambio a PWA o instalación de SDK.
