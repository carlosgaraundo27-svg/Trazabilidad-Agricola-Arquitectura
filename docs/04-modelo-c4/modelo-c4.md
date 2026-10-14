# Modelo C4 de la Arquitectura

## Convenciones y estado

Este documento presenta cuatro niveles de detalle siguiendo la Guía 04:

- **C1 - Contexto:** actores y sistemas externos.
- **C2 - Contenedores:** aplicaciones, servicios ejecutables y almacenes de datos.
- **C3 - Componentes:** responsabilidades dentro del backend.
- **C4 - Código:** estructura conceptual de clases e interfaces de un componente.

Son vistas **propuestas de diseño**, no evidencia de código actualmente implementado. Los nombres de componentes internos se deben mantener consistentes con los requisitos y la matriz de trazabilidad.

## C1. Diagrama de contexto del sistema

~~~mermaid
flowchart LR
    PRODUCER["Productor"]
    FIELD["Recolector / Cuadrilla"]
    OPS["Operario de acopio"]
    QA["Responsable de calidad"]
    LOGI["Encargado logístico"]
    ADMIN["Administrador"]
    BUYER["Comprador"]
    PUBLIC["Consumidor / público"]

    SYSTEM["Plataforma de Trazabilidad<br/>y Gestión Comercial de Palta Hass"]

    MAPS["Servicio de mapas / GPS"]
    STORAGE["Almacenamiento de archivos"]
    NOTIFY["Servicio de notificaciones"]

    PRODUCER -->|"Datos de productor y parcela"| SYSTEM
    FIELD -->|"Registro de cosecha"| SYSTEM
    OPS -->|"Recepción y pesaje"| SYSTEM
    QA -->|"Controles y clasificación"| SYSTEM
    LOGI -->|"Despachos y transporte"| SYSTEM
    ADMIN -->|"Usuarios, roles y catálogos"| SYSTEM
    BUYER -->|"Consultas autorizadas y reportes"| SYSTEM
    PUBLIC -->|"Consulta QR de solo lectura"| SYSTEM

    SYSTEM <-->|"Georreferenciación"| MAPS
    SYSTEM <-->|"Evidencias y documentos"| STORAGE
    SYSTEM -->|"Avisos operativos"| NOTIFY
~~~

### Lectura del C1

El sistema es responsable de centralizar el historial del lote. Los usuarios internos realizan operaciones según su rol. El consumidor o público no administra ni modifica información: únicamente consulta los datos que la organización haya autorizado para publicación. Mapas, almacenamiento y notificaciones son integraciones de soporte previstas; su habilitación concreta depende del alcance aprobado.

## C2. Diagrama de contenedores

~~~mermaid
flowchart TB
    subgraph CLIENTES["Clientes"]
      MOBILE["App móvil de campo<br/>Flutter propuesto<br/>SQLite/local store"]
      WEB["Portal web administrativo<br/>React + Tailwind propuestos"]
      QR["Interfaz pública QR<br/>web adaptable"]
    end

    subgraph CLOUD["Entorno de despliegue propuesto"]
      API["Backend REST<br/>Monolito Modular<br/>NestJS recomendado / pendiente de ratificación"]
      PG[("PostgreSQL<br/>OLTP")]
      REDIS[("Redis<br/>caché QR")]
      ETL["Proceso ETL"]
      DM[("Datamart lógico<br/>OLAP / BI")]
    end

    MAPS["Mapas / GPS"]
    STORE["Almacenamiento de archivos"]
    NOTIFY["Email / SMS"]

    MOBILE -->|"HTTPS; sincronización diferida"| API
    WEB -->|"HTTPS / REST"| API
    QR -->|"HTTPS / consulta pública"| API
    API -->|"Lectura y escritura transaccional"| PG
    API -->|"Consulta cacheada cuando aplica"| REDIS
    PG -->|"Extracción de eventos/datos elegidos"| ETL
    ETL --> DM
    API --> MAPS
    API --> STORE
    API --> NOTIFY
~~~

### Responsabilidad de los contenedores

| Contenedor | Responsabilidad | Requisitos relacionados |
|---|---|---|
| App móvil | Capturar cosecha en línea o sin conexión, guardar localmente y sincronizar. | RF-03, RF-04 / HU02 / DA01 |
| Portal web | Facilitar operaciones administrativas, acopio, calidad, logística y reportes. | RF-01, RF-02, RF-05 a RF-07, RF-10 a RF-12 |
| Interfaz QR | Presentar información pública de un lote, en modo de solo lectura. | RF-08, RF-09 / HU07 / DA06 |
| Backend REST | Aplicar seguridad, ejecutar casos de uso y coordinar módulos. | RF-01 a RF-12 / ADR-003, ADR-008 |
| PostgreSQL OLTP | Guardar información transaccional y el historial operativo. | RF-01 a RF-11 / RC04 / ADR-004 |
| Redis | Acelerar lecturas QR repetitivas; no es fuente de verdad. | RF-08 / DA03 / ADR-005 |
| ETL + Datamart | Procesar datos para análisis sin cargar directamente la operación transaccional. | RF-12 / DA05 / ADR-006 |

**Nota tecnológica:** la propuesta original deja NestJS o Spring Boot como opciones de backend y React/Tailwind o equivalente para web. Para diagramas y ejemplos se recomienda NestJS por coherencia con una solución TypeScript, pero la selección final debe ratificarse como decisión del equipo antes de implementar. Flutter y PostgreSQL sí están incluidos en la propuesta; Redis aparece como opción para la optimización de QR.

## C3. Diagrama de componentes del backend

~~~mermaid
flowchart TB
    CLIENTS["App móvil / Portal web / QR"]
    API["Controladores REST y DTO"]
    SECURITY["Autenticación y autorización RBAC"]

    subgraph APPLICATION["Capa de Aplicación"]
      UC_PROD["Casos de uso de Productores"]
      UC_CROP["Casos de uso de Cosecha"]
      UC_LOT["Casos de uso de Lotes y Trazabilidad"]
      UC_QA["Casos de uso de Acopio y Calidad"]
      UC_LOG["Casos de uso de Inventario y Logística"]
      UC_REPORT["Casos de uso de Reportes"]
      PORTS["Puertos / interfaces"]
    end

    subgraph DOMAIN["Dominio"]
      ENTITIES["Productor, Parcela, PreLote, Lote"]
      EVENT["EventoTrazabilidad"]
      RULES["Reglas de calidad, estados e inventario"]
    end

    subgraph INFRA["Infraestructura"]
      PGADAPTER["Adaptadores PostgreSQL"]
      CACHEADAPTER["Adaptador Redis"]
      EXTADAPTERS["Adaptadores mapas / archivos / notificaciones"]
      ANALYTICS["Adaptador ETL / Datamart"]
    end

    CLIENTS --> API --> SECURITY
    SECURITY --> UC_PROD
    SECURITY --> UC_CROP
    SECURITY --> UC_LOT
    SECURITY --> UC_QA
    SECURITY --> UC_LOG
    SECURITY --> UC_REPORT

    UC_PROD --> ENTITIES
    UC_CROP --> ENTITIES
    UC_LOT --> EVENT
    UC_LOT --> RULES
    UC_QA --> RULES
    UC_LOG --> RULES

    UC_PROD --> PORTS
    UC_CROP --> PORTS
    UC_LOT --> PORTS
    UC_QA --> PORTS
    UC_LOG --> PORTS
    UC_REPORT --> PORTS

    PGADAPTER -.->|"implementa puertos"| PORTS
    CACHEADAPTER -.->|"implementa puerto de caché"| PORTS
    EXTADAPTERS -.->|"implementa puertos externos"| PORTS
    ANALYTICS -.->|"implementa puerto/proceso analítico"| PORTS
~~~

### Lectura del C3

El backend es un solo contenedor desplegable, aunque dentro tenga módulos funcionales y capas de Clean Architecture. La API recibe la solicitud; el caso de uso coordina la operación; el dominio aplica reglas; la infraestructura implementa las interfaces de persistencia y servicios externos. El diagrama es conceptual: las relaciones exactas de importación deben comprobarse cuando exista código.

## C4. Vista de código conceptual: consulta pública de trazabilidad

~~~mermaid
classDiagram
    class TrazabilidadQRController {
      +consultarPorCodigo(codigoQR)
    }
    class ConsultarTrazabilidadPublica {
      +ejecutar(codigoQR)
    }
    class TrazabilidadRepository {
      <<interface>>
      +obtenerHistorialPublico(codigoLote)
    }
    class QRCache {
      <<interface>>
      +obtener(codigoQR)
      +guardar(codigoQR, respuesta, ttl)
    }
    class PostgresTrazabilidadRepository {
      +obtenerHistorialPublico(codigoLote)
    }
    class RedisQRCache {
      +obtener(codigoQR)
      +guardar(codigoQR, respuesta, ttl)
    }
    class Lote {
      +id
      +codigo
      +estado
    }
    class EventoTrazabilidad {
      +tipo
      +fechaHora
      +actor
      +descripcionPublica
    }

    TrazabilidadQRController --> ConsultarTrazabilidadPublica
    ConsultarTrazabilidadPublica --> TrazabilidadRepository
    ConsultarTrazabilidadPublica --> QRCache
    PostgresTrazabilidadRepository ..|> TrazabilidadRepository
    RedisQRCache ..|> QRCache
    TrazabilidadRepository --> Lote
    TrazabilidadRepository --> EventoTrazabilidad
~~~

### Regla fundamental de Clean Architecture

El caso de uso depende de interfaces, no de las clases concretas Redis o PostgreSQL. Las implementaciones tecnológicas cumplen esos contratos. El dominio no debe importar controladores, frameworks, ORM ni clientes de servicios externos.

### Ejemplo de flujo QR

1. El visitante escanea el código.
2. El controlador valida formato y llama al caso de uso.
3. El caso de uso consulta la caché si corresponde.
4. En caso de no existir una entrada válida, obtiene la información necesaria desde el repositorio.
5. La respuesta se transforma a una proyección pública autorizada.
6. Solo se devuelve la información permitida para la vista QR.

## Límite de esta documentación

C4 llega al nivel conceptual de código para ilustrar las responsabilidades; no afirma que las clases ya existan en una aplicación ejecutable. La implementación deberá respetar los mismos límites y actualizar los diagramas si las decisiones aprobadas cambian.
