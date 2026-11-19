# Inventario, Reserva, Despacho y Entrega — implementación académica

Rama feat/inventario-despacho-entrega, [PR #7](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/7), **sin fusionar**. Base main 47d827c tras [PR #6](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/6), que corrigió fiabilidad y se comprobó después del merge. [Especificación adoptada](../03-diseno-de-software/07-especificacion-inventario-despacho-entrega.md), [ADR-014](../02-arquitectura/11-decisiones-inventario-despacho.md), [C4](../04-modelo-c4/modelo-c4.md), [OpenAPI](../03-diseno-de-software/openapi.json).

## Comportamiento y límites

D1=A–D9=A adoptadas por el usuario para el prototipo. Admisión única y explícita en cuarentena por total real/evidencia actual; liberación adicional tras closed/accepted; reserva visible sin TTL; transporte completo antes de salir; salida completa descuenta H una vez, entrega mueve T→E sin volver a descontar H. Cancelar antes de salida libera reserva atómicamente. Correcciones previas conservan motivo y antes/después; guías históricas únicas por organización/centro incluso tras corrección/cancelación. Es una regla de demostración, sin validez legal afirmada.

Empaque/pallets y QR por pallet, parciales, mezclas, expiración, traslados, devoluciones, conciliación y correcciones posteriores quedan pendientes. **RF-10 parcial**; no se simula empacado. Calidad/QR no autorizan salida por sí solos; muestra no descuenta kg. Sin pérdidas, conversiones ni movimientos históricos inventados. Transporte/destino/evidencias/actores internos no pasan a DTO/caché pública QR. Sin afirmaciones de rendimiento, aprobación docente ni validación agrícola.

G usa PostgreSQL y una conexión transaccional con permisos revalidados, clave por intención, bloqueo lote→entrada→despacho, versiones y hechos append-only. Inventario deriva A/H/R/U/T/E de movimientos exactos, no de contadores o Redis independientes. Migraciones 006/007 aditivas; 001–005 intactas y sin backfill. Las cuentas demo reciben concesiones explícitas, sin herencia de admin/Calidad/publicación.

## Evidencia por capacidad

| Capacidad | Evidencia reproducible |
| --- | --- |
| Cantidad real y conservación | [Unitarias](../../tests/unit/logistics.test.js); fixture 37.125 + 36.000 = 73.125 kg; adicionales 17.125 y 25.500 para cambio de formulario; ninguna constante de lote 1000 |
| Publicación/Calidad independientes | [HTTP/PostgreSQL](../../tests/integration/logistics.test.js): pending/draft/observed/rejected, accepted sin liberación, descarte 1/3 y DTO público sin transporte |
| Concurrencia | Barrera PostgreSQL: ambos comandos llegan al bloqueo antes de liberarlo; doble admisión/reserva/salida/entrega y cancelación contra salida, un ganador válido |
| Permisos y replay | Acción/organización/centro, revocación antes de replay, clave con otro cuerpo y prueba de cada concesión específica; administración/Calidad/QR sin herencia |
| Rollback | [42 escenarios de fallo real](../../tests/integration/logistics-rollback.test.js): operación, movimiento cuando corresponde, evento, audit y request; datos/versiones/kg/claves idénticos tras fallo |
| SQL e históricos | [CHECK/FK/UNIQUE/triggers](../../tests/integration/logistics-sql.test.js): masa/origen/identidad, inmutabilidad y 15 rechazos de transporte null/vacío/espacios; down/up en base desechable |
| Precisión temporal y guías | HTTP de límites de 1 ms y rechazo de precisión extra; guía G→G2 no permite reutilizar G por otro despacho; no truncamiento silencioso de instantes |
| UI | [Tres E2E](../../tests/e2e/logistics.spec.js): recorrido completo/replay de respuesta perdida, cancelación/otro centro y no arrastrar datos entre despachos de igual versión; móvil y Tab |
| Sensibilidad de pruebas | [Mutación de elegibilidad](evidence/logistics/mutation-eligibility-red.txt), [estado](evidence/logistics/mutation-state-red.txt), [masa](evidence/logistics/mutation-mass-red.txt), detectadas y restauradas; fuente final contrastada con Git |
| SonarCloud | [Revisión y justificaciones por clave](revision-sonar-logistica.md); BLOCKER del workflow diagnóstico retirado; complejidad JS y ocho S1192 corregidos; nueve repeticiones DDL permanecen abiertas y documentadas |
| CI/Compose | [Checks de corrección crítica](evidence/logistics/critical-after.json). El PR valida instalación, audit, formato, OpenAPI/imports/enlaces, unitarias, PostgreSQL, Redis real, build, Chromium y Compose. CI no equivale a CD |

[Captura móvil](evidence/logistics/inventory-delivery-mobile.png), [captura de escritorio](evidence/logistics/inventory-delivery.png), [resultado E2E local](evidence/logistics/e2e-green.txt), [110 resultados de integración en base nueva](evidence/logistics/integration-green.txt). Capturas/datos exclusivamente ficticios; tiempos de tests no se presentan como benchmark. Los conteos de cada cabeza se registran en evidencia JSON/CI, sin atribuirlos a otra revisión.

## Demostración sobre Compose preparado

Usar el entorno ficticio descrito en [primer recorrido](../../tecnologia/primer-recorrido.md), con .env configurado. No ejecutar seed/demo en producción. Desde la rama del PR:

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run setup:env
node --env-file=.env scripts/verify-compose.js --test
docker compose exec -T app node scripts/demo-logistics.js
```

El último comando crea **un lote ficticio nuevo** de 73.125 kg y su Calidad manual closed/accepted, pero no lo admite automáticamente. Ingresar como inventario@example.test con DEMO_PASSWORD de ese entorno; admitir con referencia/evidencia actuales y cantidad impresa, liberar, preparar, reservar, completar transporte, confirmar salida y entrega. Otro centro: inventario2@example.test; otra organización: inventario-ajeno@example.test. Las concesiones de cada cuenta están en [seed-logistics.js](../../scripts/seed-logistics.js).

Recorrido completo automático, también sobre hechos nuevos y sin transporte real:

```powershell
docker compose exec -T app node scripts/demo-logistics.js --complete
```

Imprime IDs, delivered, quantityKg=73.125, onHandKg=0.000, inTransitKg=0.000 y deliveredKg=73.125. **Cada invocación crea un lote nuevo**; no es un mecanismo para reintentar una operación manual previa ni para rellenar históricos. Dejar la demo existente intacta si se necesita preservar su escenario.

## Pruebas locales en bases nuevas desechables

Integración revierte migraciones: nunca apuntar DATABASE_URL a la demo ni a datos reales. Ejemplo PowerShell con contenedores nuevos exclusivamente de prueba; si esos nombres existen, usar otros, sin borrar contenedores/volúmenes existentes:

```powershell
docker run --name traza-logistics-tests -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test_local_only -e POSTGRES_DB=integration -p 127.0.0.1:55440:5432 -d postgres:18
$deadline=(Get-Date).AddSeconds(60)
do {
  docker exec traza-logistics-tests pg_isready -U test -d integration
  if ($LASTEXITCODE -eq 0) { break }
  if ((Get-Date) -ge $deadline) { throw 'PostgreSQL no disponible' }
  Start-Sleep -Milliseconds 500
} while ($true)
docker run --name traza-logistics-redis -p 127.0.0.1:56379:6379 -d redis:8-alpine
$env:DATABASE_URL='postgres://test:test_local_only@127.0.0.1:55440/integration'
$env:TEST_ALLOW_DB_WRITE='true'
$env:DEMO_PASSWORD='Fiction-only-2026!'
$env:REDIS_URL='redis://127.0.0.1:56379'
$env:E2E_PORT='3021'
$env:PUBLIC_BASE_URL='http://127.0.0.1:3021'
npm.cmd run format:check
npm.cmd run check
npm.cmd test
npm.cmd run test:redis
npm.cmd run test:integration
docker exec traza-logistics-tests psql -U test -d integration -c 'CREATE DATABASE e2e;'
$env:DATABASE_URL='postgres://test:test_local_only@127.0.0.1:55440/e2e'
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
docker stop traza-logistics-tests traza-logistics-redis
```

Usar una base nueva para cada ejecución completa; no reutilizar la base donde se ejecutó demo-logistics.js. Credenciales anteriores son solo de prueba; no reutilizarlas en despliegue. En Unix usar npm/npx y export con los mismos valores. E2E usa DB independiente y servidor de Logística aislado para conservar el límite de 20 accesos/15 min; no se desactiva ni aumenta el control.

Compose ejecuta las 13 pruebas anteriores contra el contenedor, reinicia solo app conservando DB y ejecuta las tres de Logística contra el mismo contenedor. Luego compara hechos/cantidades/guías antes y después de recrear servicios sin eliminar volúmenes:

```powershell
node --env-file=.env scripts/test-compose.js
node --env-file=.env scripts/verify-compose.js --test --restart
```

Estos son checks de CI y persistencia en entorno de prueba; no despliegue continuo ni medición k6, SLA, DNS/CDN u operación agrícola real. La [matriz](matriz-trabajo-final.md) sigue **provisional** porque el PDF oficial no está accesible; no se presenta como rúbrica definitiva.

La última ejecución completa local en base nueva aprobó 110 resultados, incluidos permisos por cada acción. Una ejecución previa reutilizó accidentalmente la base de la demo y falló en los conteos de aislamiento del primer recorrido; se conservó la salida diagnóstica local y se repitió en una base nueva, sin cambiar aserciones ni borrar datos. Los fixtures esperan como máximo 1 s a que el reloj local alcance createdAt de PostgreSQL antes de preparar carreras; no se relajan validaciones temporales ni barreras concurrentes.
