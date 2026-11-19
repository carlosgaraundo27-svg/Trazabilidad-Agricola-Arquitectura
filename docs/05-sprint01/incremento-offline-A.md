# Incremento A — servidor de recibos de cosecha

**Revisión posterior:** [A revisado y recomendaciones de dígitos atendidas](revision-offline-A.md), [CHECK/restauración revalidados y límites de procedencia/ACL](revision-respaldo-check.md). Estos documentos prevalecen sobre los estados históricos de respaldo y los avisos nuevos pendientes de abajo. Consultar CI/Sonar del HEAD final publicado, no trasladar el verde de ce9c3f6.

**Actualización posterior a publicación manual:** [PR #8 abierto](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/8), cabeza ce9c3f6, base feat/inventario-despacho-entrega/dd18ced. Verify/Compose/Sonar de ambos SHA aprobados; dos avisos nuevos de A y20/nueveDDL de #7 permanecen documentados. [Estado por SHA, respaldo inconsistente y límites](publicacion-inventario-offline-A.md), [preparación B sin SDK](preparacion-offline-B.md). Los estados de publicación bloqueada y respaldo no encontrado inferiores son históricos; el respaldo encontrado aún no se acepta porque matchesSnapshot=false.

2026-11-19. Prototipo académico autorizado solo para servidor/contrato/pruebas, sin aprobación docente ni validación agrícola. Rama `feat/offline-servidor-recibos`, base **dd18ced**, dependiente del PR #7. [Plan A–D](../03-diseno-de-software/10-plan-incrementos-offline.md), [especificación](../03-diseno-de-software/08-especificacion-offline-cosecha.md), [OpenAPI](../03-diseno-de-software/openapi.json). B–D no implementados. No se ejecutó Flutter/Dart ni se alteró antivirus. D: pospuesto, kit conservado intacto.

Código guardado en **d282d1b** (canonización) y **25a2a81a8b34ae769f18ed030635f8ef16d21ca8** (servidor/contrato/pruebas); cambios posteriores de esta rama son evidencia y continuidad. [Resumen verificable sin secretos](evidence/offline-A-20261119/resultado.json). No se publicó esta rama ni tiene checks remotos.

## Implementado y límites

PUT `/api/v1/sync/pre-lots/{clientCaptureId}` con UUID estable, Idempotency-Key igual, body v1 estricto y canonización de fecha/UUID/decimal por texto. 201 inicial, 200 replay con mismos hechos/IDs/acceptedAt, 409 ante otro contenido/dueño sin revelar recibos ajenos. Sesión/usuario activo/rol actual y parcela asignada se revalidan dentro de la UoW, **después de esperar el bloqueo de identidad** y antes de consultar recibo. Bloqueos y FK protegen ámbito, dueño y origen. Alta, auditoría y recibo se confirman juntos; error revierte todos. No se abre una transacción anidada ni se cambia el endpoint online.

008 añade recibos inmutables, sin backfill ni TTL. FK compuesta requiere índice UNIQUE adicional en pre-lotes: puede tomar bloqueos durante upgrade; probar/plantear ventana antes de aplicarlo a un entorno con escrituras. Down con recibos devuelve55000 y conserva datos; nunca usarlo para borrar capturas. Las filas históricas quedan sin identidad sync. La respuesta permitida no incluye actor/org/transporte/credenciales. Cuota60 PUT/min/IP en memoria de esta instancia con Retry-After, sin cambiar cuotas existentes ni afirmar escalabilidad.

**No aplicado a la demo** `inventory_demo_20261118_151800`: conserva001–007, cuatro pre-lotes, dos lotes y su ledger. Huellas de todas sus tablas iguales antes/después de los tests; una sola salida/entrega73.125kg. `/health`3026 no estaba disponible al cierre de esta comprobación; no se inició otra aplicación ni se regeneró la demo. Para operarla con su versión previa, usar rama `fix/demo-recuperada-inventario` y [guía C](reactivacion-demo-C.md), sin aplicar008 a esa DB.

## Pruebas actuales

| Evidencia del 19 nov | Resultado / alcance |
| --- | --- |
| Unitarias | **25/25**, incluyendo equivalencias y rechazos de canonización v1 |
| Integración PostgreSQL completa | **128/128** en DB nueva `offline_a_1795100508427`, no demo |
| Nuevas pruebas A incluidas arriba | **15 resultados**: HTTP/SQL, migración y reinicio real de proceso; los113 anteriores también pasan |
| E2E existentes | **17/17**, DB nueva `offline_a_e2e_1795100260052`, puerto3037 y auxiliares propios de tests; no Android |
| Formato/contratos/build | Aprobados; OpenAPI38 rutas, antes37, sin rebajar la comprobación |
| Auditoría completa para publicar dd18ced | Exit0/cero hallazgos; mismo package/lock que A. No es auditoría solo de producción ni parche nuestro |
| Respaldo lógico/restauración demo | **Sin resultado nuevo verificable** en carpeta prevista o compartido por el usuario; sigue pendiente |
| Redis real/Compose y Sonar de A | No reejecutados localmente ni analizados remotamente; no trasladar resultados del SHA anterior |

Las pruebas ejercitan carrera misma identidad/cuerpo y con contenido distinto, permiso/asignación/usuario/rol/sesión revocados, caducidad durante una espera real de lock, aislamiento entre dueños/orgs, cuatro fallos SQL reales, no duplicación de alta/audit/recibo, bloqueo UPDATE/DELETE/TRUNCATE y down destructivo. Un proxy corta la respuesta **después del commit**, el cliente recibe error de red y el PUT idéntico reconcilia sin duplicar. Otra prueba detiene Node por IPC y crea otro proceso (PID diferente), conserva sesión/recibo/IDs/acceptedAt y no repite auditoría. No acredita reinicio de PostgreSQL/Windows ni persistencia Android.

TDD conservado en `.local/incremento-A-20261119/`: dominio/endpoint inicialmente rojos; prueba de expiración durante espera reprodujo aceptación indebida, corregida moviendo revalidación después del lock. Primera suite completa124/125 falló porque el lanzador privado omitía DEMO_PASSWORD ficticia para lifecycle; corregido solo ese entorno, lifecycle enfocado y suites completas posteriores aprobaron. No se cambiaron timeouts/aserciones ni se omitieron tests. Logs/trazas/snapshots/config quedan privados e ignorados; no son dumps ni se suben a GitHub.

## Reproducción sin tocar datos existentes

Preparar una base **nueva y vacía** con nombre diferente, conexión privada a esa base, PostgreSQL18 y Node24/npm del lockfile. No usar DATABASE_URL de la demo ni una base con pendientes. Desde el código A:

```powershell
npm ci --ignore-scripts
npm audit --audit-level=high
npm run check
npm test
# DATABASE_URL debe apuntar a la base nueva, nunca a Inventario/demo.
$env:TEST_ALLOW_DB_WRITE = 'true'
$env:DEMO_PASSWORD = 'Fiction-only-2026!'
npm run test:integration
npm run build
# E2E necesita OTRA base nueva y Chromium verificado; puerto distinto de3026.
# Configurar DATABASE_URL, E2E_PORT y PUBLIC_BASE_URL para ese entorno antes:
npm run test:e2e
```

Los tests aplican migraciones/seeds ficticios solo en la DB indicada. TEST_ALLOW_DB_WRITE no sustituye revisar su identidad: no copiar demo.env a este flujo. Las ejecuciones locales usaron un auxiliar privado que verifica cluster, crea un nombre offline_a_* único y rechaza sobrescrituras. No se eliminan sus bases para fabricar evidencia.

## Publicación y checks remotos

La rama **local** `feat/inventario-despacho-entrega` avanzó22c6e4f→dd18ced mediante comparación y actualización condicional de referencia; conserva19b291d/0256966/dd18ced. `fix/demo-recuperada-inventario` sigue en dd18ced. A nace de ese mismo commit. No se reescribió historial ni se hizo force push. El origin recuperado permanece apuntando al bundle original.

Publicación autorizada intentada, **bloqueada por credenciales Git locales**: Schannel no obtiene credenciales y OpenSSL no puede usar wincredman. No se cambió almacén/configuración ni se recrearon SHA distintos con la API. PR #7 consultado después sigue **abierto, sin fusionar**, remoto **22c6e4f**. Su [verify histórico](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44193301118/job/134428054443) falla en audit antes de tests; [Compose histórico](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44193301118/job/134428054833) aprobó. El audit local actual0 no convierte ese verify en aprobado. No hay CI remoto del commit A local.

Desde PowerShell normal, después de comprobar que remoto no avanzó de forma divergente, publicar los tres commits de #7 con:

```powershell
git -c http.sslBackend=openssl push https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura.git dd18ced:refs/heads/feat/inventario-despacho-entrega
```

TLS sigue validado; sin force ni cambios persistentes. Si rechaza credenciales o avance, conservar salida y revisar; no compartir tokens/contraseñas. Verificar cabeza y verify/Compose/Sonar del SHA publicado antes de declarar verde remoto. A permanece separado; no añadir sus commits al PR #7. Los **20 avisos Sonar/nueve críticos DDL de #7 siguen abiertos**, sin análisis nuevo, supresiones o gates debilitados. [Detalle](revision-pr7.md).

## Flutter y siguiente paso

Fuente previamente registrada: Flutter3.50.0, SHA ab2912035e160d9cad6306df307576da6128ebdb, engine371f77202a73e8dff57a8b3bff75bca55c090aee; preparación parcial, bootstrap no validado. Artefacto Dart3.14.0: [URL exacta oficial registrada](https://storage.googleapis.com/flutter_infra_release/flutter/371f77202a73e8dff57a8b3bff75bca55c090aee/dart-sdk-windows-x64.zip),231471855bytes, SHA256 `2e9d24952e7bda6b9532429f811211d2ac86dd274a212829f1e0916d40ad2f53`. El ZIP actual coincide con ese registro; la recuperación previa comparó MD5 con cabecera oficial. HEAD oficial actual200/longitud coincide y expone solo CRC32C: **no hubo nueva comparación MD5**. Hash local/transferencia no prueba ejecutable benigno ni falso positivo.

`dart.exe` sigue ausente de la ruta señalada; no se accedió/restauró cuarentena ni se ejecutó ningún archivo SDK. Flutter/Dart no encontrados en PATH y directorio Android SDK habitual ausente; no se enumeró dispositivo con adb ni se instaló nada. No hay cliente Flutter versionado ni smoke nativo ejecutado. No reproducir comandos de bootstrap de la guía histórica anterior al incidente.

Siguiente paso: recibir/verificar resultado del respaldo y publicación de #7; comprobar CI de ese SHA. Para B, acordar preparación de herramientas de procedencia verificable tras resolver el incidente y ejecutar NA-01–08 en Android. Hasta entonces, B–D permanecen planificados, sin app SQLite/outbox/worker ni políticas24h implementadas. CI no es CD y no se declara rendimiento medido.
