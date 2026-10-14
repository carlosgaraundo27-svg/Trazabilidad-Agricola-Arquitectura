# Diseño Interno del Software

## 1. Propósito y límite

Este documento transforma la arquitectura en una guía de diseño interno. La arquitectura define módulos, contenedores y reglas de dependencia; el diseño interno propone entidades, casos de uso, interfaces y colaboración entre objetos.

**Estado:** diseño propuesto para orientar la implementación. Los nombres de clases y métodos no implican que exista código ejecutable.

## 2. Capas y responsabilidades

| Capa | Responsabilidad | No debe hacer |
|---|---|---|
| **Presentación / adaptadores de entrada** | Recibir HTTP, validar formato, convertir solicitudes y respuestas mediante DTO. | Aplicar reglas completas del negocio o acceder directamente a tablas. |
| **Aplicación** | Coordinar casos de uso, transacciones y llamadas a interfaces. | Depender de implementaciones concretas de infraestructura. |
| **Dominio** | Mantener entidades, invariantes y reglas de negocio de lote, eventos, calidad e inventario. | Importar HTTP, framework, ORM, Redis o SDKs externos. |
| **Infraestructura / adaptadores de salida** | Implementar repositorios, caché, almacenamiento, notificaciones y acceso analítico. | Decidir unilateralmente reglas del negocio. |

## 3. Módulos y casos de uso propuestos

| Módulo | Casos de uso representativos | RF fuente |
|---|---|---|
| Productores | Registrar productor, parcela y certificación; consultar datos. | RF-01, RF-02 |
| Cosecha | Registrar cosecha, generar pre-lote, sincronizar registros pendientes. | RF-03, RF-04 |
| Acopio y Calidad | Registrar recepción y pesaje; registrar parámetros; clasificar o rechazar lote. | RF-05, RF-06, RF-07 |
| Trazabilidad | Generar código e identificador, registrar eventos, consultar historial, construir vista pública QR. | RF-04, RF-08, RF-09 |
| Inventario y Logística | Cambiar estado de inventario, asociar pallet, registrar transporte y despacho/entrega. | RF-10, RF-11 |
| Reportes | Calcular mermas, rendimientos, tiempos logísticos y liquidaciones. | RF-12 |

## 4. Entidades del dominio

- **Productor:** identidad y datos organizativos del productor.
- **Parcela:** unidad de producción y ubicación relacionada con un productor.
- **Certificación:** tipo, estado y vigencia de una certificación.
- **Cosecha:** registro de cosecha capturado en campo.
- **PreLote:** unidad creada en campo antes de la consolidación oficial.
- **Lote:** unidad central de trazabilidad con identificador único y estado operativo.
- **EventoTrazabilidad:** hecho registrado sobre un lote, con tipo, fecha/hora, actor y referencia de evidencia.
- **ControlCalidad:** resultados de inspección, calibre, materia seca, descarte y temperatura.
- **Pallet:** agrupación física etiquetable, vinculada a un lote según la regla de negocio.
- **MovimientoInventario:** cambios de ubicación o estado del producto.
- **Transporte / Despacho / Entrega:** información logística y evidencia de transferencia.
- **Usuario / Rol:** identidad y permisos del personal interno.
- **Liquidación:** resultado comercial por productor, de acceso restringido.
- **Auditoria:** registro de acciones críticas y su autor/fecha.

## 5. Reglas de dominio que deben mantenerse en el núcleo

1. Un lote tiene un identificador único.
2. Las transiciones de estado deben estar explícitas y validarse antes de persistir.
3. Un evento cerrado no debe modificarse ni borrarse mediante operaciones ordinarias.
4. Cada evento crítico guarda autor y fecha/hora; las reglas de auditoría deben ser consistentes.
5. La consolidación de pre-lotes en un lote debe mantener la relación entre origen y lote resultante.
6. La clasificación depende de reglas de aceptación aprobadas por el negocio; los umbrales concretos todavía deben definirse.
7. La proyección QR no es la entidad Lote completa: solo incluye campos publicados y autorizados.
8. Los cálculos de reportes deben tener definiciones documentadas para mermas, rendimiento, tiempos y liquidaciones.

## 6. Interfaces / puertos propuestos

| Interfaz | Uso |
|---|---|
| **LoteRepository** | Consultar y persistir agregados de lote respetando las invariantes. |
| **TrazabilidadRepository** | Consultar historial y proyección de trazabilidad. |
| **ProductorRepository** | Gestionar productor, parcela y certificación. |
| **InventarioRepository** | Registrar movimientos y consultar estados. |
| **QRCache** | Consultar/guardar una proyección QR temporal. |
| **StorageService** | Guardar y recuperar evidencias o documentos. |
| **NotificationService** | Enviar notificaciones operativas cuando se habilite la integración. |
| **GeolocationService** | Resolver o validar referencias de ubicación cuando aplique. |
| **AnalyticsRepository / ReportPort** | Obtener resultados del Datamart para reportes. |

Los contratos se definen hacia el interior. PostgreSQL, Redis y proveedores externos implementan dichos contratos desde infraestructura.

## 7. Secuencia: registro offline y sincronización

~~~mermaid
sequenceDiagram
    actor Recolector
    participant App as App móvil
    participant Local as Almacenamiento local
    participant API as API REST
    participant UC as Caso de uso SincronizarPreLotes
    participant DB as PostgreSQL

    Recolector->>App: Registrar cosecha sin conexión
    App->>Local: Guardar pre-lote pendiente con ID local
    Local-->>App: Confirmar guardado local
    Note over App,Local: El usuario puede continuar sin internet
    App->>API: Enviar lote pendiente al recuperar conexión
    API->>UC: Validar y procesar solicitud
    UC->>DB: Registrar pre-lote de forma idempotente
    DB-->>UC: Confirmación / ID del servidor
    UC-->>API: Resultado de sincronización
    API-->>App: Confirmación por registro
    App->>Local: Marcar sincronizado
~~~

### Consideraciones de sincronización

- Cada elemento local necesita un identificador estable para evitar duplicados en reintentos.
- La sincronización debe ser idempotente: reenviar un elemento ya aceptado no debe crear otro igual.
- Se deben distinguir estados pendientes, en proceso, sincronizados y con error.
- Las reglas de conflicto y edición posterior deben definirse antes de implementar.

## 8. Secuencia: consulta QR

~~~mermaid
sequenceDiagram
    actor Visitante
    participant QR as Interfaz QR
    participant API as Controlador REST
    participant UC as ConsultarTrazabilidadPublica
    participant Cache as QRCache
    participant Repo as TrazabilidadRepository

    Visitante->>QR: Escanear código
    QR->>API: Consultar código QR
    API->>UC: Ejecutar caso de uso
    UC->>Cache: Buscar proyección pública
    alt Caché válida
      Cache-->>UC: Datos públicos cacheados
    else Sin caché válida
      UC->>Repo: Obtener historial autorizado
      Repo-->>UC: Datos del lote y eventos
      UC->>Cache: Guardar proyección con expiración
    end
    UC-->>API: DTO público filtrado
    API-->>QR: Respuesta de solo lectura
    QR-->>Visitante: Mostrar origen y recorrido autorizados
~~~

## 9. Diseño de seguridad y autorización

- La autorización se valida en backend, no solo ocultando botones en el frontend.
- La consulta pública QR debe usar un DTO o proyección separada del modelo interno.
- Las liquidaciones y datos financieros no deben formar parte de respuestas públicas.
- Los permisos deben definirse por rol y operación.
- Las acciones críticas deben producir auditoría.
- Los secretos y credenciales no se guardan en el repositorio; se usan variables de entorno o un gestor de secretos del entorno desplegado.

## 10. Patrones y principios de diseño

- **Repository:** separa los casos de uso del mecanismo de persistencia.
- **Adapter:** integra Redis, PostgreSQL y servicios externos mediante contratos.
- **DTO / View Model:** evita exponer entidades internas en respuestas REST.
- **Strategy (si corresponde):** permite encapsular reglas de clasificación por tipo de producto, solo cuando existan variantes reales que lo justifiquen.
- **SOLID:** aplicar especialmente responsabilidad única y dependencia de abstracciones; evitar clases de servicio que acumulen todo el proceso.
- **No sobre-diseñar:** mantener la solución en un monolito modular; no crear servicios distribuidos sin necesidad validada.

## 11. Pruebas que deben acompañar el diseño

- Unitarias de reglas de dominio: transición de lote, cierre de evento y clasificación.
- De aplicación: registro de cosecha, consolidación y consulta pública.
- De integración: repositorios con PostgreSQL y caché Redis.
- De contrato: estructura de solicitudes/respuestas REST y DTO QR.
- Seguridad: acceso a funciones según roles y rechazo de información interna en la vista pública.
- Offline: pérdida de red, reinicio de app, reintentos e idempotencia.
- Rendimiento: escenario EQ-01 con la carga previamente acordada.
