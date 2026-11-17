# Documentación técnica — Sprint 01

Repositorio del proyecto de Arquitectura de Software: **Trazabilidad y Gestión Comercial de Palta Hass**.

## Documento principal

- [README del Sprint 01](05-sprint01/README.md) — resumen, línea base de arquitectura, índice de entregables y decisiones pendientes.
- [Propuesta técnica resumida y mapa de documentos](../README.md)
- [Registro de alineamiento arquitectónico](02-arquitectura/00-registro-alineamiento.md)
- [Escenarios de atributos de calidad](01-analisis-de-sistema/08-escenarios-atributos-calidad.md)
- [Componentes y trazabilidad con requisitos](02-arquitectura/04-componentes-arquitectonicos.md)
- [Modelo C4 (C1-C4)](04-modelo-c4/modelo-c4.md)
- [Diseño interno](03-diseno-de-software/01-diseno-interno.md)
- [Modelo de datos conceptual](03-diseno-de-software/02-modelo-datos-conceptual.md)
- [Arquitectura técnica y despliegue](02-arquitectura/05-arquitectura-tecnica-despliegue.md)
- [Matriz de acceso y seguridad](02-arquitectura/06-matriz-accesos-seguridad.md)

## Estructura

- **01-analisis-de-sistema/**: actores, historias de usuario, requisitos, atributos, restricciones, drivers y escenarios de calidad.
- **02-arquitectura/**: estilo, enfoque, ADR, matriz de componentes, despliegue y seguridad.
- **03-diseno-de-software/**: entidades del dominio, interfaces, secuencias y modelo de datos conceptual.
- **04-modelo-c4/**: contexto, contenedores, componentes y vista conceptual de código.
- **05-sprint01/**: README específico del Sprint 01 con su resumen técnico y navegación documental.

La estructura se organiza conforme a la Guía 04, que pide mantener la documentación en `docs/` y separar de ella los ejemplos técnicos en `tecnologia/`.

## Estado

Este repositorio contiene el **primer recorrido y Acopio académico implementados** (Acceso, Productores, Cosecha, recepción y consolidación), su [C4 canónico](04-modelo-c4/modelo-c4.md) y la [arquitectura objetivo](04-modelo-c4/modelo-c4-objetivo.md) de las capacidades restantes. Las [evidencias de cierre](05-sprint01/cierre-primer-recorrido.md) distinguen pruebas locales, Compose Windows y Actions; los diagramas no sustituyen esa evidencia ni acreditan metas de calidad no medidas.

## Revisión antes de avanzar al Sprint 2

La [revisión arquitectónica](05-sprint01/revision-previa-sprint02.md) registra las correcciones del estilo y C1–C4, los riesgos adicionales y los criterios pendientes de validación. El [modelo C4](04-modelo-c4/modelo-c4.md) es la fuente canónica de las vistas.

## Primer recorrido implementado

- [Especificación y aceptación](03-diseno-de-software/03-especificacion-primer-recorrido.md)
- [Contrato OpenAPI](03-diseno-de-software/openapi.json)
- [Decisiones y alcance ejecutable](02-arquitectura/07-decisiones-primer-recorrido.md)
- [Evidencia y estado del PR #1](05-sprint01/evidencia-primer-recorrido.md)
- [Entorno y pruebas](../tecnologia/primer-recorrido.md)

## Acopio académico

Calidad académica implementada: [especificación Q1–Q9 adoptadas para el prototipo](03-diseno-de-software/05-especificacion-calidad-lote.md), [ADR-012](02-arquitectura/09-decisiones-calidad.md) y [continuidad](05-sprint01/continuidad-calidad.md). Captura, borradores y cierre atómico que exige originales de todas las recepciones; [guía](../tecnologia/calidad.md) y [evidencia](05-sprint01/calidad-implementacion.md). Históricos sin original permanecen bloqueados, sin backfill informal. RF-06/RF-07 tienen cobertura parcial, sin aprobación docente ni validación agrícola.

- [Especificación y criterios D1–D7](03-diseno-de-software/04-especificacion-acopio-consolidacion.md)
- [ADR-011 y validaciones pendientes](02-arquitectura/08-decisiones-acopio.md)
- [Guía de ejecución](../tecnologia/acopio.md)
- [Evidencias y continuidad](05-sprint01/acopio-implementacion.md)

## Publicación pública QR

[Contrato, estados y PQ-01–13](03-diseno-de-software/06-especificacion-publicacion-qr.md), [ADR-013 / ADR-005 / ADR-008](02-arquitectura/10-decisiones-publicacion-qr.md), [guía](../tecnologia/publicacion-qr.md), [evidencia](05-sprint01/evidence/qr/README.md), [revisión e integración de Calidad #4](05-sprint01/revision-pr4.md). Publicación no equivale a aprobar Calidad.

## Inventario, Reserva, Despacho y Entrega

[Especificación D1–D9 adoptadas](03-diseno-de-software/07-especificacion-inventario-despacho-entrega.md), [ADR-014](02-arquitectura/11-decisiones-inventario-despacho.md), [implementación y evidencia](05-sprint01/inventario-implementacion.md), [continuidad](05-sprint01/continuidad-inventario.md). Implementado en PR #7, sin fusionar, sobre main 47d827c. [Corrección de fiabilidad de main](05-sprint01/revision-sonar-main.md), [triage Sonar de Logística](05-sprint01/revision-sonar-logistica.md). RF-10 parcial, sin pallets/empaque. [Matriz de 16 criterios transcritos](05-sprint01/matriz-trabajo-final.md): Fuente: transcripción del estudiante, pendiente de cotejar con el PDF original; SDD por aclarar con la docente.

## Revisión #7 y siguiente incremento propuesto

[Revisión individual de 20 avisos y recorrido](05-sprint01/revision-pr7.md). PR #7 permanece sin fusionar. [Captura offline RF-03/DA01](03-diseno-de-software/08-especificacion-offline-cosecha.md) y [ADR-015 propuesta](02-arquitectura/12-propuesta-offline-movil.md): decisiones O1–O10 pendientes, sin implementar ni sustituir Flutter.
