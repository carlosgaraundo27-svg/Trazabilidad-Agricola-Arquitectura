# Propuesta — Captura offline y sincronización de cosecha/pre-lotes

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

| ID | A (recomendada) | B | C / ejemplo y consecuencia |
| --- | --- | --- | --- |
| O1 Cliente y plataforma | Mantener Flutter, empezar Android y contrato reutilizable; iOS diferido | Flutter Android+iOS desde inicio, más infraestructura y pruebas | PWA/web offline: requiere aprobación expresa de sustitución y ADR. Ej.: demostrar 3 capturas tras reiniciar Android; un navegador responsive no acredita esa demo |
| O2 Persistencia local | SQLite privada de app con captura + outbox en una transacción; claves de sesión en almacén seguro del SO | Base embebida no SQL, justificando transacciones/migraciones | No usar memoria/preferencias para la cola. Ej.: 37.125 kg guardados localmente deben sobrevivir cierre forzado |
| O3 Identificación | clientCaptureId UUID generado una vez al primer guardado local y congelado con el cuerpo al confirmar, mapeado a preLotId servidor; conservar ambos | preLotId elegido por cliente como ID final, requiere extender contrato e identidad histórica | A conserva UUID servidor vigente. Dos envíos del mismo captureId producen una cosecha/pre-lote; mismo ID con 38.000 en vez de 37.125 da 409 |
| O4 Cuándo sincronizar | Botón y al abrir/recuperar app con red; reintento secuencial en primer plano | Añadir ejecución periódica en segundo plano y política de batería/red por plataforma | A no promete trabajo con app cerrada. Ej.: 10 pendientes permanecen guardados al apagar; se reanudan al abrir |
| O5 Identidad/asignaciones offline | Primera sesión online y descarga de parcelas; permitir captura local con perfil conocido y desbloqueo del dispositivo, avisando que no es permiso servidor | Exigir sesión aún no vencida para guardar; más restrictivo en jornadas sin red | Definir retención local/validez del catálogo antes de implementar. Recomendación inicial: mostrar fecha de descarga y advertir catálogo vencido, nunca borrar cola ni inferir autorización vigente. Revocado al volver: bloquear sincronización |
| O6 Sesión móvil | Reutilizar sesión cookie + CSRF en jar nativo persistido de forma segura; reautenticación al vencer (sin contraseña guardada) | Nuevo flujo token/refresh por dispositivo con revocación y almacenamiento seguro, requiere ADR/endpoints propios | A reduce cambio de backend; probar HTTPS, cookie, CSRF, logout y expiración real, sin abrir CORS ni desactivar Origin |
| O7 Conflictos/correcciones | Captura editable solo en draft; confirmar congela cuerpo/ID; conflictos se muestran y resuelven manualmente | Editar lo pendiente solo si nunca se intentó; exige control de estado adicional | Nunca last-write-wins para cantidad/origen. Una respuesta perdida impide clonar automáticamente con ID nuevo |
| O8 Reintentos y tamaño | Un registro por petición, secuencial; backoff 1/2/4/8/16/30 s con jitter, respeta Retry-After; botón reintentar | Batch con resultados por elemento y transacciones independientes; más contrato | A: 25.500 y 17.125 son dos altas independientes, sin transacción global ficticia. Tras 5 fallos automáticos pausar y mostrar acción; no borrar registro |
| O9 Datos locales/logout | Espacios por organización/actor; conservar pendientes bloqueados y exigir el mismo usuario al volver; borrado solo explícito con advertencia de pérdida local | Borrar al salir, requiere decisión y confirmación que identifica pendientes no enviados | No enviar cola de A como usuario B. Al cambiar cuenta, ocultar su detalle; DB privada y bloqueo SO no equivalen a cifrado completo |
| O10 Catálogo/límites de jornada | Parcelas asignadas descargadas online; límites de cantidad/unidades iguales al contrato actual; fecha capturada y recibida separadas | Permitir nuevas parcelas offline o futuras tolerancias de reloj, requiere reglas adicionales | Recomendación: no inventar ID de parcela ni corregir reloj silenciosamente; futuro según servidor→validación, conservar dato para resolución |

O5/O9 requieren concretar retención y sensibilidad del dispositivo para el contexto académico antes de escribir código; no se fija un plazo implícito. Recomendación transversal: no admitir primer inicio completamente desconectado sin identidad/catálogo conocido.

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

## Contrato backend propuesto (no registrado en OpenAPI vigente)

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
- 401 AUTH_REQUIRED; 403/404 según convención de ámbito vigente; 400 contrato/esquema; 422 dato no permitido; 429 límite con Retry-After; 503 temporal.
- Timeout/5xx con commit incierto **siempre** se tratan como uncertain y se reintentan con ID/cuerpo idénticos. No deducir “no guardado” de una respuesta ausente.
- Sesión, usuario activo, permiso prelot:create y asignación vigente de parcela **se revalidan antes de replay**, bajo bloqueos de autorización; revocación impide leer la respuesta histórica por esa vía. No confiar en permisos ni reloj descargados.
- Mismo captureId usado por otro actor/organización no da acceso al recurso. Ámbito propuesto: UUID aleatorio generado localmente, unicidad efectiva (organization_id, client_capture_id) y dueño actor inmutable; otra organización no comparte identidad ni recibo; devolución pública de conflicto sin revelar propietario. Cualquier colisión se resuelve manualmente, sin reasignar identidad.

Canonización versionada incluye parcelId, harvestedAt, quantity y unit, más schemaVersion; hash servidor calculado desde objeto canónico propio, nunca confiar en hash enviado. Orden de propiedades/UUID mayúscula/37.1 frente a 37.100 no generan altas distintas: definir equivalencias con ejemplos en pruebas antes de implementar (v1 propone rechazar más de 3 decimales, incluido cero adicional). Nota: cambiar un campo legítimo bajo el mismo ID tras aceptación es conflicto, no “actualización”.

Un GET de recibo podría ayudar a reconciliar, pero no es necesario para A: el PUT repetible devuelve el resultado con permisos vigentes. Proponerlo solo si existe consumidor/caso no cubierto.

## Migraciones servidor y compatibilidad propuestas

Migración **008+ disponible en ese momento**, sin editar 001–007 ni inventar captureId para históricos:

1. Tabla de recibos H (nombre tentativo harvest.sync_receipts), UUID del cliente, dueño/organización, schemaVersion/canonización, hash, cuerpo mínimo, IDs remotos y acceptedAt; FK compuestas, UNIQUE organización/captureId y hechos inmutables.
2. Serializar clave/identidad por transacción; revalidar S/P, consultar recibo. Si coincide, devolver mismos IDs; distinto→409. Primera aceptación crea cosecha/pre-lote, audit y recibo en **una** UoW; fallo de evento/recibo/auditoría revierte todo.
3. Reutilizar caso de uso de H mediante contrato explícito dentro de UoW; no llamar un servicio que abra una transacción anidada independiente. El endpoint online actual conserva contrato/IDs.
4. Registros históricos sin recibo quedan sin recibo. No recrearlos, renumerarlos ni insertar movimientos para “sincronizarlos”.
5. Probar instalación limpia, upgrade desde versión previa con filas reales ficticias, rollback de migración fallida y no alteración de cantidades/orígenes existentes. Down con datos aceptados requiere estrategia de conservación, no borrar historia para hacer verde.

Nombres definitivos y nueva concesión (si se separa de prelot:create) pendientes de O3/O6 y revisión de contrato. No se amplían permisos silenciosamente.

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
