# Matriz de cumplimiento de Sprint 2

Fuente: [PDF oficial completo y dossier](fuentes-y-alcance.md). Estados de evidencia, no calificaciones. **C =02ca31bd03dc1626bc9f0c610405b8a673c0fe07**, [fuente](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/tree/02ca31bd03dc1626bc9f0c610405b8a673c0fe07). [V local](evidence/02ca31bd03dc1626bc9f0c610405b8a673c0fe07/verification.json); [R remoto](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44809169009); [M laboratorio](evidence/02ca31bd03dc1626bc9f0c610405b8a673c0fe07/lab/run.json). C conserva código productivo del corte anterior; cambios posteriores del registrador/CI se verifican por su propio SHA en [PR15](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/15).

Nuevo corte **S=5fd294c76f360d09ab1ade5c2d870b30d3754234**: [CI100 Jest / 52 node:test/82,66 %](evidence/5fd294c76f360d09ab1ade5c2d870b30d3754234/verification-ci.json), [protocolo separado de capacidad](capacidad-y-permisos.md). C/V/R/M de abajo conservan su atribución histórica; S no sustituye el SHA de evidencias previas.

## Ocho actividades oficiales

| ID | Actividad | Evidencia por SHA y localización | Resultado | Faltante para cierre |
| --- | --- | --- | --- | --- |
| A1 | Implementar estilo arquitectónico | C: server/composition.js; [C4](../04-modelo-c4/modelo-c4.md), V/check y R/verify | Monolito modular; imports actuales verificados. | Revisión exhaustiva/ratificación docente. |
| A2 | Aplicar enfoque/patrón arquitectónico | C: server/modules/harvest/application.js; [arquitectura](arquitectura-implementada.md) | Dominio, aplicación, repositorios y adaptadores con inyección de dependencias. | Chequeo estático parcial, contratos dinámicos. |
| A3 | SDD: aceptación y tareas implementadas | C: [RF/especificaciones/tareas/pruebas](trazabilidad-sdd.md) | Trazabilidad preparada y suites de negocio ampliadas. | Criterios móviles/agrícolas y RF parciales explícitos. |
| A4 | REST funcional y OpenAPI/Swagger | C: [contrato canónico](../03-diseno-de-software/openapi.json), V/check, R/verify/Compose | OpenAPI3.1,40 paths validados; integración HTTP y Playwright aprobados remotamente. | Demo/visor manual; cada endpoint no se aprueba solo por check estático. |
| A5 | Analizar base y caché | C/M y S: [SQL/Redis ejecutados](resultados-capacidad.md), [protocolo](capacidad-y-permisos.md) | Planes/índices reales; Redis frío/caliente/degradado y caída/reconexión del mismo adaptador;3 contaminaciones HTTP saneadas en S. | Escala/repeticiones, TTL/evicciones y recuperación extensa; sin garantía de mejora o disponibilidad. |
| A6 | SOLID y patrones cuando corresponda | C: [código y límites concretos](arquitectura-implementada.md), tests/jest/persisted-business.test.js; R/verify | SRP/DIP sustentados, Repository/Composition Root/UoW; rollback real en pruebas. | No certifica SOLID global ni todas las implementaciones/contratos. |
| A7 | Jest y CI recomendado | S: tests/jest, jest.config.js, CI; [reporte](reporte-verificacion.md) y [checks](evidence/5fd294c76f360d09ab1ade5c2d870b30d3754234/ci-remoto.json) | **100 Jest / 52 node:test;3.304/3.997 líneas,82,66 % PostgreSQL remoto**, mismos45 archivos. HTML/LCOV publicados e importados. | Cobertura parcial de HTTP/contención. Sonar86,7 % de código nuevo, gate80 intacto; no es el porcentaje Jest. PDF sin mínimo. |
| A8 | EQ y k6 progresivo hasta2.000 VU | S: [run](evidence/5fd294c76f360d09ab1ade5c2d870b30d3754234/lab/run.json), [resultados](resultados-capacidad.md), [EQ](validacion-atributos.md) | Abuso1IP1320/1500 HTTP429/exit99 conservado. Screening de capacidad llegó2.000 VU con2000 claves reales,33.987 respuestas correctas y0 429/5xx; p95/p99/recursos registrados. | Meseta corta60s; falta100 VU / 10 min y topologías productivas/NAT/TLS/IPv6. Android/24h/energía, disponibilidad mensual y ETL siguen pendientes. |

## Cinco entregables oficiales

| ID | Entregable | Paquete y SHA | Estado | Faltante explícito |
| --- | --- | --- | --- | --- |
| E1 | Código organizado según arquitectura | C: fuente, [arquitectura/SOLID/patrones](arquitectura-implementada.md), V/check | Preparado en rama PR15 separada; producción preservada. | Integración no autorizada; PR14/15 abiertos sin fusión. |
| E2 | Primera versión funcional | C/R: [guía reproducible](guia-demostracion.md), [recorrido histórico](../05-sprint01/evidencia-primer-recorrido.md) | verify/Compose/HTTP/Playwright remotos aprobados; versión base conservada. | Demo manual y aceptación móvil completa. |
| E3 | API OpenAPI/Swagger | C: [contrato](../03-diseno-de-software/openapi.json), V/check, ejemplos de guía | Contrato validado, visor reproducible descrito. | No hay visor servido por producto; demostración manual pendiente. |
| E4 | Jest y reporte de cobertura | S: [reporte](reporte-verificacion.md), artifact jest-coverage-S HTML/LCOV14d | 100 Jest/82,66 %, sin reducir alcance; node:test52/Playwright/Flutter conservados. Sonar importa LCOV;86,7 % nuevo es otra métrica. | Cobertura backend parcial; React/Flutter fuera de Jest. Gate S aprobado,80 intacto; revisar checks propios de cabeza final. |
| E5 | Evidencias/resultados de calidad | S: [resultados nuevos](resultados-capacidad.md), [evidencia](evidence/README.md), [EQ](validacion-atributos.md) | Parcial: permisos definidos15/15, Redis 3/3, recuperación funcional, screening2000 y control de abuso reales en runner; fallos preservados. | No aceptación completa: estabilidad prolongada, representatividad productiva, móvil, disponibilidad mensual y ETL/Datamart. |

Pruebas con dobles/VM son simulaciones de comportamiento; SQL/Redis/HTTP/k6 del runner son ejecuciones reales con ficción. Ninguna fila equivale a aceptación completa del Sprint ni disponibilidad de producción.
