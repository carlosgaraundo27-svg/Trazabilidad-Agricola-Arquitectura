# ADR-015 propuesta — Cliente de campo y sincronización offline

Fecha: 2026-11-16. **Estado: propuesta pendiente de decisión del usuario. Sin implementación.**

RF-03/DA01 requieren captura durable en móvil y sincronización. Flutter es la tecnología móvil de referencia previa; el repositorio solo contiene cliente React en línea, sin M1/L1 ejecutables. ADR-003 acepta REST; ADR-009 acota el corte online. La UI adaptable existente no acredita offline.

Se recomienda conservar Flutter y empezar por Android, con SQLite transaccional para captura/outbox, UUID local estable mapeado al ID servidor y recibo idempotente en PostgreSQL. Validar sesión/permisos/asignación al sincronizar; conflictos explícitos, sin sobrescribir ni cambiar identidad tras respuesta perdida. Detalles, alternativas, O1–O10 y OF-01–16 en la [especificación propuesta](../03-diseno-de-software/08-especificacion-offline-cosecha.md).

Alternativas: Flutter Android+iOS desde inicio; o PWA/web offline con una nueva decisión expresa sobre sustitución tecnológica y sus garantías. No se elige PWA por inercia ni se modifica el estado de la referencia Flutter sin respuesta.

Consecuencias de la recomendación: crear cliente, almacenamiento/migraciones locales, sesión móvil segura, adaptador H/recibos atómicos y pruebas de dispositivo/reinicio/red. Hay que decidir retención, catálogo offline, segundo plano y autenticación. No hay implementación, rendimiento medido ni aprobación docente inferidos. Ningún comando Flutter está disponible aún en el proyecto.
