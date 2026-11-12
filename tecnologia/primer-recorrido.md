# Entorno del primer recorrido

Guía vigente para la entrega reproducible: [arranque Windows/Compose](arranque-windows.md), [C4 implementado](../docs/04-modelo-c4/modelo-c4.md) y [evidencias de cierre](../docs/05-sprint01/cierre-primer-recorrido.md).

El recorrido implementado y sus límites están en la [especificación](../docs/03-diseno-de-software/03-especificacion-primer-recorrido.md); el contrato está en [OpenAPI](../docs/03-diseno-de-software/openapi.json). Solo usar datos ficticios hasta ratificar permisos y reglas pendientes.

## Requisitos

Node.js 24, npm y PostgreSQL 18, o Docker con Compose v2. La aplicación sirve React compilado y API en el mismo origen. No se necesita Redis para este recorrido.

## Arranque con Docker

Desde la carpeta que contiene package.json:

```powershell
node scripts/setup-env.js
# Editar .env: POSTGRES_PASSWORD alfanumérica propia y DEMO_PASSWORD de >=12 caracteres.
docker compose up --build -d
docker compose exec app node scripts/seed.js
```

Abrir http://localhost:3000. Compose espera PostgreSQL y aplica migraciones antes de iniciar. Los datos quedan en el volumen pgdata. Este Compose es local: publica solo loopback, usa HTTP y cookies sin Secure. Dockerfile por separado usa NODE_ENV=production: requiere APP_ORIGIN HTTPS y proxy TLS. No usar el Compose de demostración como despliegue público. Los resultados actuales de esta variante se registran por separado en la evidencia de cierre.

```powershell
docker compose logs app
docker compose down
```

La segunda orden conserva el volumen. No se incluye una orden automática para destruir datos.

## Arranque con Node y PostgreSQL existentes

Crear una base vacía y un usuario con permisos DDL en ella, sin usar datos operativos. Copiar .env.example a .env, sustituir DATABASE_URL, DEMO_PASSWORD y APP_ORIGIN; configurar el mismo puerto/origen que se abrirá en navegador. Si la contraseña de PostgreSQL contiene caracteres reservados, codificarla en la URL.

```powershell
npm ci --ignore-scripts
npm run migrate
npm run seed
npm run build
npm start
```

La migración versionada es transaccional y repetible. El seed es repetible, conserva cuentas existentes y no cambia sus contraseñas. Requiere ALLOW_DEMO_SEED=true y se rechaza en producción.

Cuentas ficticias: admin@example.test (alta de productor/parcela), campo@example.test (captura en parcela asignada), otro@example.test (organización distinta) y lector@example.test (sin operaciones habilitadas). Todas usan el DEMO_PASSWORD elegido al crear el seed. No se incorpora una contraseña operativa al repositorio.

Para una demostración manual: administrador crea productor y parcela, cierra sesión; recolector ingresa, selecciona un origen asignado, registra fecha, cantidad y unidad, conserva el ID mostrado y recarga para consultar persistencia. El seed ya asigna Parcela demo Norte. Las parcelas nuevas necesitan asignación explícita, administrada por fixture SQL hasta desarrollar su UI:

```sql
INSERT INTO access.parcel_assignments(user_id,parcel_id,organization_id)
VALUES ('20000000-0000-4000-8000-000000000002', '<UUID de parcela nueva>',
        '10000000-0000-4000-8000-000000000001');
```

Esta preparación no equivale a conceder acceso global al recolector.

## Comprobaciones reproducibles

```powershell
npm run check
npm run format:check
npm test
npm audit --audit-level=high
npm run build
```

Integración usa una base dedicada y admite PostgreSQL nativo; prepara tablas/fixtures y modifica temporalmente constraints para probar rollback. Nunca apuntar estas pruebas a la base de operación.

```powershell
$env:DATABASE_URL = 'postgres://usuario:clave@localhost:5432/recorrido_test'
$env:TEST_ALLOW_DB_WRITE = 'true'
npm run test:integration
```

El test de integración verifica migración repetida, login, autorización, aislamiento, validación, idempotencia concurrente, conflicto, revocación, FK/CHECK, persistencia al recomponer backend, rollback y cierre de sesión. Dejar DB_MODE sin definir para PostgreSQL. Alternativa rápida aislada en memoria (PostgreSQL WASM; no verifica protocolo pg/red ni concurrencia nativa):

```powershell
$env:DB_MODE = 'pglite'
$env:TEST_ALLOW_DB_WRITE = 'true'
npm run test:integration
Remove-Item Env:DB_MODE
```

E2E necesita otra base dedicada, compilación web, contraseña ficticia y Chromium. Las variables de entorno prevalecen sobre .env:

```powershell
$env:DATABASE_URL = 'postgres://usuario:clave@localhost:5432/recorrido_e2e'
$env:TEST_ALLOW_DB_WRITE = 'true'
$env:DEMO_PASSWORD = 'Fiction-only-2026!'
npx playwright install chromium
npm run build
npm run test:e2e
```

Playwright inicia servidor propio, aplica migración/seed, crea origen desde UI, asigna mediante fixture SQL y captura como recolector. No mockea red/API/DB. Usa E2E_PORT si 3000 está ocupado. Si el sandbox impide descargar Chromium, PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH puede apuntar a un binario instalado compatible. Para un servidor ya iniciado deliberadamente, E2E_EXTERNAL_SERVER=true omite su creación; debe usar la misma DB y puerto. Los resultados/reportes se guardan en test-results y playwright-report. CI utiliza Chromium correspondiente a su versión de Playwright y PostgreSQL real.

## Migraciones y reversión

001_initial.up.sql crea schemas con propietarios lógicos y restricciones. 001_initial.down.sql contiene la reversión destructiva para una base desechable; no ejecutarla sobre datos a conservar. Para ensayar reversión, aplicar down y quitar la versión 001 de public.schema_migrations dentro de una transacción; volver a ejecutar npm run migrate. El script normal nunca ejecuta down ni borra datos automáticamente. Respaldar antes de una reversión real; respaldo/restauración operativos siguen pendientes.

## Implementación y fuentes

server/composition.js es el único ensamblador de adaptadores. application.js recibe puertos como objetos; repository.js implementa SQL propio. Cosecha recibe el contrato requireHarvestOrigin del módulo Productores; no importa su repositorio. La auditoría y el ámbito se exponen por Acceso. Todas las consultas de una unidad de trabajo usan la misma conexión.

Fuentes oficiales consultadas: [transacciones node-postgres](https://node-postgres.com/features/transactions), [seguridad Express](https://expressjs.com/en/advanced/best-practice-security/), [servidor E2E Playwright](https://playwright.dev/docs/test-webserver). Versiones exactas en package-lock.json.
