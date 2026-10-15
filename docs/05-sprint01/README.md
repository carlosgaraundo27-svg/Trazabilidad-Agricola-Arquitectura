# Sprint 01 — Documentación de Arquitectura y Diseño

**Proyecto:** Trazabilidad y Gestión Comercial de Palta Hass  
**Curso:** Arquitectura de Software (IS-488) — UNSCH, 2026-II  
**Entregable:** Documentación técnica de análisis, arquitectura y diseño  
**Estado:** Propuesta arquitectónica documentada; la implementación y las metas de calidad no se consideran verificadas.

## 1. Propósito del Sprint

Este Sprint organiza y consolida la propuesta arquitectónica del sistema de trazabilidad agrícola. Define el problema que aborda la solución, sus actores y requisitos, los atributos de calidad y drivers arquitectónicos, las principales decisiones de arquitectura, los componentes, el despliegue objetivo y el diseño conceptual del software.

El foco de la solución es mantener la trazabilidad del **lote agrícola** desde el productor y la parcela hasta la cosecha, recepción, calidad, inventario, transporte y entrega, conservando un historial operativo consultable y una vista pública limitada mediante código QR.

> **Límite del entregable:** los diagramas, componentes y tecnologías descritos representan el diseño propuesto. No constituyen evidencia de que exista una aplicación productiva, ni de que se hayan ejecutado pruebas de rendimiento o seguridad.

## 2. Problema y objetivo del sistema

La información de las etapas de la cadena agrícola puede mantenerse en registros separados, dificultando reconstruir el origen y recorrido de un lote, analizar mermas y consultar indicadores operativos.

La propuesta busca centralizar la información del ciclo de vida del lote, controlar los cambios y eventos de trazabilidad y facilitar el acceso a información autorizada para los usuarios internos y los consumidores que consultan un QR.

## 3. Línea base de arquitectura

| Elemento | Propuesta para el sistema |
|---|---|
| **Estilo arquitectónico principal** | Monolito Modular: una aplicación backend desplegable como unidad, organizada en módulos funcionales. |
| **Enfoque interno** | Clean Architecture: dominio, aplicación, presentación/adaptadores e infraestructura; las dependencias se orientan hacia el núcleo del negocio. |
| **Comunicación** | API REST sobre HTTPS para los clientes móviles, web y la consulta pública. |
| **Persistencia operativa** | PostgreSQL como base transaccional principal (OLTP). |
| **Consultas públicas QR** | Redis como caché propuesta; PostgreSQL continúa siendo la fuente transaccional de verdad. |
| **Analítica** | Proceso ETL y Datamart lógico (OLAP), separados de las operaciones transaccionales. |
| **Despliegue** | Docker para estandarizar el entorno previsto. |
| **Seguridad** | Autenticación de usuarios internos, autorización por roles y exposición controlada de la vista pública QR. |

El Monolito Modular se selecciona para mantener juntos los procesos que comparten información del lote, sin renunciar a límites funcionales internos. Los microservicios no forman parte del diseño inicial porque aumentarían la complejidad operacional y de consistencia distribuida sin una necesidad independiente demostrada.

**Pendiente de ratificación:** NestJS figura como tecnología backend recomendada, mientras que la documentación inicial también menciona Spring Boot y una ilustración de despliegue señala Python/FastAPI. La tecnología final debe confirmarse antes de implementar.

## 4. Clientes y responsabilidades funcionales

### Clientes previstos

- **Aplicación móvil de campo:** registrar actividades de cosecha y conservar información local cuando no haya conectividad, para sincronizarla posteriormente.
- **Portal web administrativo y operativo:** gestionar las funciones internas según los permisos asignados.
- **Consulta pública QR:** mostrar únicamente información de trazabilidad autorizada y en modo de solo lectura.

### Módulos del backend propuesto

- Productores y parcelas.
- Cosecha.
- Acopio y calidad.
- Lotes y trazabilidad.
- Logística e inventario.
- Reportes y analítica.
- Acceso, usuarios, roles y permisos.

Estos módulos se describen como responsabilidades lógicas dentro del mismo backend; no implican servicios desplegados de forma independiente.

## 5. Índice documental del Sprint 01

Los documentos siguientes constituyen el detalle del análisis, la arquitectura y el diseño.

### 5.1 Análisis del sistema

| Documento | Contenido |
|---|---|
| [Actores](../01-analisis-de-sistema/01-actores.md) | Usuarios, roles e integraciones externas. |
| [Historias de usuario](../01-analisis-de-sistema/02-historias-del-usuario.md) | Necesidades y objetivos por rol (HU). |
| [Requisitos funcionales](../01-analisis-de-sistema/03-requisitos-funcionales.md) | RF-01–RF-13 y relación con las historias de usuario. |
| [Atributos de calidad](../01-analisis-de-sistema/04-atributos-de-calidad.md) | Cualidades que la solución debe considerar. |
| [Restricciones](../01-analisis-de-sistema/05-restricciones.md) | Límites de alcance, conectividad, información y despliegue. |
| [Drivers arquitectónicos](../01-analisis-de-sistema/06-drivers-arquitectonicos.md) | DA01–DA06 que orientan las decisiones. |
| [Escenarios de atributos de calidad](../01-analisis-de-sistema/08-escenarios-atributos-calidad.md) | EQ-01–EQ-07; metas propuestas pendientes de validación. |

### 5.2 Arquitectura

| Documento | Contenido |
|---|---|
| [Registro de alineamiento](../02-arquitectura/00-registro-alineamiento.md) | Diferencias de la propuesta inicial y decisiones que requieren ratificación. |
| [Estilo arquitectónico](../02-arquitectura/01-estilo-arquitectonico.md) | Monolito Modular y su justificación. |
| [Enfoque arquitectónico](../02-arquitectura/02-enfoque-arquitectonico.md) | Clean Architecture y dirección de dependencias. |
| [Decisiones arquitectónicas](../02-arquitectura/03-decisiones-arquitectonicas.md) | ADR-001–ADR-008, con contexto, decisión y consecuencias. |
| [Componentes arquitectónicos](../02-arquitectura/04-componentes-arquitectonicos.md) | Módulos y trazabilidad entre requisitos, drivers y componentes. |
| [Arquitectura técnica y despliegue](../02-arquitectura/05-arquitectura-tecnica-despliegue.md) | Clientes, componentes de infraestructura, seguridad y tecnologías propuestas. |
| [Matriz de acceso y seguridad](../02-arquitectura/06-matriz-accesos-seguridad.md) | Accesos por rol y clasificación de datos; pendiente de aprobación. |

### 5.3 Diseño y modelo C4

| Documento | Contenido |
|---|---|
| [Diseño interno del software](../03-diseno-de-software/01-diseno-interno.md) | Entidades, casos de uso, interfaces, adaptadores y secuencias. |
| [Modelo de datos conceptual](../03-diseno-de-software/02-modelo-datos-conceptual.md) | Entidades principales y relaciones del dominio. |
| [Modelo C4](../04-modelo-c4/modelo-c4.md) | Contexto (C1), contenedores (C2), componentes (C3) y vista conceptual de código (C4). |
| [Ejemplo de Clean Architecture](../../tecnologia/ejemplo-clean-architecture.md) | Ejemplo didáctico complementario de la organización interna. |

Para navegar por toda la documentación del proyecto, consultar el [índice general de documentos](../README.md) y la [página principal del repositorio](../../README.md).

## 6. Trazabilidad arquitectónica

Las decisiones técnicas deben justificarse desde las necesidades del sistema. La cadena documental utilizada es:

```text
Necesidad del negocio
        ↓
Historia de usuario y requisito funcional (HU / RF)
        ↓
Atributo de calidad y driver arquitectónico (DA)
        ↓
Decisión arquitectónica (ADR)
        ↓
Componente o módulo responsable
        ↓
Escenario de calidad para su verificación (EQ)
```

**Ejemplo: consulta pública mediante QR**

La consulta del historial público se relaciona con RF-08/RF-09 y HU07. El rendimiento y el control de exposición de datos conducen a los drivers correspondientes y a decisiones como la API REST, la vista pública controlada y el uso propuesto de Redis como caché. Los escenarios EQ asociados describen cómo debería comprobarse la solución cuando exista una implementación y un entorno de prueba.

## 7. Decisiones y pendientes antes de implementar

1. **Ratificar el backend:** resolver la diferencia entre NestJS, Spring Boot y la referencia a Python/FastAPI presente en materiales iniciales.
2. **Validar el cronograma:** confirmar la duración definitiva del proyecto, pues la propuesta inicial contiene referencias distintas de semanas.
3. **Aprobar escenarios de calidad:** acordar umbrales, entorno, carga y método de medición antes de presentar resultados.
4. **Especificar la sincronización offline:** definir resolución de conflictos, reintentos e idempotencia.
5. **Completar la seguridad:** revisar y aprobar roles, permisos y datos visibles mediante QR.
6. **Precisar componentes de soporte:** definir expiración e invalidación de caché, ubicación del Datamart y responsabilidades de ETL.
7. **Detallar contratos e implementación:** diseñar el esquema lógico/físico de base de datos y las interfaces de la API.

## 8. Orden recomendado de lectura

1. Analizar actores, historias de usuario, requisitos y restricciones.
2. Revisar atributos de calidad, drivers y escenarios EQ.
3. Leer el registro de alineamiento, el estilo y el enfoque arquitectónico.
4. Revisar las ADR y la matriz de componentes.
5. Consultar la arquitectura técnica, la matriz de seguridad y los modelos de diseño/C4.

## 9. Estado final del entregable

El Sprint 01 establece una base documental coherente para continuar el diseño. La decisión global es **Monolito Modular**, estructurado internamente con **Clean Architecture**, comunicado por **API REST sobre HTTPS**, con **PostgreSQL** para operaciones, **Redis** como caché QR propuesta y un flujo separado de **ETL/Datamart** para analítica.

La documentación deberá actualizarse cuando se ratifiquen las decisiones pendientes o cambie el diseño. Las metas de calidad se consideran objetivos por validar, no resultados ya medidos.
