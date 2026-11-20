# Sprint 2: implementación y validación de la arquitectura

Preparación de entrega de Trazabilidad y Gestión Comercial de Palta Hass. Corte documental: 20/11/2026. **Cumplimiento parcial; no es aprobación docente ni certificación de rendimiento.** Se leyó completo el enunciado oficial de una página antes de implementar esta preparación.

## Lectura y entrega

1. [Fuentes, alcance y SHA](fuentes-y-alcance.md): control del PDF y dossier, rama y protección del ensayo Android.
2. [Matriz de ocho actividades y cinco entregables](matriz-cumplimiento.md): evidencia y faltantes en cada fila.
3. [Reporte de verificación](reporte-verificacion.md): resultados ejecutados, cobertura, fallos y deuda.
4. [Arquitectura, SOLID y patrones](arquitectura-implementada.md): vínculos a código y límites de la interpretación.
5. [Trazabilidad SDD](trazabilidad-sdd.md): RF, aceptación, tareas, archivos y pruebas.
6. [Validación EQ-01 a EQ-07](validacion-atributos.md): medidas, PostgreSQL, Redis, carga y criterios de interrupción.
7. [Guía reproducible y demostración](guia-demostracion.md): comandos seguros, laboratorio externo y API.
8. [Evidencia sanitizada por SHA](evidence/README.md).
9. [Continuidad de esta preparación](continuidad.md).
10. [Mediciones ejecutadas de PostgreSQL, Redis, k6 y sync50](mediciones-ejecutadas.md).
11. [Capacidad separada de abuso, proxy/IP y permisos](capacidad-y-permisos.md).
12. [Resultados nuevos:2.000 VU, permisos y recuperación Redis](resultados-capacidad.md).

| Entregable oficial | Enlace directo |
| --- | --- |
| Código organizado | [Arquitectura y código concreto](arquitectura-implementada.md) |
| Versión funcional | [Guía de arranque y demostración](guia-demostracion.md) |
| API OpenAPI/Swagger | [Contrato canónico](../03-diseno-de-software/openapi.json) |
| Jest y cobertura | [Reporte](reporte-verificacion.md) y [evidencias por SHA](evidence/README.md) |
| Validación de atributos | [EQ, análisis y pendientes](validacion-atributos.md) |

**Nuevo corte ejecutado5fd294c:**100 Jest / 52 node:test aprobados remotamente, cobertura backend **3304/3997=82,66 %**,45 archivos sin exclusiones. [Manifiesto CI](evidence/5fd294c76f360d09ab1ade5c2d870b30d3754234/verification-ci.json). SEC-01–07:15 denegaciones HTTP comprobadas; capacidad2.000 VU con33987 respuestas correctas/0 429/0 5xx y Redis caído/recuperado con3/3 contaminaciones comprobados en [resultados5fd](resultados-capacidad.md). Sonar86,7 % nuevo/gate80 intacto, métrica separada de Jest. [Protocolo y diferencias](capacidad-y-permisos.md).

Corte anterior medido: **02ca31bd03dc1626bc9f0c610405b8a673c0fe07**. Jest: **83/83**; node:test: **49/49**. Mismos45 archivos/3997 líneas: **71,47 % local (2857) /71,52 % PostgreSQL remoto (2859)**, desde8,48 % (339). HTML/LCOV publicados y su importación Sonar confirmada. El gate02ca falló75,5 % nuevo<80; después [CI20be52d](evidence/20be52d72d7ebbe488a660307230d9857f44d4b5/ci-remoto.json) aprobó todos sus checks y Sonar87,1 % nuevo al ejecutar el registrador real, sin exclusiones. La cabeza documental posterior debe tener checks propios. El PDF no fija mínimo; no se debilita el gate del proyecto. Suites y alcance conservados.

La rama `chore/preparacion-sprint02` parte de PR 14, cabeza `2f7a28772bed67ebcce48fec2fc9c0da54a14d99`. El [PR 15 de preparación](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/15) está publicado en borrador con base `feat/offline-captura-outbox-sync` para aislar su diff. Ambos quedan abiertos, sin fusión. Esto no convierte el incremento offline en parte de main (`0ed299ffa31cd4666e556db38762df7bd313c4bb`, consultado en GitHub).

**Corte anterior02ca en runner aislado:** SQL/Redis reales,50 capturas servidor en0,255371 s y k6 con parada a 10 VU por 1320/1500 respuestas429 (exit99,0 5xx). No se alcanzó 2000 VU. [Resultados y límites](mediciones-ejecutadas.md). **Nuevo corte5fd:** el screening separado sí alcanzó2.000 VU; el abuso de1 IP conserva1320/1500 HTTP429 como control. **Pendientes:** cobertura HTTP fuera del conjunto definido, escala/repeticiones y estabilidad/recuperación extensa Redis,100 VU / 10 min y pruebas con topologías productivas/NAT/TLS, Android50/SQLite/24h/energía, monitoreo mensual y ETL/Datamart. El teléfono y sus servicios no se intervinieron.

Los documentos históricos siguen en [Sprint 1](../05-sprint01/README.md), [diseño](../03-diseno-de-software/01-diseno-interno.md) y [C4](../04-modelo-c4/modelo-c4.md). No se trasladaron ni copiaron.
