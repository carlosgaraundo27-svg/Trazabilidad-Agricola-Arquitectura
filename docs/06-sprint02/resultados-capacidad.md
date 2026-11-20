# Resultados nuevos: capacidad, abuso, permisos y Redis

Código **5fd294c76f360d09ab1ade5c2d870b30d3754234**, [CI44815768255](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44815768255). Los seis checks remotos aprobaron. [Manifiesto Jest](evidence/5fd294c76f360d09ab1ade5c2d870b30d3754234/verification-ci.json), [run completo](evidence/5fd294c76f360d09ab1ade5c2d870b30d3754234/lab/run.json), [protocolo reproducible y límites](capacidad-y-permisos.md). La cabeza documental posterior conserva estas mediciones atribuidas a5fd, sin transferir resultados por semejanza de rama.

## Abuso e identidad del cliente

[Observación real de10VU](evidence/5fd294c76f360d09ab1ade5c2d870b30d3754234/lab/traffic-abuse-10.json): **1500 peticiones,10 VU,1 clave/IP127.0.0.1**,180 respuestas200 y1320 respuestas429. req.ip coincidió con socket.remoteAddress y trust proxy fue false. Primera denegación: policy `"60-in-1min";q=60;w=60`, Retry-After43s. La clave y los headers concuerdan con60/min/IP; el total admitido es compatible con tres ventanas.

Es un único cliente **para el limitador**, no prueba que exista una sola persona. Diez VU no son diez identidades de red ni sesiones independientes. Cookies/publicId/etiquetas VU no cambian la clave. El modelo representa un origen compartido/NAT. Se conserva exit99 y su stopReason rate_limit_429 como evidencia del control de abuso. Throughput total8,318req/s incluye rechazos; solo0,998req/s fueron respuestas correctas. No se atribuye a saturación.

## Capacidad separada: screening alcanzó2.000 VU

| Perfil /VU objetivo | Peticiones | Correctas | Req/s totales | p95 /p99 correctas ms | 429 /5xx | Exit |
| --- | ---: | ---: | ---: | --- | --- | ---: |
| abuse /smoke | 40 | 40 | 0,885 | 9,542 /11,276 | 0 /0 | 0 |
| abuse /10 | 1500 | 180 | 8,318 | 10,632 /16,561 | 1320 /0 | 99 |
| capacity /smoke | 5 | 5 | 0,167 | 6,621 /7,221 | 0 /0 | 0 |
| capacity /10 | 168 | 168 | 1,555 | 3,553 /4,688 | 0 /0 | 0 |
| capacity /50 | 848 | 848 | 7,847 | 3,320 /4,582 | 0 /0 | 0 |
| capacity /100 | 1698 | 1698 | 15,669 | 2,984 /5,689 | 0 /0 | 0 |
| capacity /250 | 4246 | 4246 | 39,208 | 2,910 /7,850 | 0 /0 | 0 |
| capacity /500 | 8495 | 8495 | 78,399 | 3,005 /7,436 | 0 /0 | 0 |
| capacity /1000 | 16992 | 16992 | 156,835 | 2,026 /5,207 | 0 /0 | 0 |
| capacity /2000 | 33.987 | 33.987 | 313,679 | 2,266 /5,253 | 0 /0 | 0 |

La etapa2000 registró **VU activos máximos2000**,33.987 respuestas200 con DTO válido,0 respuestas429/5xx y313,679req/s de promedio de etapa completa, incluidas rampa/bajada. No se deduce throughput de meseta de ese promedio. El [testigo servidor](evidence/5fd294c76f360d09ab1ade5c2d870b30d3754234/lab/traffic-capacity-2000.json) comprobó2000 claves y2000 etiquetas VU, una clave por VU, IP=socket, trust proxy false. Misma verificación en todas las etapas; no bastó programar un target.

Orígenes TCP reales127.16.0.1–127.16.7.208 por k6 localIPs, no X-Forwarded-For. Lectores QR anónimos con5s de pausa,100 IDs públicos ficticios rotados. No hay clientes autenticados ni una mezcla de escrituras; no replica NAT compartido, IPv6, proxy, TLS, red móvil ni carga completa de HTML/JS/QR. No se cambió limitador, pool SQL o regla productiva.

Todas las etapas de capacidad cumplieron sus presupuestos y terminaron exit0. Estado explícito: completed_short_screening_2000. El run global queda completed_with_observed_limit porque el perfil de abuso sí falló por429; job verde no convierte ese fallo en éxito de capacidad.

La meseta de capacidad fue60s por nivel, no diez minutos. **EQ-01 de100 VU / 10 min, estabilidad prolongada, máximo de capacidad y comportamiento productivo siguen sin acreditarse.** Alcanzar2000 en este modelo no garantiza rendimiento fuera del runner.

## Recursos y límites de interpretación

Linux7.0.0-1020-azure; modelo AMD EPYC9V45;4vCPU y16759431168 bytesRAM. Node24.22.3, k6 2.4.0; PostgreSQL18.7/Redis8, digests exactos en run.json. CLK_TCK100; límites de proceso y k6 nofile8192 registrados.

[360 muestras de recursos, cada3s](evidence/5fd294c76f360d09ab1ade5c2d870b30d3754234/lab/resources.json):

| Medida de toda la corrida | Observado |
| --- | ---: |
| CPU host máxima de muestras |17,944 % |
| CPU app máxima, porcentaje de un núcleo |21,425 % |
| CPU generador máxima Docker, suma de núcleos |124,29 %;31,073 % normalizada por4vCPU |
| RAM generador máxima |669,8MiB;4,19 % |
| RSS app máxima |263,348MiB |
| Memoria disponible mínima |13,656GiB |
| Disco disponible mínimo |85,864GiB |

Ventanas CPU no alineadas: no sumar picos de componentes. Son muestras, no picos continuos; guardas de recursos se aplican entre etapas y k6 aborta dentro de etapa por5xx/timeout según protocolo. Sin señales de agotamiento en este conjunto. El observador por respuesta y el perfilado V8 consumen CPU/RAM; todas las partes comparten runner/loopback. Dataset100 publicaciones/4 despachos pequeño, buffers calientes. No se aisló un cuello de botella ni se midió capacidad máxima, IOPS o contención sostenida.

## Redis: caída y recuperación del mismo adaptador

[Resultado funcional real](evidence/5fd294c76f360d09ab1ade5c2d870b30d3754234/lab/cache-recovery.json): PING previo válido; solo Redis del runner detenido y PING inaccesible; el mismo servidor HTTP devolvió200 con DTO correcto mediante fallback. Redis arrancó; el adaptador original emitió public_cache_recovered y volvió a poblar caché; lectura caliente correcta, sin reiniciar app.

Siete lecturas HTTP comprobadas: disponible10,546ms; degradada4,397ms; recuperada3,583ms; caliente posterior2,386ms; las tres contaminaciones también200 con DTO correcto/reparación de clave. Cada fase funcional tiene una lectura: **no son percentiles comparables ni mejora temporal demostrada**. La observación de reconexión tardó401,335ms desde el retorno de up del contenedor; no mide el tiempo total de indisponibilidad ni un RTO garantizado.

SEC-08 real Redis+HTTP: **3/3 variantes** (JSON corrupto, campo privado, hash ajeno), respuestas saneadas y caché reparada. Eventos de degradación GET/SET/conexión y recuperación preservados. No FLUSHALL ni cambios a servicios locales.

## Permisos y errores HTTP prioritarios

**100 Jest/9 suites y52 node:test**, todos aprobados en CI. Backend completo constante: **3304/3997 líneas =82,66 %**,45 archivos; sin exclusiones. HTML/LCOV por SHA. Sonar importó tres LCOV y aprobó **86,7 % de código nuevo**, gate80 intacto: esta métrica incluye herramientas/laboratorio y es distinta del total Jest.

SEC-01–07: **15/15 denegaciones definidas**, enumeradas en [matriz EQ](validacion-atributos.md); SEC-08:3/3 contaminación/reparación aparte. No es100/100 pruebas de permisos ni una auditoría exhaustiva. Error500 saneado y503 por contrato/health usan fallos inyectados: no se hizo caer PostgreSQL. Persisten rutas/controladores y contención sin completar; ver HTML por archivo. No se ejecutó Jest HTTP en el host Android.

Sync50 servidor en esta corrida:50ACK válidos en0,266746s y cuatro deltas50; cinco replays sin duplicar. **No es Android ni SQLite durable**. Ensayo24h, energía, disponibilidad mensual y ETL/Datamart permanecen pendientes; D11 y sus servicios no intervenidos.
