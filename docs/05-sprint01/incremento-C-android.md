# Incremento C — captura y sincronización operativa

Rama `feat/offline-captura-outbox-sync`, base main0ed299f tras integrar #12→#11→#13 conservando commits. [Contrato aprobado O1–O10](../03-diseno-de-software/13-incremento-C-captura-offline.md), [OpenAPI](../03-diseno-de-software/openapi.json), [C4 actual](../04-modelo-c4/modelo-c4.md). C no se autoriza a fusionar. PR9 sigue borrador documental reconciliado d478986; sus verify/Compose/Sonar aprobaron, sin atribuirle implementación Android.

## Comportamiento

Catálogo completo mínimo de parcelas asignadas, kg/unidad y precisión v1. El servidor revalida sesión/rol/asignaciones; límite técnico1000 sin descargar parcialmente. Borradores incompletos editables, UUID v4 desde primer guardado; al confirmar, validación v1/fecha con zona no futura/catalogación/ventana y captura+outbox en una transacción. No se normaliza silenciosamente una fecha errónea ni se redondean cantidades.

Confirmar significa **guardado local**, no aceptación remota. Solo un recibo validado y persistido permite “Sincronizado”. ID/cuerpo confirmado y recibos son inmutables. Un worker foreground, claim SQLite y lease original; timer/manual/resume no solapan envíos. Contadores/plazos se escriben antes de red; in_flight se recupera como incierto tras abrir. Inicial+5 reintentos2/4/8/16/30s,jitter0–20%,Retry-After mayor íntegro. Agotar pausa, no borra. Manual permite nuevo ciclo del mismo contenido y conserva intentos totales; conflictos409 requieren intervención, no se renumeran.

Cookie8h y ventana24h son independientes. Reloj Android elapsedRealtime/BOOT_COUNT; sin continuidad fiable o tras reboot sin revalidar se bloquean confirmaciones y se conservan datos. Perfil/cookie cifrados en Keystore, CSRF en memoria, ninguna contraseña/cookie en tablas. Expiración local conserva perfil;401 remoto bloquea hasta revalidar. Logout bloquea autoridad, conserva SQLite. Organización/actor determinan cada archivo y callback no reutiliza la base del siguiente usuario. Migración local2 aditiva mantiene el contrato de propietario workspace.schema_version1; PRAGMA user_version2 describe la actualización. No se reescriben001–008 servidor.

## Evidencia realizada en HONOR físico

Flutter3.50.0/Dart3.14.0 oficial independiente, Android16/API36/HONOR X6b Plus, SDK analizado previamente. No emulador/navegador. Solo bases ficticias aisladas; demo001–007 intacta. Resultados actuales del código en esta rama:

| Tipo | Resultado y alcance |
| --- | --- |
| Dart/Widget automatizadas |23 aprobadas: contrato v1, ACK estricto/status/replay, política24h y boot, retry/HTTP Retry-After, migración de perfil cifrado/serialización/guardias, sesión y UI B |
| Node automatizadas |34 unitarias aprobadas; catálogo real PGlite de memoria: ámbito, rol vigente, revocación, mínimo DTO/capacidad sin parcial |
| Android SQLite automatizada |1 caso C aprobado: draft editable/ID estable, confirmación/outbox, claim concurrente único, contador/plazo al reabrir base, seis intentos/ciclo y manual sin cambiar cuerpo |
| Android migración/fallo local inyectado |1 aprobado: base B v1→v2 sin borrar draft, cantidad inválida conservada, trigger de fallo en INSERT outbox revierte también confirmación, Retry-After25h durable tras reabrir sin acelerarlo con botón manual |
| Android + fallo remoto inyectado |1 recorrido aprobado con múltiples aserciones: tres disparadores simultáneos→un envío; conexión cortada después del commit real→incierto→reapertura/controlador nuevo→replay sin duplicar;409 distinto contenido no sobrescribe; expiración401/revalidación; rol403/asignación404 y recuperación explícita; logout/cambio de organización y dos usuarios de la misma organización sin leer/enviar pendientes ajenos |
| Modo avión real + UI Android automatizada |4 fases aprobadas en procesos distintos, conservando datos con --no-uninstall: preparar catálogo; activar modo avión y quitar reverse3043, crear/editar/confirmar mediante formulario; reabrir aún offline y verificar mismo ID/cuerpo pendiente; restaurar modo avión anterior/reverse y sincronizar. Conteo servidor:1 cosecha/1 pre-lote/1 recibo/1 audit y1 envío para esa captura |
| Android proceso nuevo + app completa |2 fases aprobadas: corte postcommit→incierto persistido→otro proceso→replay con2 intentos totales,1 hecho/recibo/audit. Arranque de SessionApp y pausa/resume reales; regresión de callback después de dispose corregida sin retirar aserciones |
| Android regresión B |6 casos afectados aprobados: login/UI/HTTPS/CSRF, expiración, logout sin red, respuesta tardía/cambio de usuario, archivo cifrado corrupto y FK/rollback/aislamiento |
| Análisis estático |flutter analyze sin avisos; comprobador de imports/OpenAPI/enlaces aprobado |

La manipulación de modo avión fue realizada por el agente vía ADB autorizado, verificada como enabled durante captura/reapertura y restaurada a disabled original. No se presenta como prueba manual del propietario. El corte postcommit es del fixture loopback: el servicio real ya había confirmado alta/audit/recibo antes de destruir socket, no se simula aceptación en el cliente.

Fallos previos conservados: el primer inyector no cortaba porque consultaba req.params después de entrar al router; la captura del ID antes de next corrigió el fixture y el caso incierto/replay pasó sin retirar aserciones. La suite histórica A intentada con PGlite aprobó8 subcasos y se detuvo al llegar a la barrera PostgreSQL multiconexión: el adaptador serializado de PGlite no sirve para esa prueba. La app completa también reveló notificación tardía tras dispose; guardia de vida y montaje corrigen la raíz y su regresión nativa pasa. No se modificó/omitió la barrera; la suite completa corresponde a CI PostgreSQL18. No declarar ese intento como suite completa local aprobada.

Límites: ventana24h/reboot del teléfono se verifican con reloj inyectado en Dart y reloj nativo leído; no se reinició físicamente el sistema operativo ni se esperaron24h. Reapertura entre procesos sí se ejecutó en Android. Sin corte de energía, extracción/restauración entre dispositivos, pérdida física de clave, carga/SLA, iOS o ejecución en segundo plano. Firma productiva/aviso DWARF de B siguen pendientes. Checksums y análisis negativos del SDK alternativo no resuelven el incidente anterior de Kaspersky; caso de soporte aún por presentar, CSV ya analizado.

## Retoma y corrección del gate, 2026-11-20

En5fb8e09 verify/Compose aprobaron; Sonar falló **solo** por new_duplicated_lines_density=5,5% frente al máximo3% (19 líneas del cargador de config de fixtures B/C). Fiabilidad, seguridad y mantenibilidad del gate eran A. Se comparte ese cargador sin cambiar origen, certificado, claves o base: creación exclusiva wx y archivo existente/corrupto nunca reemplazado por recuperación silenciosa. Dos regresiones nuevas verifican reutilización exacta, origen/CA ajenos rechazados y corrupción/config inválida conservadas. No se modifica el Quality Gate, las exclusiones ni las pruebas previas.

Se corrigen los cuatro avisos S7723 usando new Error. Se conservan documentados cuatro S9382 menores en tests/android/c-backend-fixture.js: dos awaits al validar rutas de ancestro a hijo antes de cualquier escritura, y dos al crear organizaciones/usuarios en la conexión de una única transacción antes de sus FK dependientes. La ejecución secuencial es intencional; no se paraleliza SQL ni se suprimen hallazgos. Los avisos heredados de main permanecen separados de los nuevos de C.

En la retoma no existían proceso/puerto C ni sesión de ejecución anterior consultable; el estado -1 durante la interrupción no aporta un error/stack de Node. No se acredita una causa interna sin ese registro. Se reinició una sola instancia en el mismo puerto3043/base privada existente y se añadió stdout/stderr privado; arranque limpio y datos conservados. B3042 no estaba activo y no se inicia para este cambio. El helper se verifica para ambas configuraciones sin modificarlas. La app Android no cambia en esta corrección; se repite únicamente la regresión nativa C afectada y se restaura el APK debug normal conservado, sin reinstalar SDK.

Resultado de la corrección: dos regresiones Node nuevas aprobadas y las configuraciones B/C reales conservadas byte a byte; c_sync_test.dart aprobado otra vez en HONOR físico sobre la base existente (20s de recorrido). No se repiten las fases de modo avión, reloj, migración o instalación de herramientas ajenas al cambio. Las23 Dart/Widget y9 fases C/6 regresiones B de la tabla corresponden al núcleo Android previamente probado y conservado; este cambio solo afecta a los fixtures Node. El resultado CI final por SHA se enlaza en [PR14](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/14); un gate verde no cierra los cuatro S9382 justificados.

## Prueba breve del propietario

1. Comprobar que el fixture C existente responde en `https://127.0.0.1:3043`, con reverse3043; no iniciar otro si el puerto está ocupado. Usuario **campo-c@example.test**, contraseña únicamente en `.local/android-c-fixture/credenciales.txt`. No compartirla por chat.
2. En la app de desarrollo, iniciar sesión y esperar el catálogo de1 parcela ficticia. “Nueva captura”: escoger parcela, fecha ISO con Z/offset, cantidad decimal con punto y unidad; “Guardar borrador”. Anotar ID.
3. Para offline estricto con este fixture USB, quitar solo reverse3043 y activar modo avión. Editar el mismo borrador y “Confirmar localmente”. Debe quedar pendiente, contenido congelado y mensaje de que todavía no está aceptado.
4. Cerrar/reabrir sin desinstalar: pendiente/ID/cuerpo deben conservarse. Restaurar modo avión y reverse3043, regresar a primer plano o pulsar “Sincronizar”: esperar “Sincronizado”. No cambiar el ID si hubo error/respuesta perdida.
5. “Cerrar sesión” conserva pendientes. Otro usuario/organización no debe verlos ni enviarlos; volver al dueño exige login online. No usar el endpoint QR para acceder a las capturas.

El fixture3043 y su clave de control solo existen para pruebas loopback y datos ficticios. No se publican CSV, dumps, claves, config, certificados, APK ni evidencias privadas. C es captura/consulta operativa, no ETL o datamart.
