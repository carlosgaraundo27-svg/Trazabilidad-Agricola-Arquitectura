# Arquitectura Técnica y Despliegue

## 1. Arquitectura lógica y arquitectura física

La arquitectura lógica describe responsabilidades y comunicaciones: clientes, API REST, módulos, persistencia, caché y analítica. La arquitectura física describe dónde se ejecutan esos elementos: dispositivos cliente, contenedores Docker y recursos de servidor o nube.

No deben confundirse. Varios módulos lógicos pueden ejecutarse dentro de una misma aplicación backend y un mismo contenedor de aplicación.

## 2. Diagrama de despliegue propuesto

~~~mermaid
flowchart TB
    subgraph USERS["Dispositivos de usuario"]
      ANDROID["Dispositivo Android<br/>App móvil"]
      BROWSER["Navegador web<br/>Portal / QR"]
    end

    INTERNET["Internet / HTTPS"]
    FW["Firewall / reglas de red"]

    subgraph HOST["Servidor o entorno Cloud del prototipo"]
      WEB["Frontend web<br/>estático servido por Nginx"]
      API["Contenedor Docker<br/>API REST monolítica modular"]
      WORKER["Proceso/contenedor ETL<br/>programado"]
    end

    subgraph DATA["Persistencia y soporte"]
      PG[("PostgreSQL<br/>datos operativos")]
      REDIS[("Redis<br/>caché QR / arquitectura objetivo")]
      DM[("Datamart lógico<br/>esquema analítico")]
      FILES["Almacenamiento de evidencias"]
    end

    ANDROID --> INTERNET
    BROWSER --> INTERNET
    INTERNET --> FW
    FW --> WEB
    FW --> API
    API --> PG
    API --> REDIS
    API --> FILES
    PG --> WORKER
    WORKER --> DM
    API -->|"Lectura de reportes"| DM
~~~

## 3. Nodos propuestos

| Nodo | Responsabilidad | Tecnología de referencia | Estado |
|---|---|---|---|
| Cliente de campo | Captura local y sincronización | Flutter + almacenamiento local | Propuesto en la propuesta técnica |
| Cliente web | Operaciones administrativas y consulta QR | React/Tailwind o equivalente | Selección final pendiente |
| Servidor web | Entregar frontend y manejar HTTPS/proxy | Nginx | Referencia inicial |
| Servidor de aplicación | API REST y módulos de negocio en una sola unidad desplegable | NestJS recomendado; Spring Boot era alternativa | Debe ratificarse por ADR antes de codificar |
| Persistencia OLTP | Datos transaccionales, lotes e historial | PostgreSQL | Decisión documentada (ADR-004) |
| Caché | Respuestas frecuentes QR | Redis | Componente previsto en la arquitectura objetivo (ADR-005); se debe probar la política de expiración y el beneficio de rendimiento. Si se decide excluirlo del MVP, se actualizará la ADR. |
| Proceso ETL | Transformar/extraer datos para analítica | Job programado; tecnología por decidir | Propuesto |
| Datamart | Indicadores analíticos | Esquema lógico analítico PostgreSQL al inicio | Propuesto |
| Contenedores | Repetibilidad del despliegue | Docker | Restricción RC05 / ADR-007 |
| Servicios externos | Mapas, archivos y notificaciones | Proveedor por seleccionar | Integraciones proyectadas |

## 4. Topología para el prototipo

La propuesta original incluye dimensionamientos académicos de referencia para servidor web, aplicación, base de datos/analítica y dispositivo móvil. Son valores de planificación, no una garantía de capacidad ni una recomendación para producción. El dimensionamiento real debe validarse mediante pruebas de carga, retención de datos, copias de seguridad y presupuesto.

Para reducir complejidad en el prototipo:

- Puede iniciarse con una aplicación backend en un contenedor Docker.
- PostgreSQL conserva el almacén transaccional principal.
- El Datamart puede empezar como esquema lógico separado en PostgreSQL, alimentado por ETL. En la misma instancia comparte recursos con OLTP; su impacto se validará mediante EQ-07.
- Redis se conserva como componente previsto para consultas QR, con validación de su necesidad y política de expiración.
- Los archivos adjuntos deben almacenarse fuera de las tablas transaccionales cuando el volumen y la operación lo justifiquen.
- Los servicios externos solo se integran cuando estén dentro del alcance aprobado.

## 5. Seguridad de la red y del despliegue

- Exponer únicamente endpoints necesarios y protegerlos mediante HTTPS.
- La base de datos y Redis no deben quedar expuestos directamente a internet.
- Guardar credenciales en variables de entorno o gestor de secretos; nunca en Git.
- Configurar copias de seguridad y probar la restauración.
- Separar permisos de base de datos por responsabilidad cuando la tecnología y el tiempo lo permitan.
- Registrar errores operativos y acciones críticas evitando capturar secretos o datos sensibles en logs.

## 6. Stack: recomendación sujeta a ratificación

Para evitar mantener alternativas indefinidamente, se recomienda evaluar y aprobar un stack coherente:

- Web: React + TypeScript + Tailwind.
- Móvil: Flutter.
- Backend: NestJS + TypeScript.
- Datos: PostgreSQL.
- Caché: Redis incluido en la arquitectura objetivo (ADR-005), con beneficio y políticas pendientes de validación. Su exclusión del MVP requerirá actualizar la ADR y los diagramas.
- Analítica: proceso ETL y Datamart lógico sobre PostgreSQL en la primera iteración.
- Despliegue: Docker y servidor Cloud académico.

La elección de NestJS es una recomendación técnica para compartir TypeScript con el frontend y facilitar la organización modular, no un hecho ya implementado. La decisión final debe registrarse en ADR y mantenerse coherente entre documentación, código y presentación.
