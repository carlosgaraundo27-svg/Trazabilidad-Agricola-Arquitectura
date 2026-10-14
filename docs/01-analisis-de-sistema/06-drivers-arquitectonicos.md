# Drivers Arquitectónicos Principales

Los **drivers arquitectónicos** son los requisitos, atributos de calidad o restricciones que influyen significativamente en las decisiones de arquitectura. Cada driver se formula a partir del problema que debe resolver y se relaciona con una respuesta arquitectónica concreta.

| ID | Driver | Definición aplicada al proyecto | Origen | Implicancia en la Arquitectura |
| :--- | :--- | :--- | :--- | :--- |
| **DA01** | **Operación Desconectada en Campo** | La app móvil debe permitir registrar información de cosecha aun sin conectividad y sincronizarla posteriormente. | RF-03 / Usabilidad / RC01 | Requiere almacenamiento local en el cliente móvil y sincronización asíncrona mediante API REST. |
| **DA02** | **Inmutabilidad y Auditoría del Lote** | El historial del lote debe conservar los eventos registrados y evitar modificaciones normales sobre eventos ya cerrados. | Integridad / Auditoría / RF-09 | Determina reglas de dominio para eventos, estados y trazabilidad histórica. |
| **DA03** | **Consultas Públicas Rápidas** | La consulta de trazabilidad mediante QR debe responder rápidamente sin afectar el procesamiento transaccional interno. | Rendimiento / RF-08 | Justifica una estrategia de caché con Redis y separación entre carga pública de lectura y carga transaccional. |
| **DA04** | **Extensibilidad a Nuevos Cultivos** | La solución debe poder incorporar otros productos agrícolas sin rediseñar innecesariamente el núcleo del sistema. | Escalabilidad / Mantenibilidad | Justifica la organización modular y el desacoplamiento de las reglas de negocio respecto de particularidades de Palta Hass. |
| **DA05** | **Separación Analítica** | La generación de indicadores y reportes no debe interferir innecesariamente con las operaciones transaccionales. | RF-12 / Rendimiento | Justifica mantener OLTP y OLAP separados mediante ETL y Datamart. |
| **DA06** | **Seguridad y Exposición Controlada de Información** | El sistema debe proteger las operaciones internas y limitar la información visible en la consulta pública QR. | Seguridad / RF-08 / RC03 | Requiere HTTPS, autenticación, autorización por roles y separación entre información pública e interna. |

## Priorización

| Prioridad | Driver | Razón |
| :--- | :--- | :--- |
| **Alta** | **DA01 - Operación desconectada** | Condiciona directamente el cliente móvil y la estrategia de sincronización. |
| **Alta** | **DA02 - Inmutabilidad y auditoría** | Afecta el núcleo del dominio y la integridad histórica del lote. |
| **Alta** | **DA03 - Consultas públicas rápidas** | Puede generar una carga elevada de lecturas sobre la plataforma pública. |
| **Alta** | **DA06 - Seguridad** | El sistema combina datos internos con una interfaz pública. |
| **Media-Alta** | **DA04 - Extensibilidad** | Determina la organización del dominio y la capacidad de incorporar nuevos cultivos. |
| **Media** | **DA05 - Separación analítica** | Influye principalmente en reportes, indicadores y procesamiento histórico. |

## Trazabilidad de drivers

| Driver | Decisiones relacionadas |
| :--- | :--- |
| **DA01** | ADR-001, ADR-003 |
| **DA02** | ADR-002, ADR-004 |
| **DA03** | ADR-005 |
| **DA04** | ADR-001, ADR-002 |
| **DA05** | ADR-006 |
| **DA06** | ADR-008 |
