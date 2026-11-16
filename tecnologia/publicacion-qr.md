# Publicación QR — demostración reproducible

Usar datos ficticios, una base/volumen exclusivo de demostración y Node 24. No ejecutar integración contra la demo: su prueba de down/up revierte las migraciones en una base desechable. No borrar volúmenes existentes.

## Compose

Desde la raíz del repositorio, PowerShell:

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run setup:env
# Editar .env: PUBLIC_BASE_URL debe ser la URL raíz accesible al lector del QR.
# Ejemplo para APP_PORT=3000: PUBLIC_BASE_URL=http://localhost:3000
# Un teléfono físico necesita la URL pública HTTPS real; localhost es solo el equipo local.
docker compose up --build -d --wait
docker compose exec -T app node scripts/demo-publication.js
```

La última orden crea un lote ficticio sin publicarlo e imprime su lotId. `seed` solo prepara cuentas/concesiones; no publica lotes ni eventos. Ingresar con `publicacion@example.test` y DEMO_PASSWORD del entorno; seleccionar el lote en Publicación QR. Escribir `VV-DEMO-001`, elegir Cosecha, fecha `2026-01-02`, descripción `Cosecha ficticia documentada.`; revisar los campos, marcar aprobación y publicar. Descargar QR PNG y abrir la URL pública sin sesión. Cambiar la descripción y publicar de nuevo; la siguiente consulta mostrará la revisión vigente. Retirar y consultar de nuevo: no disponible. Esta publicación no equivale a aprobar Calidad.

Para una demostración automatizada **explícita** de publicación del contenido ficticio del fixture:

```powershell
docker compose exec -T app node scripts/demo-publication.js --publish
```

El fixture compartido está en scripts/publication-fixture.js; API/UI no dependen de él. El comando exige ALLOW_DEMO_SEED=true, usa los permisos normales y rechaza producción. No borra información, no modifica históricos ni publica eventos internos.

Redis vive en la red Compose, sin puerto del host y sin volumen de datos. Para reproducir degradación en una demo exclusiva:

```powershell
docker compose stop redis
# Consultar un lote publicado, actualizarlo o retirarlo desde la UI.
docker compose start redis
```

Si se retira con Redis parado, nuevas consultas responderán 404 incluso después de recuperarse la caché. Para probar DB caída con caché caliente, detener **solo db en esa demo**; la API pública responderá 503 hasta recuperarla. No ejecutar estas órdenes contra una instancia compartida. `docker compose down` detiene conservando el volumen; no usar `-v`.

## Nativo y pruebas

Configurar DATABASE_URL exclusiva, PUBLIC_BASE_URL y opcionalmente REDIS_URL. Si Redis no está configurado, el puerto nulo usa PostgreSQL. Para aplicar y ejecutar demo:

```powershell
npm.cmd run migrate
npm.cmd run seed
npm.cmd run build
npm.cmd start
# En otra consola, con el mismo .env:
node --env-file=.env scripts/demo-publication.js
```

Verificación limpia (bases de integración y E2E **distintas y nuevas**, ambas con TEST_ALLOW_DB_WRITE=true):

```powershell
npm.cmd run format:check
npm.cmd run check
npm.cmd test
npm.cmd run test:integration
npm.cmd run test:redis
npm.cmd run build
npm.cmd run test:e2e
```

`test:redis` exige un REDIS_URL exclusivo real y falla si falta: nunca se omite silenciosamente. En Unix usar `npm` en lugar de `npm.cmd`. CI aprovisiona PostgreSQL y Redis, corre estas verificaciones y además Compose con base E2E expuesta solo mediante compose.test.yaml. Las pruebas usan claves Redis únicas y TTL, no FLUSHALL. Integración revierte y reaplica todas las migraciones; no usar bases con información que se deba conservar.

Los usuarios ficticios `publicacion2@example.test` (Sur) y `publicacion-ajena@example.test` (otra organización) permiten comprobar aislamiento. Administrador, Acopio y Calidad no heredan permisos de publicación. La representación pública omite identificadores operativos, responsables, contactos, notas, credenciales y finanzas. Las descripciones son texto plano y requieren revisión humana de su contenido.

Limitaciones: una instancia B1 y límite local por IP; HTTPS/configuración de dominio real para despliegue; sin pallets, categoría comercial, offline ni afirmaciones de rendimiento. [Contrato y política de retiro](../docs/03-diseno-de-software/06-especificacion-publicacion-qr.md), [evidencia](../docs/05-sprint01/evidence/qr/README.md).
