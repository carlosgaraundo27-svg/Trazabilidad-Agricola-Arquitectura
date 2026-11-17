# ADR-014 — Existencias y movimientos logísticos conservados

2026-11-16. **Estado: Aceptada por el usuario para prototipo académico**, D1=A–D9=A con sus precisiones. Base main 47d827c, tras corrección separada #6 y Sonar de main aprobado. Sin aprobación docente ni validación agrícola.

## Contexto

RF-10/RF-11 requieren inventario y transporte; entrega está en el modelo conceptual y solicitud del usuario sin RF propio en el catálogo existente. Calidad conserva un resultado manual y QR una proyección independiente; ninguno autoriza salida por sí solo. Mezclar calidad, liberación y despacho facilitaría autorizaciones implícitas o descontar masa dos veces.

## Decisión

Componente **G** de Logística e Inventario dentro de B1, módulos domain/policies/application/repository y adaptador HTTP. Puertos T1.inventorySource/inventorySources, Q.eligibility y S.requireCenter/audit inyectados en composición. PostgreSQL y la misma unitOfWork son autoridad; Redis no decide stock y el DTO público QR no cambia.

Admisión explícita única por total real y evidencia actual en cuarentena; liberación logística después de closed/accepted; reserva sin TTL; despacho completo; entrega total. Balance derivado de movimientos append-only, cantidades BigInt a milésimos y referencias al origen inmutable. A=H+T+E, R⊆H; reservar reduce disponibilidad, salida H→T, entrega T→E. No restar descarte de muestra ni reconstruir historia.

Transacciones revalidan sesión/concesión, bloquean clave→lote→entrada→despacho y comprueban versiones/estado/saldo. Operación, movimiento, evento, guía/entrega, auditoría y respuesta idempotente se confirman juntos. Lectura de detalle/historia bloquea entrada compartida; listas son proyecciones paginadas. Se conservan claves sin TTL arbitrario y se deniega replay tras revocar permisos.

Guía normalizada única por organización/centro en la demostración. Registro inmutable de toda referencia asignada impide que una corrección o cancelación la libere para otro despacho. Transporte privado puede estar incompleto antes de salida; al salir debe estar completo. Edición ordinaria/cancelación/devolución posteriores bloqueadas. Instantes de API con zona y hasta milisegundos; DB y comparación conservan esa precisión, sin convertir Date a texto que pierda fracciones.

## Alternativas diferidas

Ingreso automático, segregación obligatoria de personas, parciales, mezcla, empaque/pallets, TTL de reservas, traslados, entregas parciales, incidencias, devoluciones y correcciones posteriores. Se requiere especificar masa/composición/reconciliación antes de implementarlos. RF-10 queda **parcial por empaque**, packagingState=not_managed no representa empacado.

## Consecuencias y límites

Una reserva ocupa el lote completo y debe cancelarse explícitamente si se abandona. Una diferencia física o de entrega bloquea el cierre ordinario; no se inventa pérdida ni ubicación física del remanente documental. Los datos de transporte son internos, sin validez legal/fiscal afirmada. Los permisos de demo son concesiones explícitas, no herencia de rol.

La corrección requiere pruebas PostgreSQL de carreras, rollback y persistencia, además de E2E; un gate aprobado no elimina avisos pendientes de mantenimiento. No se promete mejora de rendimiento ni escalabilidad sin medición. [Especificación adoptada](../03-diseno-de-software/07-especificacion-inventario-despacho-entrega.md), [implementación/evidencias](../05-sprint01/inventario-implementacion.md).
