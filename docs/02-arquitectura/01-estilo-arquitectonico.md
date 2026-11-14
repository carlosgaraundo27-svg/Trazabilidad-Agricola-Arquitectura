# Estilo arquitectónico: monolito modular

**Estado:** diseño propuesto, basado en ADR-001 y ADR-002. Revisión: 2026-11-06. Las propiedades descritas deberán verificarse en la implementación.

## 1. Decisión y alcance

El sistema adopta una **organización cliente-servidor con un backend monolítico modular**, estructurado internamente mediante Clean Architecture. El monolito se refiere a la aplicación de negocio: sus siete módulos se compilan y despliegan juntos. La app móvil, el portal web, PostgreSQL, Redis y el proceso ETL tienen responsabilidades y ciclos de ejecución distintos.

| Dimensión | Decisión | Qué significa en este proyecto |
|---|---|---|
| Organización entre aplicaciones | Cliente-servidor | Móvil y web solicitan operaciones al backend; no acceden directamente a la base central. |
| Estilo del backend | Monolito modular | Siete módulos de negocio dentro de una unidad desplegable. |
| Organización interna | Clean Architecture | Casos de uso y dominio independientes de frameworks y adaptadores. |
| Comunicación externa | API REST sobre HTTPS | Contratos entre clientes y backend; REST no define la modularidad interna. |
| Comunicación entre módulos | Contratos internos y llamadas en proceso | Sin HTTP entre módulos ni un servidor por módulo. |
| Persistencia | PostgreSQL compartido, con propiedad lógica por módulo | Compartir motor no autoriza escribir tablas de otro módulo. |
| Operación | Docker | Un contenedor Docker no equivale necesariamente a un contenedor del modelo C4. |

La denominación “monolito modular” es defendible cuando se explican los límites, contratos y reglas de colaboración. Dibujar cajas con nombres de módulos, por sí solo, no demuestra modularidad.

## 2. Vista del estilo

**Alcance:** colaboración de aplicaciones con el backend. El detalle de los siete módulos se encuentra en C3.

~~~mermaid
flowchart TB
    M["App móvil de campo — captura y sincronización"]
    W["Portal web — operación y vista pública QR"]
    subgraph B["Backend monolítico modular — una unidad de despliegue"]
      E["Adaptadores de entrada REST — validación y acceso"]
      U["Casos de uso por módulo — coordinación"]
      D["Dominio por módulo — reglas del lote"]
      P["Puertos — contratos internos"]
      A["Adaptadores de salida — persistencia e integraciones"]
      E -->|"invoca"| U
      U -->|"aplica reglas"| D
      U -->|"depende de contratos"| P
      A -.->|"implementa"| P
    end
    DB[("PostgreSQL — datos operativos")]
    R[("Redis — proyección pública temporal")]
    M -->|"HTTPS / JSON"| E
    W -->|"HTTPS / JSON"| E
    A -->|"SQL mediante driver"| DB
    A -->|"protocolo Redis"| R
~~~

**Leyenda:** cajas = responsabilidades; cilindros = almacenes. Flecha sólida = uso o dependencia indicada; discontinua = implementación de interfaz. La flecha del adaptador al puerto es una dependencia de código, no el sentido de devolución de los datos. La infraestructura queda dentro del backend; los motores de datos quedan fuera. ETL y servicios proyectados se detallan en C2.

## 3. Límites y propiedad de datos

Estos límites son una propuesta de diseño para revisión; no agregan funcionalidades al catálogo RF.

| Módulo | Datos bajo su responsabilidad | Contrato que ofrece a otros módulos |
|---|---|---|
| Productores | Productor, parcela, certificación | Consultar origen y validar parcela para cosecha. |
| Cosecha | Cosecha, pre-lote, identificación de captura | Registrar y sincronizar pre-lotes; consultar origen y disponibilidad. |
| Acopio y Calidad | Recepción, pesaje, controles y decisión de calidad | Recibir producto, evaluar calidad y solicitar consolidación del lote. |
| Trazabilidad | Lote consolidado, código QR, eventos e historial | Consolidar identidad, registrar hechos y consultar la proyección pública. |
| Logística e Inventario | Pallet, movimientos, despacho y entrega | Consultar existencias y registrar movimientos; comunicar hechos del lote a Trazabilidad. |
| Reportes | Definiciones de indicadores y consultas analíticas | Consultar el Datamart con permisos; no cambiar existencias ni estados del lote. |
| Acceso y Permisos | Usuario, rol y asignación de permisos | Autenticar y evaluar permiso por operación y recurso. |

**RF-04 se divide explícitamente:** Cosecha identifica el pre-lote; Trazabilidad identifica el lote consolidado; Acopio coordina su formación. La relación de mezcla/división y sus cantidades debe aprobarse antes de cerrar el esquema de datos.

Los estados de inventario pertenecen a Logística e Inventario. La decisión de calidad pertenece a Acopio y Calidad. Trazabilidad registra esos hechos y la vista del lote sin mantener otra fuente contradictoria del stock.

**Liquidaciones:** RF-12 solicita reportarlas, pero aún no define el origen de precios, descuentos ni aprobación del cálculo. Reportes puede mostrar resultados autorizados; el motor transaccional de liquidaciones requiere aclarar alcance y propietario antes de implementarlo.

## 4. Reglas verificables de modularidad

1. Cada módulo expone contratos de aplicación; los demás no importan sus controladores, adaptadores ORM ni repositorios concretos.
2. Cada escritura se realiza mediante el módulo propietario. No se comparten entidades ORM como contratos públicos; se usan identificadores y DTO.
3. Dentro del módulo: entrada → aplicación → dominio; los adaptadores de salida implementan interfaces interiores.
4. Las dependencias entre módulos deben ser acíclicas. Ejemplo: Cosecha consulta Productores; Acopio coordina con Cosecha y Trazabilidad; Logística registra hechos mediante Trazabilidad. Trazabilidad no llama de vuelta a los módulos que lo invocan.
5. Una operación que cambie datos operativos y registre su evento debe coordinar **una misma transacción PostgreSQL** mediante una unidad de trabajo. Si falla el evento obligatorio, se revierte la operación. El mecanismo de propagación del contexto transaccional queda por especificar en el diseño técnico.
6. Notificaciones, caché y ETL no forman parte de la transacción de negocio. Se ejecutan después del commit; deben definirse reintentos, invalidación y observabilidad.
7. No se asume entrega fiable solo por usar eventos en memoria. Si se requieren entregas garantizadas a un proceso externo, se evaluará un outbox mediante una ADR específica.

**Verificación futura:** reglas de imports, prueba de rollback operación/evento, prueba de integración de contratos y prueba de que el dominio funciona sin PostgreSQL ni Redis. Estas pruebas aún no han sido ejecutadas.

## 5. Justificación y alternativas

| Criterio | Monolito sin límites | Monolito modular seleccionado | Microservicios |
|---|---|---|---|
| Integridad de operación y evento | Transacción local, con riesgo de lógica dispersa | Transacción local coordinada y propiedad explícita | Requiere abordar consistencia y fallos distribuidos. |
| Operación académica | Despliegue simple | Despliegue simple con disciplina de módulos | Más servicios, redes, registros y despliegues que mantener. |
| Cambio de reglas de cultivo | Alto riesgo de afectar áreas ajenas | Reglas encapsuladas; extracción futura no automática | Aislamiento de servicio a costa de contratos distribuidos. |
| Escalamiento | Se replica la aplicación | Se replica el backend completo | Puede escalar servicios por separado. |
| Fallos | Pueden afectar toda la aplicación | Comparten proceso: la modularidad no aísla caídas | Aislamiento parcial, condicionado por dependencias. |

La conectividad intermitente (DA01) justifica almacenamiento y sincronización en móvil; **no es una propiedad que el monolito resuelva por sí solo**. DA02 y DA04 sustentan transacciones y límites de módulos. DA03 motiva evaluar caché, DA05 el modelo analítico y DA06 controles de acceso en backend.

## 6. Costes y límites de la decisión

- Los módulos se publican juntos y comparten memoria/CPU del proceso backend.
- Clean Architecture ayuda a controlar dependencias, pero exige contratos y revisión para evitar acoplamiento.
- Redis reduce lecturas repetidas cuando existe una entrada válida; no garantiza rendimiento ni elimina el acceso a PostgreSQL.
- El Datamart inicial comparte instancia PostgreSQL con OLTP: hay separación lógica, no aislamiento de CPU, memoria o disco.
- Una futura extracción a microservicios requiere justificar carga, autonomía y consistencia; no basta mover carpetas.

## 7. Correspondencia documental

- [ADR-001 y ADR-002](03-decisiones-arquitectonicas.md): selección y consecuencias.
- [Enfoque interno](02-enfoque-arquitectonico.md): dependencias de código.
- [C1–C4](../04-modelo-c4/modelo-c4.md): ampliación progresiva del sistema.
- [Despliegue](05-arquitectura-tecnica-despliegue.md): ubicación física para el prototipo.
- [Revisión previa a Sprint 2](../05-sprint01/revision-previa-sprint02.md): decisiones y evidencias pendientes.
