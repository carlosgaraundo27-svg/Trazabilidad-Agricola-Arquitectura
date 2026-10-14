# Componentes Arquitectónicos y Trazabilidad con Requisitos

## Propósito

Este documento relaciona los componentes de la solución con los requisitos funcionales (RF), historias de usuario (HU), drivers arquitectónicos (DA), restricciones (RC) y decisiones (ADR) que justifican su existencia. La trazabilidad es necesaria para responder durante la sustentación: **“¿De qué requisito sale este componente?”**

**Estado:** diseño propuesto. La presencia de un componente en el diagrama no significa que su código esté implementado.

## Diagrama de componentes del backend

~~~mermaid
flowchart TB
    MOBILE["App móvil de campo"]
    WEB["Portal web"]
    QR["Consulta pública QR"]

    API["API REST<br/>Autenticación + autorización"]

    subgraph BACKEND["Backend - Monolito Modular"]
      AUTH["Acceso y permisos"]
      PROD["Módulo Productores"]
      COSECHA["Módulo Cosecha"]
      ACOPIO["Módulo Acopio y Calidad"]
      TRAZA["Módulo Trazabilidad"]
      LOG["Módulo Logística e Inventario"]
      REPORT["Módulo Reportes"]
    end

    PG[("PostgreSQL / OLTP")]
    REDIS[("Redis / Caché QR")]
    ETL["Proceso ETL"]
    DM[("Datamart / OLAP")]
    EXT["Adaptadores externos<br/>Mapas, archivos, notificaciones"]

    MOBILE -->|"HTTPS / sincronización"| API
    WEB -->|"HTTPS"| API
    QR -->|"HTTPS / solo lectura"| API

    API --> AUTH
    API --> PROD
    API --> COSECHA
    API --> ACOPIO
    API --> TRAZA
    API --> LOG
    API --> REPORT

    PROD --> PG
    COSECHA --> PG
    ACOPIO --> PG
    TRAZA --> PG
    LOG --> PG
    REPORT --> PG
    TRAZA --> REDIS
    API --> EXT
    PG --> ETL --> DM
    REPORT --> DM
~~~

## Matriz de trazabilidad de componentes

| Componente | Responsabilidad | Requisitos / historias fuente | Drivers / restricciones | Decisiones |
|---|---|---|---|---|
| **App móvil de campo** | Capturar cosecha y conservar registros sin conexión. | RF-03, RF-04 / HU02 | DA01, RC01 | ADR-003; el almacenamiento local requiere decisión tecnológica detallada. |
| **Portal web** | Interfaz para administración y operación del sistema. | RF-01, RF-02, RF-05, RF-06, RF-07, RF-10, RF-11, RF-12 | Seguridad, usabilidad | ADR-003, ADR-008 |
| **Consulta pública QR** | Mostrar únicamente trazabilidad autorizada. | RF-08, RF-09 / HU05, HU07 | DA03, DA06, RC03 | ADR-005, ADR-008 |
| **API REST** | Recibir solicitudes, validar acceso y exponer casos de uso. | RF-01 a RF-13 / todas las HU que interactúan con el backend | DA01, DA06 | ADR-003, ADR-008 |
| **Acceso y permisos** | Autenticar usuarios y autorizar acciones por rol. | RF-13; requisito no funcional Seguridad; RF-08 para vista QR | DA06, RC03 | ADR-008 |
| **Módulo Productores** | Gestionar productores, asociaciones, parcelas y certificaciones. | RF-01, RF-02 / HU01 | DA04, DA06 | ADR-001, ADR-002, ADR-008 |
| **Módulo Cosecha** | Registrar cosecha, pre-lotes e información del responsable. | RF-03, RF-04 / HU02 | DA01, RC01 | ADR-001, ADR-002, ADR-003 |
| **Módulo Acopio y Calidad** | Registrar recepción, pesaje, atributos de calidad y clasificación. | RF-05, RF-06, RF-07 / HU03, HU04 | DA02 | ADR-001, ADR-002, ADR-004 |
| **Módulo Trazabilidad** | Identificar lotes, registrar eventos e historial, generar y consultar QR. | RF-04, RF-08, RF-09 / HU05, HU07 | DA02, DA03, DA06, RC03 | ADR-002, ADR-005, ADR-008 |
| **Módulo Logística e Inventario** | Mantener estados de stock, transporte, despacho y entrega. | RF-10, RF-11 / HU06 | DA02, DA06 | ADR-001, ADR-002, ADR-004 |
| **Módulo Reportes** | Generar indicadores de mermas, rendimiento, tiempos y liquidaciones. | RF-12 / HU08 | DA05 | ADR-006 |
| **PostgreSQL / OLTP** | Fuente transaccional de entidades y eventos del sistema. | RF-01 a RF-11; RF-12 como fuente de extracción | DA02, RC04 | ADR-004 |
| **Redis / caché QR** | Reducir lecturas repetidas al almacén transaccional para consultas QR. | RF-08; escenario EQ-01 | DA03 | ADR-005 |
| **ETL** | Transformar y trasladar datos seleccionados al modelo analítico. | RF-12 | DA05 | ADR-006 |
| **Datamart / OLAP** | Almacenar estructura orientada a indicadores y reportes. | RF-12 / HU08 | DA05, RC04 | ADR-006 |
| **Adaptadores externos** | Integrar mapas, almacenamiento de evidencias y notificaciones cuando se habiliten. | RF-01 georreferenciación; necesidades de soporte descritas en actores | Seguridad / mantenibilidad | Aplicación de puertos y adaptadores bajo ADR-002 |

## Reglas de diseño derivadas

1. La API no debe contener toda la lógica de negocio; coordina la entrada y salida de los casos de uso.
2. Los módulos pertenecen a una misma aplicación desplegable, pero no deben convertirse en una única colección de dependencias cruzadas.
3. El dominio conserva reglas de lotes, eventos, calidad y estados; no depende directamente de PostgreSQL, Redis ni de frameworks.
4. Redis es una caché, no la fuente de verdad de los datos del lote.
5. El Datamart se usa para análisis; PostgreSQL transaccional sigue siendo la fuente operativa.
6. La consulta QR utiliza una proyección pública explícita y no devuelve directamente la entidad interna completa.
7. Las dependencias externas se encapsulan detrás de interfaces/adaptadores; las integraciones se implementarán solo si están dentro del alcance aprobado.

## Ejemplo de trazabilidad completa

**Componente:** Consulta pública QR.

- **Necesidad de negocio:** conocer origen y recorrido del lote.
- **Requisito:** RF-08 (generar QR y vista pública) y RF-09 (conservar historial).
- **Historia:** HU07 (consumidor consulta por QR).
- **Atributos:** rendimiento y seguridad.
- **Drivers:** DA03 y DA06.
- **Decisiones:** ADR-005 (Redis como caché) y ADR-008 (seguridad y exposición controlada).
- **Componentes colaboradores:** API REST, caso de uso de consulta, repositorio de trazabilidad, PostgreSQL y, cuando aplique, Redis.
- **Verificación:** escenario EQ-01 de rendimiento y EQ-04 de seguridad.
