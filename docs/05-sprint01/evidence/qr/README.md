# Evidencias de publicación QR y Redis

Prototipo académico, sin aprobación docente ni validación agrícola. [Especificación PQ-01–13](../../../03-diseno-de-software/06-especificacion-publicacion-qr.md), [ADR-013](../../../02-arquitectura/10-decisiones-publicacion-qr.md), [guía](../../../../tecnologia/publicacion-qr.md).

Base main b664fee con Calidad integrada y commits conservados. El PR #5 permanece abierto sin fusionar. Las pruebas existentes no se omiten ni se rebajan.

- Unitarias: contrato estricto, URL de entorno, guard de publicación/versión, contenido corrupto y DB caída. mutation-red.txt demuestra que eliminar el guard de publicación falla; código restaurado.
- Integración PostgreSQL real en bases nuevas: permisos de otro centro/organización y administrador sin herencia; no publicado/publicado/retirado; ausencia de campos y valores privados; cache fría/caliente/actualizada; retiro con DELETE fallido manteniendo valor antiguo; GET/SET fallidos; caída y recuperación de caché; retiro con Redis caído; concurrencia/idempotencia, revisión inmutable y rollback real de auditoría; rate limit.
- Playwright Chromium aislado: recorrido de publicación/consulta anónima/actualización/retiro; PNG QR decodificado con URL exacta, HTML escapado, sin solicitudes de sesión en público, anchuras 320/768/1024/1440 sin overflow, sin pageerror. Capturas móvil/escritorio.
- CI añade test:redis obligatorio contra Redis real: GET/SET/TTL/DELETE y consulta por puerto; adaptador no disponible falla sin cola. Compose usa Redis real, E2E completo y reinicio conservando volumen. Docker local tiene acceso denegado: no se presenta como verificado localmente.

La primera ejecución QR falló en formato de publication-http.js y SonarCloud; se corrigió código/tipos/semántica sin modificar el gate. La cabeza integrada 5e05ac4 tuvo verify, compose y SonarCloud success. ci-main-integrated.json registra esa cabeza verificada; la descripción del PR enlaza los checks efectivos de su última cabeza. No atribuir los checks de cabezas anteriores a commits nuevos.

No hay ensayo de carga ni comparación de latencia. Los conteos de consultas en pruebas solo comprueban rutas fría/caliente: no se declaran mejoras de rendimiento. El límite en memoria es por instancia; no se afirma protección global multiinstancia. Una respuesta admitida antes del retiro puede terminar y no se pueden revocar copias descargadas.

Validación local final: **18 unitarias, 51 resultados de integración PostgreSQL y 13 E2E Chromium aprobados**, cero omitidos. Build, formato, validación OpenAPI/imports/enlaces y npm audit aprobados (cero vulnerabilidades reportadas). Evidencias unit-final.txt, integration-final.txt, e2e-final.txt, build-final.txt, format-final.txt, check-final.txt y audit.json. El lock de Calidad también tiene prueba de mutación detectada/restaurada. Demo CLI ejecutada sobre base ficticia exclusiva; fixture compartido scripts/publication-fixture.js.
