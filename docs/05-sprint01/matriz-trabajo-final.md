# Matriz provisional de control del trabajo final — 16 áreas

2026-11-16. **El PDF oficial compartido no está accesible en las fuentes disponibles.** Se revisaron archivos locales y sesiones documentales disponibles; no se obtuvo su enumeración literal. P01–P16 son áreas provisionales de control, **no los 16 criterios oficiales**, sus títulos ni ponderaciones. No se calcula nota ni cumplimiento porcentual. Sustituir la correspondencia por la rúbrica auténtica cuando esté disponible, conservando evidencia y pendientes.

Base main 47d827c, tras PR #6: fiabilidad corregida y verify/compose/SonarCloud aprobados después del merge. Inventario/Reserva/Despacho/Entrega existen en [PR #7](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/7), **abierto sin fusionar**; no atribuir ese código a main. Estado técnico no equivale a aprobación docente ni validación agrícola.

## Evidencia de referencia

[Requisitos RF](../01-analisis-de-sistema/03-requisitos-funcionales.md), [HU](../01-analisis-de-sistema/02-historias-del-usuario.md), [EQ](../01-analisis-de-sistema/08-escenarios-atributos-calidad.md), [C4 implementado](../04-modelo-c4/modelo-c4.md), [objetivo](../04-modelo-c4/modelo-c4-objetivo.md), [OpenAPI](../03-diseno-de-software/openapi.json), [CI](../../.github/workflows/ci.yml), [Compose](../../compose.yaml). [Calidad](calidad-implementacion.md), [QR](evidence/qr/README.md), [Inventario: implementación, comandos y pruebas](inventario-implementacion.md), [Sonar de main](evidence/sonar-main/after.json), [revisión Sonar de Logística](revision-sonar-logistica.md).

## Matriz provisional

| ID / área provisional | Estado | Evidencia existente | Pendiente | Siguiente acción |
| --- | --- | --- | --- | --- |
| P01 Problema, actores, requisitos y trazabilidad | Documentado; D1–D9 adoptadas académicamente | RF/HU/EQ; especificaciones Acopio/Calidad/QR/Inventario; ID-01–24 | Contraste literal con PDF; validación docente | Obtener PDF y mapear cada criterio real a requisitos/evidencia, marcando parciales |
| P02 Estilo y decisiones arquitectónicas | Documentado y parcialmente ejecutado | Monolito modular; ADR-001–014; ADR-014 adoptado para este prototipo | Capacidades objetivo restantes y validación formal | Revisar decisiones frente al alcance real y registrar cambios posteriores |
| P03 Modelos C4 | Actualizado al corte de PR #7 | C1–C4; componente G, puertos mínimos de T1/Q/S; persistencia PostgreSQL | Consistencia con rúbrica y futuros módulos | Contrastar vistas con composición y contratos; separar implementado de objetivo |
| P04 Capas y dependencias | Implementado/verificado en el corte | Domain/application/repository, UoW; check de imports; G sin repositorios ajenos ni Redis público | Evolución modular futura | Mantener dependencias mediante puertos y ejecutar check en cada cambio |
| P05 Prototipo y persistencia | Parcial frente al objetivo completo | Origen, Acopio, Calidad, QR; PR #7 añade Inventario/Reserva/Despacho/Entrega, 006/007 sin backfill | RF-10 parcial: empaque/pallets; parcialidades/devoluciones/corrección posterior diferidas | Revisar PR #7 sin merge automático; decidir siguiente incremento y conservar origen/kg |
| P06 Seguridad, permisos, privacidad y auditoría | Implementado/probado para recorridos actuales | Sesión/CSRF/origen; cada acción/organización/centro; revocación/replay; DTO QR permitido; rollback audit | Operación productiva, administración de accesos y evaluación externa | Conservar transporte privado; revisar límites/secretos/despliegue con evidencia propia |
| P07 API y pruebas | Contratos y pruebas ejecutables | OpenAPI 37 rutas; 23 unitarias; 110 resultados integración en DB nueva; 16 E2E; Redis real en CI; mutaciones detectadas | Checks de cada SHA nuevo; capacidades fuera del alcance | Consultar CI de cabeza exacta y preservar aserciones, concurrencia e idempotencia |
| P08 Offline y sincronización | **Pendiente** | RF-03, ADR-003, EQ-02 y vistas objetivo | Cola durable, conflictos, cierre/reinicio, revocación al sincronizar | Especificar protocolo e intención UUID; probar desconexión/reconexión sin pérdida ni duplicación; móvil adaptable no es offline |
| P09 Reportes, ETL y Datamart | Diseño objetivo; ejecución no demostrada | RF-12, ADR-006, EQ-07 | ETL, tablas, indicadores, reintentos y carga operativa | Seleccionar indicadores y fuentes reales; no inventar pérdidas ni movimientos históricos |
| P10 Integración continua | **CI demostrada** | Verify/Compose/Sonar main 47d827c verdes; PR #7 4453ec7 verdes; instalación/audit/formato/contratos/tests/build/reinicio | Vigilar cada nueva cabeza; nueve S1192 DDL abiertos, documentados | Registrar resultado por SHA; mantener gate/perfil/exclusiones; no presentar deuda abierta como resuelta |
| P11 Despliegue continuo y operación | **CD no demostrado** | Docker/Compose reproducibles y reinicio con volúmenes en runner desechable | Entorno persistente, despliegue/rollback, secretos, backups/restauración, monitoreo | Elegir staging y demostrar publicación/rollback por SHA; Compose en CI no es CD |
| P12 Escalabilidad y disponibilidad | Diseño y fallback funcional; **escala/SLA no medidos** | B1 único, PostgreSQL/Redis, health y fallo Redis probado | Réplicas, límite compartido, proxy, sesiones, recursos/recuperación sostenida | Definir topología/carga; resolver límites por instancia y medir |
| P13 Rendimiento, k6 y caché | **Caché configurada/probada; rendimiento no medido; k6 pendiente** | TTL 300 s, clave por versión, guard DB/hash, fría/caliente/retiro/fallo Redis | Dataset, baseline, P95/P99, throughput, errores/429, recursos | Medir fría/caliente/sin Redis comparables; tiempos de tests no son benchmark |
| P14 DNS, HTTPS y CDN | Sin evidencia de despliegue | PUBLIC_BASE_URL/APP_ORIGIN y validación URL | Dominio real, TLS/proxy, política CDN y prueba de retiro | Demostrar resolución/TLS; CDN inicial solo assets con hash, conservar no-store público |
| P15 Informe final | Documentación técnica; informe consolidado no aportado | RF/HU/ADR/C4/especificaciones/evidencias y continuidad | Formato/rúbrica oficial, consolidación, fuentes, resultados/límites | Obtener PDF y consolidar informe trazado; distinguir objetivo, implementado y demostrado |
| P16 Presentación y defensa | Sin archivo/ensayo evidenciado | Material técnico y demo ficticia reproducible | Diapositivas, guion/tiempos, respaldo demo, ensayo | Preparar según rúbrica y ensayar recorrido/Redis caído con pendientes explícitos |

## Límites de interpretación

- CI aprueba comprobaciones de un SHA; no demuestra CD ni disponibilidad mensual.
- TTL/caché fría/caliente y fallback prueban corrección funcional. Cada consulta mantiene guard PostgreSQL; no se afirma mejora de latencia/capacidad sin medición.
- EQ-01 (100 usuarios/10 min, P95≤2 s) sigue como propuesta por validar. El límite por IP de 60 consultas/min puede hacer que k6 de una IP mida 429: definir escenarios permitido/abuso antes de medir, sin desactivar controles para obtener verde.
- Las 16 E2E son 13 previas más tres de Logística. La evidencia local enfocada de tres no se presenta como salida completa de 16; CI ejecuta ambas suites. No se trasladan checks entre SHAs.
- Prioridades académicas y aceptación docente requieren su propia confirmación. [Continuidad vigente](continuidad-inventario.md).
