# Restricciones del Proyecto

| ID | Clasificación | Restricción / Limitación |
| :--- | :--- | :--- |
| **RC01** | Operacional (Offline) | La aplicación móvil de campo debe ser capaz de funcionar y registrar datos sin conexión a internet, sincronizando los pre-lotes a posteriori. |
| **RC02** | Presupuestal / Tecnológica | No se debe incluir en el alcance la integración activa con IoT (contenedores marítimos), contratos inteligentes o Blockchain para no sobrecomplejizar el prototipo. |
| **RC03** | Alcance de Datos Públicos | La vista pública del código QR debe restringir estrictamente la exposición de datos personales de los productores o información financiera interna. |
| **RC04** | Base de Datos | Se requiere el uso de PostgreSQL como motor transaccional (OLTP) y base para el Datamart analítico (OLAP). |
| **RC05** | Despliegue | La solución debe ser "containerizada" utilizando Docker para asegurar la portabilidad entre entornos de desarrollo y el servidor Cloud. |