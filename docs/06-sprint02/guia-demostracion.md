# Guía reproducible y demostración

## Qué puede ejecutarse en esta preparación

Todo parte de la raíz del repositorio. Código medido: `addab5f9101a5d6288fb325d1adda395553d967c`; comparar antes de reutilizar resultados en otra cabeza. El [manifiesto](evidence/addab5f9101a5d6288fb325d1adda395553d967c/verification.json) permite verificar hashes.

En Windows usar `npm.cmd` porque la política de PowerShell bloquea `npm.ps1`; no cambiar esa política. Las pruebas aisladas ya ejecutadas se reproducen con:

```powershell
node --version
npm.cmd run test:coverage
node --test --test-concurrency=1 tests/unit/*.test.js
npm.cmd run check
npm.cmd run format:check
```

No cargar `.env` para esas pruebas. `node scripts/sprint02/record-tests.js` las ejecuta secuencialmente, quita variables DB/Redis heredadas y escribe evidencia sanitizada nueva por SHA; los logs quedan en `.local/sprint02/<SHA>`. Si el formato local CRLF falla, conserva exit1 y añade diagnóstico `--end-of-line auto`; **no omite ni sustituye** el gate original. Los JSON de Jest con paths absolutos permanecen privados; el manifiesto publicado usa rutas relativas. El HTML está en `coverage/jest/index.html` y LCOV en `coverage/jest/lcov.info`. No versionar todo coverage.

No ejecutar en esta máquina `npm ci`, build, integración, E2E, Docker, Redis/k6, seeds/migraciones o herramientas Flutter/ADB mientras el ensayo pueda compartir recursos. CI ejecuta instalación/build/SQL/Redis/Playwright en runners ajenos; Flutter test se conserva y se ejecutará solo en SDK/runner independiente, sin seleccionar el dispositivo del ensayo. No iniciar los backends históricos Android.

## Laboratorio: exclusivamente otra máquina/runner

Las instrucciones siguientes son para Linux/Bash con Node24, npm, Docker Compose y k6 instalados. No se han ejecutado contra esta máquina. Usar el checkout del candidato en el runner, sin mover documentos históricos. Registrar SO, CPU/RAM/disco, versiones, SHA, digests de imágenes y fecha. Revisar que el runner no use teléfono, volúmenes, servicios ni backend del ensayo. Si no se puede garantizar, **posponer**.

```bash
git rev-parse HEAD
node --version
npm --version
docker compose version
k6 version
npm ci --ignore-scripts
npm run build
docker compose -f scripts/sprint02/compose.yaml up -d --wait db redis
export SPRINT02_INDEPENDENT_HOST=true
export SPRINT02_DATABASE_URL='postgres://sprint02:fiction_lab_only@127.0.0.1:55442/sprint02_lab'
export SPRINT02_REDIS_URL='redis://127.0.0.1:56382'
read -rs -p 'Contraseña ficticia nueva para las cuentas de este laboratorio: ' SPRINT02_DEMO_PASSWORD
export SPRINT02_DEMO_PASSWORD
export SPRINT02_LOTS=10
node scripts/sprint02/prepare-lab.js
node scripts/sprint02/analyze-postgres.js
```

La contraseña de PostgreSQL del Compose es ficción pública local, nunca reutilizarla. Elegir contraseña demo ficticia de al menos12 caracteres, conservarla solo en entorno privado y no en archivos entregables. El preparador exige base vacía: aplica migraciones actuales y semillas ficticias mediante servicios, crea10 publicaciones y4 despachos ROP y marcador sintético. No borra ni repara otra base; si falla, preservar log y revisar antes de reintentar. Aumentar escala requiere otra base/volumen de laboratorio autorizado y actualizar configuración/guardas en una revisión separada; no reutilizar datos de la demo o del ensayo. Los scripts actuales limitan el nombre/puerto para prevenir destinos accidentales.

Resultados no secretos en `.local/sprint02`: `lab-fixture.json` con IDs ficticios, `postgres-plans.json`, luego `cache-<modo>.json`, `k6-<etapa>.json`. Conservar logs de cada comando y su exit code, también si falla. Esos archivos no se suben automáticamente: revisar datos y copiar **solo resultados sintéticos sanitizados** a un directorio nuevo de evidencia por SHA/entorno. Nunca adjuntar bases, `.env`, cookie jars, tokens, certificados o archivos del teléfono.

Para planes comparables registrar estadísticas y repetir en mismo dataset/recursos. Se puede actualizar estadísticas **solo en este Compose del runner**:

```bash
docker compose -f scripts/sprint02/compose.yaml exec -T db psql -U sprint02 -d sprint02_lab -c 'ANALYZE;'
node scripts/sprint02/analyze-postgres.js
```

Guardar el primer JSON con nombre de corrida antes de repetir: los nombres simples son salida de trabajo, no historial de resultados. Leer [el protocolo de análisis](validacion-atributos.md) antes de interpretar planes o muestras.

## Redis real: cuatro condiciones

En ese mismo laboratorio externo, sin app/carga concurrente durante esta comparación:

```bash
SPRINT02_CACHE_MODE=none node scripts/sprint02/compare-cache.js
SPRINT02_CACHE_MODE=cold node scripts/sprint02/compare-cache.js
SPRINT02_CACHE_MODE=warm node scripts/sprint02/compare-cache.js
docker compose -f scripts/sprint02/compose.yaml stop redis
SPRINT02_CACHE_MODE=degraded node scripts/sprint02/compare-cache.js
docker compose -f scripts/sprint02/compose.yaml up -d redis
```

Repetir warm tras archivar su primer resultado para comprobar recuperación. El script exige Redis realmente inaccesible para degraded; no baja DB ni cambia controles. Cuenta SELECT del repositorio y observa 50 respuestas del caso de uso, no HTTP. Su guarda de base exige marcador sintético. No usar `FLUSHALL`, `down -v` ni comandos del Compose normal.

## Arranque funcional del candidato en runner

Después de preparar la base y construir web, en una terminal del runner:

```bash
NODE_ENV=development HOST=127.0.0.1 PORT=3302 \
APP_ORIGIN=http://127.0.0.1:3302 PUBLIC_BASE_URL=http://127.0.0.1:3302 \
DATABASE_URL="$SPRINT02_DATABASE_URL" REDIS_URL="$SPRINT02_REDIS_URL" \
node server/main.js
```

No usa `--env-file` ni cambia backend alguno existente. Abrir `http://127.0.0.1:3302` en el runner. El laboratorio usa HTTP loopback; **no es despliegue público, HTTPS móvil ni release**. Detener solo ese proceso al terminar, conservando volúmenes y resultados.

## API y visor del contrato

Contrato canónico: [OpenAPI](../03-diseno-de-software/openapi.json), OpenAPI3.1, validado por `npm run check`. Sus schemas y paths son la fuente de los ejemplos. No hay endpoint Swagger añadido al producto. Para visualizarlo, usar Swagger Editor/UI local compatible en el runner, cargando ese archivo en modo lectura; documentar versión/digest del visor. El servidor del contrato predetermina3000; las pruebas de abajo eligen explícitamente3302. No abrir CORS ni modificar APP_ORIGIN para hacer funcionar un visor en otro puerto; ejecutar solicitudes con cliente del laboratorio.

Demostración Node24, en otra terminal del **runner**, con la contraseña ficticia ya exportada. Solo imprime códigos/ID ficticio, mantiene cookie/CSRF en memoria. Las rutas/cuerpos provienen de `/auth/login`, `/pre-lots` y `/producers` del contrato:

```bash
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { labConfig } from './scripts/sprint02/lab-config.js';
import { ids } from './scripts/seed.js';
labConfig(process.env);
const base = 'http://127.0.0.1:3302';
const login = await fetch(base + '/api/v1/auth/login', {
  method: 'POST', signal: AbortSignal.timeout(5000),
  headers: { 'Content-Type': 'application/json', Origin: base },
  body: JSON.stringify({ email: 'campo@example.test', password: process.env.SPRINT02_DEMO_PASSWORD }),
});
assert.equal(login.status, 200);
const session = await login.json();
const cookie = login.headers.getSetCookie().map(v => v.split(';')[0]).join('; ');
const key = crypto.randomUUID();
const input = { parcelId: ids.parcel, harvestedAt: '2026-01-02T12:00:00Z', quantity: '12.125', unit: 'kg' };
async function post(route, body, requestKey = key) {
  return fetch(base + '/api/v1' + route, {
    method: 'POST', signal: AbortSignal.timeout(5000),
    headers: { 'Content-Type': 'application/json', Origin: base, Cookie: cookie,
      'X-CSRF-Token': session.csrfToken, 'Idempotency-Key': requestKey },
    body: JSON.stringify(body),
  });
}
const first = await post('/pre-lots', input);
assert.equal(first.status, 201);
const item = await first.json();
const replay = await post('/pre-lots', input);
assert.equal(replay.status, 200);
assert.equal((await replay.json()).id, item.id);
assert.equal((await post('/pre-lots', { ...input, quantity: '0' }, crypto.randomUUID())).status, 422);
assert.equal((await post('/pre-lots', { ...input, quantity: '12.126' })).status, 409);
assert.equal((await post('/producers', { name: 'Ficticio' })).status, 403);
console.log({ created: first.status, replay: replay.status, preLotId: item.id, validation: 422, conflict: 409, forbidden: 403 });
JS
```

No es un resultado ya ejecutado ni modifica la sesión del teléfono. Si no coincide, preservar status/código público y clasificar fallo; no cambiar regla o expectativa para aprobar. La matriz completa negativa incluye sesión expirada, org/centro y CSRF: [EQ-04](validacion-atributos.md).

## k6 en etapas con revisión

Con app3302 del runner activa, usar ID público de `lab-fixture.json`:

```bash
export SPRINT02_BASE_URL=http://127.0.0.1:3302
export SPRINT02_PUBLIC_ID=$(node --input-type=module -e "import fs from 'node:fs'; console.log(JSON.parse(fs.readFileSync('.local/sprint02/lab-fixture.json')).publications[0].publicId)")
export SPRINT02_SOURCE_SHA=$(git rev-parse HEAD)
SPRINT02_STAGE=smoke k6 run scripts/sprint02/qr-load.js
```

Inspeccionar resultado y recursos, esperar≥60s y solo después elegir la siguiente etapa: `SPRINT02_STAGE=10 k6 run scripts/sprint02/qr-load.js`. Repetir manualmente con50,100,250,500,1000,2000 según la [tabla de duraciones y paradas](validacion-atributos.md). No usar un bucle que ignore fallos y lance todas las etapas. Preservar resumen, exit code y gráficos/recursos del generador y servidor. El limitador de60/min/IP puede impedir avanzar; reportarlo como límite real, no desactivarlo. Etapa programada no equivale a usuarios concurrentes alcanzados ni a capacidad demostrada.

## Recorrido para exponer

| Paso | Qué mostrar con ficción | Qué observar / límite |
| --- | --- | --- |
| Origen | Productor/parcela y pre-lote | Relaciones, unidad, cantidad e ID; no certificación agrícola. |
| Acopio/Calidad | Recibir, revisar discrepancia, consolidar y cerrar evaluación manual | Origen intacto y bloqueo por originales faltantes; calidad no autoriza despacho por sí sola. |
| Logística | Admitir cantidad real→liberar→preparar→reservar→salir→entregar | A=H+T+E; entrega no descuenta otra vez; transporte interno fuera del QR. |
| QR | Publicado→consulta anónima→retirada | DTO limitado; retirada pese a caché; no mejora temporal sin medición. |
| ROP-01 | Centro/período y tránsito/entrega | UTC/cursor/permisos; consulta operativa, no Datamart. |
| Android | Documentos/resultados previos C/D | Captura durable y ACK único previos; **no manipular ensayo24h para grabar demo**. |
| Calidad de software | Matriz, HTML/LCOV y faltantes | Cobertura8,48 % backend; no presentar todos los EQ como aprobados. |

Guías históricas complementarias: [arranque](../../tecnologia/arranque-windows.md), [Acopio](../../tecnologia/acopio.md), [Calidad](../../tecnologia/calidad.md), [QR](../../tecnologia/publicacion-qr.md), [Inventario](../05-sprint01/inventario-implementacion.md), [Android B/C](../../clients/android_b/README.md). Son referencias de sus cortes; no ejecutar sus comandos contra el ensayo activo. El PDF Sprint2 no fija duración de exposición.
