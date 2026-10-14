# Matriz Propuesta de Roles, Permisos y Clasificación de Datos

## Propósito

Definir una primera matriz para que la decisión de seguridad no se quede en “usar RBAC”. La matriz es una propuesta derivada de los actores y del alcance funcional; debe revisarla el equipo y confirmarla el docente antes de implementarla.

## 1. Matriz de permisos por rol

Leyenda: **C** = crear/registrar; **L** = leer/consultar; **M** = modificar mientras la operación siga abierta; **A** = aprobar/cerrar; **G** = administrar; **—** = sin permiso por defecto. Los permisos se aplican solo al ámbito de datos autorizado para el usuario.

| Rol | Productores / parcelas | Cosecha / pre-lotes | Acopio / pesaje | Calidad / clasificación | Inventario / transporte | Reportes / liquidación | Usuarios / roles | QR público |
|---|---|---|---|---|---|---|---|---|
| **Productor** | L de sus datos; solicitar corrección según proceso aprobado | L de sus registros si se habilita en alcance | — | L de estado autorizado | — | L solo de liquidación propia, si se habilita acceso | — | L público |
| **Recolector / cuadrilla** | L mínimo de parcela asignada | C; M mientras esté pendiente de sincronización/cierre | — | — | — | — | — | L público |
| **Operario de acopio** | L necesario para recepción | L de pre-lotes recibidos | C/M recepción y pesaje antes del cierre | L del resultado autorizado | L de estado necesario para operación | — | — | L público |
| **Responsable de calidad** | L mínimo para identificar origen | L de cosecha/pre-lote | L de recepción | C/M controles; A/registrar decisión de clasificación según reglas aprobadas | L del estado relacionado | — | — | L público |
| **Encargado logístico** | L mínimo para el despacho | L de lotes habilitados | L de recepción necesaria | L del estado de calidad | C/M movimientos, transporte, despacho y entrega según etapa | L de indicadores logísticos autorizados | — | L público |
| **Administrador** | G catálogos y registros según política aprobada | L/G operativo según necesidad | L/G operativo según necesidad | L/G operativo según necesidad | L/G operativo según necesidad | L restringido según función; auditar acceso a datos financieros | G usuarios, roles, permisos y configuración | L público |
| **Comprador autorizado** | L solo información relacionada con la compra | L cuando esté relacionada con lote comprado | L de datos autorizados | L de resultados autorizados | L de estado logístico autorizado | L de reportes y liquidación únicamente si la relación comercial lo permite | — | L público |
| **Consumidor / público** | — | — | — | No obtiene registros internos; solo el estado publicable | No obtiene detalle interno del transporte | — | — | L solo proyección pública |

**Precaución:** esta matriz es un baseline de diseño. Las funciones exactas de modificación, aprobación, liquidación, devolución y corrección deben confirmarse con el proceso real de la organización. La regla de mínimo privilegio aplica incluso al administrador, especialmente respecto de la consulta de información financiera.

## 2. Clasificación de información

| Clase | Ejemplos | Regla de acceso |
|---|---|---|
| **Pública** | Producto, código público de lote, fechas y etapas de trazabilidad seleccionadas, estado publicable de calidad y centro de acopio si se autoriza. | Puede publicarse mediante QR tras filtrar y validar los datos. |
| **Interna** | Datos de contacto de productor, notas operativas, registros completos de pesaje, detalles de inventario y bitácoras de operación. | Acceso autenticado según rol y necesidad funcional. |
| **Restringida** | Liquidaciones, importes, información financiera, credenciales, tokens y secretos. | Acceso explícito, mínimo privilegio y no exposición en QR; secretos nunca se versionan en el repositorio. |

## 3. Controles mínimos derivados

1. Validar autenticación y autorización en el backend; no confiar solamente en la interfaz.
2. Denegar por defecto y conceder permisos por rol y recurso.
3. Construir una proyección/DTO pública QR; no serializar la entidad interna completa.
4. Registrar actor, acción, recurso, fecha/hora y resultado para operaciones críticas.
5. No incluir contraseñas, tokens, datos financieros o secretos en logs o respuestas públicas.
6. Aplicar HTTPS y restringir el acceso de red a PostgreSQL y Redis.
7. Cubrir con pruebas negativas las operaciones sin sesión, credenciales inválidas, rol incorrecto y acceso a registros de otro ámbito.

## 4. Trazabilidad

- **RF-13:** administración de usuarios, roles y permisos.
- **RF-08 / RF-09:** vista pública e historial de lote.
- **DA06:** seguridad y exposición controlada de información.
- **RC03:** restricción de datos públicos.
- **ADR-008:** decisión de seguridad, autenticación y control de exposición.
- **EQ-04:** escenario medible de acceso no autorizado.

## Estado

**Propuesta pendiente de validación.** Al acordar los permisos definitivos, deben actualizarse este documento, los casos de uso, los controladores y los escenarios de prueba.
