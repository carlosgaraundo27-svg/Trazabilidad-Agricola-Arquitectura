# Arquitectura del Sistema de Trazabilidad Agrícola

## Diagrama de Arquitectura (Despliegue Lógico)

```mermaid
flowchart TD
%% =========================
%% CLIENTES / PRESENTACIÓN
%% =========================
subgraph PRESENTACION["CAPA DE PRESENTACIÓN"]
AppMovil["App Móvil (Offline/Campo)"]
PortalWeb["Portal Web (Admin/Operadores)"]
ConsultaQR["Consulta QR (Público)"]
end

%% =========================
%% SERVICIOS Y NEGOCIO
%% =========================
subgraph SERVICIOS["CAPA DE SERVICIOS Y NEGOCIO"]
API["API REST (Gateway/Auth)"]

    subgraph MODULOS["Módulos de Dominio"]
    ModProd["Productores"]
    ModCosecha["Cosecha"]
    ModAcopio["Acopio y Calidad"]
    ModTraz["Trazabilidad"]
    ModLog["Logística e Inventario"]
    ModRep["Reportes"]
    end
    API --> MODULOS
end

%% =========================
%% PERSISTENCIA Y ANALÍTICA
%% =========================
subgraph PERSISTENCIA["CAPA DE PERSISTENCIA"]
BD["Base de Datos PostgreSQL (OLTP)"]
Cache["Redis (Caché QR)"]
Datamart["Datamart (OLAP / BI)"]
end

%% =========================
%% SOPORTE EXTERNO
%% =========================
subgraph EXTERNOS["SERVICIOS EXTERNOS"]
GPS["Geolocalización / Mapas"]
Storage["Almacenamiento (Archivos/Imágenes)"]
Notif["Notificaciones (Email/SMS)"]
end

%% =========================
%% FLUJO DE COMUNICACIÓN
%% =========================
AppMovil -->|"Sincronización API"| API
PortalWeb -->|"Peticiones HTTPS"| API
ConsultaQR -->|"Lectura Rápida"| API

MODULOS --> BD
MODULOS --> Cache
BD -.->|"Proceso ETL"| Datamart
ModRep --> Datamart

MODULOS --> EXTERNOS

%% =========================
%% ESTILOS VISUALES
%% =========================
style PRESENTACION fill:#2d3748,stroke:#4fd1c5,stroke-width:2px,color:#fff
style SERVICIOS fill:#2d3748,stroke:#4fd1c5,stroke-width:2px,color:#fff
style PERSISTENCIA fill:#2d3748,stroke:#4fd1c5,stroke-width:2px,color:#fff
style EXTERNOS fill:#2d3748,stroke:#4fd1c5,stroke-width:2px,color:#fff
style MODULOS fill:#4a5568,stroke:#a0aec0,stroke-width:1px,color:#fff

style AppMovil fill:#1a202c,stroke:#fff,color:#fff
style PortalWeb fill:#1a202c,stroke:#fff,color:#fff
style ConsultaQR fill:#1a202c,stroke:#fff,color:#fff
style API fill:#1a202c,stroke:#fff,color:#fff
style BD fill:#1a202c,stroke:#fff,color:#fff
style Cache fill:#1a202c,stroke:#fff,color:#fff
style Datamart fill:#1a202c,stroke:#fff,color:#fff
style ModProd fill:#2d3748,stroke:#fff,color:#fff
style ModCosecha fill:#2d3748,stroke:#fff,color:#fff
style ModAcopio fill:#2d3748,stroke:#fff,color:#fff
style ModTraz fill:#2d3748,stroke:#fff,color:#fff
style ModLog fill:#2d3748,stroke:#fff,color:#fff
style ModRep fill:#2d3748,stroke:#fff,color:#fff