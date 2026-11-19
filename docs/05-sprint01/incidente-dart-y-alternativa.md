# Incidente Dart y alternativa oficial — 2026-11-19

**B sigue como preparación documental.** #9 se mantiene en borrador, sin implementación/validación Android. No se ejecutó el SDK señalado, restauró cuarentena, añadió exclusión o desactivó protección. No se envió reporte o muestra en nombre del propietario.

Se preparó el borrador privado .local/sonar-reportes-20261119/BORRADOR-SOPORTE-KASPERSKY.md. Incluye procedencia/versiones/hashes y distingue hechos de campos ausentes. No contiene credenciales, cookies, tokens o dumps del proyecto. La búsqueda acotada de logs SDK no aportó el evento exacto del antivirus; ausencia de dart.exe no demuestra por sí sola cuarentena o falso positivo.

| Dato disponible | Resultado |
| --- | --- |
| Preparación afectada | Flutter3.50.0, revisión ab2912035e160d9cad6306df307576da6128ebdb; Dart3.14.0; engine371f77202a73e8dff57a8b3bff75bca55c090aee |
| Procedencia registrada | storage.googleapis.com/flutter_infra_release/flutter/371f77202a73e8dff57a8b3bff75bca55c090aee/dart-sdk-windows-x64.zip |
| ZIP conservado |231471855bytes; SHA-256 recalculado2e9d24952e7bda6b9532429f811211d2ac86dd274a212829f1e0916d40ad2f53; coincide con el registro previo |
| Hash adicional histórico | MD5 base64 2HCJ4Ak8XeRJjre5ku2/Sw== comparado anteriormente con cabecera oficial; CRC32C JW4DpQ==. Es integridad de transferencia del ZIP, no dictamen de seguridad |
| Evento/fecha exacta de detección | **No disponibles** en las evidencias revisadas. No se sustituye por fecha del archivo, del borrador o de un bootstrap fallido |
| Detección, acción y hash del dart.exe señalado | **Pendientes del evento**. No confundir hash del ZIP con hash del ejecutable; no se ejecutó/restauró el binario para obtenerlo |
| Antivirus | Kaspersky21.27 observado activo en la preparación previa; versión/parches/firmas del evento y dictamen de resolución no aportados |

## Alternativa evaluada, no habilitada

La ruta histórica con /flutter/releases/releases_windows.json devolvió404. Se consultó el catálogo oficial de distribución [releases_windows.json](https://storage.googleapis.com/flutter_infra_release/releases/releases_windows.json); el [archivo oficial de SDK](https://docs.flutter.dev/install/archive) explica los metadatos y la procedencia que deben corroborarse. Se evaluó un artefacto distinto, no se recomendó un downgrade como solución al incidente:

- Flutter **3.47.9 stable**, Dart **3.13.7**, release2026-10-29; revisión c197ca5199e9ee5661e865596c9c07294dfab51c.
- Engine89c39edfdfae2949f6806e4a315c0c08522238b7, leído del [commit oficial](https://raw.githubusercontent.com/flutter/flutter/c197ca5199e9ee5661e865596c9c07294dfab51c/bin/internal/engine.version), distinto del afectado.
- [ZIP oficial Windows](https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.47.9-stable.zip): HEAD200,1939451626bytes. SHA-256 esperado del catálogo **d8e2b5977e09082c6440f89dc1aa887b94c8fbcc3b39222797046295a3f68a9e**; cabecera MD5base64 E2whwCcE1v5Ir1IJ5x/ZFA== y CRC32C1ezNjg==.

| Condición | Estado real |
| --- | --- |
| Procedencia/versionado | Metadatos oficiales y revisión/engine contrastados por HTTPS |
| Integridad del paquete local | **No verificada**: no se descargó el ZIP de1.94GB; un hash publicado no equivale a comparar un archivo local |
| Estado frente a antivirus | **Sin dictamen/análisis de ese archivo local**; no se afirma limpio porque sea oficial, antiguo o distinto |
| Compatibilidad/ejecución | No instalado/ejecutado; no es entorno Android disponible ni aceptación de B |

Antes de cualquier ejecución futura: resolver el incidente con evidencia, verificar el archivo descargado contra el catálogo y su procedencia, analizar el artefacto alternativo con protecciones activas y revisar compatibilidad. Ningún checksum, HEAD200 o cambio de versión sustituye el análisis antivirus. No se usa otro entorno para eludir Kaspersky.

## Único paso manual actual

**Exportar desde Informes de Kaspersky el evento exacto referente a dart.exe**, guardándolo de forma privada bajo .local/sonar-reportes-20261119/evento-kaspersky.txt o el formato que ofrezca el producto. Debe conservar fecha/zona, detección, acción, ruta/hash y producto/firmas. Esa exportación completa los campos ausentes del borrador; no enviar el reporte automáticamente ni restaurar el archivo. [Datos que solicita soporte](https://support.kaspersky.com/common/error/other/15332).
