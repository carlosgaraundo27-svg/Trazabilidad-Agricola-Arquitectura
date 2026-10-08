# Estilo Arquitectónico

## 1. Estilo seleccionado

**Estilo arquitectónico principal: Monolito Modular.**

La solución se propone como un **monolito modular**, donde los módulos funcionales del sistema se ejecutan dentro de una misma aplicación backend desplegable, pero mantienen responsabilidades claramente separadas.

La organización interna se apoya complementariamente en una **estructura en capas** y una comunicación **cliente-servidor mediante API REST**. Por tanto, API REST y la organización en capas no se consideran el estilo principal, sino mecanismos de estructuración e integración que permiten materializar el estilo monolítico modular.

Este estilo es apropiado para el proyecto porque permite centralizar la trazabilidad de los lotes y mantener una consistencia transaccional sobre procesos estrechamente relacionados, evitando la complejidad operacional de distribuir prematuramente el sistema en microservicios.

## 2. Objetivo del estilo

El estilo arquitectónico busca:

- Centralizar la gestión de la trazabilidad agrícola en una única plataforma.
- Mantener separados los módulos funcionales para facilitar su evolución.
- Permitir que la aplicación móvil de campo, el portal administrativo y la consulta pública mediante QR consuman los mismos servicios de negocio.
- Garantizar una fuente transaccional central para productores, cosechas, lotes, calidad, inventario y despachos.
- Aislar los componentes de soporte, como caché, almacenamiento, geolocalización, notificaciones y analítica.
- Mantener una ruta de evolución futura hacia servicios independientes si el crecimiento del sistema lo justificara.

## 3. Organización global propuesta

### 3.1 Clientes / presentación

- **App móvil de campo:** registro de cosecha, generación de pre-lotes y sincronización posterior cuando exista conexión.
- **Portal web administrativo/operativo:** gestión de productores, acopio, calidad, inventario, logística y reportes.
- **Consulta pública QR:** acceso de solo lectura a la información pública de trazabilidad de un lote o pallet.

### 3.2 Backend monolítico modular

El backend se despliega como una única aplicación, internamente organizada en módulos de dominio:

- **Productores**
- **Cosecha**
- **Acopio y Calidad**
- **Trazabilidad**
- **Logística e Inventario**
- **Reportes**

El acceso de los clientes se realiza mediante una **API REST**, incluyendo los mecanismos necesarios de autenticación y autorización.

### 3.3 Persistencia y soporte

- **PostgreSQL:** almacenamiento transaccional principal (OLTP).
- **Redis:** caché orientada principalmente a consultas frecuentes de trazabilidad pública mediante QR.
- **Datamart:** almacenamiento analítico (OLAP) alimentado mediante procesos ETL para indicadores y reportes.

### 3.4 Servicios externos

- Geolocalización y mapas.
- Almacenamiento de archivos e imágenes.
- Servicios de notificaciones.

## 4. Diagrama del estilo arquitectónico

~~~mermaid
flowchart TB

    subgraph CLIENTES["CLIENTES / PRESENTACIÓN"]
        APP["App móvil de campo<br/>Offline / Online"]
        WEB["Portal web<br/>Administración y operaciones"]
        QR["Consulta pública<br/>Código QR"]
    end

    subgraph BACKEND["MONOLITO MODULAR - BACKEND"]
        API["API REST<br/>Autenticación / Autorización"]

        subgraph MODULOS["MÓDULOS FUNCIONALES"]
            PROD["Productores"]
            COSECHA["Cosecha"]
            ACOPIO["Acopio y Calidad"]
            TRAZ["Trazabilidad"]
            LOG["Logística e Inventario"]
            REPORT["Reportes"]
        end

        API --> PROD
        API --> COSECHA
        API --> ACOPIO
        API --> TRAZ
        API --> LOG
        API --> REPORT
    end

    subgraph PERSISTENCIA["PERSISTENCIA Y ANALÍTICA"]
        PG["PostgreSQL<br/>OLTP"]
        REDIS["Redis<br/>Caché QR"]
        ETL["ETL / proceso analítico"]
        DM["Datamart<br/>OLAP / BI"]
    end

    subgraph EXTERNOS["SERVICIOS EXTERNOS"]
        GPS["GPS / Mapas"]
        STORAGE["Almacenamiento de archivos"]
        NOTIF["Email / SMS"]
    end

    APP -->|"HTTPS / API REST<br/>Sincronización"| API
    WEB -->|"HTTPS / API REST"| API
    QR -->|"HTTPS / Consulta pública"| API

    PROD --> PG
    COSECHA --> PG
    ACOPIO --> PG
    TRAZ --> PG
    LOG --> PG
    REPORT --> PG

    TRAZ --> REDIS
    API -->|"Consultas frecuentes"| REDIS

    PG --> ETL
    ETL --> DM
    REPORT --> DM

    COSECHA --> GPS
    ACOPIO --> STORAGE
    LOG --> NOTIF
~~~

## 5. Correspondencia con los drivers arquitectónicos

| Driver | Respuesta del estilo arquitectónico |
|---|---|
| **DA01 - Operación desconectada en campo** | El cliente móvil mantiene operación local y posteriormente sincroniza con el backend mediante API REST. |
| **DA02 - Inmutabilidad y auditoría del lote** | El módulo de Trazabilidad concentra las reglas relacionadas con eventos e historial, manteniendo el control desde el backend. |
| **DA03 - Consultas públicas rápidas** | Redis se incorpora como componente de soporte para desacoplar las consultas QR frecuentes de la base transaccional. |
| **DA04 - Extensibilidad a nuevos cultivos** | Los módulos mantienen responsabilidades separadas, permitiendo incorporar reglas y procesos sin convertir el backend en un bloque monolítico sin estructura. |
| **DA05 - Separación analítica** | El OLTP permanece separado del procesamiento analítico mediante ETL y Datamart. |

## 6. ¿Por qué no microservicios?

Para el alcance actual, **no se selecciona microservicios como estilo principal** porque introduciría complejidad adicional en despliegue, observabilidad, comunicación entre servicios, consistencia distribuida y operación.

El monolito modular permite obtener una separación interna suficiente para el proyecto y deja abierta una evolución futura: un módulo que requiera escalabilidad o independencia podría extraerse posteriormente como servicio, sin obligar a distribuir todo el sistema desde el inicio.

## 7. Ventajas para el proyecto

- Menor complejidad de despliegue y operación.
- Transacciones centralizadas sobre el ciclo de vida del lote.
- Separación clara de responsabilidades.
- Facilidad para realizar pruebas e integración.
- Evolución progresiva del sistema.
- Posibilidad de incorporar nuevos cultivos y procesos.
- Compatibilidad con Docker y despliegue Cloud.
- Integración sencilla con PostgreSQL, Redis y servicios externos.

## 8. Limitaciones y medidas de control

| Riesgo del monolito | Medida arquitectónica |
|---|---|
| Crecimiento excesivo del backend | Mantener módulos independientes y contratos claros. |
| Alto acoplamiento entre módulos | Aplicar Clean Architecture como enfoque interno. |
| Sobrecarga de PostgreSQL por consultas QR | Utilizar Redis para consultas de alta frecuencia. |
| Crecimiento de necesidades analíticas | Mantener OLTP y Datamart separados. |
| Necesidad futura de escalar un módulo | Diseñar módulos con límites claros para una eventual extracción a servicios independientes. |

## 9. Decisión final

La arquitectura global seleccionada es:

> **Monolito Modular**, organizado internamente mediante una estructura en capas, expuesto mediante **API REST**, con PostgreSQL como persistencia transaccional, Redis como caché para consultas QR y un flujo separado de analítica mediante Datamart.

El detalle de las dependencias y responsabilidades internas se define mediante el **enfoque de Clean Architecture**, documentado en el archivo correspondiente.
