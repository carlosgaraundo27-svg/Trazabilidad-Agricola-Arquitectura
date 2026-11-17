# Inventario, Reserva, Despacho y Entrega

2026-11-16. **D1=A–D9=A adoptadas explícitamente por el usuario para el prototipo académico.** Base main 47d827c1ac2ae0fe3c8050279f5e0ecdcd562d05, después de corregir SonarCloud en el PR separado #6 y comprobar verify, Compose y Sonar de main aprobados. No implica aprobación docente ni validación agrícola. [Revisión de main](../05-sprint01/revision-sonar-main.md), [ADR-014](../02-arquitectura/11-decisiones-inventario-despacho.md).

## Alcance adoptado

Un lote consolidado, su centro de origen y un destino de entrega: admisión única y explícita en cuarentena, liberación logística explícita tras Calidad `closed/accepted` (Aprobado), preparación, reserva sin vencimiento, salida completa y entrega total. La cantidad es el total **real** documentado del lote, derivado por servidor; 1000 kg nunca es una constante operativa. Las pruebas usan 73.125 kg y también 17.125/25.500 kg.

| Decisión | Regla adoptada | Alternativa diferida |
| --- | --- | --- |
| D1 | Admitir una vez por lote, con peso verificado, referencia y evidencia física actual; cuarentena | Ingreso automático para nuevos hechos |
| D2 | Calidad cerrada accepted más liberación logística explícita; revalidar al reservar/salir | Separación obligatoria de personas |
| D3 | Un lote completo por su cantidad real; cantidad de despacho no editable | Parciales, mezclas y asignaciones físicas parciales |
| D4 | Reserva visible, sin TTL; cancelación autorizada antes de salir | Expiración automática |
| D5 | Empaque y pallets fuera; RF-10 parcial | Empaque, composición por pallet y QR por pallet |
| D6 | Transporte completo antes de salida; guía única por organización y centro en la demo | Precinto opcional con motivo, emisión/validación legal |
| D7 | Confirmación total por usuario autorizado del centro de origen, con fecha y evidencia | Entregas parciales/incidencias y conciliación |
| D8 | Corrección auditada y cancelación solo antes de salida | Devoluciones, reversas y correcciones posteriores |
| D9 | Permiso por acción, organización y centro; sin herencia de admin/Calidad/QR | Segregación obligatoria de actores |

La guía se normaliza con trim/mayúsculas. Toda referencia asignada permanece vinculada al despacho en un registro inmutable, aunque se corrija, borre del borrador o cancele. Otro despacho del mismo ámbito no puede reutilizarla; el despacho original puede volver a su propia referencia. Otros centros tienen espacios separados. Esta es una regla **de demostración**, no una regla legal validada. No se capturan DNI/teléfonos. Transporte puede estar incompleto en draft/reserved; salida exige guía, vehículo, placa, chofer, precinto y destino completos.

## Restricciones y estados

Calidad y publicación QR no autorizan despacho por sí solas. Sin evaluación, draft, observed y rejected no permiten liberar/reservar/salir. Descartar un fruto de una muestra no reduce kilos de inventario. No se inventan pérdidas, conversiones, retornos ni movimientos para registros históricos. La admisión registra un hecho actual autorizado; si el peso verificado difiere del total documentado se bloquea, sin fabricar merma. Recepciones, temperaturas originales, aportes, origen y Calidad cerrada permanecen intactos. Transporte, destino, evidencia y actores internos quedan fuera del DTO público QR.

| Modelo | Estados y significado |
| --- | --- |
| Inventario | `quarantine`: admitido sin liberación; `released`: liberación logística explícita respaldada por evaluación/versión closed/accepted |
| Despacho | `draft`: preparado, sin reserva; `reserved`: total retenido en centro; `in_transit`: salida confirmada; `delivered`: recepción total confirmada; `cancelled`: cancelado antes de salida |
| Calidad | Estados existentes; Logística no los modifica ni calcula reglas agrícolas |
| Empaque | Proyección `packagingState=not_managed`: operación no cubierta. No se simula empacado |

Transiciones: sin entrada→quarantine→released; draft→reserved→in_transit→delivered; draft/reserved→cancelled. Corrección de transporte conserva estado y kg, avanza versión y registra antes/después y motivo. Desde in_transit se bloquean edición ordinaria, cancelación y devolución. Delivered/cancelled no se reabren.

## Conservación y atomicidad

A=admitido; H=en centro; R=reservado, subconjunto de H; U=H−R; T=salido pendiente de entrega total; E=entregado. **A=H+T+E**, 0≤R≤H, U≥0. Despachable=U solamente con released y closed/accepted. Reservar no descuenta H; salida H→T y libera la reserva; entrega T→E sin otro descuento de H. Cancelar reserved libera R sin crear otra entrada.

| Hecho ficticio | A | H | R | U | T | E |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Admitir | 73.125 | 73.125 | 0 | 73.125 | 0 | 0 |
| Liberar | 73.125 | 73.125 | 0 | 73.125 | 0 | 0 |
| Reservar | 73.125 | 73.125 | 73.125 | 0 | 0 | 0 |
| Cancelar reserva, alternativa a salir | 73.125 | 73.125 | 0 | 73.125 | 0 | 0 |
| Salir desde reserved | 73.125 | 0 | 0 | 0 | 73.125 | 0 |
| Entregar | 73.125 | 0 | 0 | 0 | 0 | 73.125 |

Si se reportan 70 kg donde se esperan 73.125, no se confirma entrega total ni se inventan 3.125 de merma/retorno. T representa saldo documental sin confirmar, no localización física medida. El procedimiento de discrepancias queda pendiente.

Kg decimales exactos, hasta tres decimales, normalizados como cadenas; cálculo BigInt a milésimos, sin floats ni redondeo. Totales derivados de movimientos `admitted`, `reserved`, `reservation_released`, `dispatched`, `delivered`; cada efecto positivo tiene tipo explícito. Aportes del lote se referencian sin duplicarlos. No hay contadores de stock independientes ni Redis como autoridad.

Orden de bloqueo: revalidar sesión/concesión en DB → clave del actor mediante advisory lock transaccional → lote FOR UPDATE → entrada FOR UPDATE → despacho FOR UPDATE. Cada comando opera sobre un solo lote completo. Comprobar estado, versiones, Calidad y saldo después del bloqueo. Lecturas de detalle/historia mantienen entrada compartida para balance/eventos coherentes; listas usan proyecciones acotadas de una sentencia por listado. No se prometen prestaciones sin mediciones.

Idempotency-Key UUID por intención, hash de acción/recurso/cuerpo normalizado. Mismo contenido devuelve respuesta original con 200; otro cuerpo/operación/recurso da 409. Permisos se revalidan antes del replay. Operación, versiones, movimiento, evento, registro de guía/entrega, auditoría y clave comparten transacción; fallo en cualquier escritura revierte todos los efectos. No hay TTL arbitrario de claves. Después de respuesta perdida la UI conserva la intención y bloquea otra operación hasta reintentar; no garantiza almacenamiento offline ni persistencia de esa intención tras cerrar el navegador.

## API interna implementada

Sesión, CSRF y origen existentes; cuerpos estrictos. El cliente no fija actor, organización, estado, saldo ni cantidad de despacho. UUID normalizados. Instantes con zona y hasta tres decimales de segundo, sin futuro ni truncamiento silencioso; salida≥preparación y entrega≥salida. [OpenAPI](openapi.json) es el contrato detallado de campos, nulos y respuestas.

| Método /api/v1 | Entrada | Resultado |
| --- | --- | --- |
| GET /inventory/lots | centerId, offset | Lotes, total real y stockEntryId opcional; no inventa saldo de no admitidos |
| GET /inventory | centerId, offset | Página de resúmenes de existencias |
| POST /inventory/entries | lotId, verifiedKg, reference, evidenceRef | quarantine, total derivado y peso verificado idéntico |
| GET /inventory/entries/:id | ID | Detalle de inventario, composición y resumen mínimo de Calidad |
| GET /inventory/entries/:id/movements | offset | Página, balance y snapshotVersion de la misma lectura |
| POST /inventory/entries/:id/release | expectedVersion, reason | Liberación con evaluación/versión registradas |
| GET /shipments | centerId, offset | Página de resúmenes privados |
| POST /shipments | stockEntryId, transport?, destinationLabel? | draft por total real; no reserva implícita |
| GET /shipments/:id | ID | Detalle, entrega e inventario vigente |
| PUT /shipments/:id/transport | expectedVersion, transport, destinationLabel?, reason | Corrección antes de salida, 200 |
| POST /shipments/:id/reservation | expectedVersion, expectedInventoryVersion | Reserva completa, sin vencimiento |
| POST /shipments/:id/departure | versiones, departedAt | Salida completa con transporte obligatorio |
| POST /shipments/:id/delivery | versiones, receivedKg, deliveredAt, evidenceRef | Entrega total, sin segundo descuento |
| POST /shipments/:id/cancellation | versiones, reason | Cancelación previa, libera reserva si existe |
| GET /shipments/:id/events | offset | Historia privada paginada con snapshotVersion y despacho |

Listas/historias: limit=100, offset 0–100000. Comandos requieren Idempotency-Key; alta/transición nueva=201, replay=200, corrección PUT=200. Sin DELETE ni asignación libre de estados. 400 clave inválida; 401 sesión; 403 lista/CSRF/origen; 404 recurso inaccesible; 409 versión/estado/duplicado, IDEMPOTENCY_CONFLICT, STOCK_INSUFFICIENT o GUIDE_REFERENCE_CONFLICT; 422 validación, ADMISSION_QUANTITY, QUALITY_NOT_APPROVED, INVENTORY_NOT_RELEASED, TRANSPORT_INCOMPLETE, DEPARTURE_TIME o DELIVERY_TOTAL. Fallos de escritura=500 seguro con rollback; no se filtra SQL.

StockEntrySummary contiene identidad, disposición/versión y A/H/R/U/T/E, unidad kg y empaque no gestionado. El detalle añade referencia/evidencia actuales, liberación y responsable, calidad mínima `{id,version,evaluationState,qualityResult}`, composición y dispatchableKg. No expone captura/nota privada de Calidad. ShipmentSummary contiene identidad, cantidad/estado/versión, transporte/destino y fechas; el detalle añade updatedAt, entrega e inventario vigente. Transporte=`{guideReference,vehicleLabel,plate,driverName,sealReference}`; borradores admiten nulos. Entrega incluye cantidad, instante, evidencia y usuario interno; no se afirma firma externa. El DTO público QR no cambia.

Puertos: T1.inventorySource/inventorySources conserva identidad, total y composición; Q.eligibility devuelve solo evaluación/versión/state/result bajo bloqueo compartido; S.requireCenter/audit conserva autorización y auditoría transaccionales. La composición inyecta estos contratos, sin imports de repositorios ajenos.

## Pantallas y permisos

Inventario por centro con admisión y evidencia actuales; detalle H/R/U/T/E, Calidad y liberación separadas, origen de solo lectura; preparación sin reserva; transporte con motivo auditado; reserva visible/cancelable; salida explícita; entrega total con discrepancia explicada; historia paginada. Carga, vacío, error, conflicto con actualización, éxito y reintento de respuesta perdida. Teclado y móvil; cambiar entre despachos remonta el formulario por identidad/versión para no arrastrar datos privados ajenos.

Concesiones: inventory:read/admit/release y shipment:read/create/update/reserve/dispatch/deliver/cancel por usuario/organización/centro. Admin, Calidad y publicador QR no las heredan. El seed solo prepara cuentas ficticias explícitas; migraciones no conceden permisos ni crean inventario. Auditoría exitosa y eventos privados atómicos; logs genéricos sin transporte ni credenciales.

## Migraciones y límites pendientes

006_inventory crea entradas, movimientos, eventos y requests; amplía CHECK de concesiones sin otorgarlas. 007_shipments crea despachos, entregas y referencias históricas de guía, FKs compuestas de ámbito, cantidades completas, unicidad de efecto/reserva/salida y triggers de identidad/transiciones/inmutabilidad. No se modifican 001–005 ni se rellenan lotes históricos. Down solamente en base desechable y orden inverso; un rollback productivo del código no debe borrar hechos.

Quedan pendientes empaque/pallets, parciales, mezclas, expiración, traslados, devoluciones, conciliación de diferencias y correcciones posteriores a salida. Requieren decisiones y pruebas propias antes de implementar. No hay offline, ETL ni despliegue continuo añadidos por este incremento.

## Aceptación y evidencia

| ID | Criterio |
| --- | --- |
| ID-01 | Admisión explícita por cantidad real positiva, también 73.125; quarantine y evidencia actual |
| ID-02 | Doble admisión concurrente o con claves distintas no duplica saldo; migración/seed sin backfill |
| ID-03 | Diferencia de peso verificado bloquea; no fabrica pérdidas |
| ID-04 | Sin evaluación/draft/observed/rejected bloquean; accepted sin liberación no basta; QR no autoriza |
| ID-05 | Liberar conserva masa; descarte 1/3 de muestra no descuenta kilos |
| ID-06 | Unidades/precisión/estados/actor/masa arbitrarios se rechazan sin cambios |
| ID-07 | Draft no reserva; reserva total mantiene H y reduce U a cero, sin TTL |
| ID-08 | Doble reserva/salida y replay concurrentes tienen un efecto válido, nunca saldo negativo |
| ID-09 | Saldo insuficiente con versiones actuales da STOCK_INSUFFICIENT; versiones viejas dan conflicto |
| ID-10 | Salida revalida reserva propia, Calidad, liberación, permiso y transporte completo |
| ID-11 | Salida mueve total real H→T conservando composición y origen |
| ID-12 | Cancelar draft no crea masa; cancelar reserved libera R atómicamente; carrera contra salida serializada |
| ID-13 | Desde salida no hay edición ordinaria, cancelación, devolución, reapertura ni DELETE de hechos |
| ID-14 | Corrección previa conserva antes/después/motivo y referencias de guía históricas; versión vieja falla |
| ID-15 | Entrega total mueve T→E, H queda igual; repetición/concurrencia no duplica |
| ID-16 | Entrega distinta, futura, anterior a salida o sin evidencia falla; sin merma/retorno inventados |
| ID-17 | Acción/centro/organización/sesión inválidos y revocación antes de replay deniegan |
| ID-18 | Clave por intención; cuerpo/operación/recurso diferente falla; UI reintenta respuesta perdida sin duplicar |
| ID-19 | Fallo real en operación/movimiento/evento/audit/request revierte versiones, kg, hechos y clave |
| ID-20 | CHECK/FK/UNIQUE/triggers protegen ámbitos, cantidades completas, identidad e historia inmutable |
| ID-21 | A=H+T+E y 0≤R≤H en cada transición; hechos sobreviven reinicio sin reconstrucción histórica |
| ID-22 | DTO/caché pública QR sin transporte, destino, actores internos ni evidencia privada |
| ID-23 | Listados/historia por centro y paginados; detalle/versiones/historia coherentes |
| ID-24 | E2E: Calidad ficticia preparada, admitir→liberar→preparar→reservar→salir→entregar; cancelación, reintento, otro centro y cambio entre despachos |

Pruebas y comandos reproducibles: [implementación/evidencias](../05-sprint01/inventario-implementacion.md). PostgreSQL real para concurrencia y rollback; Chromium para UI; ningún gate/aserción se rebaja. [Matriz provisional](../05-sprint01/matriz-trabajo-final.md): falta acceso al PDF oficial, no es matriz definitiva.

## Trazabilidad

RF-10/HU06: ID-01–16/21/24, **parcial por empaque diferido**. RF-11/HU06: ID-10/14/22, datos internos sin emisión/validación fiscal. RF-04/05/09: ID-02/03/11/19–21, identidad/masa/origen/auditoría. RF-06/07: ID-04/05/10, resultado manual existente, sin nueva regla agrícola. RF-08/ADR-008/013: ID-22, privacidad QR. RF-13/DA06/EQ-04/05: ID-17–20/23. RF-12/ADR-006: movimientos como posible fuente futura, sin ETL/reportes implementados. Entrega responde al modelo conceptual y solicitud del usuario; no se inventa un nuevo número RF oficial en el catálogo RF-01–13.
