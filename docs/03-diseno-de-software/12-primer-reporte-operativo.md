# ROP-01 — salidas y entregas por centro

Estado: **alcance autorizado; contrato completado antes del código**. RF-12/HU08 se cubren solo en esta consulta operativa. No es ETL/datamart ni implementación de indicadores agrícolas, mermas o liquidaciones. [Requisitos](../01-analisis-de-sistema/03-requisitos-funcionales.md) y [matriz](../05-sprint01/matriz-trabajo-final.md).

## Usuario, objetivo y fuentes

El encargado logístico consulta salidas de sus centros, distingue tránsito y entrega y ve la duración entre hechos registrados. Reutiliza sesión y concesión shipment:read; ser administrador no sustituye esa concesión.

Fuentes: logistics.shipments, inventory.entries para lotId, access.centers para nombre y logistics.deliveries para recepción. Una fila por shipmentId. Joins por identidad, organización y centro; deliveries tiene PK shipment_id y entries/centers identidad única. No unir movimientos, eventos ni contribuciones que multipliquen filas. Solo lectura: no modifica cantidades, estados o historia.

Campos públicos internos del DTO: shipmentId, centerId, centerName, lotId, state, quantityKg, receivedKg nullable, unit, departedAt, deliveredAt nullable, durationSeconds nullable y dataIssue boolean. Unidad kg conforme al contrato logístico existente; cantidades como texto decimal exacto de tres posiciones, sin Number ni conversiones de unidad. No hay totales de página o selección.

Se excluyen guía, destino, chofer, placa, precinto, transporte, evidencia y actor personal. No se conecta al QR, API pública o caché pública. Cache-Control: no-store, como el resto de la API autenticada.

## API y filtros

GET /api/v1/reports/shipments, dentro de la API autenticada actual:

| Parámetro | Contrato |
| --- | --- |
| centerId | UUID obligatorio, centro autorizado de la organización de sesión |
| from | Instante ISO8601 con zona, inclusivo sobre departedAt |
| to | Instante ISO8601 con zona, exclusivo sobre departedAt; posterior a from |
| state | Opcional: in_transit o delivered; nunca filtra createdAt/deliveredAt |
| lotId | UUID opcional, igualdad exacta sobre entries.lot_id |
| limit | Entero 1–100, predeterminado 25 |
| afterDepartedAt, afterShipmentId | Cursor opcional; ambos presentes o ambos ausentes |

Instantes con hasta tres decimales, normalizados a UTC; sin fechas locales ambiguas. Ventana máxima técnica de 31 días por consulta, sin implicación de negocio ni promesa de rendimiento productivo. SELECT parametrizado y timeout de consulta de 5s; antes de ampliar volumen se medirá plan/dataset y se evaluarán índices en migración nueva, nunca reescribiendo las publicadas.

Orden ascendente (departedAt, shipmentId). Paginación por cursor exclusivo sobre esa pareja; limit+1 decide nextCursor, sin COUNT o carga histórica completa. Respuesta: items, limit, nextCursor nullable, generatedAt (UTC), timeZone=UTC y dateField=departedAt. El cursor procede de la última fila visible y mantiene los mismos filtros. Un empate temporal se ordena por UUID. Cada página es una lectura consistente; cambios concurrentes de estado pueden cambiar la selección entre páginas, sin prometer snapshot histórico global.

Autenticar y revalidar sesión/concesión en cada página **antes** de consultar datos; organización exclusivamente de sesión y presente en todos los joins. No sesión/expirada:401; sin concesión/centro ajeno:403, sin filas/totales. Parámetros inválidos/desconocidos, rango vacío/invertido/largo o cursor incompleto:422. Timeout:503 sin SQL interno. Reutiliza errores y componentes de acceso existentes, sin crear permisos.

## Fechas y cálculos

Salida/entrega se devuelven como ISO8601 UTC con milisegundos. Duración solo con salida y entrega existentes y ordenadas: deliveredAt−departedAt, segundos como texto con tres posiciones, calculados en PostgreSQL sin coma flotante. 10:00Z→11:30Z=5400.000; igualdad=0.000. Incluye paradas; no es tiempo de conducción ni SLA.

En tránsito: receivedKg, deliveredAt y durationSeconds null; nunca cero, hora actual o entrega asumida. Estado delivered sin recepción, entrega anterior a salida o recepción discordante con tránsito: dataIssue=true y duración null. Se muestran hechos disponibles, sin reparar historia. No calcula merma, eficiencia, promedio, pago o productividad.

## Pantalla

Nueva pestaña Reportes operativos solo con centros shipment:read, usando navegación, API, botones, etiquetas, estados y estilos existentes. Centro obligatorio, desde/hasta **de salida en UTC**, estado y lote exacto; aplicar filtros reinicia paginación. Desde inclusivo/hasta exclusivo y zona visibles. Fechas de pantalla usan UTC, no zona implícita del navegador. Cursor siguiente/anterior con filtros aplicados estables; no mezclar resultados con filtros aún sin aplicar.

Carga accesible, vacío explícito, error con reintento y página con filas. Sin datos anteriores mientras carga/error; respuestas de solicitudes obsoletas o de una vista desmontada no sustituyen las actuales. Tabla con cabeceras semánticas, contenedor horizontal acotado en móviles, navegación por teclado y sin depender solo del color. No edición, exportación masiva o enlaces QR.

## Criterios de aceptación verificables

1. Base aislada nueva con datos ficticios y esquema actual; demo 001–007 sin acceso/migración/seed.
2. Una salida en tránsito y otra entregada, con múltiples movimientos/eventos: cada shipmentId aparece una sola vez; borradores/reservas/cancelados sin salida no aparecen.
3. Cantidades exactas de tres decimales y unidad kg, incluidas fracciones; respuesta y pantalla no redondean ni suman unidades.
4. from incluye y to excluye la salida exacta; offset horario equivalente produce la misma selección; precisión milisegundo y validación de límites/rango/estado/lote/cursor.
5. Entrega pendiente deja tres campos null; diferencia válida, igualdad y milisegundos exactos. No se cambia ningún hecho al leer.
6. Sin sesión, sesión expirada, otra organización/centro y revocación de shipment:read entre páginas se rechazan; DTO excluye datos privados y ruta pública no expone el reporte.
7. Páginas pequeñas con empate de salida recorren todos los IDs una sola vez, orden estable, límite máximo y última página/cursor correctos. No totales ambiguos.
8. E2E real del login, pestaña, filtros de fecha/estado/lote, vacío, carga, error/reintento y resultados de tránsito/entrega. Verificar teclado y disposición móvil/escritorio; no atribuirlo a Android.
9. OpenAPI, documentación y matriz reflejan reporte operativo implementado y sus límites. CI del SHA final del PR aprobado antes de declarar listo; publicar sin fusionar.

Analítica futura requerirá grano, dimensiones, indicadores acordados, cargas incrementales/idempotentes, frescura, conciliación, retención y aislamiento de carga. Este reporte no acredita ese trabajo.
