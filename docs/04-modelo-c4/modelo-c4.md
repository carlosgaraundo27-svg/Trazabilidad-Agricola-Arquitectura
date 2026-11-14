# Modelo C4 — Trazabilidad y Gestión Comercial de Palta Hass

**Estado:** arquitectura objetivo propuesta; revisión 2026-11-06. Los diagramas no acreditan implementación. Backend NestJS/TypeScript y web React son recomendaciones pendientes de ratificación; se conservan identificadores estables aunque cambie el framework.

## 1. Cómo leer los modelos

| Nivel | Pregunta | Alcance y ampliación |
|---|---|---|
| C1 — Contexto | ¿Quién usa el sistema y con qué sistemas se relaciona? | Sistema S1 completo. |
| C2 — Contenedores | ¿Qué aplicaciones y almacenes forman S1? | Amplía S1; identifica el backend B1. |
| C3 — Componentes | ¿Qué responsabilidades viven dentro de B1? | Amplía B1; identifica T1 Trazabilidad. |
| C4 — Código propuesto | ¿Cómo se organiza la consulta QR dentro de T1? | Clases e interfaces propuestas de un caso de uso. |

C4 es independiente de la herramienta de dibujo. Se usa Mermaid para mantener las vistas editables y visibles en GitHub. **Contenedor C4 significa aplicación o almacén lógico; no significa necesariamente contenedor Docker.** El despliegue se documenta [por separado](../02-arquitectura/05-arquitectura-tecnica-despliegue.md).

**Convenciones comunes:** cada caja identifica tipo, nombre y responsabilidad. Cilindro = almacén de datos. Marco = límite del sistema o contenedor indicado. Flecha sólida = relación dirigida con su propósito; no representa simultáneamente ida y vuelta. Flecha discontinua en C1/C2 = integración proyectada; en C4, triángulo hueco = implementación de interfaz. Las tecnologías “propuestas” no están ratificadas.

## 2. C1 — Contexto del sistema S1

**Audiencia:** docente, equipo y participantes del negocio. No se incluyen bases de datos, frameworks ni módulos internos.

~~~mermaid
flowchart TB
    CAMPO["Personas: Productor y Recolector
    Registran origen y cosecha"]
    OPER["Personas: Acopio, Calidad y Logística
    Controlan recepción y recorrido"]
    GEST["Personas: Administrador y Comprador
    Gestionan accesos o consultan datos autorizados"]
    PUBLICO["Persona: Consumidor
    Consulta el recorrido público"]
    S1["Sistema S1: Trazabilidad de Palta Hass
    Relaciona origen, lote, eventos y gestión comercial"]
    MAP["Sistema externo: Mapas
    Resuelve referencias geográficas — proyectado"]
    ARC["Sistema externo: Archivos
    Conserva evidencias — proyectado"]
    AV["Sistema externo: Notificaciones
    Entrega avisos — proyectado"]
    CAMPO -->|"registra productor, parcela y cosecha"| S1
    OPER -->|"registra pesaje, calidad y despacho"| S1
    GEST -->|"administra o consulta según su rol"| S1
    PUBLICO -->|"consulta información publicada mediante QR"| S1
    S1 -.->|"solicita referencias geográficas"| MAP
    S1 -.->|"guarda y recupera evidencias"| ARC
    S1 -.->|"solicita entrega de avisos"| AV
~~~

**Leyenda C1:** personas agrupadas solo para facilitar lectura; no comparten automáticamente permisos. Las tres integraciones externas son proyectadas y su proveedor está pendiente. El GPS del dispositivo es una capacidad local, no un sistema remoto de mapas.

El [catálogo de actores](../01-analisis-de-sistema/01-actores.md) conserva los ocho roles individuales. El comprador se autentica para sus consultas autorizadas; el consumidor accede solamente a la proyección pública. El QR no concede permisos administrativos.

## 3. C2 — Contenedores de S1

**Audiencia:** desarrollo y operación. La frontera incluye aplicaciones cliente propias, backend, proceso analítico y almacenes lógicos.

~~~mermaid
flowchart TB
    R["Persona: Recolector — captura en campo"]
    I["Personas autenticadas — operación y consultas permitidas"]
    V["Persona: Consumidor — lectura pública"]
    subgraph S1["S1 — Plataforma de Trazabilidad de Palta Hass"]
      M1["Contenedor M1: App móvil
      Flutter propuesto — captura y sincronización"]
      L1[("Almacén L1: registros locales
      Motor por decidir — cola pendiente durable")]
      W1["Contenedor W1: Portal web
      React propuesto — operación y ruta pública QR"]
      B1["Contenedor B1: Backend monolítico modular
      NestJS propuesto — API y reglas de negocio"]
      O1[("Almacén O1: OLTP
      PostgreSQL — operaciones e historial")]
      K1[("Almacén K1: Caché QR
      Redis — solo proyección pública")]
      M1 -->|"lee y escribe mediante API local"| L1
      M1 -->|"envía registros y recibe confirmación; HTTPS / JSON"| B1
      W1 -->|"operaciones y consulta pública; HTTPS / JSON"| B1
      B1 -->|"lee y escribe datos; SQL mediante driver"| O1
      B1 -->|"lee, guarda e invalida proyección; protocolo Redis"| K1
    end
    R -->|"registra cosecha"| M1
    I -->|"opera con permisos"| W1
    V -->|"abre ruta QR pública"| W1
~~~

**Leyenda C2:** cajas = aplicaciones o sistemas externos; cilindros = almacenes lógicos; flechas = invocaciones iniciadas por el origen. Las respuestas retornan por la misma comunicación. Las integraciones proyectadas de C1 se detallan en la tabla siguiente para conservar legible la vista central.

| Origen | Sistema externo de C1 | Relación proyectada |
|---|---|---|
| B1 | Mapas | Consultar referencias mediante HTTPS; API por definir. |
| B1 | Archivos | Guardar/recuperar evidencias mediante HTTPS; API por definir. |
| B1 | Notificaciones | Solicitar avisos mediante HTTPS; API por definir. |

### C2 complementario — colaboración analítica

**Alcance:** B1, J1, O1 y A1 de S1. Se separa esta colaboración para no cruzar el flujo ETL con las comunicaciones de los clientes.

~~~mermaid
flowchart TB
    B1["Contenedor B1: Backend
    NestJS propuesto — operación y consultas"]
    J1["Contenedor J1: Proceso ETL
    Job programado — tecnología por decidir"]
    O1[("Almacén O1: OLTP
    PostgreSQL — datos operativos")]
    A1[("Almacén A1: Datamart
    PostgreSQL — esquema analítico")]
    B1 -->|"consulta indicadores; SQL mediante driver"| A1
    J1 -->|"extrae datos; SQL mediante driver"| O1
    J1 -->|"carga hechos; SQL mediante driver"| A1
~~~

**Leyenda:** cajas = aplicaciones; cilindros = almacenes lógicos; flechas = acceso iniciado por el origen. O1/A1 comparten una instancia en el despliegue inicial; esta vista no representa servidores separados.

**Decisiones explícitas para evitar ambigüedad:**

- W1 contiene la ruta pública QR y las rutas autenticadas. Dibujar una vista pública no implica otra aplicación desplegable. La seguridad se aplica en B1.
- B1 es una única aplicación de negocio. J1 es un proceso analítico de soporte: no convierte a los módulos del backend en microservicios.
- O1 y A1 son almacenes lógicos distintos que inicialmente comparten una instancia PostgreSQL. El diagrama no promete aislamiento físico.
- L1 está en el dispositivo. O1 es la fuente central de los registros ya aceptados; la confirmación local no equivale a confirmación del servidor.
- J1 inicia la lectura de O1: PostgreSQL no “envía” espontáneamente datos al ETL.
- Redis forma parte de la arquitectura objetivo, con invalidación, TTL y comportamiento ante fallo todavía por especificar.
- Las conexiones SQL y Redis se restringen a la red privada; los clientes solo alcanzan la API.

| Contenedor o almacén | Trazabilidad principal |
|---|---|
| M1 / L1 | RF-03, RF-04; DA01; ADR-003 |
| W1 | RF-01–RF-13 según rol; ADR-003, ADR-008 |
| B1 | RF-01–RF-13; ADR-001, ADR-002 |
| O1 | RF-01–RF-11, RF-13 y fuente de RF-12; ADR-004 |
| K1 | RF-08; DA03; ADR-005 |
| J1 / A1 | RF-12; DA05; ADR-006 |

## 4. C3 — Componentes del backend B1

**Alcance:** únicamente B1. Los módulos se modelan como componentes de grano grueso que encapsulan sus casos de uso, dominio y adaptadores. No se muestran como procesos separados. **Tecnología de todos los componentes interiores:** código TypeScript/NestJS propuesto; el dominio se mantiene independiente del framework.

Para mantener legibilidad, la vista muestra los contratos de entrada y las colaboraciones de negocio principales. Los adaptadores de persistencia de cada módulo se detallan en la tabla; no se dibuja una estrella de líneas a la misma base.

~~~mermaid
flowchart TB
    C["Contenedores M1 y W1 — clientes del backend"]
    subgraph B1["B1 — Backend monolítico modular"]
      E["Componente E: Entrada REST
      Valida formato y delega operaciones"]
      S["Componente S: Acceso y Permisos
      Autentica y evalúa permisos"]
      P["Componente P: Productores
      Administra origen y certificaciones"]
      H["Componente H: Cosecha
      Registra y sincroniza pre-lotes"]
      Q["Componente Q: Acopio y Calidad
      Recibe, pesa y evalúa"]
      T1["Componente T1: Trazabilidad
      Identifica lotes y conserva historial / QR"]
      G["Componente G: Logística e Inventario
      Controla stock, pallets y despachos"]
      F["Componente F: Reportes
      Consulta indicadores autorizados"]
      E -->|"autentica y autoriza operaciones privadas"| S
      E -->|"gestiona origen"| P
      E -->|"registra o sincroniza"| H
      E -->|"recibe y evalúa producto"| Q
      E -->|"consulta historial o QR público"| T1
      E -->|"gestiona stock y despachos"| G
      E -->|"solicita indicadores"| F
      H -->|"valida origen mediante contrato"| P
      Q -->|"consulta pre-lotes mediante contrato"| H
      Q -->|"solicita consolidación y registra hechos"| T1
      G -->|"registra hechos del lote mediante contrato"| T1
    end
    C -->|"HTTPS / JSON"| E
~~~

**Leyenda C3:** marco = un contenedor; cajas interiores = componentes; flechas interiores = llamadas a contratos en el mismo proceso. E es un conjunto de adaptadores de entrada, no un servicio API separado. Sus llamadas privadas requieren autorización previa; la consulta pública QR valida código y política de publicación, sin requerir cuenta interna.

| Componente | Dependencia de salida y propósito |
|---|---|
| S | O1: usuarios, roles y permisos. |
| P | O1: datos de productor, parcela y certificación. |
| H | O1: cosechas, pre-lotes e idempotencia; P por contrato. |
| Q | O1: recepción y calidad; H y T1 por contrato. |
| T1 | O1: lotes y eventos; K1: proyección pública temporal. |
| G | O1: movimientos, pallets, despachos y entregas; T1 por contrato. |
| F | A1: lectura de indicadores del Datamart. |

Las dependencias de salida usan adaptadores y puertos propios del módulo. No se permite que H escriba tablas de P ni que G modifique directamente eventos de T1. La transacción de una operación y su evento se coordina según las [reglas de modularidad](../02-arquitectura/01-estilo-arquitectonico.md). J1 permanece fuera de B1 en C2: no se presenta aquí como una capa del backend.

Las integraciones proyectadas se asignarán a adaptadores de los módulos responsables al cerrar sus contratos. No se introducen dependencias ficticias en esta vista de negocio.

## 5. C4 — Diseño de código de la consulta pública dentro de T1

**Alcance:** porción de consulta QR del componente T1; no todas las clases del sistema. Es un diseño propuesto en TypeScript. El ejemplo didáctico existente no implementa aún la caché ni todos estos contratos.

~~~mermaid
classDiagram
    direction TB
    class TrazabilidadQRController {
      +consultar(codigoQR)
    }
    class ConsultarTrazabilidadPublica {
      +ejecutar(codigoQR) TrazabilidadPublicaDTO
    }
    class TrazabilidadRepository {
      <<interface>>
      +obtenerPorCodigo(codigo) Lote
    }
    class QRCache {
      <<interface>>
      +obtener(codigo) TrazabilidadPublicaDTO
      +guardar(codigo, dto, ttl)
      +invalidar(codigo)
    }
    class PostgresTrazabilidadRepository {
      +obtenerPorCodigo(codigo) Lote
    }
    class RedisQRCache {
      +obtener(codigo) TrazabilidadPublicaDTO
      +guardar(codigo, dto, ttl)
      +invalidar(codigo)
    }
    class TrazabilidadPublicaDTO {
      +codigoLote
      +estado
      +eventos
    }
    class Lote {
      +codigo
      +obtenerEventos()
    }
    TrazabilidadQRController --> ConsultarTrazabilidadPublica : invoca
    ConsultarTrazabilidadPublica --> TrazabilidadRepository : consulta contrato
    ConsultarTrazabilidadPublica --> QRCache : usa contrato
    ConsultarTrazabilidadPublica --> TrazabilidadPublicaDTO : construye proyeccion
    TrazabilidadRepository --> Lote : devuelve o ausencia
    PostgresTrazabilidadRepository ..|> TrazabilidadRepository : implementa
    RedisQRCache ..|> QRCache : implementa
~~~

**Leyenda C4:** cajas = clases o interfaces; flecha sólida = dependencia de código; triángulo hueco discontinuo = implementación. El controlador pertenece al adaptador de entrada de T1, agrupado como E en C3; el caso de uso y sus contratos están hacia el interior; PostgreSQL/Redis son adaptadores exteriores. No hay dependencia del caso de uso hacia una clase concreta de infraestructura.

**Contrato público y errores:**

1. Validar formato del código y aplicar la política pública antes de responder.
2. Una caché válida contiene exclusivamente el DTO público, nunca el agregado Lote ni su descripción interna.
3. Ante ausencia de caché, consultar el repositorio y construir el DTO con campos permitidos y eventos publicables que tengan descripción pública aprobada.
4. Un lote inexistente o no autorizado para publicación no devuelve información interna. La respuesta HTTP exacta se cerrará en el contrato API.
5. La indisponibilidad de Redis puede usar PostgreSQL como respaldo con límites de carga. No se afirma que este comportamiento esté implementado.
6. Los cambios de publicación requieren invalidación; antes de implementar se definirá cómo evitar servir datos revocados durante fallos de invalidación. TTL por sí solo no garantiza revocación inmediata.

## 6. Continuidad y comprobación del modelo

| Elemento | C1 | C2 | C3 | C4 |
|---|---|---|---|---|
| Plataforma | S1 | Frontera S1 | Contexto | Contexto |
| Backend | Dentro de S1, sin detallar | B1 | Frontera B1 | Contexto |
| Trazabilidad | Responsabilidad de S1 | Dentro de B1 | T1 | Consulta QR ampliada |
| Consulta pública | Consumidor consulta S1 | Ruta en W1 → B1 | E → T1 | Controlador → caso de uso → contratos |
| Persistencia | Oculta | O1 y K1 | Salidas de T1 | Adaptadores implementan interfaces |

Al revisar, comprobar que los nombres y responsabilidades se conservan entre niveles; que las flechas indican propósito y protocolo cuando cruzan procesos; y que ninguna caja Docker se interpreta como módulo de negocio.

## 7. Referencias y documentos relacionados

- [Modelo C4 — niveles de diagramas](https://c4model.com/diagrams).
- [Contenedores y diferencia con despliegue](https://c4model.com/diagrams/container).
- [Componentes: alcance de un contenedor](https://c4model.com/diagrams/component).
- [Código: alcance de un componente](https://c4model.com/diagrams/code).
- [Notación](https://c4model.com/diagrams/notation) y [lista de revisión](https://c4model.com/diagrams/checklist).
- [Matriz requisito–componente](../02-arquitectura/04-componentes-arquitectonicos.md).
- [Diseño interno y secuencias](../03-diseno-de-software/01-diseno-interno.md).
- [Revisión previa a Sprint 2](../05-sprint01/revision-previa-sprint02.md).

Los cuatro niveles se conservan para apoyar la revisión académica; el modelo C4 permite seleccionar los niveles que aporten valor. La aprobación de la docente y los criterios exactos del Sprint 2 siguen pendientes.
