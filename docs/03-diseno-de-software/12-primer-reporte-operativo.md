# Propuesta ROP-01 — despachos salidos y entregas por centro

Estado: **especificación para revisión, no implementada**. Fuente: RF-12/HU08, DA05/EQ-07 y los hechos logísticos ya implementados. No cubre mermas, rendimiento agrícola o liquidaciones: sus definiciones/reglas siguen pendientes. [RF-12](../01-analisis-de-sistema/03-requisitos-funcionales.md), [diseño de Reportes](01-diseno-interno.md), [matriz más reciente en el borrador #9](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/blob/6e1642b73bf517f14ad04108f685e0eab26091a6/docs/05-sprint01/matriz-trabajo-final.md). Esa matriz conserva Reportes/ETL/Datamart proyectados y no los añade como criterio17 a la transcripción.

## Objetivo y usuario

Permitir al encargado logístico autorizado localizar salidas de su centro, distinguir las que siguen en tránsito de las entregadas y consultar el tiempo transcurrido entre salida y entrega. Es un listado operativo de hechos, sin declarar eficiencia del transporte, incumplimientos de SLA o indicadores agrícolas.

Usuario inicial: actor interno con sesión vigente y concesión **shipment:read** para el centro solicitado, conforme al modelo existente. No habilita acceso público QR ni acceso del comprador: la política de compradores/liquidaciones necesita acuerdo propio. El nombre del rol o ser administrador no sustituye la concesión de centro.

## Fuente y campos mínimos

Fuente transaccional PostgreSQL: logistics.shipments, logistics.deliveries y inventory.entries solo para identificar lote. Relacionar por shipment_id/entry_id y verificar organization_id/center_id en todos los joins. La entrega es0..1 por despacho; evitar joins a movimientos/eventos que multipliquen filas. No usar datos ficticios como históricos recuperados.

Una fila por shipmentId: lotId, centerId, referencia interna de guía, state, quantityKg y receivedKg como textos decimales exactos de tres posiciones, departedAt, deliveredAt y durationSeconds nullable. Solo estados **in_transit** y **delivered**, nombres reales del esquema. No incluir borradores/reservas/cancelaciones sin salida en este primer listado, ni contraseña, cookie, actor personal, chofer, placa o transporte JSON completo.

## Filtros y permisos

- Centro obligatorio; organización proviene de la sesión, nunca de un organizationId libre del cliente.
- Intervalo obligatorio sobre departedAt: desde inclusivo/hasta exclusivo, instantes con zona normalizados a UTC. Mostrar zona explícita; si se ofrece calendario Lima, documentar su conversión sin cambiar el reloj del sistema.
- Estado opcional entre los dos admitidos; lotId o shipmentId exactos opcionales. No búsqueda libre de personas.
- Página acotada a100 como patrón existente; orden estable departedAt/id. Antes de implementar, acordar el límite máximo de rango con dataset y revisar plan/índices; no abrir escaneo histórico ilimitado ni inventar un benchmark.

Aplicar sesión/organización/concesión actual **antes de leer o devolver resultados**; misma validación para cada página y eventual exportación futura. Sin sesión401; sin permiso403 conforme al listado existente; no devolver filas ni totales de otro centro/organización. Entradas/rangos inválidos422. DTO explícito y consultas parametrizadas; no serializar entidades/transportes completos. No crear un permiso nuevo ni modificar administración de roles en esta especificación.

## Cálculo y límites semánticos

Para entrega existente: durationSeconds = deliveredAt − departedAt, usando diferencia temporal exacta con precisión de milisegundos, expresada como texto decimal en segundos; sin redondear mediante Number. Ejemplo:10:00:00Z→11:30:00Z produce5400.000s. No es tiempo de conducción pura: incluye cualquier parada entre ambos hechos.

En tránsito: deliveredAt/receivedKg/durationSeconds son null, no cero ni una entrega asumida. No sustituir entrega ausente por la hora actual. Para delivered sin entrega o tiempo negativo, señalar inconsistencia de datos y no fabricar fecha/duración; el esquema/servicio actual ya rechaza esos casos al registrar hechos. No calcular pérdida como diferencia de cantidades ni extrapolar productividad, merma, pago o conversión de unidades. No agregar promedios, percentiles o denominadores de negocio en esta primera versión.

Cada página se obtiene en lectura consistente y muestra generatedAt; puede cambiar entre consultas. No prometer un corte histórico coherente entre varias páginas sin diseñar snapshot/cursor temporal. Exportación masiva queda fuera del primer incremento hasta acordar consistencia, límites y privacidad.

## Aceptación antes de implementar

1. Fixture NUEVO/aislado: una salida en tránsito y una entregada; cada despacho aparece una vez pese a sus múltiples movimientos/eventos.
2. Límite temporal: salida exactamente desde entra; exactamente hasta no entra; cambio de zona representa el mismo instante.
3. Salida/entrega del ejemplo producen5400.000; igualdad de instantes produce0.000; milisegundos se conservan; tránsito produce null.
4. Actor sin sesión/concesión y otra organización no obtienen filas ni cantidades; cambios de permiso se revalidan en la siguiente lectura.
5. La respuesta excluye transporte/personas/secretos y no llega al DTO/caché QR; los filtros no admiten organización arbitraria o SQL libre.
6. Las cantidades coinciden con los hechos registrados, sin doble suma o descuentos. No se corrigen datos durante una lectura.
7. Página/plan de consulta acotados se verifican con dataset acordado y operaciones concurrentes; EQ-07/P95 siguen metas propuestas, no resultados medidos.

## Operación frente a analítica

ROP-01 es una consulta operativa acotada sobre OLTP. No implementa AnalyticsRepository/Datamart, ETL, modelo dimensional, agregados históricos ni el RF-12 completo. Analítica requerirá después definir grano/hechos/dimensiones, reglas de indicadores, cargas incrementales/idempotentes, frescura, conciliación, retención y pruebas de aislamiento de carga con DA05. No usar este listado para afirmar que ese trabajo existe.
