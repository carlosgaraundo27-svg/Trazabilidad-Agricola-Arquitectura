# Trazabilidad y Gestión Comercial de Palta Hass

**Proyecto:** Diseño de una arquitectura de software para la trazabilidad y gestión comercial de la cadena de suministro de palta Hass en una organización agrícola peruana.  
**Curso:** Arquitectura de Software (IS-488) — UNSCH, 2026-II  
**Tipo de entrega:** Documentación técnica de arquitectura — Sprint 01  
**Estado:** Propuesta arquitectónica y de diseño; no representa una aplicación productiva implementada.

## 1. Problema y objetivo

La información de productores, parcelas, cosecha, recepción, calidad, inventario, transporte y entrega puede quedar distribuida en distintos puntos de la cadena. Esto dificulta reconstruir el origen y recorrido de un lote, identificar mermas y disponer de indicadores para tomar decisiones.

La propuesta centraliza la información del proceso en torno al **lote agrícola como unidad de trazabilidad**, con historial de eventos y consulta pública limitada mediante QR.

## 2. Decisión arquitectónica principal

- **Estilo global:** Monolito Modular.
- **Organización complementaria:** estructura en capas.
- **Comunicación:** API REST sobre HTTPS entre clientes y backend.
- **Enfoque interno:** Clean Architecture.
- **Persistencia transaccional:** PostgreSQL (OLTP).
- **Caché QR:** Redis, dentro de la arquitectura objetivo.
- **Analítica:** ETL + Datamart lógico (OLAP).
- **Despliegue del prototipo:** Docker.

Se propone un Monolito Modular porque los procesos comparten datos del lote y necesitan consistencia, mientras los módulos separados permiten mantener las responsabilidades claras. No se seleccionan microservicios para el alcance inicial, ya que añadirían complejidad operativa sin una necesidad independiente demostrada.

## 3. Clientes y módulos

**Clientes:** app móvil para campo y captura offline, portal web administrativo/operativo y consulta pública QR de solo lectura.

**Módulos del backend:** Productores, Cosecha, Acopio y Calidad, Trazabilidad, Logística e Inventario, Reportes y Acceso/Permisos.

## 4. Documentación oficial para el Sprint 01

La documentación canónica está organizada según la Guía 04 en los directorios **docs/** y **tecnologia/**.

| Documento | Contenido |
|---|---|
| [Índice documental](docs/README.md) | Navegación del entregable completo. |
| [Actores](docs/01-analisis-de-sistema/01-actores.md) | Actores humanos e integraciones externas. |
| [Historias de usuario](docs/01-analisis-de-sistema/02-historias-del-usuario.md) | Necesidades por rol, HU01–HU09. |
| [Requisitos funcionales](docs/01-analisis-de-sistema/03-requisitos-funcionales.md) | RF-01–RF-13 y matriz HU–RF. |
| [Atributos de calidad](docs/01-analisis-de-sistema/04-atributos-de-calidad.md) | Definiciones aplicadas al sistema. |
| [Restricciones](docs/01-analisis-de-sistema/05-restricciones.md) | Límites de alcance, conectividad, datos y despliegue. |
| [Drivers arquitectónicos](docs/01-analisis-de-sistema/06-drivers-arquitectonicos.md) | DA01–DA06, prioridad y trazabilidad. |
| [Escenarios medibles de calidad](docs/01-analisis-de-sistema/08-escenarios-atributos-calidad.md) | EQ-01–EQ-07; metas propuestas pendientes de validación. |
| [Registro de alineamiento](docs/02-arquitectura/00-registro-alineamiento.md) | Resuelve diferencias entre la propuesta inicial y la línea actual. |
| [Estilo arquitectónico](docs/02-arquitectura/01-estilo-arquitectonico.md) | Monolito Modular y justificación. |
| [Enfoque arquitectónico](docs/02-arquitectura/02-enfoque-arquitectonico.md) | Clean Architecture y regla de dependencias. |
| [Decisiones arquitectónicas](docs/02-arquitectura/03-decisiones-arquitectonicas.md) | ADR-001–ADR-008. |
| [Componentes y requisitos](docs/02-arquitectura/04-componentes-arquitectonicos.md) | Diagrama de componentes y matriz requisito–componente–decisión. |
| [Arquitectura técnica y despliegue](docs/02-arquitectura/05-arquitectura-tecnica-despliegue.md) | Nodos, contenedores, seguridad y stack propuesto. |
| [Matriz de acceso y seguridad](docs/02-arquitectura/06-matriz-accesos-seguridad.md) | Roles, permisos y clasificación de datos; pendiente de aprobación. |
| [Diseño interno](docs/03-diseno-de-software/01-diseno-interno.md) | Entidades, casos de uso, puertos, adaptadores y secuencias. |
| [Modelo de datos conceptual](docs/03-diseno-de-software/02-modelo-datos-conceptual.md) | Entidades y relaciones principales. |
| [Modelo C4](docs/04-modelo-c4/modelo-c4.md) | C1 Contexto, C2 Contenedores, C3 Componentes y vista C4 conceptual. |
| [Ejemplo Clean Architecture](tecnologia/ejemplo-clean-architecture.md) | Ejemplo didáctico de dominio, interfaz y caso de uso. |

## 5. Trazabilidad que debe mantenerse

Los elementos del diagrama no se eligen arbitrariamente. La explicación debe recorrer:

**Necesidad → requisito RF → historia HU → atributo/driver → decisión ADR → componente → escenario de verificación EQ.**

Ejemplo: consulta QR → RF-08/RF-09 → HU07 → rendimiento/seguridad → DA03/DA06 → ADR-005/ADR-008 → API + módulo de Trazabilidad + PostgreSQL/Redis → EQ-01/EQ-04.

## 6. Estado de implementación y decisiones pendientes

Este Sprint entrega documentación de arquitectura y diseño. Los diagramas de clases, el C4 y el ejemplo de tecnología muestran la solución prevista, pero **no certifican que los módulos estén implementados o probados**.

Antes de implementar o declarar resultados, el equipo debe:
1. Ratificar la tecnología backend (NestJS recomendado; Spring Boot figura como alternativa original) y la tecnología final del portal.
2. Aprobar las metas numéricas propuestas en los escenarios de calidad y documentar el entorno de prueba.
3. Definir reglas exactas de sincronización offline, conflictos e idempotencia.
4. Completar la matriz de roles y permisos.
5. Confirmar la ubicación física del Datamart y validar la estrategia de caché.
6. Diseñar el esquema lógico/físico de base de datos y APIs.

## 7. Referencia de repositorio

Esta es la URL para entregar el Sprint 01:

**https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura**
