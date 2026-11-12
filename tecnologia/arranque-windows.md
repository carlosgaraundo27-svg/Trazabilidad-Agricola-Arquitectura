# Primer recorrido reproducible en Windows

Trabajar desde el clon `repo-github`; conservar `repo` como respaldo. Requisitos: Git, Node `>=24 <25`, npm y Docker Desktop con motor Linux y Compose v2/v5. No se necesita PostgreSQL instalado en Windows. Express 5 es el backend decidido en [ADR-009](../docs/02-arquitectura/07-decisiones-primer-recorrido.md).

[Resultados actuales](../docs/05-sprint01/cierre-primer-recorrido.md): separar siempre ejecución nativa local, Compose local y Actions. Docker funciona en la terminal del usuario según `hello-world`; la sesión del agente recibe acceso denegado al motor y necesita resultados manuales para acreditar Docker local.

## 1. Comprobar herramientas, motor y puertos

```powershell
Set-Location -LiteralPath 'C:\ruta\repo-github'
git status --short
node --version
npm.cmd --version
docker version
docker info --format '{{.OSType}}'
docker compose version
netstat -ano -p tcp | Select-String ':(3000|3002|55432|55433)\s+.*LISTENING'
```

Se requiere Client/Server sin errores y `linux`. No cambiar permisos ni políticas para subsanar un acceso denegado. Usar `npm.cmd` evita invocar `npm.ps1` con PowerShell restringido.

En la revisión, el respaldo conserva la app nativa en 3000 y PostgreSQL nativo en 55432. Seleccionar `APP_PORT=3002` en `.env` para Compose. El puerto interno DB 5432 no se publica por defecto; los datos nativos y el volumen Docker son independientes. No detener procesos ajenos ni copiar directorios PostgreSQL entre instalaciones.

## 2. Preparar configuración sin sobrescribirla

```powershell
node scripts/setup-env.js
git check-ignore -v .env
notepad.exe .env
```

El auxiliar genera credenciales ficticias locales desde `.env.example` solo si `.env` no existe. Conserva un archivo existente y no imprime sus valores. Ajustar `APP_PORT=3002` si 3000 está ocupado. No versionar `.env`; la plantilla permanece con marcadores sin secretos.

La clave PostgreSQL generada es alfanumérica y la de demo supera 12 caracteres. Cambiar `.env` después de inicializar un volumen no cambia contraseñas ya almacenadas. El seed conserva cuentas y contraseñas existentes; ante un conflicto, revisar las credenciales de esa base y no borrar datos para resolverlo.

## 3. Levantar app y PostgreSQL

```powershell
node --env-file-if-exists=.env scripts/verify-compose.js
```

Equivale a validar configuración, ejecutar `docker compose up --build -d --wait`, consultar migración `001` y ejecutar `docker compose exec -T app node scripts/seed.js`. Las migraciones transaccionales/repetibles son parte de `scripts/container-start.js` y preceden al servidor. No se ejecutan scripts down ni se sobrescriben filas del seed.

El comando exige DB/app saludables y comprueba `/health` y HTML 200. Guarda el resultado sin credenciales en `.local/compose-start-*.json`. No imprimir `docker compose config` sin `--quiet`: puede incluir contraseñas. El primer build necesita red para descargar imágenes y paquetes.

Abrir `http://localhost:3002` cuando `APP_PORT=3002`. API y frontend comparten origen; usar `localhost` consistentemente. Cuentas ficticias:

- `admin@example.test`: registrar productor y parcela.
- `campo@example.test`: registrar cosecha/pre-lote en una parcela asignada.
- `otro@example.test`: organización distinta para comprobar aislamiento.
- `lector@example.test`: sin operaciones habilitadas en este corte.

La contraseña es `DEMO_PASSWORD` del `.env` usado al crear las cuentas. Solo usar datos ficticios. No copiar contraseñas a capturas o logs.

Para la demo rápida, ingresar como recolector y usar `Parcela demo Norte`; registrar cantidad positiva, fecha y unidad y recargar. Las parcelas nuevas requieren asignación explícita. La UI de asignaciones aún no existe; el E2E prepara la asignación mediante SQL parametrizado, como fixture acotado a la parcela que acaba de crear.

## 4. Verificar el recorrido completo en Compose

El override `compose.test.yaml` publica únicamente DB en `127.0.0.1:55433`, distinto de PostgreSQL nativo 55432. No usar este override para un despliegue público. La prueba crea productor, parcela y pre-lote ficticios, asigna la parcela al recolector y comprueba recarga, cuatro anchos y logout. Añade registros; no reinicializa ni limpia la DB de demo.

En un checkout nuevo, instalar las dependencias del lockfile y el navegador requerido. En el clon revisado ya están instaladas; no hace falta repetir la instalación. Si se usa el navegador local de la sesión, establecer `PLAYWRIGHT_BROWSERS_PATH` hacia `arranque-runtime\playwright-browsers` del directorio hermano.

```powershell
# Solo si faltan dependencias o el navegador en este checkout:
npm.cmd ci --ignore-scripts
node node_modules/@playwright/test/cli.js install chromium

node --env-file-if-exists=.env scripts/verify-compose.js --test
node --env-file-if-exists=.env scripts/test-compose.js
```

El segundo auxiliar apunta expresamente al frontend Compose y a su DB publicada por el override. `E2E_EXTERNAL_SERVER=true` omite la creación de un servidor Node adicional; no altera el test de recorrido. El JSON `.local/compose-e2e-*.json` registra su salida con credenciales redactadas. El navegador Chromium debe coincidir con el lockfile de Playwright.

## 5. Comprobar persistencia sin destruir volúmenes

Después del recorrido, ejecutar:

```powershell
node --env-file-if-exists=.env scripts/verify-compose.js --test --restart
```

El auxiliar guarda los IDs de pre-lotes, ejecuta `down` y `up -d --wait` con los mismos archivos Compose y comprueba que todos siguen presentes. No añade `-v`, no elimina el volumen `pgdata`, no repite el seed y no cambia credenciales. Volver a ingresar en la interfaz y consultar el registro creado. El JSON `.local/compose-restart-*.json` contiene los IDs anteriores y posteriores.

Para detener después del uso:

```powershell
docker compose -f compose.yaml -f compose.test.yaml down
```

La configuración base se detiene con `docker compose down`. Mantener los mismos archivos y directorio del proyecto al reanudar. No borrar volúmenes para solucionar errores de contraseña.

## 6. Build y pruebas locales independientes

```powershell
npm.cmd run check
npm.cmd run format:check
npm.cmd test
npm.cmd run build
npm.cmd audit --audit-level=high
```

Para integración usar una base vacía y dedicada con permisos DDL; la suite ensaya rollback y down/up. Para E2E nativo usar otra base dedicada, `TEST_ALLOW_DB_WRITE=true`, una contraseña de demo y `E2E_PORT=3001`. Nunca apuntar integración a `trazabilidad` ni a una base de demo/operación. Las variables de proceso prevalecen sobre `.env`.

```powershell
# En una terminal de pruebas, configurar DATABASE_URL a la base dedicada.
$env:TEST_ALLOW_DB_WRITE = 'true'
npm.cmd run test:integration
# Cambiar DATABASE_URL a la otra base dedicada antes del E2E:
npm.cmd run test:e2e
```

El E2E nativo inicia directamente un hijo Node y lo cierra por IPC al terminar. No requiere detener procesos manualmente ni reutiliza un servidor de otra sesión. La regresión `server-lifecycle.test.js` comprueba salida 0 y puerto liberado. Cerrar la terminal de pruebas para descartar sus variables temporales.

La CI ejecuta `verify` contra PostgreSQL real y otro job `compose` contra los contenedores, con pruebas UI y persistencia. Revisar conclusiones y SHA en Actions; los archivos YAML por sí solos no acreditan que CI haya pasado.

Este Compose es para demostración local con HTTP y `NODE_ENV=development`. La ejecución aislada del Dockerfile usa producción y requiere `APP_ORIGIN` HTTPS con terminación TLS; no se declara un despliegue productivo.
