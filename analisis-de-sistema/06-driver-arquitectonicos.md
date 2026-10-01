# Drivers Arquitectónicos Principales

| ID | Driver Arquitectónico | Origen | Implicancia en la Arquitectura |
| :--- | :--- | :--- | :--- |
| **DA01** | **Necesidad de Operación Desconectada en Campo** | RF-03 (Offline) / Usabilidad | Obliga al uso de una arquitectura de cliente móvil robusta (ej. Flutter) con almacenamiento local (SQLite/NoSQL) y sincronización asíncrona vía API REST. |
| **DA02** | **Inmutabilidad y Auditoría del Lote** | Integridad / RF-09 | Determina el diseño de la lógica de dominio en torno a "eventos" de trazabilidad; una vez un lote cambia de estado, los registros pasados son de solo lectura. |
| **DA03** | **Consultas Públicas Rápidas vs. Transaccionalidad** | Rendimiento / RF-08 | Sugiere la separación de cargas; uso de una capa de caché (Redis) específica para responder a los escaneos masivos de QR sin golpear la base relacional principal. |
| **DA04** | **Extensibilidad a Nuevos Cultivos** | Escalabilidad / Mantenibilidad | Justifica el uso de un patrón de arquitectura modular (o hexagonal parcial) en la capa de Negocio, desacoplando la lógica central de las particularidades de la Palta Hass. |
| **DA05** | **Separación Analítica** | RF-12 (Reportes) / Rendimiento | Requiere implementar procesos ETL para mover datos desde la base OLTP hacia un Datamart (OLAP) para la generación de indicadores de mermas y rendimientos. |