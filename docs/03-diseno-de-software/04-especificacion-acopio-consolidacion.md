# Borrador: recepción en acopio y consolidación del lote

Fecha: 2026-11-12. Estado: **propuesta para decisión del usuario; no aprobada para implementar**. Base técnica: primer recorrido del PR #2, commit `ba006eb`. Rama local separada: `docs/especificacion-acopio`. Este documento no añade código, tablas, roles ni rutas al primer recorrido.

## 1. Objetivo y alcance

Permitir que un operario autorizado reciba producto identificado por pre-lote, registre su pesaje de recepción y forme un lote consolidado conservando el origen y las cantidades aportadas. El resultado debe permitir responder qué se recibió, cuánto se pesó, de dónde proviene cada aporte, quién lo confirmó y qué cantidad permanece sin consolidar.

Trazabilidad: HU03/RF-05 para recepción y pesaje, RF-04 para identidad del lote y una parte acotada de RF-09/DA02 para eventos y conservación del origen. No se pretende completar HU04 de calidad, QR, inventario, pallets, transporte, liquidación ni captura offline.

### Supuestos explícitos del borrador

- Operación web en línea dentro del monolito Node 24/Express 5, con React/Vite y PostgreSQL 18; se conserva el lockfile.
- Se reutilizan sesión, CSRF, organización y auditoría. El actor nunca procede del body.
- La cantidad declarada en cosecha permanece intacta; el pesaje de recepción es un hecho nuevo, no una corrección silenciosa de la cosecha.
- No se consolidan organizaciones distintas en este recorrido. La mezcla entre productores, parcelas o fechas dentro de una organización está pendiente de decisión.
- Recepción y consolidación no equivalen a aprobación de calidad ni habilitan despacho. Si el negocio exige calidad aprobada antes de consolidar, debe resolverse su inclusión antes de implementar.
- Pesaje manual registrado por un usuario autorizado. Integración automática con balanzas y certificación metrológica/legal quedan fuera del alcance.

## 2. Mapa de capacidades y responsabilidades propuesto

Se mantienen las fronteras de la [arquitectura objetivo](../02-arquitectura/01-estilo-arquitectonico.md). Los nombres físicos nuevos son candidatos, sujetos a revisión; no son módulos ya implementados.

| Capacidad / componente         | Propiedad y contrato                                                                                       | Dependencias permitidas                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `access` / S, existente        | Sesión, autorización, ámbito de organización/centro y auditoría                                            | Contratos propios                                                    |
| `harvest` / H, existente       | Pre-lote, cosecha y origen declarado; contrato nuevo propuesto para consultar un origen autorizado         | Productores y Acceso, como en el corte actual                        |
| `traceability` / T1, propuesto | ID del lote, aportes por origen, eventos e historial de consolidación; consulta de cantidades ya asignadas | Persistencia propia y contratos comunes; no llama de vuelta a Acopio |
| `intake` / Q Acopio, propuesto | Recepciones, pesajes, cierre y coordinación de la consolidación                                            | Acceso, contrato de Cosecha y contrato de Trazabilidad               |

La dirección es Q → H/S/T1; H no depende de Q y T1 no consulta de vuelta a Q. Los módulos participan en una unidad de trabajo PostgreSQL cuando una confirmación necesita atomicidad. No se crean microservicios ni acceso directo a repositorios de otro módulo.

La asignación de centros de acopio y el mantenimiento de usuarios no tienen UI en el primer recorrido. La propuesta para este corte es usar fixtures ficticios explícitos hasta decidir su administración; ningún permiso se deduce de una ubicación enviada por el cliente.

## 3. Flujo funcional y estados propuestos

1. El operario identifica un pre-lote accesible y ve su ID, parcela/productor de origen, fecha de cosecha, cantidad declarada y unidad original.
2. Abre una recepción en un centro autorizado, con referencia operativa/ticket y fecha/hora. Se valida que el pre-lote exista en su organización.
3. Registra pesaje y los datos necesarios para justificarlo. Una recepción en borrador puede modificarse solo con permiso, control de versión y auditoría.
4. Confirma la recepción cuando origen y pesaje estén completos y se haya aplicado la política aprobada para discrepancias. Los datos confirmados dejan de ser editables ordinariamente.
5. Selecciona recepciones habilitadas, indica aportes y confirma un lote. Trazabilidad genera identidad única y conserva cada vínculo de origen/cantidad; Acopio coordina permisos y saldos.
6. Consulta el lote y reconstruye sus aportes hasta la recepción, pre-lote, cosecha, parcela y productor.

Estados candidatos de recepción: `borrador` → `recibida`. Estado candidato del lote: `borrador` → `consolidado`. La elegibilidad, aprobación o corrección de esos estados depende de D6/D7. La cantidad pendiente de consolidar se deriva de los aportes; no se añade otra fuente de stock ni se reemplaza el estado `registrado` del pre-lote original.

No se habilitan correcciones de registros cerrados, anulaciones o división de lotes consolidados hasta definir sus permisos, efectos cuantitativos y eventos compensatorios. No se elimina historia ni se reutilizan IDs para representar otro origen.

## 4. Permisos propuestos, pendientes de D7

La base actual solo admite roles `admin`, `collector` y `viewer`; un rol de acopio requeriría una migración aprobada que conserve las cuentas existentes. Esta matriz describe permisos futuros, no concesiones actuales.

| Actor                                                | Lectura                                                                        | Escrituras propuestas                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Operario de acopio                                   | Origen mínimo, recepciones y lotes de su organización y centros asignados      | Abrir recepción y pesar/editar borrador; confirmar y consolidar solo si D7 lo autoriza            |
| Supervisor de acopio, si se aprueba                  | Mismo ámbito autorizado y evidencias de discrepancias                          | Aprobar excepciones/correcciones según D7; no editar historia sin una operación auditada definida |
| Recolector                                           | Propuesta: estado mínimo de recepción relacionado con sus parcelas autorizadas | Ningún permiso de pesaje, consolidación, mezcla o división por ser recolector                     |
| Administrador actual                                 | Conserva su alcance del primer recorrido                                       | No hereda automáticamente operaciones de acopio ni aprobación de excepciones                      |
| Anónimo, lector sin autorización u otra organización | Sin acceso operativo                                                           | Denegación por defecto                                                                            |

Cada escritura y reintento revalida sesión activa, rol, organización, centro y origen. No basta conocer un UUID. La corrección de un pesaje cerrado, una mezcla excepcional y una división necesitan permisos explícitos separados. Las consultas filtran antes de responder; no se exponen contactos, notas internas ni datos de otro ámbito.

## 5. Pesaje y cantidades

### Datos mínimos candidatos

Identificador de recepción; pre-lote(s) y origen autorizado; centro; referencia/ticket; fecha/hora de recepción y pesaje con zona; usuario responsable; unidad; valores medidos; balanza o justificación de captura manual; estado y eventos. Datos de conductor, DNI/RUC, precios o información comercial no forman parte de este recorrido.

Si se registra **bruto y tara**, debe cumplirse bruto > tara ≥ 0 y neto = bruto − tara > 0, expresados en la misma unidad y resolución. Debe decidirse si también se permite capturar neto directamente y qué evidencia se exige (D2). El usuario no puede enviar un neto contradictorio con los valores de los que se deriva.

Propuesta técnica para comparar aportes: masa en kg y decimales exactos; tres decimales es un candidato compatible con el corte anterior, sujeto a la resolución de la balanza y regla de redondeo de D2. No usar coma flotante binaria como autoridad del saldo, redondeos silenciosos o tolerancias inventadas. Los límites máximos y la precisión de las sumas deben quedar cerrados antes del esquema físico.

Los pre-lotes actuales admiten `kg` y `unidad`. Si el origen declara unidades y se recibe una masa, ambos hechos se conservan por separado. No convertir unidades a kg por un factor implícito ni comparar ambas dimensiones como si fueran equivalentes. La cantidad oficial debe provenir de medición o de una regla expresamente aprobada.

### Declarado frente a recibido

Una diferencia entre cosecha declarada y neto medido es una **discrepancia registrada**, no merma automática. D4 decide tolerancia, aprobación y efecto. No se sobrescribe la declaración para hacer coincidir cifras ni se rechaza por defecto todo pesaje mayor que una estimación sin acordar esa regla.

Si una pesada agrupa varios pre-lotes, el total no permite deducir por sí solo cuántos kg provienen de cada uno. Se necesita pesaje individual u otra política de atribución aprobada en D2. No repartir proporcionalmente por cantidades declaradas, partes iguales o tamaño aparente sin decisión del negocio.

### Balance de consolidación

Para cada recepción confirmada, definir:

- R: neto medido de recepción.
- H: cantidad habilitada para consolidar según la política aprobada, con 0 ≤ H ≤ R.
- A: suma de aportes ya confirmados en lotes.
- S = H − A: saldo pendiente de consolidación, con S ≥ 0.

H = R solo puede adoptarse expresamente si el negocio permite consolidar todo el neto sin una etapa previa de calidad (D6). R − H no se etiqueta automáticamente como descarte o merma. La cantidad de un lote es la suma exacta de sus aportes; cada aporte es positivo y nunca excede el saldo de su recepción.

Dos transacciones concurrentes no pueden consumir el mismo saldo dos veces. El propietario de los aportes es Trazabilidad; Acopio obtiene el saldo mediante contrato y coordina el bloqueo/confirmación en la misma transacción. Un total derivado no se mantiene como otro inventario mutable independiente.

## 6. Conservación del origen y cambios cerrados

Cada aporte conserva referencias estables a lote, recepción, pre-lote, cosecha, parcela y productor, su organización, cantidad/unidad aportada y actor/fecha del evento. Se consulta la versión histórica pertinente del origen; no se sustituyen referencias por un nombre concatenado ni por el último productor de una selección UI.

El primer recorrido permanece intacto: pesar o consolidar no modifica cantidad declarada, unidad, fecha, responsable, clave de idempotencia o parcela del pre-lote. Los datos recibidos se preservan aun cuando una relación deje de estar habilitada para operaciones nuevas; la lectura histórica sigue su propia autorización.

Si se permite dividir un pre-lote entre lotes, cada asignación y saldo debe quedar registrado sin duplicar masa. Si se permite dividir un lote ya mezclado, se necesita una política explícita para la composición de sus hijos: no es válido copiar el total de cada origen a todos los hijos ni afirmar proporciones físicas que nunca se midieron. Se conserva el vínculo con el padre y la regla aplicada. D3/D5 deciden si estas operaciones forman parte de este incremento.

## 7. Confirmaciones, errores e idempotencia

Los comandos propuestos son abrir/confirmar recepción, registrar pesaje y consolidar lote. Sus rutas y DTO finales se fijarán después de aprobar cardinalidades y permisos; no se amplía ahora OpenAPI ni se crean migraciones.

- Mantener los errores estructurados del proyecto: 401 sin sesión, 403 sin permiso, 404 para origen no accesible, 409 para conflicto de versión/clave/saldo y 422 para medición o entrada inválida. No revelar SQL, credenciales o existencia de datos ajenos.
- Idempotency-Key por actor para las confirmaciones. Mismo contenido normalizado recupera el mismo resultado; distinto contenido con la misma clave produce conflicto. Se revalida autorización antes de responder al reintento.
- La idempotencia técnica no detecta por sí sola dos comandos con claves distintas para la misma entrega física. D1 define la identidad operativa de la recepción y el tratamiento de duplicados.
- Una consolidación confirma identidad de lote, aportes, eventos y auditoría en la misma unidad de trabajo. Ante fallo, no queda un lote parcial ni un saldo consumido sin su historia.
- No hay `DELETE` ordinario de eventos/recepciones cerradas. Una corrección aprobada deberá conservar el valor previo, motivo, autor y compensación cuantitativa; no se implementa antes de D7.

## 8. Criterios de aceptación propuestos

Estos criterios son verificables después de aprobar las decisiones aplicables. No se presentan como pruebas ya ejecutadas.

| ID    | Dado / acción                                                                 | Resultado exigido                                                                                                                                             |
| ----- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Usuario autorizado y pre-lote de su ámbito                                    | Abre recepción con IDs de origen y actor de sesión; conserva la declaración original                                                                          |
| AC-02 | Rol sin permiso, centro no asignado u origen ajeno                            | Rechazo seguro, sin escritura ni filtración de datos                                                                                                          |
| AC-03 | Bruto 125 kg y tara 5 kg                                                      | Neto exacto 120 kg; un neto enviado distinto se rechaza; resolución según D2                                                                                  |
| AC-04 | Tara negativa, tara ≥ bruto, cantidad no finita, cero o precisión no admitida | Error de validación, sin recepción confirmada ni aportes                                                                                                      |
| AC-05 | Pre-lote declarado en unidades y recepción medida en kg                       | Ambos valores y dimensiones permanecen; no aparece un factor de conversión inventado                                                                          |
| AC-06 | Diferencia entre declarado y medido                                           | Se conserva y aplica la política D4; no se convierte automáticamente en merma                                                                                 |
| AC-07 | Dos recepciones elegibles con aportes medidos 70 y 30 kg                      | Lote de 100 kg con ambos orígenes y sus aportes exactos, solo si D3 permite esa mezcla                                                                        |
| AC-08 | Regla D3 prohíbe la combinación seleccionada                                  | No se crea lote ni se consume saldo; la UI explica la restricción sin alterar el origen                                                                       |
| AC-09 | Recepción con H = 100 kg y parcialidad aprobada                               | Aportar 60 deja S = 40; se rechaza una asignación adicional de 50                                                                                             |
| AC-10 | Parcialidad no aprobada                                                       | No se ofrece ni acepta una asignación parcial; se aplica la regla de consumo completo definida                                                                |
| AC-11 | Dos confirmaciones concurrentes intentan aportar 60 kg desde un saldo de 100  | Solo una puede consumir ese saldo; ninguna combinación produce A > H                                                                                          |
| AC-12 | Reintento tras pérdida de respuesta                                           | Misma clave/datos devuelve los mismos IDs sin duplicar recepción, lote, aporte o evento; cambio de contenido produce conflicto                                |
| AC-13 | Fallo al escribir auditoría/evento/aporte                                     | Rollback completo de la confirmación y saldo conservado                                                                                                       |
| AC-14 | Intento de modificar origen o pesaje cerrado                                  | Rechazo; una futura corrección autorizada conserva historia y compensaciones aprobadas                                                                        |
| AC-15 | Consulta del lote después de reiniciar app y DB                               | Se recuperan IDs, aportes, origen y cantidades sin depender de un nuevo seed                                                                                  |
| AC-16 | Recorrido desde la UI                                                         | Operario recibe, pesa y consolida; confirmación muestra IDs y consulta permite recorrer origen y saldos. Estados vacío/carga/error/éxito y acceso por teclado |

AC-07/08, AC-09/10 y cualquier división se concretarán con ejemplos aprobados; no se implementan opciones incompatibles para elegir silenciosamente una en producción.

## 9. Decisiones que bloquean la implementación

| ID                     | Decisión del usuario                                                                                                                                                | Efecto de no decidir                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| D1 — Recepción         | ¿Cada pre-lote llega una sola vez o admite varias entregas? ¿Qué ticket/referencia distingue una entrega y evita duplicados?                                        | No se fija cardinalidad, unicidad operativa ni regla de recepción parcial                                |
| D2 — Pesaje            | ¿Pesaje individual por pre-lote o remesa conjunta? ¿Bruto/tara obligatorios o neto directo? ¿Resolución, redondeo y atribución por origen si la pesada es conjunta? | No se fija el modelo de medición ni se inventan kg por origen                                            |
| D3 — Mezcla            | ¿Puede un lote combinar parcelas, productores o fechas? ¿Qué incompatibilidades lo impiden? ¿Puede consolidarse solo una parte del saldo?                           | No se cierra elegibilidad ni consumo completo/parcial; no se habilita mezcla genérica                    |
| D4 — Discrepancias     | ¿Qué diferencia declarado/medido se tolera? ¿Quién autoriza excedentes/déficits? ¿Cómo se registra merma real y qué evidencia la respalda?                          | No se aplican tolerancias, descuentos ni mermas por defecto                                              |
| D5 — División          | ¿Se admite repartir un pre-lote y también dividir/reabrir un lote consolidado? Si ya está mezclado, ¿qué composición se atribuye a cada hijo y con qué base?        | División de lotes cerrados queda fuera; no se asume proporcionalidad ni se duplican aportes              |
| D6 — Habilitación      | ¿Basta recepción/pesaje o se necesita calidad aprobada antes de consolidar? ¿Qué cantidad H queda habilitada?                                                       | No se iguala H a R automáticamente ni se inventa aceptación de calidad                                   |
| D7 — Permisos y cierre | ¿Quién confirma recepción, consolida, aprueba excepciones y corrige? ¿Se requiere una segunda persona? ¿Cómo se autoriza centro/organización?                       | No se conceden roles nuevos ni permiso implícito al administrador; correcciones cerradas no se habilitan |

Aprobar primero este mapa de responsabilidades y las decisiones D1–D7 con ejemplos de recepción, mezcla y reparto. Después se podrá cerrar el contrato API, las transiciones y el esquema físico. La relación muchos-a-muchos del [modelo conceptual](02-modelo-datos-conceptual.md) no sustituye esa aprobación.

## 10. Estructura, estilo y comprobaciones futuras

Estructura candidata: `server/modules/intake/` y `server/modules/traceability/`, con dominio/aplicación/repositorio como los módulos actuales; ensamblado en `server/composition.js`, adaptadores en `server/http.js`, UI en `web/` y migraciones aditivas en `migrations/`. Los contratos de origen y aportes deben aprobarse antes de escribir SQL. No se modifica retroactivamente la migración `001` ya aplicada.

Estilo ya presente en `producers/application.js`, que debe conservarse al extender el sistema:

```javascript
return unitOfWork(async (tx) => {
  const result = await repository.createProducer(tx, actor, input);
  await access.audit(tx, actor, "producer:create", result.id);
  return result;
});
```

Pruebas futuras: unitarias para pesaje/políticas aprobadas; integración PostgreSQL real para ámbito, idempotencia, concurrencia, restricciones y rollback; E2E de recepción-pesaje-consolidación; persistencia con Compose conservando volúmenes. Las suites usarán bases desechables separadas de la demo. No se fijan porcentajes de cobertura o metas de rendimiento no acordadas.

Comandos existentes que se usarán cuando haya implementación autorizada; **no ejecutados para redactar este borrador**:

```powershell
npm.cmd run check
npm.cmd run format:check
npm.cmd test
npm.cmd run build
# DATABASE_URL de pruebas dedicada y TEST_ALLOW_DB_WRITE=true:
npm.cmd run test:integration
# Otra base E2E dedicada y Chromium compatible:
npm.cmd run test:e2e
```

Límites: siempre conservar origen, autorización, cantidades y auditoría; decidir antes de implementar roles, mezcla/división, pesaje y corrección; nunca sobrescribir cosechas, eliminar historia, convertir unidades implícitamente, versionar secretos ni probar migraciones destructivas sobre datos existentes. No se inicia planificación detallada ni código de este recorrido hasta aprobar el borrador.
