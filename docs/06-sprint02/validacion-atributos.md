# Validación EQ y análisis preparado

Fuente: [siete escenarios Sprint 1](../01-analisis-de-sistema/08-escenarios-atributos-calidad.md). Los valores numéricos mantienen su carácter de **propuestas por validar**. Código del paquete: `addab5f9101a5d6288fb325d1adda395553d967c`. [Resultados ejecutados](reporte-verificacion.md) y [comandos](guia-demostracion.md) separados del plan.

## Escenarios

| ID | Estímulo / entorno y respuesta | Medida / protocolo | Evidencia actual y faltante |
| --- | --- | --- | --- |
| EQ-01 | Consumidores consultan QR publicado bajo concurrencia ficticia; solo DTO aprobado. API, PostgreSQL y Redis dedicados. | Propuesta: p95 ≤2 s y <1 % 5xx, 100 VU durante 10 min. Medir 200 correctos, 429, errores negocio/transporte/5xx, latencia y recursos; comparar caché. | Jest verifica reglas con dobles; no benchmark. k6, planes y Redis reales **pendientes**. |
| EQ-02 | Recolector pierde red, confirma localmente y recupera conexión. | 100 % de registros de prueba una sola vez; 50 pendientes ≤60 s con conexión estable documentada. IDs/hashes y conteos independientes antes/después; diferenciar confirmación local y ACK remoto. | Android previo C/D en PR14; nuevo lote 50/60 s pendiente. 24 h y energía no aprobados. No usar el teléfono actual para preparar el lote. |
| EQ-03 | Operación crítica durante ventana de servicio; caída no confirma escritura inexistente. | Propuesta mensual ≥99,5 %. Acordar endpoints/calendario/sondeo; disponibilidad = tiempo disponible / tiempo elegible; conservar intervalos y faltantes de monitoreo. | Sin ventana mensual ni resultado calculable. Reinicio/rollback de tests no demuestra disponibilidad mensual. |
| EQ-04 | Anónimo o actor sin permiso intenta operación; datos internos no salen por QR. | Propuesta 100 % de negativos rechazados y cero campos sensibles del conjunto revisado. Matriz siguiente; contar casos ejecutados/rechazados, nunca usar total de tests como denominador. | Algunas reglas de revalidación y DTO en Jest aprobadas. Matriz HTTP íntegra pendiente de reejecución externa. |
| EQ-05 | Alteración de hechos cerrados, replay y carreras. | 100 % intentos cerrados del conjunto rechazados; 100 % comandos críticos exitosos con auditoría definida. Comparar cosecha/prelote/recibo/audit y movimientos por separado; inducir fallo de escritura y exigir rollback. | Jest prueba intención y masa con fake; suites reales `api`, `intake`, `quality`, `logistics-sql/rollback`, `harvest-sync` existentes. Contención y reejecución reales pendientes. |
| EQ-06 | Cambio de regla localizado, sin infraestructura en dominio. | Diff por responsabilidad, regresiones aprobadas y revisión de imports. Registrar archivos/razón y límites del chequeo. | Preparación sin cambios en reglas; Jest/node:test/check aprobados. No se simuló un cambio agrícola ni se mide costo futuro de mantenimiento. |
| EQ-07 | Reporte analítico concurrente con transacciones; cargas separadas. | Propuesta p95 ≤3 s y sin incremento de errores sobre umbral a acordar. Dataset/grano/indicadores y baseline transaccional antes de comparar. | **ETL/Datamart no demostrado.** ROP-01 conserva utilidad operativa, pero no sustituye este escenario. Pendiente de alcance docente/implementación. |

## Matriz negativa EQ-04 para laboratorio

| Caso | Entrada / acción | Resultado esperado | Resultado nuevo |
| --- | --- | --- | --- |
| SEC-01 | GET protegido sin cookie | 401, sin filas | Pendiente HTTP |
| SEC-02 | Sesión expirada/inactiva | 401 | Pendiente HTTP |
| SEC-03 | Collector crea productor; admin captura cosecha | 403 en cada caso | Rol puro comprobado en node:test; HTTP pendiente |
| SEC-04 | Actor consulta parcela/recibo de otra organización | 404 en recurso, sin filtración | Pendiente HTTP |
| SEC-05 | Actor solicita listado de centro sin concesión | 403 | Pendiente HTTP |
| SEC-06 | Revocación de origen antes de replay cosecha | 404 y ningún hecho/audit nuevo | Jest fake aprobado; SQL/HTTP pendiente |
| SEC-07 | Escritura con CSRF ausente/ajeno u Origin no permitido | 403 | Pendiente HTTP |
| SEC-08 | Caché contiene campo privado, hash ajeno o JSON corrupto | Solo DTO aprobado desde snapshot | 3 variantes Jest aprobadas; Redis/HTTP pendiente |

Este cuadro no declara 8/8 HTTP: ejecutados nuevos sobre HTTP = 0, resultado HTTP aún no calculable. En Jest las 3 variantes de contaminación se recuperan correctamente; son comportamiento de proyección, no rechazo de autenticación. Enumerar subcasos por separado al ejecutar para que numerador/denominador no cambien por agrupación editorial.

## PostgreSQL: análisis de código y medición prevista

`server/db.js` usa pool `max:10`; eso limita conexiones de una instancia, no demuestra capacidad de servicio. Transacciones incluyen auditoría y locks. `publicationRepository.publicGate` consulta `public_id` (UNIQUE, migración005) con `FOR SHARE` incluso con caché caliente. `snapshot` añade contenido para ID/versión publicada; podría aprovechar el mismo índice. La presencia del índice no demuestra que el plan lo utilice, ni evita espera por un retiro concurrente.

ROP-01 filtra por organización/centro, rango `departed_at`, estado/lote opcionales y cursor `(departed_at,id)`; pagina `limit+1`. El índice existente de despachos ordena `(organization_id,center_id,id)`; **hipótesis**, no cambio aplicado: evaluar si `(organization_id,center_id,departed_at,id)` reduce lectura/sort en cardinalidad significativa. No quitar filtros de ámbito, triggers, locks ni límites de ventana para mejorar una gráfica.

[analyze-postgres.js](../../scripts/sprint02/analyze-postgres.js) captura SQL de repositorios reales y ejecuta tres `EXPLAIN (ANALYZE, BUFFERS, SETTINGS, FORMAT JSON)`: guard público, snapshot y página ROP. Guarda versión, índices, cardinalidad y muestra de conexiones/esperas. Exige marcador y base dedicada; timeouts de sentencia5s/lock1s. `FOR SHARE` necesita transacción escribible, pero las consultas explicadas son SELECT. El plan realmente ejecuta SQL: nunca apuntarlo a la base del ensayo. [Referencia PostgreSQL 18](https://www.postgresql.org/docs/18/using-explain.html).

Dataset inicial: 10 publicaciones generadas con servicios reales más 4 despachos del fixture ROP; puramente ficticio, **no representativo de producción**. Repetir, en bases nuevas vacías, con 100 y 1.000 publicaciones si hay recursos; más publicaciones no convierte 4 despachos en una prueba representativa de analítica. Definir escala y distribución ROP mayor antes de extrapolar. Tras cargar, actualizar estadísticas únicamente en el laboratorio; registrar el comando. La comparación antes/después de cualquier índice requiere mismos datos, parámetros, hardware, cachés y al menos cinco repeticiones; ningún índice nuevo se propone como optimización probada.

Leer del plan: estimadas/reales, loops, filas descartadas, scan/sort, buffers hit/read, temporales, planificación y ejecución. Acompañar con CPU/RAM/disco, latencias y conexiones durante concurrencia; la muestra puntual del script no mide contención sostenida. Tomar `pg_stat_activity`, `pg_locks`/`pg_blocking_pids` y deltas de `pg_stat_database` sin resetear estadísticas compartidas. No publicar consultas/valores fuera de datos ficticios. Sin planes ejecutados no hay tiempos, buffers ni mejora que reportar.

## Redis: comparación reproducible pendiente

[compare-cache.js](../../scripts/sprint02/compare-cache.js) usa caso de uso, repositorio PostgreSQL y adaptador Redis reales; 50 lecturas secuenciales por condición, mismo lote. Cuenta gate/snapshot/SQL y hit/miss/error de GET, conserva muestras y p95. SQL cuenta SELECT del repositorio, no BEGIN/COMMIT. Excluye HTTP y latencia de red del cliente final.

| Condición | Preparación | Comprobación esperada, no resultado medido |
| --- | --- | --- |
| none | `noCache`, sin Redis | 50 guard + 50 snapshots, mismo DTO |
| cold | Borrar **solo** clave del lote antes de cada lectura | 50 miss y 50 snapshots; no usar FLUSHALL. Frío significa clave Redis ausente, no PostgreSQL/disco frío. |
| warm | Redis disponible, una lectura previa fuera de muestra | 50 hits, 50 guard y 0 snapshots; no prometer cero consultas DB. |
| degraded | Detener exclusivamente Redis del Compose externo; confirmar PING fallido | 50 errores GET y 50 snapshots; caída real de ese Redis, no doble ni sustitución por noCache. |

Las aserciones bloquean etiquetar caliente/degradado si no se cumplen sus contadores. El script no detiene servicios; la guía restringe ese paso al host independiente. Reanudar Redis y repetir warm para recuperación, archivando resultados anteriores. Medir además TTL, memoria/evicciones y retirada con invalidación fallida mediante la suite Redis/SQL existente. No extrapolar 50 lecturas a disponibilidad. **Todos estos resultados reales están pendientes.**

## k6 progresivo hasta 2.000 VU

[qr-load.js](../../scripts/sprint02/qr-load.js) usa `ramping-vus` y una etapa elegida por ejecución. No inicia automáticamente todas. Solo acepta `http://127.0.0.1:3302` en otro host, ID ficticio y SHA explícitos. El generador y servicio quedan colocados; registrar esta interferencia, no confundir saturación del generador con saturación del backend. Para generación distribuida se requiere otro plan revisado, sin falsificar IP mediante cabeceras ni desactivar seguridad. [Documentación k6](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/).

| Orden / selector | VU objetivo | Rampa | Meseta | Bajada y reposo |
| --- | ---: | --- | --- | --- |
| smoke | 1 | 5 s | 10 s | 30 s + 30 s |
| 10 | 10 | 30 s | 2 min | 30 s + 30 s |
| 50 | 50 | 30 s | 2 min | 30 s + 30 s |
| 100 | 100 | 30 s | **10 min** | 30 s + 30 s |
| 250 | 250 | 30 s | 2 min | 30 s + 30 s |
| 500 | 500 | 30 s | 2 min | 30 s + 30 s |
| 1000 | 1.000 | 30 s | 2 min | 30 s + 30 s |
| 2000 | 2.000 | 30 s | 2 min | 30 s + 30 s |

Una iteración por VU duerme1s además del tiempo HTTP. VU no equivale a requests/s. Entre ejecuciones esperar ≥60s para recuperar ventana del limitador; revisar resultados y recursos antes de avanzar. `qr_5xx` divide 5xx/total peticiones; `qr_429` registra limitados sin hacerlos éxito; `qr_business_errors` otros4xx; `http_req_failed` conserva fallos/transporte; `qr_success_ms` mide solo200 con forma pública esperada, evitando que denegaciones rápidas mejoren artificialmente p95. `qr_correct=1` es comprobación del fixture, no mínimo porcentual del PDF. Con muchos429 el ensayo falla la corrección de respuestas, aunque no haya5xx.

**Limitación conocida:** producción mantiene60 consultas/min/IP en `publication-http.js`. Un generador loopback único probablemente topará con429 en etapas superiores; es una hipótesis del código, no resultado observado. No desactivar rate limit ni alterar negocio. Si aparecen429, registrar capacidad del acceso limitado y detener escalada como evidencia inconclusa de capacidad de negocio. Para alcanzar2.000 VU con tráfico admitido hará falta acordar topología/usuarios/IP legítimos en otro laboratorio y ampliar el plan, conservando controles.

Parada automática: tasa5xx≥1 % después de10s aborta la ejecución; timeout HTTP5s. Parada manual de seguridad propuesta: generador CPU>70 %, servicio/DB CPU>80 % por30s, memoria>80 %, swap/OOM, conexiones sostenidas>80 % del máximo, bloqueos>1s, errores de integridad, disco<20 % libre o interferencia con otros trabajos. Registrar límite concreto y etapa alcanzada; estos son límites operativos del ensayo, no requisitos del PDF. Guardar código de salida, versión k6, sistema/CPU/RAM, imágenes/digests, cardinalidades, configuración, muestras, inicio/fin, SHA y fallo. No continuar por obtener un resumen verde.
