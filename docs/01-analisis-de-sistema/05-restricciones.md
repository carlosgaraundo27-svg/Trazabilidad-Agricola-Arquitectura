# Restricciones del Proyecto

Las restricciones establecen condiciones que limitan las alternativas arquitectónicas y tecnológicas que pueden seleccionarse para la solución.

| ID | Clasificación | Definición de la restricción | Implicancia para la arquitectura |
| :--- | :--- | :--- | :--- |
| **RC01** | Operacional (Offline) | La aplicación móvil de campo debe registrar información aun cuando no exista conexión a internet. | Requiere almacenamiento local y sincronización posterior con el backend. |
| **RC02** | Presupuestal / Tecnológica | El alcance no contempla integración activa con IoT de contenedores marítimos, contratos inteligentes ni Blockchain. | Se evita introducir infraestructura y complejidad que no son necesarias para el prototipo. |
| **RC03** | Alcance de Datos Públicos | La consulta pública mediante QR no debe exponer datos personales de productores ni información financiera interna. | Obliga a diferenciar información pública de información interna y refuerza los controles de autorización y exposición. |
| **RC04** | Base de Datos | PostgreSQL debe utilizarse como motor transaccional principal (OLTP) y como fuente para el procesamiento del Datamart analítico. | Condiciona la persistencia principal y las estrategias de integración con la capa analítica. |
| **RC05** | Despliegue | La solución debe estar containerizada mediante Docker para facilitar su ejecución entre desarrollo y servidor Cloud. | Condiciona la estrategia de despliegue y favorece una infraestructura reproducible y portable. |
