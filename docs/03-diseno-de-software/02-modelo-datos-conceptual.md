# Modelo de Datos Conceptual

## 1. Objetivo

El modelo conceptual representa las principales entidades de negocio y sus relaciones. Se centra en el lote como unidad de trazabilidad y no constituye todavía un esquema SQL definitivo.

## 2. Diagrama conceptual

~~~mermaid
erDiagram
    PRODUCTOR ||--o{ PARCELA : posee
    PRODUCTOR ||--o{ CERTIFICACION : registra
    PARCELA ||--o{ COSECHA : origina
    COSECHA ||--o{ PRE_LOTE : produce
    PRE_LOTE }o--o{ LOTE : se_consolida_en
    LOTE ||--o{ EVENTO_TRAZABILIDAD : registra
    LOTE ||--o{ CONTROL_CALIDAD : recibe
    LOTE ||--o{ PALLET : agrupa
    LOTE ||--o{ MOVIMIENTO_INVENTARIO : tiene
    LOTE ||--o{ DESPACHO_LOTE : se_incluye
    DESPACHO ||--o{ DESPACHO_LOTE : incluye
    DESPACHO ||--o| ENTREGA : culmina_en
    USUARIO ||--o{ EVENTO_TRAZABILIDAD : registra
    USUARIO ||--o{ AUDITORIA : ejecuta
    PRODUCTOR ||--o{ LIQUIDACION : recibe
~~~

## 3. Descripción de entidades

| Entidad | Datos conceptuales principales | Requisito relacionado |
|---|---|---|
| Productor | identificador, nombre/razón social, estado, datos de contacto internos | RF-01 |
| Parcela | identificador, productor, ubicación georreferenciada | RF-01 |
| Certificación | tipo, entidad emisora, vigencia, estado | RF-02 |
| Cosecha | fecha/hora, parcela, responsable, cantidad | RF-03 |
| PreLote | identificador único, origen, estado de sincronización | RF-03, RF-04 |
| Lote | código único, fechas, estado actual, origen consolidado | RF-04 |
| EventoTrazabilidad | tipo, fecha/hora, actor, estado anterior/nuevo, evidencia | RF-09 |
| ControlCalidad | calibre, materia seca, descarte, temperatura, decisión | RF-06, RF-07 |
| Pallet | código, lote relacionado, etiqueta QR | RF-08 |
| MovimientoInventario | lote/pallet, estado origen/destino, ubicación, fecha/hora | RF-10 |
| Despacho | fecha, guía, vehículo, placa, chofer, precinto | RF-11 |
| Entrega | fecha/hora, destino y confirmación | alcance de entrega |
| Usuario / Rol | cuenta interna, roles y permisos | Seguridad |
| Auditoria | actor, acción, recurso, fecha/hora y resultado | Auditoría |
| Liquidación | productor, periodo, cantidades, importe y estado | RF-12; acceso restringido |
| Dimensiones y hechos analíticos | periodos, producto, lote, mermas y rendimientos agregados | RF-12 |

## 4. Reglas y aclaraciones

1. La relación entre PreLote y Lote puede ser muchos-a-muchos si las reglas operativas permiten que varios pre-lotes se combinen y que un pre-lote se divida. Antes de diseñar tablas se debe confirmar el proceso real.
2. El evento de trazabilidad registra la historia; el estado actual del lote puede mantenerse como dato operativo derivado o persistido, pero debe existir una regla consistente para actualizarlo.
3. La consulta QR recupera solo una proyección pública. No debe leer y serializar indiscriminadamente toda la entidad Lote.
4. Los datos de Liquidación son internos; jamás se agregan automáticamente a la vista pública.
5. El Datamart puede comenzar como un esquema lógico separado sobre PostgreSQL para el prototipo. Una instancia física separada puede evaluarse si el volumen lo justifica.
6. El detalle de claves primarias, foráneas, restricciones, índices, tipos y cardinalidades definitivas se define en el diseño lógico/físico de la base de datos.
