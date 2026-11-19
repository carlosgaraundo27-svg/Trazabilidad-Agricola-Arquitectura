# ROP-01 — implementación y prueba manual

Rama feat/reporte-operativo-rop01 sobre main18d57e9 (merge autorizado de #10). [Contrato previo al código](../03-diseno-de-software/12-primer-reporte-operativo.md) y [OpenAPI](../03-diseno-de-software/openapi.json). API GET /api/v1/reports/shipments y pestaña Reportes operativos implementadas dentro del monolito actual, con puerto de acceso existente, servicio/repository de lectura y componentes React separados.

Una fila por despacho; PK/joins por organización/centro, sin movimientos/eventos en el SELECT. Cantidades textuales exactas, kg, tiempos UTC y duración decimal calculada en PostgreSQL. Ventana de salida [desde,hasta), hasta31 días, estado/lote exacto, cursor por salida/UUID y límite100. Sin totales, mutaciones, exportación, transporte, chofer/placa/precinto/evidencia, QR o caché pública. No es ETL/datamart ni RF-12 completo.

## Pruebas y límites

- Rojo previo: API ausente404; filtros aceptaban año0000 incompatible con PostgreSQL. Regresiones verdes tras implementación, con validación de zona, milisegundos, años UTC0001–9999, rango, cursor y campos desconocidos.
-30 unitarias locales,5 resultados de integración ROP-01 en PGlite nueva en memoria: cantidad999999999.999/0.001, duración5400.001/0.000, pendientes null, límites inclusivo/exclusivo, offset horario equivalente, filtro por estado/lote, empate temporal entre páginas, ningún duplicado, sesión/organización/centro/concesión/revocación/expiración y hechos iguales antes/después de leer.
- E2E en Chrome Google firmado, con archivo PGlite NUEVO/privado y esquema001–008: login, pestaña, filtros, tránsito/entrega, carga retenida, vacío, fallo503 simulado/reintento, DTO privado ausente en pantalla, teclado y anchos320/768/1024/1440. Capturas320/1440 inspeccionadas. El primer intento usó memoria entre dos conexiones separadas y falló al perder el seed; se conserva como fallo de preparación, no de autenticación de producto. La repetición con almacenamiento privado nuevo aprobó.
- Check, OpenAPI3.1, formato y build aprobados. PostgreSQL, E2E completo y Compose deben comprobarse en CI del SHA publicado del PR; los resultados de main18d57e9 no sustituyen esos checks. Estado final/enlaces por SHA en la descripción del PR.
- Fixture crea cuatro despachos ficticios nuevos con triggers activos; tres salidos y uno en preparación. Las fechas antiguas se fijan al INSERT del draft, nunca mediante UPDATE de hechos históricos. Solo para base aislada con TEST_ALLOW_DB_WRITE=true.

No se mide capacidad productiva con cuatro despachos. El timeout5s y el rango acotado son guardas, no evidencia de P95. La página es consistente; no promete un snapshot histórico único entre páginas si cambian estados concurrentemente. PostgreSQL001–008 se prueba en CI; PGlite no es Android ni certificación de producción.

## Recorrido manual aislado

URL local prevista: http://127.0.0.1:3041. Solo declararla disponible tras comprobar health y el proceso preparado. Usuario ficticio autorizado: **inventario@example.test**, concesión shipment:read en Acopio ficticio Norte. La contraseña generada se conserva exclusivamente en .local/rop01-manual/credenciales.txt; no se publica ni se pega en el chat.

1. Ingresar con ese usuario y la contraseña del archivo privado local. Abrir **Reportes operativos**.
2. Centro Acopio ficticio Norte; salida desde **2026-01-03T00:00:00.000 UTC** y hasta **2026-01-04T00:00:00.000 UTC**; estado ambos y lote vacío. Consultar: tres filas, dos entregadas y una en tránsito. La preparación no aparece.
3. En tránsito: una fila de0.001kg y recepción/entrega/duración pendientes. Entregado: dos filas; duraciones5400.001 y0.000 segundos, sin conversión de unidad o pérdida de decimales.
4. Copiar el UUID de un lote y filtrar por él. Para el lote con salida11:30:00.123Z, poner hasta exactamente ese instante: vacío; volver al día siguiente: aparece. Las fechas del filtro son siempre **de salida**, no de entrega.
5. Los botones anterior/siguiente usan cursor y se deshabilitan si no hay página; el fixture pequeño cabe en una sola página. La regresión API con limit1 verifica el empate y las tres páginas sin duplicados. Cambiar filtros reinicia esa navegación.

Esta instancia utiliza su propio archivo PGlite y puerto3041; no reutiliza demo.env, DB inventory_demo_20261118_151800 ni puerto3026. La guía privada de arranque/parada identifica únicamente este proceso; no detener otros Node/PostgreSQL.

B sigue pendiente y #9 en borrador, solo documental. Se conserva .local/sonar-reportes-20261119/BORRADOR-SOPORTE-KASPERSKY.md sin enviar. Único paso manual Android: exportar el evento exacto de dart.exe desde Informes de Kaspersky a .local/sonar-reportes-20261119/evento-kaspersky.txt (o formato ofrecido), sin ejecutar/restaurar SDK o cambiar protecciones.
