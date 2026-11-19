# ADR-015 propuesta — Cliente de campo y sincronización offline

**Actualización 2026-11-19:** autorización expresa para implementar/probar solo el servidor A en rama dependiente de #7. [Plan A–D](../03-diseno-de-software/10-plan-incrementos-offline.md): recibo inmutable, identidad organización/captura y propietario fijo, canonización v1 y alta/audit/recibo atómicos, revalidación antes de replay. Implementación A en H con migración008 aditiva; sin backfill ni cambios a la demo. Esta decisión parcial de servidor no adopta Flutter/SQLite/ventana24h ni el adaptador nativo pendientes. La propuesta móvil y B–D continúan pendientes, sin ejecución del SDK señalado.

Fecha: 2026-11-16. **Estado: propuesta pendiente de decisión del usuario. Sin implementación.**

RF-03/DA01 requieren captura durable en móvil y sincronización. Flutter es la tecnología móvil de referencia previa; el repositorio solo contiene cliente React en línea, sin M1/L1 ejecutables. ADR-003 acepta REST; ADR-009 acota el corte online. La UI adaptable existente no acredita offline.

Se recomienda conservar Flutter y empezar por Android, con SQLite transaccional para captura/outbox, UUID local estable mapeado al ID servidor y recibo idempotente en PostgreSQL. Validar sesión/permisos/asignación al sincronizar; conflictos explícitos, sin sobrescribir ni cambiar identidad tras respuesta perdida. Detalles, alternativas, O1–O10 y OF-01–16 en la [especificación propuesta](../03-diseno-de-software/08-especificacion-offline-cosecha.md).

Alternativas: Flutter Android+iOS desde inicio; o PWA/web offline con una nueva decisión expresa sobre sustitución tecnológica y sus garantías. No se elige PWA por inercia ni se modifica el estado de la referencia Flutter sin respuesta.

Consecuencias de la recomendación: crear cliente, almacenamiento/migraciones locales, sesión móvil segura, adaptador H/recibos atómicos y pruebas de dispositivo/reinicio/red. Hay que decidir retención, catálogo offline, segundo plano y autenticación. No hay implementación, rendimiento medido ni aprobación docente inferidos. Ningún comando Flutter está disponible aún en el proyecto.

La propuesta concreta del 2026-11-17, aún pendiente, fija para decidir: O5 ventana local 24 h separada de sesión servidor 8 h, continuidad monotónica de arranque y bloqueo de nuevas capturas tras reboot sin revalidación; O6 jar nativo seguro/cookie/CSRF con smoke Android NA-01–08 pendiente; O7 mismo PUT/ID/cuerpo para reconciliar, sin sustitutos tras intento; O8 cinco reintentos después del inicial; O9 aislamiento por propietario y logout sin borrar pendientes. Estos valores no están implementados ni aprobados por silencio.
