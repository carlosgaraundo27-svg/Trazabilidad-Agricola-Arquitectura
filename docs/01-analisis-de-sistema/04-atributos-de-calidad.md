# Atributos de Calidad y Requisitos No Funcionales

Los atributos de calidad representan las características que condicionan las decisiones arquitectónicas del sistema. Se expresan mediante una **definición aplicada al proyecto** y un criterio o escenario que permite orientar su tratamiento arquitectónico.

| Atributo | Definición aplicada al proyecto | Criterio / escenario de calidad |
| :--- | :--- | :--- |
| **Seguridad** | Capacidad del sistema para proteger la información y restringir las operaciones según el tipo de usuario. | Autenticación para usuarios internos, autorización basada en roles (RBAC), comunicación mediante HTTPS y control estricto de la información expuesta mediante QR. |
| **Integridad** | Capacidad del sistema para conservar la consistencia y validez de la información del lote durante su ciclo de vida. | Los eventos de trazabilidad cerrados no deben modificarse mediante operaciones normales; las transiciones del lote y del inventario deben respetar las reglas de negocio. |
| **Rendimiento** | Capacidad del sistema para responder oportunamente a las operaciones y consultas previstas. | Las consultas públicas mediante QR deben responder con baja latencia bajo una carga de prueba definida, utilizando Redis para reducir consultas repetitivas a PostgreSQL. |
| **Disponibilidad** | Capacidad del sistema para permanecer operativo durante el horario previsto y recuperarse ante fallos básicos. | Persistencia central, copias de seguridad y mecanismos básicos de recuperación que permitan restablecer el servicio ante fallos. |
| **Escalabilidad** | Capacidad de la solución para soportar mayor volumen de productores, lotes y consultas sin rediseñar el núcleo del sistema. | La organización modular debe permitir incorporar nuevos cultivos, como café o cacao, y ampliar el volumen de operación sin modificar innecesariamente las reglas centrales. |
| **Mantenibilidad** | Capacidad del sistema para incorporar cambios y corregir componentes sin afectar innecesariamente otras partes. | Separación de responsabilidades mediante **Monolito Modular + Clean Architecture**, interfaces definidas, API organizada y módulos de dominio independientes. |
| **Usabilidad** | Facilidad con la que los usuarios pueden ejecutar las tareas que corresponden a su rol y contexto operativo. | Portal web para operaciones administrativas y flujo móvil simplificado para el trabajo en campo, incluyendo operación sin conexión. |
| **Auditoría** | Capacidad de registrar y consultar las acciones relevantes realizadas sobre información crítica. | Registrar quién ejecutó acciones críticas, sobre qué recurso y en qué fecha/hora, especialmente en operaciones relacionadas con lotes, calidad, inventario y despacho. |

## Relación con la arquitectura

Los atributos de calidad más influyentes en la estructura arquitectónica son:

1. **Seguridad**, por la coexistencia de información interna y consulta pública.
2. **Integridad y Auditoría**, por la necesidad de conservar el historial del lote.
3. **Rendimiento**, por las consultas públicas mediante QR.
4. **Escalabilidad y Mantenibilidad**, por la proyección hacia nuevos cultivos.
5. **Disponibilidad**, por la necesidad de continuidad operativa.

Estos atributos constituyen insumos directos para la identificación y priorización de los drivers arquitectónicos.
