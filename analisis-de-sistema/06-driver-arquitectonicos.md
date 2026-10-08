# Drivers Arquitectónicos Principales

| ID | Driver Arquitectónico | Origen | Implicancia en la Arquitectura |
| :--- | :--- | :--- | :--- |
| **DA01** | **Necesidad de Operación Desconectada en Campo** | RF-03 (Offline) / Usabilidad | Obliga al uso de una arquitectura de cliente móvil robusta con almacenamiento local y sincronización asíncrona vía API REST. |
| **DA02** | **Inmutabilidad y Auditoría del Lote** | Integridad / RF-09 | Determina el diseño de la lógica de dominio en torno a eventos de trazabilidad; una vez un lote cambia de estado, los registros pasados son de solo lectura. |
| **DA03** | **Consultas Públicas Rápidas vs. Transaccionalidad** | Rendimiento / RF-08 | Sugiere la separación de cargas; uso de una capa de caché (Redis) específica para responder a consultas QR sin sobrecargar la base relacional principal. |
| **DA04** | **Extensibilidad a Nuevos Cultivos** | Escalabilidad / Mantenibilidad | Justifica una organización modular del negocio, desacoplando la lógica central de las particularidades de la Palta Hass para facilitar la incorporación de nuevos cultivos. |
| **DA05** | **Separación Analítica** | RF-12 (Reportes) / Rendimiento | Requiere implementar procesos ETL para mover datos desde la base OLTP hacia un Datamart (OLAP) para la generación de indicadores de mermas y rendimientos. |
| **DA06** | **Seguridad y Exposición Controlada de Información** | Seguridad / RF-08 / RC03 | Obliga a separar la información pública de la información interna, aplicar autenticación y autorización por roles, proteger las comunicaciones mediante HTTPS y evitar la exposición de datos personales o financieros en la consulta QR. |

## Priorización

| Prioridad | Driver | Razón |
| :--- | :--- | :--- |
| **Alta** | DA01 - Operación desconectada | Condiciona directamente la arquitectura del cliente móvil y la estrategia de sincronización. |
| **Alta** | DA02 - Inmutabilidad y auditoría | Afecta el núcleo del dominio y la integridad histórica del lote. |
| **Alta** | DA03 - Consultas QR | Puede generar una carga de lectura considerable sobre la plataforma pública. |
| **Alta** | DA06 - Seguridad | El sistema combina datos internos con una interfaz pública de consulta. |
| **Media-Alta** | DA04 - Extensibilidad | Define cómo debe organizarse el dominio para soportar futuros cultivos. |
| **Media** | DA05 - Separación analítica | Influye principalmente en reportes y procesamiento de información histórica. |
