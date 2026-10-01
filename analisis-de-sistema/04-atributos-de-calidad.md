# Atributos de Calidad y Requisitos No Funcionales

| Atributo | Criterio Arquitectónico / Escenario de Calidad |
| :--- | :--- |
| **Seguridad** | Autenticación y autorización basada en roles (RBAC); comunicación cifrada mediante HTTPS; JWT/sesión segura. |
| **Integridad** | Los eventos del lote cerrados (ej. calidad aprobada) no deben alterarse mediante operaciones normales del sistema; inmutabilidad operativa protegida por reglas de dominio. |
| **Rendimiento** | Las consultas públicas QR deben responder con rapidez (baja latencia) bajo una carga de prueba definida, utilizando caché (ej. Redis) para aliviar la base de datos principal. |
| **Disponibilidad** | La plataforma debe mantener el servicio durante el horario operativo previsto, contar con persistencia central, copias de seguridad diarias (backups) y recuperación ante fallos básicos. |
| **Escalabilidad** | El modelo modular debe permitir incorporar nuevas cadenas agrícolas (ej. café, cacao) y mayor volumen de productores sin rediseñar el núcleo del sistema. |
| **Mantenibilidad** | Separación clara de responsabilidades mediante arquitectura modular/hexagonal, API documentada y módulos de dominio independientes. |
| **Usabilidad** | Interfaces adaptadas a escritorio (portal web) y dispositivos móviles, con un flujo de campo simplificado para los recolectores. |
| **Auditoría** | Registrar obligatoriamente quién ejecutó acciones críticas, y la fecha/hora de la transacción. |