# ADR-014 propuesta — Existencias y movimientos logísticos conservados

2026-11-16. **Estado: Propuesta, pendiente de D1–D9.** No autoriza implementación ni migraciones. Base main d7da0d6 tras integrar QR/Redis revisados. Sin aprobación docente ni validación agrícola.

## Contexto

RF-10/RF-11 requieren inventario y transporte. El modelo conceptual ya contempla entrega, pero no existe su requisito RF específico en el catálogo. Calidad conserva una decisión manual cerrada y QR una proyección pública independiente; ninguna autoriza despacho. Convertir estos estados en un único «aprobado/despachado» generaría autorizaciones implícitas y riesgo de descontar kilos dos veces.

## Propuesta sujeta a decisiones

Un componente de Logística e Inventario dentro de B1, con capacidades inventory→shipment→delivery y contratos hacia T1/Q/S. PostgreSQL y unitOfWork existentes son autoridad para cantidades, reserva, salida y entrega. Sin caché Redis de stock en este incremento; Redis público/DTO QR permanecen sin cambios.

Admisión explícita de masa documentada en cuarentena; liberación logística explícita después de Calidad closed/accepted; reservar y despachar lote completo; confirmar entrega total. Cantidades exactas y movimientos append-only, con identidad/origen preservados. Reservar no descuenta existencia física; salir mueve centro→tránsito; entregar mueve tránsito→entregado sin otro descuento del centro. A=H+T+E y 0≤R≤H. Estado de Calidad, disposición de inventario y estado de despacho se mantienen separados.

Se recomienda diferir parciales, empaque/pallets, expiración automática, transferencias entre centros y devoluciones para reducir decisiones físicas/documentales simultáneas. Ello deja RF-10 parcial respecto de empaque. Si el usuario necesita esas capacidades primero, se revisará la propuesta antes de implementar; no se implementa una alternativa no elegida.

## Alternativas que permanecen abiertas

La [tabla D1–D9](../03-diseno-de-software/07-especificacion-inventario-despacho-entrega.md#3-decisiones-que-debe-responder-el-usuario) contiene opciones, recomendación y ejemplos de cantidades. Incluye ingreso automático solo para hechos nuevos; segregación de personas; parciales con composición física explícita; reserva con TTL; pallets de un lote/multilote; precinto opcional documentado; entregas parciales/incidencias; devoluciones/reversas y permisos por centro. No hay opción de despachar pending/observed/rejected ni restar descarte de muestra.

## Consecuencias y límites

Una reserva completa bloquea el total del lote; no permite aprovechar 600 kg dejando 400 kg mientras D3=A. Una reserva no caduca sola mientras D4=A y debe cancelarse explícitamente si se abandona. Una diferencia física 980/1000 o una entrega parcial queda sin cierre ordinario bajo D1/D7=A: se requiere diseñar un procedimiento de conciliación, no inventar merma. Un despacho que ya salió no puede cancelarse para restituir masa sin un hecho físico de retorno.

Bloqueo/versiones/idempotencia y movimientos/auditoría atómicos añaden trabajo transaccional que se debe verificar con pruebas reales. No se promete menor latencia ni escalabilidad sin mediciones. El transporte es información privada; el requisito de placa/chofer/guía no se interpreta como validación legal o emisión fiscal.

Próximo paso: respuesta explícita D1–D9 y formalización del alcance de entrega; luego actualizar esta ADR y contratos para reflejar lo elegido. No cambiar Estado a Aceptada ni crear SQL/código por silencio.
