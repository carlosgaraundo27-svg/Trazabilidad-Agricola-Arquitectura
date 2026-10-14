# Guion de Exposición — Entregable Sprint 01

## Objetivo de la exposición

En 12 minutos se debe explicar el problema, justificar las decisiones arquitectónicas y demostrar que cada componente del diagrama se deriva de requisitos, atributos de calidad o restricciones. El documento es una guía de ensayo; no se debe leer palabra por palabra.

## Distribución de 12 minutos

| Tiempo | Sección | Qué explicar |
|---|---|---|
| 0:00–0:50 | Problema y objetivo | Fragmentación de datos entre productor, cosecha, acopio, calidad, inventario, transporte y entrega. El lote será la unidad central de trazabilidad. |
| 0:50–1:40 | Alcance y actores | App de campo, portal interno, consulta pública QR y roles del proceso. Aclarar fuera de alcance: IoT activo y blockchain. |
| 1:40–2:40 | Requisitos | Mencionar RF-03 offline, RF-04 identificador de lote, RF-08 QR, RF-09 historial, RF-10/11 logística y RF-12 reportes. |
| 2:40–3:40 | Drivers y calidad | Explicar DA01–DA06 y que EQ-01 a EQ-07 son escenarios medibles con metas propuestas por validar. |
| 3:40–4:40 | Estilo arquitectónico | Monolito Modular: una aplicación backend desplegable, con módulos internos separados. No es un monolito desordenado ni microservicios. |
| 4:40–5:40 | C1 contexto | Quién usa el sistema, qué puede hacer cada actor y qué servicios externos se prevén. |
| 5:40–6:50 | C2 contenedores | App móvil, portal, API REST, PostgreSQL, Redis y ETL/Datamart. Distinguir contenedor lógico de módulo y de host físico. |
| 6:50–8:10 | C3 componentes y trazabilidad | Recorrer Productores, Cosecha, Acopio/Calidad, Trazabilidad, Logística/Inventario y Reportes, relacionándolos con RF concretos. |
| 8:10–9:10 | Clean Architecture / C4 código | Dominio, Aplicación, Presentación, Infraestructura. Explicar que el dominio no depende de PostgreSQL o Redis. |
| 9:10–10:20 | Flujo offline y QR | Mostrar la sincronización diferida e idempotente y el filtro de datos públicos. |
| 10:20–11:15 | Datos, seguridad y ADR | PostgreSQL como OLTP, Redis como caché, ETL/Datamart para analítica, HTTPS/RBAC y decisiones registradas. |
| 11:15–12:00 | Límites y cierre | Es arquitectura propuesta; escenarios y stack tienen decisiones pendientes de ratificación y validación por pruebas. |

## Mensaje principal de la exposición

“Diseñamos una plataforma para centralizar la trazabilidad de la palta Hass usando el lote como entidad central. Elegimos un Monolito Modular porque los procesos comparten datos y necesitan consistencia, pero requieren separación de responsabilidades. Usamos Clean Architecture internamente para aislar el dominio, API REST para integrar tres clientes, PostgreSQL para operación transaccional, Redis para acelerar las consultas QR y ETL/Datamart para análisis. Cada componente se justifica con requisitos concretos y las metas de calidad propuestas deben comprobarse con pruebas.”

## Preguntas que cualquier integrante debe poder responder

### 1. ¿De qué requisito sale la app móvil?

RF-03 exige registrar cosecha desde un dispositivo móvil y conservar los datos localmente sin conectividad; RF-04 exige identificar pre-lotes/lotes. Por eso se propone almacenamiento local y sincronización posterior. Referencias: HU02, DA01 y RC01.

### 2. ¿Por qué hay una API REST?

Permite que la app móvil, el portal web y la consulta QR utilicen el mismo backend. La comunicación se registra en ADR-003; las operaciones concretas derivan de RF-01 a RF-12.

### 3. ¿Por qué el backend es monolítico modular?

El flujo del lote conecta productores, cosecha, acopio, calidad, inventario, logística y trazabilidad. Para el prototipo, un backend desplegable reduce la complejidad operacional y permite centralizar transacciones. La modularidad reduce el acoplamiento interno. ADR-001.

### 4. ¿Por qué no microservicios?

No hay todavía una necesidad validada de desplegar/escalar los módulos de forma independiente que justifique sumar comunicación distribuida y consistencia entre servicios. Se deja como posible evolución, no como objetivo inicial.

### 5. ¿Cuál es la diferencia entre estilo y enfoque?

El estilo define la organización global del sistema: Monolito Modular. El enfoque define las reglas de las dependencias internas: Clean Architecture.

### 6. ¿Por qué PostgreSQL?

La información de productores, lotes, controles de calidad, inventario y logística es estructurada y relacionada. El requisito RC04 lo establece como motor OLTP; ADR-004 lo registra como decisión.

### 7. ¿Para qué se necesita Redis si ya existe PostgreSQL?

Redis es caché de lectura para consultas QR frecuentes. No reemplaza PostgreSQL ni es la fuente definitiva de los lotes. DA03 y ADR-005 justifican el componente; EQ-01 permitirá medir si cumple el objetivo de rendimiento.

### 8. ¿Por qué el QR no muestra todos los datos del lote?

RF-08 pide consulta pública de solo lectura y RC03 prohíbe exponer datos personales o financieros internos. DA06 y ADR-008 conducen a crear una proyección pública limitada.

### 9. ¿Por qué hay un Datamart?

RF-12 solicita indicadores de mermas, rendimiento, tiempos logísticos y liquidación. ETL/Datamart separa ese análisis de la operación transaccional. DA05 y ADR-006.

### 10. ¿Cómo demuestran que el sistema es seguro o rápido?

Todavía no se debe afirmar que lo es. EQ-01 y EQ-04 son escenarios de diseño con medidas propuestas que deben validarse mediante pruebas; los resultados se reportarán cuando haya una implementación y evidencias.

### 11. ¿Está implementado todo el stack?

No. Este Sprint entrega documentación técnica versionada de la arquitectura propuesta. Las tecnologías marcadas como recomendadas o pendientes no deben presentarse como código implementado.

### 12. ¿Qué pasa si se añade un cultivo distinto?

La modularidad y la separación del dominio buscan aislar reglas generales de trazabilidad respecto a reglas particulares del producto. La extensión a otros cultivos está planteada como evolución, no como obligación del prototipo inicial.

## Regla para responder preguntas sobre un componente

Usar siempre esta secuencia:

**Componente → requisito (RF) → historia (HU) → atributo/driver → decisión ADR → escenario de verificación.**

Ejemplo QR:
Consulta QR → RF-08/RF-09 → HU07 → rendimiento/seguridad → DA03/DA06 → ADR-005/ADR-008 → EQ-01/EQ-04.

## Checklist antes de exponer

- [ ] Abrir el repositorio y navegar a docs/ y tecnologia/.
- [ ] Mostrar README con índice de la documentación.
- [ ] Explicar los requisitos RF y los actores.
- [ ] Mostrar los siete escenarios EQ y aclarar que las metas están pendientes de validación.
- [ ] Mostrar C1, C2 y C3, y el ejemplo C4.
- [ ] Responder de qué RF/ADR surge cada componente principal.
- [ ] Aclarar qué está propuesto y qué está implementado.
- [ ] Ensayar cronometrando 12 minutos.
