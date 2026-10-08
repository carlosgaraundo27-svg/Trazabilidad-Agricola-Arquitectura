# Enfoque Arquitectónico

## 1. Enfoque seleccionado

**Clean Architecture (Arquitectura Limpia).**

Clean Architecture se utilizará como **enfoque arquitectónico interno** del backend del sistema de trazabilidad agrícola.

Su función no es definir el despliegue global del sistema, sino establecer **cómo se organizan las responsabilidades y cómo se controlan las dependencias internas** de los módulos.

La regla principal es que las dependencias del código deben dirigirse hacia el núcleo del negocio. Por ello, las reglas de trazabilidad no deben depender directamente de PostgreSQL, Redis, Angular, Flutter, Docker o de un proveedor externo concreto.

## 2. Objetivo

El enfoque busca:

- Separar las reglas de negocio de los detalles tecnológicos.
- Evitar que el dominio dependa directamente de frameworks o bases de datos.
- Facilitar pruebas unitarias de las reglas de trazabilidad.
- Permitir sustituir componentes tecnológicos sin modificar innecesariamente el núcleo del negocio.
- Mantener una separación clara entre presentación, aplicación, dominio e infraestructura.
- Reducir el acoplamiento entre los módulos y sus mecanismos técnicos de persistencia o integración.

## 3. Capas de Clean Architecture aplicadas al proyecto

| Capa | Responsabilidad | Ejemplos en el proyecto |
|---|---|---|
| **Dominio** | Contiene las entidades, reglas y conceptos centrales del negocio. | Productor, Parcela, Pre-Lote, Lote, Evento de Trazabilidad, Calidad, Inventario, Despacho. |
| **Aplicación** | Orquesta los casos de uso y define los contratos necesarios para operar sobre el dominio. | Registrar cosecha, consolidar lote, registrar calidad, clasificar lote, generar QR, consultar trazabilidad, registrar despacho, generar indicadores. |
| **Presentación / Adaptadores** | Recibe solicitudes externas y transforma datos para interactuar con los casos de uso. | Controladores REST, DTO, serialización, endpoints de consulta QR y adaptadores de interfaz. |
| **Infraestructura** | Contiene implementaciones tecnológicas concretas. | Repositorios PostgreSQL, Redis, GPS/Mapas, almacenamiento de archivos, notificaciones y componentes de acceso a Datamart. |

## 4. Responsabilidades principales

### 4.1 Dominio

El dominio representa el núcleo de la trazabilidad y debe ser independiente de tecnologías externas.

Conceptos principales:

- **Productor**
- **Parcela**
- **Pre-Lote**
- **Lote**
- **Evento de Trazabilidad**
- **Control de Calidad**
- **Inventario**
- **Transporte / Despacho**

Reglas relevantes:

- Cada lote debe poseer un identificador único.
- Los eventos del lote deben conservar su historial.
- Los eventos cerrados no deben modificarse mediante operaciones normales.
- La clasificación del lote debe obedecer las reglas de negocio definidas.
- El estado del inventario debe seguir transiciones válidas.
- La información pública no debe exponer datos internos o personales no autorizados.

### 4.2 Aplicación

La capa de aplicación contiene los casos de uso que coordinan el flujo del negocio.

Casos de uso propuestos:

~~~text
RegistrarProductor
RegistrarCosecha
SincronizarPreLotes
ConsolidarLote
RegistrarRecepcion
RegistrarCalidad
ClasificarLote
GenerarIdentificadorLote
GenerarQR
ConsultarTrazabilidadPublica
RegistrarMovimientoInventario
RegistrarDespacho
RegistrarTransporte
GenerarReporte
GenerarIndicadores
~~~

La capa de aplicación no debe conocer la implementación concreta de PostgreSQL, Redis o de los servicios externos.

En su lugar, utiliza contratos o interfaces, por ejemplo:

~~~text
LoteRepository
TrazabilidadRepository
InventarioRepository
QRCache
StorageService
NotificationService
GeolocationService
~~~

### 4.3 Presentación / Adaptadores

Esta capa transforma las solicitudes externas hacia los casos de uso.

Ejemplos:

- **ProductorController**
- **CosechaController**
- **LoteController**
- **CalidadController**
- **InventarioController**
- **DespachoController**
- **TrazabilidadQRController**
- **ReportesController**

La interfaz puede recibir solicitudes desde:

- App móvil.
- Portal web.
- Consulta pública QR.

La presentación no implementa reglas centrales de negocio; únicamente adapta las entradas y salidas.

### 4.4 Infraestructura

La infraestructura implementa los detalles técnicos definidos mediante los contratos de las capas internas.

Ejemplos:

~~~text
PostgresLoteRepository
PostgresTrazabilidadRepository
RedisQRCache
S3StorageAdapter
MapsAdapter
NotificationAdapter
DatamartReportAdapter
~~~

De esta forma, el núcleo del sistema no necesita conocer la tecnología utilizada.

## 5. Regla de dependencias

La dependencia debe seguir la dirección:

~~~text
PRESENTACIÓN / ADAPTADORES
            ↓
        APLICACIÓN
            ↓
         DOMINIO
            ↑
     INFRAESTRUCTURA
~~~

La infraestructura implementa los contratos definidos hacia el interior, pero el dominio no conoce las implementaciones tecnológicas.

### Regla fundamental

> **El dominio no debe depender de la infraestructura.**

Por ejemplo:

~~~text
Correcto:

Caso de uso
    ↓
LoteRepository (interfaz)
    ↑
PostgresLoteRepository (implementación)

Incorrecto:

Caso de uso
    ↓
PostgreSQL / ORM directamente
~~~

## 6. Diagrama del enfoque

~~~mermaid
flowchart TB

    subgraph PRESENTACION["PRESENTACIÓN / ADAPTADORES"]
        APP["App móvil"]
        WEB["Portal web"]
        QR["Consulta QR"]
        CTRL["Controladores REST / DTO / Adaptadores"]
    end

    subgraph APLICACION["APLICACIÓN"]
        UC["Casos de uso"]
        PORTS["Puertos / Interfaces"]
        UC --> PORTS
    end

    subgraph DOMINIO["DOMINIO - NÚCLEO DEL NEGOCIO"]
        ENT["Entidades"]
        RULES["Reglas de negocio"]
        EVENTS["Eventos de trazabilidad"]
    end

    subgraph INFRA["INFRAESTRUCTURA"]
        PG["PostgreSQL"]
        REDIS["Redis"]
        GPS["GPS / Mapas"]
        STORE["Storage"]
        NOTIF["Notificaciones"]
        DM["Datamart"]
    end

    APP --> CTRL
    WEB --> CTRL
    QR --> CTRL

    CTRL --> UC
    UC --> ENT
    UC --> RULES
    UC --> EVENTS

    INFRA -.->|"Implementa interfaces"| PORTS
    PORTS -.-> PG
    PORTS -.-> REDIS
    PORTS -.-> GPS
    PORTS -.-> STORE
    PORTS -.-> NOTIF
    PORTS -.-> DM
~~~

## 7. Aplicación a la trazabilidad del lote

Un ejemplo de flujo es la **consulta de trazabilidad mediante QR**:

1. El consumidor escanea el QR.
2. **TrazabilidadQRController** recibe la solicitud.
3. **ConsultarTrazabilidadPublica** ejecuta el caso de uso.
4. El caso de uso utiliza **TrazabilidadRepository** o **QRCache**.
5. Redis responde cuando existe información cacheada.
6. PostgreSQL actúa como fuente transaccional cuando corresponde.
7. El caso de uso construye la respuesta pública.
8. El controlador devuelve únicamente los datos autorizados.

La regla de negocio permanece independiente del mecanismo utilizado para almacenar o consultar los datos.

## 8. Relación con los drivers arquitectónicos

| Driver | Aplicación de Clean Architecture |
|---|---|
| **DA01 - Operación desconectada** | La sincronización de pre-lotes se implementa como un caso de uso independiente del cliente móvil concreto. |
| **DA02 - Inmutabilidad y auditoría** | Las reglas de integridad e historial se mantienen en el dominio y no dependen de la interfaz. |
| **DA03 - Consultas públicas rápidas** | Redis se incorpora mediante un puerto/adaptador sin contaminar el dominio con detalles de caché. |
| **DA04 - Nuevos cultivos** | Las reglas de negocio se mantienen encapsuladas, permitiendo ampliar comportamientos sin depender de una tecnología concreta. |
| **DA05 - Separación analítica** | La generación de información para el Datamart se trata como una preocupación externa al núcleo transaccional. |

## 9. Beneficios

- Alta separación de responsabilidades.
- Menor acoplamiento con tecnologías concretas.
- Mayor facilidad para pruebas unitarias.
- Facilita la evolución del sistema.
- Permite reemplazar PostgreSQL, Redis o servicios externos sin modificar las reglas centrales.
- Favorece la mantenibilidad y la reutilización de la lógica de negocio.
- Hace explícitos los límites entre negocio e infraestructura.

## 10. Decisión final

La propuesta queda definida de la siguiente manera:

> **Estilo arquitectónico:** Monolito Modular.

> **Organización complementaria:** estructura en capas y comunicación cliente-servidor mediante API REST.

> **Enfoque arquitectónico interno:** Clean Architecture.

> **Núcleo:** reglas y entidades de trazabilidad agrícola.

> **Infraestructura:** PostgreSQL, Redis, Datamart y servicios externos mediante adaptadores.

Esta combinación permite mantener una solución técnicamente coherente con el alcance del proyecto y, al mismo tiempo, preparada para evolucionar sin introducir innecesariamente la complejidad de una arquitectura de microservicios.
