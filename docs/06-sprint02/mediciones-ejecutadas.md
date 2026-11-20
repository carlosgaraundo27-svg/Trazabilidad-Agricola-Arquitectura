# Mediciones ejecutadas en laboratorio independiente

**Nuevo corte5fd:** [screening2.000 VU, observación de IPs, permisos y caída/recuperación Redis](resultados-capacidad.md). Las tablas siguientes preservan sus SHA anteriores y no se renuevan artificialmente.

## Procedencia y método

Datos ficticios en GitHub-hosted Ubuntu, ajenos al teléfono/servicios locales. [D822 sin perfilado](evidence/d8227d047a6e6f35028fe4494c53924b0c151758/lab/run.json), [02ca con NODE_V8_COVERAGE](evidence/02ca31bd03dc1626bc9f0c610405b8a673c0fe07/lab/run.json) y [primer fallo309](evidence/309fd38e9f30f3aafe43dd6c501152cd459b5769/lab-first/run.json) conservados sin sobrescribir. Perfilado/hardware distintos: diferencias entre corridas no acreditan optimización.

| Recurso | D822 /sin perfilado | 02ca /perfilado V8 |
| --- | --- | --- |
| SO/CPU | Linux 7.0.0-1019-azure, AMD EPYC9V45,4 vCPU | Linux 7.0.0-1016-aws, Xeon6975P-C,4 vCPU |
| RAM bytes | 16.759.431.168 | 16.463.409.152 |
| Node /k6 | 24.22.2 /2.4.0 | 24.22.3 /2.4.0 |
| SHA | d8227d047a6e6f35028fe4494c53924b0c151758 | 02ca31bd03dc1626bc9f0c610405b8a673c0fe07 |

PostgreSQL 18.7, Redis 8-alpine y k6:latest resueltos a digest exacto en run.json: usar repoDigests para repetir imágenes, latest puede cambiar. Cada comando/exit/duración registrado. Dataset100 publicaciones y4 despachos ROP, servicios/semillas ficticias reales, marcador de base dedicada y ANALYZE explícito. Loopback; Node/generador/DB/Redis comparten runner. No hay red móvil ni despliegue distribuido.

Secuencialidad intencional: hechos dependientes, planes en transacción, cuatro modos caché separados,50 escrituras sync y5 replays, k6 con61s entre etapas. Paralelizar cambia estados/caché/ventanas/carga. CPU/RAM durante fases cortas es promedio de host con arranque de subproceso, no pico. Carga muestreada cada3s. No se midieron IOPS, espacio libre de disco, picos subsegundo, red externa ni contención sostenida.

## PostgreSQL real

[SQL, parámetros ficticios, índices y planes02ca](evidence/02ca31bd03dc1626bc9f0c610405b8a673c0fe07/lab/postgres-plans.json): tres EXPLAIN(ANALYZE,BUFFERS,SETTINGS), timeout5s/lock1s, sin cambios de índices.

| Consulta | Plan /estimadas→reales | Planificación /ejecución ms | Buffers hit/read |
| --- | --- | ---: | ---: |
| PublicGate public_id FOR SHARE | LockRows→Seq Scan,1→1; descarta99 | 0,044 /0,035 | 7 /0 |
| Snapshot public_id/version/state | Seq Scan,1→1; descarta99 | 0,045 /0,022 | 6 /0 |
| ROP organización/centro/período/cursor | Limit→Sort→joins,2→3 | 0,514 /0,106 | 10 /0 |

Índice UNIQUE public_id presente; con100 filas el optimizador eligió scan. No se fuerza índice ni se deduce que falte uno. ROP quicksort25kB en memoria,4 despachos, sin spills. Hipótesis de índice organización/centro/departed_at/id requiere cardinalidad/distribución mayor y comparación repetida. Buffers observados calientes, no disco frío. Conexiones/esperas puntuales en JSON no estudian contención. D822 conserva sus tiempos propios de ejecución0,032/0,020/0,169ms; no se selecciona solo el mejor.

## Redis real:50 lecturas por condición

Caso de uso/repositorio/adaptador reales; verifica DTO/contadores. p95 por rank ceil(0,95*n) de 50 duraciones; no promedio de percentiles.

| Condición | p95 D822 (ms) | p95 02ca ms | SELECT /gate /snapshot | Hit /miss /errorGET |
| --- | ---: | ---: | --- | --- |
| Sin caché | 2,024900 | 1,257749 | 100 /50 /50 | 0 /50 /0 |
| Fría | 2,392547 | 1,711240 | 100 /50 /50 | 0 /50 /0 |
| Caliente | 1,904236 | 1,181248 | 50 /50 /0 | 50 /0 /0 |
| Degradada | 1,940092 | 1,539739 | 100 /50 /50 | 0 /0 /50 |

[none](evidence/02ca31bd03dc1626bc9f0c610405b8a673c0fe07/lab/cache-none.json), [cold](evidence/02ca31bd03dc1626bc9f0c610405b8a673c0fe07/lab/cache-cold.json), [warm](evidence/02ca31bd03dc1626bc9f0c610405b8a673c0fe07/lab/cache-warm.json), [degraded](evidence/02ca31bd03dc1626bc9f0c610405b8a673c0fe07/lab/cache-degraded.json). Fría: borra solo clave antes de cada lectura, no buffers PG. Caliente: prewarm fuera de muestra; DB sigue autorizando50 guards. Degradada: Redis dedicado realmente detenido/PING fallido;50 erroresGET, fallback válido y eventos GET/SET preservados. Se reinició solo ese Redis para carga posterior; falta otra comparación warm de recuperación.

Se acredita reducción de snapshots, no mejora significativa de latencia ni disponibilidad: una serie50/modo, orden fijo, buffers PG calientes, sin HTTP/concurrencia. TTL/evicciones/memoria Redis sostenida y recuperación comparada pendientes.

## Sincronización50: alcance servidor

[02ca](evidence/02ca31bd03dc1626bc9f0c610405b8a673c0fe07/lab/sync50.json): **50/50 HTTP201 con ACK válido en0,255371 s**, cumple≤60 s solo en este entorno servidor. Antes104cosechas/104prelotes/0recibos/104audits; después154/154/50/154. Cinco replays200 con mismos preLotId, contenido semántico correcto y conteos sin incrementos. D822:0,393929 s con mismos criterios. IDs/hash/duraciones por petición conservados, sin cookies/contraseñas.

Cola cliente solo RAM; HTTP/PostgreSQL reales en loopback. Desde primer envío hasta último ACK, excluye login/conteos previos. No demuestra SQLite/WAL durable, reconstrucción de outbox, reintentos Android, recuperación de red ni50 replays completos. El objetivo Android requiere ensayo independiente futuro; D11 no intervenido.

## k6: parada real a 10 VU

| Corrida /etapa | Peticiones | Correctas200 | 429 /5xx | Req/s | p95 de200 ms | Exit |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| D822 /1 VU | 40 | 40 | 0 /0 | 0,885986 | 2,937157 | 0 |
| D822 /10 VU | 1500 | 180 | 1320 /0 | 8,318400 | 23,280359 | **99** |
| 02ca /1 VU | 40 | 40 | 0 /0 | 0,885873 | 3,103018 | 0 |
| 02ca /10 VU | 1500 | 180 | 1320 /0 | 8,317444 | 17,327283 | **99** |

[smoke02ca](evidence/02ca31bd03dc1626bc9f0c610405b8a673c0fe07/lab/k6-smoke.json), [10 VU02ca](evidence/02ca31bd03dc1626bc9f0c610405b8a673c0fe07/lab/k6-10.json). JSON incluye métricas/thresholds; logs k6 en artifact por SHA. Throughput incluye rechazos. p95 solo200 evita que429 rápidos aparenten mejora.

Smoke verificó respuestas/recursos antes de avanzar, con61s entre ventanas. A10 VU: **88 %429**,12 % correctas;0 5xx observado en esa ventana. Exit99 y stopReason=rate_limit_429 conservados. No se ejecutaron50/100/250/500/1000/2000 ni meseta100 VU / 10 min EQ-01. Job verde significa protocolo completado con límite observado, **no carga aprobada**. Rate limit60/min/IP intacto; falta topología distribuida de tráfico legítimamente admitido.

Recursos02ca:95 muestras/3 s, CPUhost máxima6,03 %, disponible mínima14,052GiB, CPUk6 Docker máxima1,07 % sumada (normalizar/4 vCPU), RSSapp máxima142,43MiB. D822:96 muestras, CPUhost≤10 %, disponible≥14,359GiB, k6≤1,28 %, RSSapp≤143,36MiB. Smoke:14 muestras/presencia del generador. Sin agotamiento observado; muestreo puede perder picos. No certifica capacidad2000 ni SLA.

No se midieron disponibilidad mensual, ETL/Datamart ni aceptación Android. [Plan EQ y faltantes](validacion-atributos.md).
