# Escenarios de Atributos de Calidad

## Propósito

La Guía 04 indica que un atributo expresado como “el sistema debe ser rápido” todavía no es verificable. Por eso cada escenario se describe con fuente, estímulo, artefacto, entorno, respuesta, medida y método de verificación.

**Importante:** los valores numéricos marcados como “propuesta por validar” son objetivos de diseño para acordar con el equipo y el docente. No son resultados medidos ni compromisos de producción.

## EQ-01. Rendimiento: consulta pública mediante QR

| Elemento | Descripción |
|---|---|
| **Atributo** | Rendimiento |
| **Fuente del estímulo** | Consumidor o comprador que escanea un código QR. |
| **Estímulo** | Se reciben múltiples consultas de trazabilidad en un intervalo corto. |
| **Artefacto** | Endpoint público QR, caso de uso de consulta, caché Redis y repositorio PostgreSQL. |
| **Entorno** | Prueba controlada con datos representativos y carga concurrente documentada. |
| **Respuesta esperada** | Entregar solo los datos públicos autorizados del lote, sin errores inesperados ni exposición de información sensible. |
| **Medida de respuesta** | **Propuesta por validar:** percentil 95 (P95) de respuesta ≤ 2 segundos y menos del 1 % de errores HTTP 5xx con 100 usuarios virtuales concurrentes durante 10 minutos. |
| **Verificación** | Ejecutar una prueba de carga, registrar latencias, tasa de errores y uso de PostgreSQL/Redis. |
| **Estado** | Pendiente de acordar carga, ambiente y datos de prueba. |

## EQ-02. Operación desconectada: captura y sincronización en campo

| Elemento | Descripción |
|---|---|
| **Atributo** | Usabilidad / disponibilidad operativa local |
| **Fuente del estímulo** | Recolector o cuadrilla de cosecha. |
| **Estímulo** | La conectividad se pierde durante el registro de cosecha. |
| **Artefacto** | Aplicación móvil, almacenamiento local y componente de sincronización. |
| **Entorno** | Dispositivo móvil sin internet durante el registro; posteriormente se restablece la conexión. |
| **Respuesta esperada** | El usuario registra datos y genera pre-lotes sin conexión; al recuperar conectividad, los datos se sincronizan sin perder registros ni duplicarlos. |
| **Medida de respuesta** | **Propuesta por validar:** el 100 % de los registros confirmados localmente del conjunto de prueba se sincroniza una sola vez; lote de 50 registros pendientes sincronizado en ≤ 60 segundos bajo conexión estable. |
| **Verificación** | Desconectar la red, registrar datos, cerrar/reabrir la aplicación, restaurar conexión y comparar identificadores locales con registros del servidor. |
| **Estado** | Pendiente de implementación y prueba del protocolo de sincronización. |

## EQ-03. Disponibilidad: continuidad de operaciones críticas

| Elemento | Descripción |
|---|---|
| **Atributo** | Disponibilidad |
| **Fuente del estímulo** | Usuario operativo que registra o consulta un lote. |
| **Estímulo** | El usuario intenta usar una operación crítica durante el horario definido. |
| **Artefacto** | API REST, aplicación backend y persistencia PostgreSQL. |
| **Entorno** | Entorno desplegado, con monitoreo y procedimientos de respaldo definidos. |
| **Respuesta esperada** | La operación está disponible o, si falla una dependencia, el sistema comunica el error de manera controlada y no confirma una transacción no persistida. |
| **Medida de respuesta** | **Propuesta por validar:** disponibilidad mensual ≥ 99,5 % para los endpoints críticos acordados. |
| **Verificación** | Revisar monitoreo y bitácoras, contabilizar tiempo disponible y tiempo de interrupción durante el periodo de evaluación. |
| **Estado** | Pendiente de definir endpoints críticos, mantenimiento programado y alcance del monitoreo. |

## EQ-04. Seguridad: bloqueo de acciones no autorizadas

| Elemento | Descripción |
|---|---|
| **Atributo** | Seguridad |
| **Fuente del estímulo** | Usuario sin sesión, con credenciales inválidas o sin permisos suficientes. |
| **Estímulo** | Intenta acceder a una función protegida o consultar datos internos mediante el endpoint QR. |
| **Artefacto** | Autenticación, autorización RBAC, controladores REST y proyección pública de trazabilidad. |
| **Entorno** | Pruebas de seguridad con perfiles de administrador, operario, comprador y visitante público. |
| **Respuesta esperada** | La operación no autorizada es rechazada y la vista pública no expone datos personales ni información financiera interna. |
| **Medida de respuesta** | **Criterio propuesto:** 100 % de los casos negativos del conjunto de pruebas rechazados y cero campos sensibles en respuestas públicas revisadas. |
| **Verificación** | Ejecutar pruebas de autorización por rol, revisar respuestas HTTP y comparar el DTO público con el modelo interno. |
| **Estado** | Pendiente de cerrar la matriz de permisos y las pruebas negativas. |

## EQ-05. Integridad y auditoría: protección de eventos cerrados

| Elemento | Descripción |
|---|---|
| **Atributo** | Integridad / auditoría |
| **Fuente del estímulo** | Usuario operativo, proceso interno o intento de modificación no autorizada. |
| **Estímulo** | Se intenta editar o eliminar un evento de trazabilidad que ya fue cerrado. |
| **Artefacto** | Dominio de Lote, EventoTrazabilidad, casos de uso y repositorios. |
| **Entorno** | Operación normal del sistema después de registrar un evento cerrado. |
| **Respuesta esperada** | Se rechaza la modificación ordinaria; el historial conserva actor y marca temporal de las operaciones críticas. |
| **Medida de respuesta** | **Criterio propuesto:** el 100 % de los intentos de edición/eliminación incluidos en las pruebas son rechazados; el 100 % de las operaciones críticas exitosas genera el registro de auditoría definido. |
| **Verificación** | Ejecutar pruebas de dominio y API para transiciones válidas, inválidas y modificación de eventos cerrados; revisar registros de auditoría. |
| **Estado** | Pendiente de definir las reglas completas de transición del lote. |

## EQ-06. Mantenibilidad: cambio localizado en un módulo

| Elemento | Descripción |
|---|---|
| **Atributo** | Mantenibilidad |
| **Fuente del estímulo** | Equipo de desarrollo. |
| **Estímulo** | Se modifica una regla de clasificación o se añade una validación de un nuevo tipo de cultivo. |
| **Artefacto** | Módulo correspondiente, casos de uso y entidades del dominio. |
| **Entorno** | Código organizado como Monolito Modular y Clean Architecture, con pruebas automatizadas. |
| **Respuesta esperada** | El cambio queda concentrado en la responsabilidad correspondiente y no obliga a modificar módulos no relacionados sin justificación. |
| **Medida de respuesta** | **Criterio propuesto:** todas las pruebas unitarias y de regresión definidas para el cambio pasan; la revisión de dependencias confirma que el dominio no importa infraestructura. |
| **Verificación** | Revisar diff, ejecutar pruebas y comprobar la dirección de dependencias. |
| **Estado** | Pendiente de definir cobertura, herramientas y reglas automáticas de arquitectura. |

## EQ-07. Analítica: generación de indicadores sin bloquear la operación

| Elemento | Descripción |
|---|---|
| **Atributo** | Rendimiento / separación de cargas |
| **Fuente del estímulo** | Administrador o comprador que solicita reportes de mermas y rendimiento. |
| **Estímulo** | Se ejecuta un reporte sobre un conjunto histórico de lotes mientras continúa la actividad transaccional. |
| **Artefacto** | Proceso ETL, Datamart y módulo Reportes. |
| **Entorno** | Conjunto de datos de prueba documentado y operaciones transaccionales simultáneas. |
| **Respuesta esperada** | Los indicadores se generan desde la estructura analítica y no degradan de forma significativa las operaciones transaccionales. |
| **Medida de respuesta** | **Propuesta por validar:** reportes acordados con P95 ≤ 3 segundos sobre el conjunto de prueba y sin incremento de errores transaccionales por encima del umbral acordado. |
| **Verificación** | Ejecutar reportes y transacciones en paralelo y comparar latencia/errores con y sin carga analítica. |
| **Estado** | Pendiente de definir el conjunto de datos y la estrategia física del Datamart. |

## Resumen

| Código | Atributo | Qué se comprueba |
|---|---|---|
| EQ-01 | Rendimiento QR | Latencia y errores bajo concurrencia definida. |
| EQ-02 | Operación offline | Persistencia local y sincronización sin pérdida ni duplicación. |
| EQ-03 | Disponibilidad | Continuidad de endpoints críticos. |
| EQ-04 | Seguridad | Acceso protegido y respuesta QR sin datos sensibles. |
| EQ-05 | Integridad / auditoría | Eventos cerrados protegidos y acciones críticas registradas. |
| EQ-06 | Mantenibilidad | Cambios localizados, pruebas aprobadas y dependencias correctas. |
| EQ-07 | Analítica | Reportes sin interferencia excesiva con OLTP. |
