# Ejecutar el prototipo académico de Acopio

Alcance: D1–D7 adoptadas por el usuario, sin validación agrícola ni aprobación docente. [Especificación y aceptación](../docs/03-diseno-de-software/04-especificacion-acopio-consolidacion.md), [ADR-011](../docs/02-arquitectura/08-decisiones-acopio.md), [C4 implementado](../docs/04-modelo-c4/modelo-c4.md).

## Preparación

Usar Node 24, PostgreSQL 18 y el lockfile existente. El [arranque Windows/Compose](arranque-windows.md) sigue vigente: setup conserva `.env`, migraciones se aplican en orden y seed no reemplaza cuentas existentes. El runner aplica 001 y 002 dentro de una transacción; una actualización no vuelve a ejecutar 001 ni elimina pre-lotes. No ejecutar down ni borrar volúmenes de la demostración.

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run migrate
# Solo demo ficticia, con ALLOW_DEMO_SEED=true y DEMO_PASSWORD local:
npm.cmd run seed
npm.cmd run build
npm.cmd start
```

El seed incorpora centros y concesiones ficticias explícitas. Reejecutarlo puede restablecer concesiones borradas de los fixtures; no es un administrador productivo de permisos. No versionar `.env` ni contraseñas generadas.

| Cuenta ficticia             | Centro             | Acciones                                                 |
| --------------------------- | ------------------ | -------------------------------------------------------- |
| `acopio@example.test`       | Norte              | Leer, recibir, confirmar y consolidar.                   |
| `responsable@example.test`  | Norte              | Leer y revisar discrepancias de otra persona.            |
| `acopio2@example.test`      | Sur                | Operaciones normales solo en Sur.                        |
| `doble@example.test`        | Norte              | Operaciones normales y revisión; no puede autoaprobarse. |
| `acopio-ajeno@example.test` | Organización ajena | Operaciones solo en su centro ajeno.                     |

Todas usan DEMO_PASSWORD de los fixtures locales. Los roles actuales no conceden Acopio por sí solos; las cuentas anteriores y sus operaciones permanecen vigentes.

## Recorrido

1. Capturar dos pre-lotes con el recolector, misma parcela/productor y fecha local en Lima; por ejemplo PA 100 kg y PB 40 kg.
2. Operario Norte: elegir centro y pre-lote. Registrar referencias distintas, evidencia, bruto/tara 105/5 y 42/2 kg. El neto se calcula exactamente; no se envía neto ni cantidades parciales.
3. Confirmar ambas recepciones. Seleccionar sus saldos completos y consolidar. Resultado: 140.000 kg, dos aportes con origen completo, pendiente de calidad y despacho no autorizado.
4. Si PA declara 100 y se reciben 98 kg, permanece pendiente de revisión. Otra persona autorizada registra motivo de aprobación; después el operario confirma y puede consolidar 98.000 kg. La declaración de 100 permanece intacta, sin merma inferida.
5. Recargar y consultar composición, eventos, revisión y saldo desde DB. Tras una respuesta perdida, reintentar la misma operación en el formulario conserva su clave. Tras conflicto concurrente, actualizar datos descarta selecciones ya consumidas.

## Comprobaciones

```powershell
npm.cmd run check
npm.cmd run format:check
npm.cmd test
npm.cmd run build
# DATABASE_URL dedicada, vacía o desechable; TEST_ALLOW_DB_WRITE=true:
npm.cmd run test:integration
# Otra DATABASE_URL dedicada, DEMO_PASSWORD y Chromium compatible con el lockfile:
npm.cmd run test:e2e
```

Integración incluye rollback real por fallo de eventos/auditoría, FK, estados, idempotencia y solicitudes simultáneas. E2E incluye dos contextos de navegador que intentan consumir el mismo saldo. El test down/up aplica 002.down antes de 001.down exclusivamente en la DB de integración.

La CI conserva `verify` y `compose`. Compose ejecuta los E2E contra app/DB reales y el auxiliar de reinicio conserva el volumen. Las capturas y logs publicables deben contener solo datos ficticios y rutas/credenciales saneadas. No se acredita calidad agrícola, aptitud productiva ni metas EQ no medidas.
