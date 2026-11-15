# Propuesta: evaluación de calidad del lote consolidado

Fecha: 2026-11-14. **Borrador para decisión; no aprobado para implementar.** Rama local `docs/especificacion-calidad`, basada en `d09d8be` del [PR #3 de Acopio](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/3), todavía sin fusionar. No añade código, tablas, permisos, rutas ni clasificación automática. La adopción académica de D1–D7 no aprueba estas reglas de calidad ni equivale a validación agrícola o docente.

## 1. Objetivo y alcance propuesto

Un responsable autorizado registra observaciones de calidad de un lote consolidado, identifica muestra, método y momento de medición, y cierra una evaluación con decisión manual justificada. Se conservan composición, cantidades, mediciones originales e historial. El lector puede distinguir qué se midió, a qué muestra corresponde y quién tomó la decisión.

Alternativa inicial recomendada: **evaluación manual académica**, sin reglas automáticas de aceptación o clasificación. El responsable elige un resultado explícito y escribe un motivo; ningún valor medido determina por sí solo el resultado. Este modo debe aprobarse en Q5/Q7 antes de implementar. No se presenta como cumplimiento productivo de RF-07 sin reglas de negocio.

Fuera del corte: integración con laboratorio/balanza/sensores; cálculo automático de categoría comercial; publicación QR; liquidaciones; eliminación física de producto; modificación de aportes; movimientos de inventario; empaque y despacho. Aprobar calidad no concede permiso de despacho ni cambia stock automáticamente.

Supuestos sujetos a aprobación: operación web en línea; reutilizar sesión/CSRF, organización/centro y auditoría; una evaluación por lote inicialmente; borrador editable con versión y cierre inmutable. Se conserva Node 24/Express 5, React/Vite y PostgreSQL 18 y su lockfile.

## 2. Responsabilidades y origen

La capacidad pertenece a Q, Acopio y Calidad, no a un microservicio ni a un módulo de inventario nuevo.

| Capacidad           | Responsabilidad propuesta                                            | Dependencias                               |
| ------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| Calidad dentro de Q | Evaluación, observaciones, muestra, decisión y eventos de evaluación | Acceso y contrato de lectura de lote de T1 |
| Acceso S            | Sesión, concesiones por acción/organización/centro y auditoría       | Contratos propios                          |
| Trazabilidad T1     | Identidad, centro, composición y cantidades consolidadas             | No consulta de vuelta a Calidad            |

Q obtiene por contrato un lote consolidado accesible con ID, organización, centro, productor/parcela, fecha de cosecha, recepciones y aportes. Guarda referencias estables y la versión/snapshot pertinente. Una muestra agregada no permite atribuir automáticamente un resultado distinto a cada pre-lote.

El lote de Acopio es inmutable. Su columna actual `quality_status=pending_quality` y el CHECK correspondiente no admiten una actualización directa. La propuesta es que Calidad conserve su propio resultado y exponga una proyección actual; el dato de consolidación queda como hecho histórico. Q9 debe cerrar cómo mostrar esa proyección sin etiquetas contradictorias ni romper clientes actuales.

La tabla actual de eventos de T1 solo admite un evento `consolidated` por lote. No se insertan allí eventos de calidad sin rediseño aprobado. Como opción inicial, Q conserva eventos de evaluación propios y compone una consulta histórica autorizada con los hechos de T1. La historia de consolidación permanece intacta y no se introduce una dependencia T1 → Q.

## 3. Observaciones, unidades y validaciones

**No hay umbrales agrícolas propuestos.** Los límites 0–100 de un porcentaje y las relaciones entre conteos son validaciones matemáticas del dato, no criterios de aceptación de palta.

| Dato                | Representación y unidad propuestas                                                                                           | Validaciones antes del cierre                                                                                                                                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calibre             | `caliberSchemeId`, versión y `caliberCode`; unidad **código del catálogo elegido**, sin orden numérico implícito             | Código existente y habilitado en el catálogo aprobado; conservar significado/versión. No inferir g, mm o frutos/caja a partir de un código. Catálogo/unidad pendientes de Q1.                                                                                  |
| Materia seca        | `dryMatterPct` como cadena decimal; **% de masa seca respecto de masa fresca de la muestra**; método y referencia de informe | Valor finito entre 0 y 100 inclusive. Base analítica, parte muestreada y método explícitos. Un dato ausente no se transforma en cero. No confundir con humedad ni promediar muestras sin regla.                                                                |
| Descarte de muestra | `inspectedCount` y `discardedCount`, enteros en **frutos examinados**; porcentaje de muestra derivado                        | Examinados > 0; 0 ≤ descartados ≤ examinados. Conservar ambos conteos; porcentaje = 100 × descartados/examinados, con redondeo de visualización por acordar. No convertirlo en kg perdidos del lote. Q3 puede elegir otra base con su propia unidad explícita. |
| Temperatura         | `valueC` como cadena decimal con signo en **°C**, `measuredAt`, etapa y procedencia                                          | Finita, sin NaN/Infinity, con resolución/rango técnico por aprobar. No rechazar temperaturas negativas por una regla agrícola inventada. No convertir °F sin una conversión explícita aprobada.                                                                |
| Muestra y evidencia | ID/referencia de muestra, alcance, responsable, método por observación e informe/ticket                                      | Referencia obligatoria; aclarar si corresponde al lote o a recepciones concretas y si hay submuestras. El sistema no certifica representatividad estadística.                                                                                                  |

Masa observada de fruto en g o diámetro en mm son alternativas de Q1, no sinónimos automáticos de un calibre comercial. Si se elige frutos/caja, debe definirse la caja/masa de referencia; no se presupone ninguna.

Decimales como cadenas y cálculo exacto; precisión de captura, límites técnicos de almacenamiento y redondeo del cociente deben aprobarse en Q6 antes del DTO/esquema físico. No se reutiliza sin decisión la resolución de 0.001 kg de Acopio para porcentajes o temperatura. Campos desconocidos, unidades ambiguas y precisión no admitida se rechazan; no se redondea silenciosamente al guardar.

### Momento de medición y RF-06

Cada observación conserva cuándo se midió y cuándo se registró; el actor y la fecha de registro provienen del servidor. Las mediciones llevan instante con zona, normalizado a UTC, sin fechas futuras. Una medición de recepción puede ser anterior a la consolidación; no se rechaza por esa sola razón.

RF-06 menciona temperatura de recepción, mientras este recorrido evalúa un lote ya consolidado. Opciones Q4: transcribir lecturas documentadas por recepción, medir después de consolidar con esa etiqueta, o registrar ambas por separado. Una medición posterior **no acredita retroactivamente la temperatura de recepción**. Tampoco se inventa la lectura de una recepción sin evidencia.

Recomendación: conservar procedencia y momento por lectura, con `stage=receipt` y `sourceReceiptId` perteneciente a la composición cuando proceda. Las nuevas mediciones del lote usan `stage=post_consolidation`, sin promedio implícito. Debe acordarse cobertura de recepciones y tratamiento de datos faltantes. Hasta resolver Q4 no se declara RF-06 completo.

### Ejemplo exclusivamente ficticio

Lote L = PA 100.000 kg + PB 40.000 kg = 140.000 kg. Una muestra identificada registra calibre `CAT-DEMO-A` de un catálogo académico aún por aprobar, materia seca 26.50 %, 10 frutos examinados y 2 señalados como descarte: 20 % de **esa muestra**. Temperatura 14.20 °C medida después de consolidar se etiqueta así; no sustituye lecturas de recepción.

Esos números no son límites recomendados y no asignan categoría. Un responsable podría registrar manualmente `observed` con motivo, únicamente si se aprueba ese modo académico. L sigue con 140.000 kg y aportes 100/40; no se descuenta 20 %, no se afirma que se hayan eliminado 28 kg ni se autoriza despacho.

## 4. Estado de evaluación, resultado e inventario

Son conceptos distintos:

- **Estado de evaluación:** `draft` o `closed`; indica edición y cierre del registro.
- **Resultado de calidad:** nulo mientras no cierre; candidatos `accepted`, `observed`, `rejected`, elegidos manualmente con motivo. Una categoría comercial es otro dato opcional de catálogo aprobado, no derivado del resultado.
- **Consolidación:** permanece `consolidated`; no se reabre ni cambia composición.
- **Inventario:** RF-10 proyecta cuarentena/aprobado/empacado/despachado; aún no está implementado y no se deduce del resultado de calidad.

| Transición propuesta                | Requisitos                                                                                    | Efecto                                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Sin evaluación → draft              | Lote consolidado accesible, concesión de creación, unicidad acordada                          | Registro con versión; calidad pendiente, sin clasificación oficial                              |
| draft → draft                       | Permiso de captura y versión esperada vigente                                                 | Nuevos valores auditados; ningún resultado definitivo                                           |
| draft → closed                      | Datos completos/válidos según política aprobada, permiso de cierre, resultado manual y motivo | Evaluación inmutable; evento y auditoría atómicos                                               |
| closed → edición/reapertura/borrado | No disponible en la recomendación inicial                                                     | Rechazo; corrección/reevaluación requiere Q8 y un nuevo registro enlazado, nunca sobreescritura |

`observed` sería un resultado cerrado de calidad, no un estado intermedio de inventario ni permiso para ignorar controles faltantes. Su significado operativo requiere Q5. La recomendación inicial no incluye corregir o reclasificar una evaluación cerrada.

## 5. Permisos propuestos por función y centro

Las funciones de negocio de esta tabla no son nuevos roles ya creados en DB. Se recomiendan concesiones explícitas por acción, usuario, organización y centro; ningún nombre de rol concede calidad automáticamente. La restricción actual de acciones de `center_grants` exige una futura migración aditiva para nuevas concesiones; no se edita retroactivamente 002.

| Función                              | Lectura                                                      | Escritura/cierre propuestos                                                               |
| ------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Responsable de calidad asignado      | Evaluación, origen mínimo, métodos y evidencias en su centro | `quality:create`, `quality:update`, `quality:close` solo si concedidos; alcance exacto Q7 |
| Capturista, si se aprueba separación | `quality:read` en centro asignado                            | Crear/editar draft; sin cerrar                                                            |
| Operario de Acopio                   | Resultado mínimo cerrado si recibe `quality:result:read`     | Sin captura/cierre de calidad por ser operario                                            |
| Recolector o administrador actual    | Sin acceso nuevo implícito                                   | Sin permiso de calidad por su rol actual                                                  |
| Logística/comprador                  | Solo proyección mínima si se define y concede explícitamente | Sin movimientos ni despacho dentro de este recorrido                                      |
| Anónimo, otro centro u organización  | Sin información operativa                                    | Denegación por defecto                                                                    |

Recomendación Q7: un responsable autorizado puede capturar y cerrar su evaluación para el corte académico, con motivo obligatorio. La alternativa de doble persona debe decidirse expresamente. **Esto no revoca D4:** una discrepancia de recepción sigue necesitando aprobador distinto del capturador, y no se puede crear un lote desde una recepción no confirmada.

Cada comando y replay revalida sesión activa y permiso por centro/lote; conocer un UUID no autoriza. Actor, organización y centro se obtienen de sesión/origen, no del body. Lecturas filtradas antes de responder. No se exponen contactos, datos financieros o informes a público/QR.

## 6. Auditoría, cierre e integridad propuestas

Cada creación, edición de draft y cierre conserva actor, fecha UTC, operación, versión, valores anteriores/nuevos pertinentes, referencia de evidencia y motivo. El evento crítico y la auditoría se confirman con la operación en la misma transacción; ante fallo, rollback completo. Eventos y evaluaciones cerradas no admiten UPDATE/DELETE/TRUNCATE ordinarios; sin rutas de borrado o reapertura.

Control optimista de versión para edición/cierre; bloqueo del registro al cerrar. Dos cierres distintos no generan resultados concurrentes: uno gana y el otro recibe 409. Unicidad de evaluación por lote propuesta en Q8; idempotencia por sí sola no evita duplicar una evaluación con otra clave.

Idempotency-Key UUID por actor en comandos, normalizado junto con los UUID de referencias. Mismo contenido normalizado devuelve los mismos IDs/versión sin otro evento; clave con contenido/operación distinta produce conflicto. Revalidar permiso antes de devolver replay, incluso tras cierre. Reintentos no reabren ni cambian el resultado.

No se sobrescribe lote, cosecha, declaración, recepción, composición o cantidad aportada. Un descarte físico futuro necesitará operación propia de inventario y regla cuantitativa aprobada; no se implementa como efecto oculto de evaluar calidad.

## 7. Pantallas y contrato API propuestos

| Pantalla                 | Contenido y acción principal                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Lotes por evaluar        | Centro autorizado, ID/origen/composición y evaluación pendiente; sin apariencia de permiso de despacho           |
| Captura de evaluación    | Muestra, método, unidades visibles, observaciones y referencias; guardar draft sin rellenar faltantes con cero   |
| Revisión y cierre manual | Resumen con datos/origen, resultado elegido, categoría opcional aprobada y motivo; confirmar cierre irreversible |
| Consulta histórica       | Evaluación cerrada de solo lectura, actor/fechas/versiones/evidencia y vínculo a cada recepción/pre-lote         |

Estados de carga, vacío, error, éxito, permiso revocado y conflicto de versión; controles etiquetados, teclado, foco tras confirmar y diseño móvil. Solo mostrar acciones concedidas; el servidor aplica la autorización de nuevo. No publicar detalles de implementación como decisiones del operario.

Base candidata `/api/v1`, sesión/CSRF y errores estructurados existentes. **No se amplía ahora OpenAPI ejecutable.** DTO definitivo depende de Q1–Q9.

| Método/ruta candidata                                  | Contrato                                                                                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| GET `/quality/lots?centerId=…&offset=…`                | Proyección autorizada de lotes y evaluación/resultado, separada de inventario; páginas acotadas                               |
| POST `/quality/evaluations`                            | `{lotId,sampleReference,methodReferences}`; crea draft, centro/organización derivados del lote                                |
| GET `/quality/evaluations?centerId=…&lotId=…&offset=…` | Evaluaciones accesibles según cardinalidad aprobada                                                                           |
| GET `/quality/evaluations/:id`                         | Datos, unidades, versión, resultado y eventos autorizados                                                                     |
| PUT `/quality/evaluations/:id`                         | Reemplaza datos del draft con `expectedVersion` y observaciones tipadas; no acepta actor/estado/resultado cerrado arbitrarios |
| POST `/quality/evaluations/:id/closure`                | `{expectedVersion,result,note,classificationCode?}`; decisión manual autorizada, no regla automática                          |

Forma candidata de observaciones: calibre `{schemeId,schemeVersion,code}`, materia seca `{valuePct,basis,methodReference,measuredAt}`, descarte `{inspectedCount,discardedCount,sampleReference}`, temperaturas `[{valueC,stage,measuredAt,sourceReceiptId?,evidenceReference}]`. Son campos propuestos; no un esquema JSON genérico que permita omitir dimensiones o inventar datos. Unidades fijas aprobadas o discriminadores explícitos si se eligen variantes; sin conversiones tácitas.

Respuesta propuesta separa `evaluationState`, `qualityResult`, `decisionMode=manual_academic`, `version` y `dispatchAuthorized=false`. Mientras draft, resultado definitivo nulo. No inventar un estado actual de inventario. Q9 debe resolver el DTO de calidad y la etiqueta antigua de Acopio antes de implementar, para no mostrar a la vez un resultado cerrado y "pendiente" como si ambos fueran actuales.

POST: 201 nuevo / 200 replay. Edición: 200; 401 sin sesión, 403 acción denegada, 404 recurso inaccesible, 409 versión/clave/unicidad/cierre, 422 datos/unidades/catálogo/faltantes inválidos. Errores sin SQL ni existencia de datos ajenos. No endpoint de clasificación automática, movimiento o despacho.

## 8. Criterios de aceptación y negativos futuros

No son pruebas ya ejecutadas ni autorización de implementación.

| ID    | Caso                                                                                            | Resultado requerido tras aprobar reglas                                                                |
| ----- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| QC-01 | Responsable autorizado abre evaluación de lote consolidado                                      | ID/versión, centro/origen correctos, evento y auditoría; lote intacto                                  |
| QC-02 | Pre-lote o recepción en lugar de lote consolidado                                               | Rechazo sin evaluación ni eventos parciales                                                            |
| QC-03 | Captura de las cuatro observaciones con unidades/métodos aprobados                              | Datos exactos y referencias conservados; ningún resultado automático                                   |
| QC-04 | NaN/Infinity, unidad desconocida, código de calibre ajeno/inactivo o precisión extra            | 422 sin redondeo silencioso ni cambios                                                                 |
| QC-05 | Materia seca fuera de 0–100; descartados negativos, mayores que examinados o examinados cero    | Rechazo matemático, sin inferir calidad del lote                                                       |
| QC-06 | Temperatura negativa válida según el formato técnico                                            | No rechazo agrícola por defecto; no equivale a aceptación                                              |
| QC-07 | Falta atributo/método/evidencia obligatoria                                                     | Draft incompleto permitido según política; cierre bloqueado, sin cero ficticio                         |
| QC-08 | Lectura posterior a consolidación o recepción no perteneciente al lote                          | Etiquetar momento real; referencia ajena rechazada; no fingir lectura de recepción                     |
| QC-09 | Mismos valores, distintas decisiones humanas justificadas                                       | Ninguna clasificación calculada por el sistema; registrar decisión/actor bajo política manual aprobada |
| QC-10 | Sin sesión, permiso, otro centro/organización, UUID conocido o permiso revocado antes de replay | Denegación segura sin filtración ni escritura                                                          |
| QC-11 | Admin/recolector/revisor de discrepancias sin concesión de calidad                              | Sin autoridad implícita de cierre; D4 se mantiene independiente                                        |
| QC-12 | Dos ediciones/cierres con la misma versión                                                      | Uno gana, otro 409; no se pierden valores ni aparecen dos resultados vigentes                          |
| QC-13 | Replay tras pérdida de respuesta, UUID con distinto caso o clave con otro contenido             | Mismo resultado normalizado sin duplicar; conflicto para otra intención                                |
| QC-14 | Falla evento/auditoría al guardar/cerrar                                                        | Rollback de operación/versión/cierre e idempotencia                                                    |
| QC-15 | Editar/borrar/reabrir evaluación cerrada o eventos                                              | Rechazo en API y respaldo SQL; historia conservada                                                     |
| QC-16 | Muestra con descarte y decisión accepted/observed/rejected                                      | Cantidades y composición del lote idénticas; ningún movimiento ni despacho                             |
| QC-17 | Recarga/reinicio sin seed adicional                                                             | Recuperar datos, decisión e historial desde DB; sin dependencia de memoria UI                          |
| QC-18 | UI por teclado/móvil y reintento/conflicto                                                      | Estados claros, foco coherente y recuperación sin pérdida de intención ni concesiones indebidas        |

Pruebas futuras: unitarias de validación/unidades/estados sin umbrales agrícolas; integración PostgreSQL real de ámbitos, versiones, concurrencia, unicidad, eventos/rollback y protección SQL; E2E captura–cierre–consulta y negativos de centro/rol/cierre. Bases dedicadas distintas de demo. No sustituir prueba de decisión manual por una regla automática inventada.

## 9. Trazabilidad con requisitos

Fuentes: [RF](../01-analisis-de-sistema/03-requisitos-funcionales.md), [HU04](../01-analisis-de-sistema/02-historias-del-usuario.md), [actores](../01-analisis-de-sistema/01-actores.md), [modelo conceptual](02-modelo-datos-conceptual.md) y [matriz propuesta de seguridad](../02-arquitectura/06-matriz-accesos-seguridad.md).

| Requisito           | Aporte del recorrido propuesto                                             | Límite explícito                                                                                              |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| RF-06 / HU04        | Registro de calibre, materia seca, descarte y temperatura; QC-03–08        | Unidades/métodos/momento requieren Q1–Q4/Q6. Lectura posterior no completa temperatura de recepción.          |
| RF-07 / HU04        | Decisión manual justificada y categoría solo si se aprueba catálogo; QC-09 | Cumplimiento académico acotado sujeto a aceptación; reglas reales de aceptación/clasificación todavía faltan. |
| RF-09 / DA02        | Historia, evento/auditoría y protección de cierre; QC-12–17                | No publicación QR ni borrado de historia.                                                                     |
| RF-04 / RF-05       | Evaluación vinculada al lote, composición y pesajes confirmados            | No cambia identidad, declaración o netos.                                                                     |
| RF-13 / DA06 / RC03 | Concesiones por acción/centro y acceso mínimo; QC-10/11                    | No administración completa de cuentas ni exposición pública.                                                  |
| RF-10 / RF-11       | Frontera de inventario/transporte preservada; QC-16                        | No implementados: calidad aceptada no significa inventario aprobado ni despacho.                              |
| RF-08 / RF-12       | Información futura susceptible de una proyección autorizada                | Sin QR, liquidaciones, descuentos o métricas de merma inferidas.                                              |

## 10. Decisiones pendientes Q1–Q9

Todas las recomendaciones son propuestas, no reglas aprobadas. El usuario debe adoptar el corte académico y registrar si hubo validación externa; nunca inferirla. El responsable agrícola valida significados, métodos y criterios reales; la docente evalúa suficiencia y diferencias con RF-06/RF-07.

| ID / pregunta                                          | Opciones                                                                                   | Recomendación para el prototipo                                                                     | Qué aprobar antes de implementar                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Q1 Calibre: ¿qué representa?                           | Código de catálogo; masa g/fruto; diámetro mm; frutos/caja con referencia definida         | Código de catálogo académico explícito, sin ordinal o conversión implícita                          | Catálogo/versión, unidad y significado; si una medida física satisface el requisito o solo lo complementa                         |
| Q2 ¿Qué muestra/método representa cada valor?          | Una muestra del lote; observaciones por recepción; submuestras y resultados múltiples      | Muestra identificada, con método/procedencia por observación y sin afirmar representatividad        | Alcance, selección/tamaño de muestra, parte analizada y método; política si hay varias lecturas                                   |
| Q3 ¿Descarte de muestra o baja física?                 | Conteos/porcentaje de muestra; masa medida de muestra; kg retirados del lote               | Conteos de muestra y porcentaje derivado informativo; sin descontar stock                           | Definición/base de descarte, unidad, evidencia y alcance; cualquier baja física exige otro recorrido                              |
| Q4 ¿Cuándo se mide temperatura?                        | Recepción documentada por aporte; después de consolidar; ambas                             | Mantener lecturas reales separadas con fecha y procedencia, sin promedio                            | Cobertura exigida, datos faltantes y aceptación académica del recorte de RF-06 si no hay lecturas históricas                      |
| Q5 ¿Cómo se decide/classifica?                         | Decisión manual; catálogo manual de categorías; reglas automáticas aprobadas               | accepted/observed/rejected manuales con motivo y etiqueta manual_academic, sin categoría inferida   | Autoridad y significado de resultados, catálogo si existe y aceptación del modo didáctico; umbrales reales siguen sin definir     |
| Q6 ¿Qué se exige al cerrar y con qué precisión?        | Todos los atributos obligatorios; N/A justificado; cierre parcial                          | Cuatro atributos completos más muestra/métodos/evidencia, faltantes solo en draft                   | Obligatoriedad, posibles N/A, resolución/límites técnicos por unidad y redondeo de visualización; no se fija precisión de balanza |
| Q7 ¿Quién captura/cierra y cuántas personas?           | Responsable único; capturista más responsable; doble aprobación                            | Un responsable de calidad autorizado captura y cierra en su centro, sin herencia de roles actuales  | Acciones/concesiones y asignaciones; si se exige separación, definirla antes. No modificar D4                                     |
| Q8 ¿Una evaluación o reevaluaciones/corrección?        | Una por lote; varias versionadas; sustitución compensatoria                                | Una evaluación por lote, inmutable al cerrar; sin reapertura/corrección inicial                     | Unicidad, quién corrige y cómo se conserva el vínculo/resultado vigente si se amplía                                              |
| Q9 ¿Cómo se presenta calidad frente a lote/inventario? | Proyección de Calidad; extensión compatible de DTO de lotes; actualización física del lote | Proyección de Q con resultado actual, conservando consolidación inmutable y sin inventario/despacho | Contrato de lectura y etiqueta pending_quality histórica, propietario de eventos y cómo evitar estados contradictorios en UI      |

No basta aprobar "evaluación manual" sin cerrar unidades, procedencia, permisos, cierre y proyección. Una decisión de calidad no autoriza por sí sola descuento, reclasificación automática, pérdida física ni despacho.

## 11. Estructura, estilo y comprobaciones posteriores

Ubicación candidata dentro de Q: archivos `quality-domain.js`, `quality-application.js`, `quality-repository.js` en `server/modules/intake/`; adaptador `server/quality-http.js`; UI bajo `web/quality/`; migración 003 aditiva solo después de aprobar el modelo. No crear tablas o rutas al redactar este documento ni modificar retroactivamente 001/002.

Se conserva el estilo existente de contratos inyectados y `unitOfWork`, validación en entrada y repositorios parametrizados. Ejemplo real de Acopio: `await access.requireCenter(tx, actor, centerId, "intake:read")`; las acciones de Calidad de esta propuesta todavía no existen. Dominio sin Express/pg e historia propia con referencias estables.

Después de aprobación, usar los comandos existentes: `npm.cmd run check`, `npm.cmd run format:check`, `npm.cmd test`, `npm.cmd run build`, y con bases dedicadas/TEST_ALLOW_DB_WRITE=true `npm.cmd run test:integration` y `npm.cmd run test:e2e`. No se ejecutan ahora como si Calidad estuviera implementada. Se comprobarán solo enlaces, formato y coherencia del borrador.

Límites: preservar D1–D7, origen/cantidades y acceso; no inventar criterios agrícolas ni atribuir aprobaciones; no alterar evaluaciones cerradas; no versionar secretos ni probar migraciones sobre demo. **Esperar respuestas Q1–Q9 y aprobación de la especificación antes de planificar o implementar Calidad.**
