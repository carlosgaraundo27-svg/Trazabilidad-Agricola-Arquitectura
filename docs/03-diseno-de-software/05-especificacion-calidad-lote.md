# Especificación: Calidad manual por lote

2026-11-15. **Q1–Q9 adoptadas por el usuario para el prototipo académico. Sin aprobación docente ni validación agrícola.** Sustituye la propuesta conservada en la rama documental `docs/especificacion-calidad` (0481740). Base de implementación: main 829f79e, integración con merge del PR #3; rama feat/calidad. [ADR-012](../02-arquitectura/09-decisiones-calidad.md).

## Alcance y decisiones

Una evaluación por lote consolidado. Identidad, centro y composición provienen de T1; Calidad no escribe cosecha, recepción, aportes ni inventario. Draft editable y versionado; closed protegido sin reapertura, corrección ni reevaluación. Lectura histórica desde DB. Resultado manual `accepted` (aprobado), `observed` (observado), `rejected` (rechazado), sin categoría comercial ni umbral automático.

| Decisión | Regla adoptada |
| --- | --- |
| Q1 | Calibre representado académicamente por pesos individuales en g/fruto; referencia de fruto por peso. Sin categorías comerciales ni conversiones. |
| Q2 | Muestra con referencia, lote, fecha con zona, responsable y procedencia. Cada observación conserva instante, responsable, procedencia y método. Sin representatividad estadística afirmada. |
| Q3 | Conteos enteros de frutos examinados y descartados, porcentaje derivado informativo. No extrapola kg ni reduce inventario. |
| Q4 | Cada recepción aportante exige su temperatura original en °C, instante, procedencia, observador y responsable de registro del servidor. Se captura junto con la nueva recepción y es inmutable. Calidad la consulta por receiptId y no permite transcribirla. Las posteriores se guardan aparte; no sustituyen ni promedian originales. |
| Q5 | Decisión humana autorizada y motivo obligatorio al cerrar, sin clasificación automática. |
| Q6 | Completar muestra, al menos un peso, materia seca %, conteos y originales de todas las recepciones antes de cerrar. Una posterior es opcional y no cubre faltantes. Validación matemática y de procedencia. Faltante es null/ausente en draft, nunca cero inventado. |
| Q7 | quality:read/create/update/close explícitos por usuario/organización/centro. La misma persona autorizada puede capturar y cerrar. La revisión independiente de discrepancias de Acopio conserva D4. |
| Q8 | UNIQUE(lot_id), versión esperada en edición/cierre; closed inmutable. No DELETE, reapertura ni reevaluación. |
| Q9 | Proyección de Calidad separada de consolidación e inventario; aprobación no autoriza despacho. |

**Decisión adicional adoptada por el usuario:** el backend bloquea cualquier cierre (`accepted`, `observed` o `rejected`) si falta la temperatura original de una sola recepción. Se permite guardar/consultar draft y la UI identifica referencias/IDs pendientes. Nunca se completa historia automáticamente. La misma exigencia tiene respaldo SQL y no existe otra ruta de aprobación de calidad.

## Representación y precisión técnicas

Dos decimales máximos de captura para g/fruto, %, °C; cadenas decimales sin exponente, coma ni conversiones implícitas. Se conservan valores exactos normalizados a dos decimales; precisión adicional rechazada sin redondear. Máximo técnico de peso 999999.99 positivo; temperatura ±999999.99 sin umbral agrícola; materia seca 0–100 inclusive. Estos límites y resolución pertenecen al software, **no a instrumentos**. Hasta 100 pesos/temperaturas. Referencias de fruto únicas por evaluación. Conteos hasta 1000000, examinados > 0, 0 ≤ descartados ≤ examinados. No se exige que el número de pesos coincida con examinados: son observaciones de la misma muestra y métodos explícitos, sin afirmar que cubren idéntica submuestra.

Porcentaje de descarte = 100 × descartados / examinados, dos decimales, mitad hacia arriba mediante enteros exactos. Solo se redondea ese cociente de presentación. Instantes ISO 8601 con zona, hasta milisegundos; normalización UTC y rechazo de futuro. Temperatura original de recepción debe ser anterior o igual al registro de recepción; la DB lo valida y su vínculo al aporte hace que preceda a consolidación. Una posterior debe ser posterior o igual a consolidación. Momento de registro/actor provienen del servidor y se distinguen del observador/momento de medición declarados.

## Contrato y transacciones

DTO de captura: `sample` nullable `{reference,sampledAt,sampledBy,provenance}`; `weights` con `{fruitReference,value,unit:'g/fruto',measuredAt,observedBy,provenance,method}`; `dryMatter` nullable con la misma metadata y `value,unit:'%'`; `discard` nullable con metadata, `inspectedCount,discardedCount,unit:'frutos'`; `temperatures` solo para posteriores, con metadata, `value,unit:'°C',stage:'post_consolidation',sourceReceiptId:null`. Los originales no pertenecen al DTO editable: se devuelven como `receiptTemperatures` de solo lectura y `missingReceiptTemperatureIds`. Objetos estrictos; null/arrays vacíos permiten draft incompleto. Al incluir una observación, sus datos propios deben estar completos y ser válidos. PUT reemplaza toda la captura y requiere expectedVersion; no es patch.

| Método/ruta /api/v1 | Entrada y salida |
| --- | --- |
| GET /quality/lots?centerId=…&offset=… | 100 por página; lote/origen, proyección de estado/resultado y evaluationId. ConsolidationQualityStatus histórico, dispatchAuthorized=false. |
| POST /quality/evaluations | {lotId}; crea draft vacío, versión 1. |
| GET /quality/evaluations/:id | Captura, versión, estado, resultado, eventos, originales y recepciones pendientes; 404 para recurso ajeno. |
| PUT /quality/evaluations/:id | expectedVersion más captura completa; versión +1. |
| POST /quality/evaluations/:id/closure | expectedVersion, result, note; valida captura persistida y originales de cada recepción; 422 si falta cualquiera. Cierre atómico. |
| POST /intake/receipts | Extensión aditiva opcional temperature: value, unit °C, measuredAt, observedBy, provenance, method; solo junto con creación. Sin campo, recepción válida y futuro cierre bloqueado. |

Sesión y CSRF existentes. Concesiones revalidadas dentro de transacción, antes de replay. Idempotency-Key UUID en comandos, por actor, mismo contenido normalizado devuelve respuesta original sin nuevo evento; otra operación/contenido con la misma clave = 409. POST nuevo 201/replay 200, PUT 200. 400 clave inválida, 401 sin sesión, 403 sin acción/centro en lista, 404 recurso inaccesible, 409 unicidad/versión/closed, 422 dato/unidad/fecha/faltante inválido. Sin actor/centro/estado arbitrarios en body. Claves se conservan sin TTL.

Edición/cierre bloquean la evaluación; versión y estado se verifican tras adquirir el bloqueo. Dos cierres con claves distintas: uno gana y el otro 409. Replay de cierre idéntico es 200 y no vuelve a cerrar. Evaluación, evento con snapshots anterior/nuevo, auditoría e idempotencia se confirman juntos; fallo revierte todo. Triggers respaldan inmutabilidad closed y eventos, sin alterar triggers/migraciones 001/002. Una recepción sin temperatura sigue conservándose sin modificación. La migración 004 crea intake.receipt_temperatures (UNIQUE receipt_id, ámbito por FK, inmutabilidad). Solo admite INSERT antes del evento received y por el capturador de esa recepción, dentro del mismo comando; un registro histórico no puede completarse por SQL ordinario ni por una API alternativa. El evento received conserva el original y el evento closed conserva un snapshot de los originales usados.

## Pantallas

Listado por centro autorizado, borrador recuperable con muestra y observaciones, revisión de mediciones y resultado manual/justificación, consulta closed de solo lectura con responsable/fecha/eventos. Unidades visibles. Sin mediciones prellenadas. Carga, vacío, error, éxito, conflicto y revocación; recargar estado actual es explícito. Reintento mantiene clave/cuerpo de intención si se pierde respuesta; no confirma operaciones nuevas a partir de versiones antiguas. Controles semánticos, teclado, foco y móvil.

La etiqueta de Acopio `pending_quality` se presenta como hecho **al consolidar**, no resultado actual. La proyección vigente se consulta en Calidad con permiso quality:read. No dependencia de T1 hacia Q ni autorización implícita de logística.

## Aceptación

| ID | Caso / resultado exigido |
| --- | --- |
| QC-01 | Crear evaluación de lote autorizado: draft v1, evento y auditoría. |
| QC-02 | Pre-lote/recepción como lotId: 404; sin evaluación parcial. |
| QC-03 | Pesos, materia seca, conteos y temperaturas exactos con metadata; sin decisión calculada. |
| QC-04 | Unidades ajenas, NaN/Infinity/exponente/precisión extra/campos desconocidos: 422 sin cambios. |
| QC-05 | % fuera de 0–100, examinados cero, descartados negativos o mayores: 422. |
| QC-06 | Temperatura negativa válida: admitida sin inferencia agrícola. |
| QC-07 | Draft incompleto permitido; cierre incompleto 422 sin fabricar datos. |
| QC-08 | Etapa receipt/sourceReceiptId en captura de Calidad o momento posterior inconsistente: 422; originales consultados desde Acopio y posteriores separados. |
| QC-09 | Cada resultado manual con motivo válido se conserva; motivo vacío o resultado ajeno: 422. |
| QC-10 | Sin sesión, acción, centro/organización o permiso revocado antes del replay: acceso denegado sin filtrar. |
| QC-11 | Capturador autorizado puede cerrar; no adquiere revisión de discrepancias Acopio. |
| QC-12 | Misma clave/cuerpo: replay sin evento; contenido distinto: 409; UUID de diferente caso equivalentes. |
| QC-13 | Duplicado por lote, versión antigua y dos cierres concurrentes: un único ganador. |
| QC-14 | Fallo real de evento/auditoría: rollback de datos/versión/closed/clave. |
| QC-15 | Edición/borrado/truncate de closed o historia: rechazo API/SQL. |
| QC-16 | Cualquier resultado y descarte conservan aportes, cantidades y sin despacho. |
| QC-17 | Recargar/reconectar sin seed recupera datos y eventos desde PostgreSQL. |
| QC-18 | UI teclado/móvil, conflicto y respuesta perdida: estados claros y reintento seguro. |
| QC-19 | Todas las originales documentadas: permite cierre manual con responsable autorizado. |
| QC-20 | Falta una original, con o sin posterior: 422 backend para cualquier resultado; draft consultable y editable. |
| QC-21 | UI identifica exactamente recepción pendiente por referencia e ID y bloquea cierre. |
| QC-22 | Nueva recepción con original: valor/unidad/instante/procedencia/observador y responsable del servidor conservados; evento/auditoría atómicos. |
| QC-23 | Histórico sin original: no backfill, ni conversión de posterior ni modificación informal; recepción y composición permanecen intactas. |

## Trazabilidad y cobertura parcial

| Requisito | Cobertura y evidencia esperada | Límite |
| --- | --- | --- |
| RF-06 / HU04 | QC-03–08: calibre académico g/fruto, materia seca %, descarte de muestra; QC-19–23: originales por cada recepción obligatorios al cerrar, capturados en Acopio con procedencia/actor, y posteriores separados. | **Parcial frente al requisito productivo**: g/fruto es la representación académica adoptada, sin categoría comercial. La cobertura de temperatura de recepción sí es completa en cada evaluación closed; históricos sin evidencia siguen bloqueados. Sin integración instrumental, representatividad ni validación agrícola. |
| RF-07 / HU04 | QC-09/11: decisión manual justificada por responsable autorizado. | **Parcial**: no hay reglas agrícolas de negocio, umbrales ni categorías comerciales; no se declara clasificación productiva completa. |
| RF-09 / DA02 | QC-12–17: historia/auditoría y cierre protegido. | Sin QR público ni corrección/reevaluación. |
| RF-04 / RF-05 | QC-01/02/16: vínculo a lote y composición. | No modifica declaración/netos ni D1–D7. |
| RF-13 / DA06 / RC03 | QC-10/11: concesión por centro. | Sin administración productiva de usuarios. |
| RF-10 / RF-11 | QC-16: frontera explícita. | Inventario/despacho fuera de incremento; dispatchAuthorized=false. |

Ubicación: Q en server/modules/intake/quality-*.js, adaptador server/quality-http.js, UI web/quality/, esquema quality en PostgreSQL por migración 003 y ampliación de originales de Acopio en 004. Contratos inyectados T1 e intake.originalTemperatures, misma unitOfWork. Sin imports entre implementaciones. Las pruebas usan bases dedicadas y fixtures ficticios; nunca la demo existente.

## Recepciones históricas y cobertura del incremento

La captura de temperature en recepción es opcional para mantener compatibilidad y permitir registrar una recepción sin inventar un dato que falta. UI/API advierten la consecuencia: no podrá cerrarse Calidad y este incremento no permite añadirlo posteriormente. Los registros existentes no se migran ni se rellenan; una posterior no los corrige.

Una incorporación histórica desde evidencia original requiere un procedimiento futuro **explícito, autorizado y auditado**, fuera de este incremento: identificar recepción y documento original verificable; conservar valor/unidad/instante/observador sin reinterpretarlos; identificar quién incorpora y por qué; registrar evidencia y auditoría transaccional como hecho adicional enlazado, con permisos por centro y controles que se definan para ese procedimiento. No se autoriza alterar recibos, modificar mediciones existentes, desactivar triggers ni ejecutar un backfill informal. Si no existe evidencia original, el dato sigue ausente y el cierre sigue bloqueado. No se ofrece ahora endpoint ni script para ese procedimiento.

[Evidencia ejecutada y límites](../05-sprint01/calidad-implementacion.md), [instrucciones](../../tecnologia/calidad.md).
