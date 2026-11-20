# Matriz de cumplimiento de Sprint 2

Fuente: [PDF oficial completo y dossier](fuentes-y-alcance.md). Estados de evidencia, no calificaciones. **C =02ca31bd03dc1626bc9f0c610405b8a673c0fe07**, [fuente](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/tree/02ca31bd03dc1626bc9f0c610405b8a673c0fe07). [V local](evidence/02ca31bd03dc1626bc9f0c610405b8a673c0fe07/verification.json); [R remoto](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44809169009); [M laboratorio](evidence/02ca31bd03dc1626bc9f0c610405b8a673c0fe07/lab/run.json). C conserva código productivo del corte anterior; cambios posteriores del registrador/CI se verifican por su propio SHA en [PR15](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/15).

## Ocho actividades oficiales

| ID | Actividad | Evidencia por SHA y localización | Resultado | Faltante para cierre |
| --- | --- | --- | --- | --- |
| A1 | Implementar estilo arquitectónico | C: server/composition.js; [C4](../04-modelo-c4/modelo-c4.md), V/check y R/verify | Monolito modular; imports actuales verificados. | Revisión exhaustiva/ratificación docente. |
| A2 | Aplicar enfoque/patrón arquitectónico | C: server/modules/harvest/application.js; [arquitectura](arquitectura-implementada.md) | Dominio, aplicación, repositorios y adaptadores con inyección de dependencias. | Chequeo estático parcial, contratos dinámicos. |
| A3 | SDD: aceptación y tareas implementadas | C: [RF/especificaciones/tareas/pruebas](trazabilidad-sdd.md) | Trazabilidad preparada y suites de negocio ampliadas. | Criterios móviles/agrícolas y RF parciales explícitos. |
| A4 | REST funcional y OpenAPI/Swagger | C: [contrato canónico](../03-diseno-de-software/openapi.json), V/check, R/verify/Compose | OpenAPI3.1,40 paths validados; integración HTTP y Playwright aprobados remotamente. | Demo/visor manual; cada endpoint no se aprueba solo por check estático. |
| A5 | Analizar base y caché | C/M: [SQL/planes/índices](evidence/02ca31bd03dc1626bc9f0c610405b8a673c0fe07/lab/postgres-plans.json), cache JSON enlazados en [análisis](mediciones-ejecutadas.md) | PostgreSQL 18.7/Redis reales;100 publicaciones/4 despachos;50 muestras por modo. Caliente reduce100→50 SELECT. | Dataset/repeticiones/concurrencia y recuperación; no mejora significativa de latencia acreditada. |
| A6 | SOLID y patrones cuando corresponda | C: [código y límites concretos](arquitectura-implementada.md), tests/jest/persisted-business.test.js; R/verify | SRP/DIP sustentados, Repository/Composition Root/UoW; rollback real en pruebas. | No certifica SOLID global ni todas las implementaciones/contratos. |
| A7 | Jest y CI recomendado | C: tests/jest, jest.config.js, .github/workflows/ci.yml; V/R; [reporte](reporte-verificacion.md) | **83 Jest;71,47 % local /71,52 % PG remoto**,45 archivos, 3997 líneas; HTML/LCOV Actions e importación Sonar real. | HTTP/errores restantes. Gate C falló75,5 % nuevo<80; [CI20be52d](evidence/20be52d72d7ebbe488a660307230d9857f44d4b5/ci-remoto.json) posterior aprobado87,1 % nuevo,80 intacto. PDF sin mínimo. |
| A8 | EQ y k6 progresivo hasta 2000 VU | C/M: [EQ-01–07](validacion-atributos.md), [resultados](mediciones-ejecutadas.md) | Smoke1 VU correcto;10 VU falló 1320/1500 respuestas429,0 5xx; exit99 preservado. Sync servidor 50ACK≤60 s. | No alcanzó 2000 VU; Android50/24h/energía, disponibilidad mensual y ETL pendientes. |

## Cinco entregables oficiales

| ID | Entregable | Paquete y SHA | Estado | Faltante explícito |
| --- | --- | --- | --- | --- |
| E1 | Código organizado según arquitectura | C: fuente, [arquitectura/SOLID/patrones](arquitectura-implementada.md), V/check | Preparado en rama PR15 separada; producción preservada. | Integración no autorizada; PR14/15 abiertos sin fusión. |
| E2 | Primera versión funcional | C/R: [guía reproducible](guia-demostracion.md), [recorrido histórico](../05-sprint01/evidencia-primer-recorrido.md) | verify/Compose/HTTP/Playwright remotos aprobados; versión base conservada. | Demo manual y aceptación móvil completa. |
| E3 | API OpenAPI/Swagger | C: [contrato](../03-diseno-de-software/openapi.json), V/check, ejemplos de guía | Contrato validado, visor reproducible descrito. | No hay visor servido por producto; demostración manual pendiente. |
| E4 | Jest y reporte de cobertura | C/V/R: [reporte](reporte-verificacion.md), artifacts jest-coverage-C HTML/LCOV14d | 83 Jest, sin reducir alcance; node:test/Playwright/Flutter conservados. Sonar importa LCOV. | Cobertura backend parcial; React/Flutter fuera de Jest. Gate20be52d aprobado87,1 % nuevo; revisar checks propios de cabeza final. |
| E5 | Evidencias/resultados de calidad | C/M y D822: [análisis medido](mediciones-ejecutadas.md), [evidencias](evidence/README.md), [EQ](validacion-atributos.md) | Parcial: PG/Redis/sync servidor/carga reales aislados; fallos guardados. | Rendimiento admitido hasta 2000, monitoreo mensual, Android y ETL/Datamart no demostrados. |

Pruebas con dobles/VM son simulaciones de comportamiento; SQL/Redis/HTTP/k6 del runner son ejecuciones reales con ficción. Ninguna fila equivale a aceptación completa del Sprint ni disponibilidad de producción.
