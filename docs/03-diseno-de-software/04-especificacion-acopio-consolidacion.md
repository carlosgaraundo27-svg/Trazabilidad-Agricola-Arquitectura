# Especificación: Acopio del prototipo académico

Actualización 2026-11-14. **D1–D7 adoptadas por el usuario solo para el prototipo académico. Sin validación de responsable agrícola ni aprobación docente.** Autoriza implementación y PR de Acopio sin fusionar. Borrador original conservado en el historial (`ab1906d`); las recomendaciones anteriores permanecen en [continuidad](../05-sprint01/continuidad-acopio-decisiones.md).

## 1. Alcance

Recepción completa, pesaje individual, revisión independiente de diferencias, confirmación, habilitación y consolidación con composición/origen. HU03/RF-05, RF-04 y parte de RF-09/DA02. Fuera: calidad, despacho, inventario/pallets, liquidación, QR, offline, reparto parcial, división, reapertura y corrección de hechos cerrados. Se conserva Node 24/Express 5, React/Vite y PostgreSQL 18, sesión/CSRF, denegación por defecto y auditoría transaccional. Migración 001 intacta; ninguna prueba sobre la demo existente.

## 2. Decisiones adoptadas

| ID  | Regla para el prototipo                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Una recepción completa por pre-lote. Referencia obligatoria, recortada y única por centro; sensible a mayúsculas, sin reinicio automático de numeración.              |
| D2  | Pesaje individual en kg con bruto y tara registrados, neto calculado y decimales exactos; sin neto directo ni atribución de pesada conjunta.                          |
| D3  | Mismo productor, parcela, fecha local de cosecha, organización y centro de recepción. Consumir todo el saldo habilitado seleccionado.                                 |
| D4  | Conservar declaración y medición. Toda diferencia requiere aprobación autorizada de una persona distinta del capturador. Sin tolerancia automática ni merma inferida. |
| D5  | Excluir reparto parcial, división y reapertura.                                                                                                                       |
| D6  | Habilitar el neto confirmado completo antes de calidad: H = R. Lote pendiente de calidad; no habilita despacho.                                                       |
| D7  | Concesiones por acción y centro; operario normal y responsable independiente para discrepancias; proteger hechos/eventos cerrados.                                    |

Supuestos técnicos, sin atribuirlos a una balanza o al negocio real:

- Fecha local derivada en servidor con zona IANA `America/Lima`; conservar instante original. No usar zona del navegador ni de sesión SQL.
- Captura como cadena decimal hasta tres decimales en kg; bruto máximo técnico `999999999.999`; `bruto > tara >= 0`, neto positivo. Rechazar precisión adicional sin redondeo silencioso. Aritmética de milésimas con enteros exactos y SQL `numeric(12,3)`.
- Máximo técnico de 100 recepciones distintas por consolidación; total exacto `numeric(15,3)`. No es umbral agrícola.
- Declaración en `unidad` y pesaje en kg no son comparables: conservar ambos, `differenceKg=null`, motivo `different_unit`, revisión independiente obligatoria. No convertir ni afirmar equivalencia física.
- Centros/cuentas/permisos de demostración mediante fixtures ficticios explícitos, sin UI administrativa. Conservar roles actuales: ninguno hereda acciones de Acopio; concesiones explícitas permiten funciones de operario/responsable.

## 3. Responsabilidades y origen

Acceso posee centros/concesiones, sesión y auditoría; Cosecha expone origen por contrato y consulta Productores para parcela/productor; Acopio posee recepción, medición y revisión y coordina la consolidación; Trazabilidad posee lotes, aportes y eventos de consolidación. Q → H/S/T1; H no depende de Q, T1 no llama de vuelta a Q. Composición inyecta contratos y la misma transacción PostgreSQL. Sin imports directos entre implementaciones ni escrituras en tablas ajenas.

Recepción conserva snapshot con IDs de pre-lote, cosecha, parcela, productor, organización, cantidad/unidad declaradas, instante/fecha local y nombres mínimos. Cada aporte conserva recepción, origen, cantidad, actor/fecha. Nunca sobrescribir la cosecha ni sustituir origen por última selección UI. Saldo derivado de aportes, sin inventario mutable adicional.

## 4. Flujo y permisos

1. `intake:read`: seleccionar centro autorizado y consultar orígenes de su organización.
2. `intake:receive`: registrar referencia, pre-lote, bruto/tara y evidencia. Actor/fecha del servidor. Estado `weighed` si declaración kg coincide exactamente; `pending_review` si difiere o las dimensiones son distintas. Pesaje registrado ineditable.
3. `intake:review`: motivo obligatorio, aprobador distinto de `capturedBy` aun con ambos permisos; `pending_review` → `weighed`. No modifica pesos ni elimina diferencia.
4. `intake:confirm`: `weighed` → `confirmed`; pendiente de revisión no se confirma. Aprobar no sustituye confirmar.
5. `lot:consolidate`: seleccionar recepciones confirmadas compatibles. Body sin cantidades parciales. Lote `consolidated`, `qualityStatus=pending_quality`, `dispatchAuthorized=false` y aportes completos.
6. Consulta autorizada recupera composición, eventos y saldos desde DB tras recargar/reiniciar.

R = neto recibido; antes de confirmar H = 0; al confirmar H = R; A = aportes; S = H − A >= 0. Consumo completo deja S = 0. Pendiente de calidad no significa calidad aprobada ni despacho.

Cada concesión es usuario/organización/centro/acción. Sin concesión no hay acceso, incluso admin/collector. Revalidar sesión activa y concesión en cada comando/reintento dentro de transacción; bloqueos coordinan revocación y escritura. Otro centro no puede leer/operar recurso. UUID no concede permisos. Sin sesión 401, acción denegada/autoaprobación 403, recurso inaccesible 404. Errores estructurados y JSON estricto, sin SQL/credenciales ni contactos/comercio innecesarios.

## 5. Atomicidad, idempotencia e inmutabilidad

Idempotency-Key UUID por actor en recibir/aprobar/confirmar/consolidar. Mismo comando normalizado devuelve mismos IDs/resultado sin otro evento; clave con otro contenido u operación 409. Revalidar permisos antes de replay, aun con saldo consumido. Referencia única por centro y recepción única por pre-lote impiden duplicado físico con otra clave.

Bloquear recepciones en orden estable; aporte único por recepción respalda consumo completo. Dos comandos distintos no consumen el mismo saldo. Lote/aportes/evento/auditoría en una transacción; cualquier fallo revierte todo. Igual atomicidad para recibir/revisar/confirmar y su evento. Restricciones/triggers SQL respaldan inmutabilidad de mediciones, revisiones y hechos cerrados; sin DELETE ordinario ni rutas de edición/división/reapertura.

## 6. Contrato HTTP

Base `/api/v1`, sesión/CSRF existentes. Masa como cadena decimal; salida con tres decimales. Colecciones paginadas `limit=100` y offset. Consultas filtradas por centro autorizado.

| Método/ruta                                | Contrato                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| GET `/intake/centers`                      | Centros y acciones concedidas del usuario.                                      |
| GET `/intake/origins?centerId=…&offset=…`  | Pre-lotes y declaración/origen de su organización.                              |
| GET `/intake/receipts?centerId=…&offset=…` | Recepciones, pesaje, revisión, estado, eventos y saldo derivado.                |
| POST `/intake/receipts`                    | `{centerId,preLotId,reference,grossKg,tareKg,evidence}`.                        |
| POST `/intake/receipts/:id/reviews`        | `{note}`, revisión independiente.                                               |
| POST `/intake/receipts/:id/confirmation`   | `{}`, confirmación.                                                             |
| GET `/lots?centerId=…&offset=…`            | Lotes con composición/eventos/total/calidad.                                    |
| POST `/lots`                               | `{centerId,receiptIds}`, IDs distintos normalizados en orden; consumo completo. |

POST: 201 nuevo, 200 replay. 400 clave inválida; 401 sesión; 403 permiso; 404 recurso inaccesible; 409 duplicado/clave/estado/consumo; 422 medición, mezcla o entrada inválida. No rutas de calidad/despacho/corrección.

## 7. Criterios de aceptación

Requisitos verificables; no resultados ya ejecutados.

| ID    | Caso                                                       | Resultado                                                                                      |
| ----- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| AC-01 | PA declara 100; bruto 105, tara 5 kg                       | Neto 100.000 exacto, declaración intacta, evento y auditoría.                                  |
| AC-02 | Sin sesión/acción, otro centro/organización                | Rechazo sin escritura ni filtración; replay también revalida permisos.                         |
| AC-03 | Bruto 0.300, tara 0.100                                    | Neto 0.200; rechazar neto enviado y precisión >3 decimales.                                    |
| AC-04 | Tara negativa, tara >= bruto, cero/no finito/exceso        | 422 sin recepción/evento.                                                                      |
| AC-05 | PD declara 20 unidades y recibe 18 kg                      | Conservar dimensiones; diferencia numérica nula y revisión obligatoria.                        |
| AC-06 | PA declara 100 y recibe 98 o 103 kg                        | Diferencia firmada intacta, revisión pendiente; sin merma/tolerancia.                          |
| AC-07 | RA 100 + RB 40, compatibles y confirmadas                  | Lote 140.000 con dos aportes/orígenes, pendiente calidad, sin despacho.                        |
| AC-08 | Distinto productor/parcela/fecha local/organización/centro | No lote ni consumo parcial; UI explica restricción.                                            |
| AC-09 | Capturador intenta aprobar su discrepancia                 | 403; otra persona con concesión correcta puede aprobar con motivo.                             |
| AC-10 | Sin revisión requerida o sin confirmación                  | No consolidación ni confirmación indebida; H=0 antes de confirmar.                             |
| AC-11 | Dos comandos consumen mismas recepciones                   | Uno gana, otro 409; sin doble masa/evento.                                                     |
| AC-12 | Replay concurrente/tras perder respuesta                   | Mismos IDs, un efecto; cambio payload/operación con clave 409.                                 |
| AC-13 | Falla evento/auditoría/aporte                              | Rollback completo y saldo preservado.                                                          |
| AC-14 | Modificar/borrar hechos cerrados, repartir/reabrir         | Rechazo en servidor y restricciones SQL; historia conservada.                                  |
| AC-15 | Referencia repetida en centro o pre-lote recibido          | 409 con otra clave; referencia igual en otro centro no duplica por sí sola.                    |
| AC-16 | UI completa y consulta tras recarga/reinicio               | Teclado/móvil, carga/vacío/error/éxito; composición, revisión y saldo desde DB sin nuevo seed. |

Pruebas unitarias: masa, fecha local, compatibilidad. Integración HTTP/PostgreSQL real: ámbito, estados, unicidad, idempotencia, revocación, triggers, rollback y concurrencia. E2E real: recorrido y negativos solicitados. Bases desechables independientes para integración/E2E; preservar demo/volúmenes y checks existentes.

## 8. Validaciones pendientes

Responsable agrícola: entregas/tickets reales, pesaje/balanza, compatibilidad física, discrepancias/merma, reparto, relación calidad-consolidación y responsabilidades. Docente: suficiencia del corte académico/simplificaciones y avance de Sprint. No se atribuye a ninguno la adopción del usuario.

Actualizar OpenAPI, C4 implementado/objetivo, fixtures, guías y evidencia real. Migración 002 aditiva, sin alterar cuentas/cosechas/pre-lotes existentes. PR de Acopio abierto, sin fusionar.
