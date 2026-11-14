# ADR-011 — Acopio del prototipo académico

Fecha: 2026-11-14. Estado: **aceptado por el usuario para implementar el prototipo académico**. Sin validación de responsable agrícola ni aprobación docente. Complementa ADR-009/010; no convierte supuestos de demostración en reglas reales del proceso.

## Decisión

Se adoptan D1–D7 de la [especificación](../03-diseno-de-software/04-especificacion-acopio-consolidacion.md): recepción completa única por pre-lote, referencia única por centro, bruto/tara individuales, revisión independiente de toda diferencia, consolidación compatible con consumo completo, sin reparto/división/reapertura. Neto confirmado habilitado antes de calidad; lote pendiente de calidad y sin despacho.

El código de Q se implementa en `server/modules/intake/`; la identidad, composición y eventos del lote en T1, `server/modules/traceability/`. Composición inyecta contratos de S/H/T1 en Q; H obtiene parcela/productor mediante contrato de P. No hay llamadas HTTP entre módulos ni callback de T1 a Q. PostgreSQL compartido permite una sola transacción para operación, evento, auditoría y resultado idempotente.

Pesaje, revisión y confirmación son hechos separados e inmutables; el estado se deriva de esos hechos. Cambiar una medición después de registrarla requerirá un futuro proceso compensatorio, fuera del corte. Se evita un CRUD que pudiera sobrescribir la declaración o invalidar una aprobación previa.

Los roles existentes se conservan. Las concesiones nuevas son explícitas por usuario/organización/centro/acción; admin, collector y viewer no heredan Acopio. Los fixtures ficticios asignan acciones de operario y responsable; una cuenta con ambas acciones sigue sin poder aprobar su propia captura. La sesión y concesiones se revalidan antes del replay y se bloquean durante la escritura para coordinar revocaciones.

Recepciones se bloquean por ID ordenado; T1 consume cada una íntegramente con `UNIQUE(receipt_id)` como respaldo. El lote cerrado no admite más aportes. Total y saldo se derivan de aportes inmutables; no se crea otro stock mutable. Una clave de idempotencia por actor abarca acción y contenido normalizado; el resultado se guarda en la misma transacción. Claves distintas no eluden unicidad física de recepción/ticket ni unicidad del consumo.

## Supuestos técnicos

- Zona fija `America/Lima` para fecha local de cosecha, calculada en servidor.
- Tres decimales en kg, cadenas HTTP, BigInt para milésimas y SQL numeric exacto. Valores adicionales se rechazan sin redondear. Máximo técnico de captura 999999999.999 kg y hasta 100 recepciones por comando; no son tolerancias ni umbrales de negocio/balanza.
- Declaración en unidades y masa recibida se conservan sin conversión; una revisión independiente habilita confirmar el neto sin afirmar equivalencia dimensional.
- Migración 002 aditiva y runner secuencial. Las marcas `-- statement` delimitan funciones SQL con punto y coma interno; no se modifica 001. El down solo se prueba en bases desechables.

## Alternativas y consecuencias

Entregas múltiples, neto directo, mezcla entre orígenes distintos, asignación proporcional, corrección y reapertura aumentan cardinalidades y requieren nuevas reglas; se excluyen según adopción del usuario. Usar coma flotante para saldo o repetir el total de un origen en varios hijos perdería integridad y se descarta. Un permiso nuevo implícito por rol ampliaría cuentas existentes y se descarta en favor de concesiones explícitas.

La simplificación puede no representar una planta real: el responsable agrícola debe validar tickets, medición, compatibilidad, discrepancias/merma, reparto, calidad y responsables antes de uso real. La docente debe evaluar suficiencia del alcance y avance académico. Calidad, despacho, administración productiva de cuentas y recuperación operativa permanecen pendientes.

Fuentes técnicas contrastadas: [numeric exacto](https://www.postgresql.org/docs/18/datatype-numeric.html), [bloqueos de fila y transacción](https://www.postgresql.org/docs/18/explicit-locking.html), [restricciones y FK](https://www.postgresql.org/docs/18/ddl-constraints.html). Estas fuentes respaldan mecanismos de PostgreSQL, no reglas agrícolas.
