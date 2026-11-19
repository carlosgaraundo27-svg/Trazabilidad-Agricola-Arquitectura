# Demo de Inventario desde la copia recuperada — 2026-11-18

**Actualización de operación:** traslado a D: pospuesto; continuar únicamente en C:. Ver [reactivación, respaldo pendiente y estado real del PR](reactivacion-demo-C.md). Las comprobaciones de esta guía son la ejecución previa; el acceso autenticado/replay no se repitieron antes del respaldo lógico. No repetir la preparación o seeds inferiores para reactivar la demo existente.

**Reconstrucción funcional con datos ficticios nuevos; no recuperación de registros anteriores de Inventario.** Base de código 22c6e4f, rama local `fix/demo-recuperada-inventario`. No se fusionó ni publicó el PR #7. No se ejecutó Flutter/Dart/SDK ni se implementó offline. Se preservaron originales y respaldos.

## Carpeta, URL y cuentas

Usar `RECUPERADO_20261117_213508/repos/repo-inventario`, no los worktrees originales. Demo local: **http://127.0.0.1:3026**. Base exclusiva `inventory_demo_20261118_151800`, migraciones **001–007**. El servidor queda iniciado para la demostración; la disponibilidad de localhost depende de este equipo y sus procesos, no es un despliegue público ni CD.

Cuenta ficticia: `inventario@example.test`. La contraseña generada está únicamente en `.local/demo-20261118_151800/credenciales-locales.txt`; configuración privada en `demo.env` del mismo directorio. No publicar esos archivos, trazas, cookies o dumps. No copiar credenciales al informe ni a GitHub.

Se usaron las migraciones, `seed.js`, `logistics-fixture.js` y `demo-logistics.js` existentes, sin cambiarlos. Hay dos lotes nuevos:

- **Para probar manualmente:** `a0f17541-cf2c-4016-9806-26c093c7520f`, **73.125 kg**, Calidad ficticia `closed/accepted`, todavía sin admisión.
- **Evidencia automatizada:** `6332692c-fa71-4410-acbb-4e4bc247de07`, despacho `e1dfe95e-9235-42da-9b41-5f66a99d6257`, ya entregado. No usarlo como candidato para volver a admitir o despachar.

73.125 kg procede de dos recepciones ficticias de 37.125 y 36.000 kg; no es una constante del sistema. La Calidad registrada por el fixture es una decisión ficticia explícita, sin aprobación docente ni validación agrícola. El descarte de la muestra no descontó kilos.

## Recorrido manual

1. Ingresar y elegir el centro ficticio Norte. En **Admitir un lote**, seleccionar el lote manual indicado, comprobar su cantidad real y completar **Peso verificado (kg)**, **Referencia de admisión** y **Evidencia de admisión**. Pulsar **Admitir en cuarentena**. Esperar confirmación; no crear una segunda admisión.
2. Consultar su inventario. Completar **Motivo de liberación** y pulsar **Liberar para logística**. La evaluación `closed/accepted` habilita solicitar esta operación; ni Calidad ni QR la ejecutan automáticamente.
3. Pulsar **Preparar despacho completo** y después **Reservar lote completo**. La reserva no vence automáticamente: baja disponibilidad, conserva stock físico y puede cancelarse antes de salir.
4. Completar **Referencia de guía**, **Vehículo**, **Placa**, **Chofer**, **Precinto** y **Destino**, con datos claramente ficticios. Guardar transporte con motivo de corrección. La guía es única por organización/centro en esta demostración; no es una regla legal validada. Confirmar la fecha de salida y pulsar **Confirmar salida**. El stock en centro se descuenta aquí una sola vez.
5. Completar cantidad total recibida, fecha posterior a salida y evidencia ficticia. Pulsar **Confirmar entrega total**. Verificar **Entregado**, stock en centro cero y total entregado igual a la cantidad real. La entrega baja tránsito; no vuelve a descontar stock en centro.

Para cancelación usar otro lote/despacho nuevo antes de salir; no cancelar el ejemplo ya entregado. Después de salida no hay edición ordinaria, cancelación ni devolución en este alcance. Pallets, parcialidades, devoluciones y correcciones posteriores siguen pendientes. El transporte no forma parte del DTO público QR.

## Cantidades verificadas y persistencia

Valores tomados de los eventos reales del lote automatizado, no movimientos fabricados para históricos:

| Evento | Stock en centro | Reservado | Disponible sin reserva | En tránsito | Entregado |
|---|---:|---:|---:|---:|---:|
| Admisión / liberación | 73.125 | 0.000 | 73.125 | 0.000 | 0.000 |
| Reserva | 73.125 | 73.125 | 0.000 | 0.000 | 0.000 |
| Salida | 0.000 | 0.000 | 0.000 | 73.125 | 0.000 |
| Entrega | 0.000 | 0.000 | 0.000 | 0.000 | 73.125 |

La entrega repetida con la clave original devolvió **200**. El mismo cuerpo con otra clave, después de entregar, devolvió **409**. Los hashes y conteos del ledger no cambiaron: una admisión, una reserva, una salida y una entrega. Se detuvo y reinició exclusivamente la aplicación en 3026; estado, eventos, movimientos, respuesta idempotente y cantidades coincidieron. **No se probó reinicio de PostgreSQL, contenedor ni Windows.** UI verificada a 390 y 1440 px.

[Evidencia resumida sin secretos](evidence/demo-recuperada-20261118/resultado.json). Logs, comparación detallada y capturas quedan privados bajo `.local/demo-20261118_151800/`.

Para volver a iniciar esta misma demo, desde la raíz del repositorio:

```powershell
& 'C:\Program Files\nodejs\node.exe' --env-file=.local/demo-20261118_151800/demo.env server/main.js
```

No iniciarlo dos veces sobre el puerto ocupado. No repetir seeds para comprobar persistencia. La preparación realizada una sola vez fue `runtime.mjs --prepare` (auxiliar privado que rechaza bases existentes), seguida de estos comandos existentes sobre la base nueva:

```powershell
& 'C:\Program Files\nodejs\node.exe' --env-file=.local/demo-20261118_151800/demo.env scripts/demo-logistics.js
& 'C:\Program Files\nodejs\node.exe' --env-file=.local/demo-20261118_151800/demo.env scripts/demo-logistics.js --complete
```

Cada invocación crea hechos nuevos. Para reconstruir en otra base elegir un nombre nuevo y configuración privada nueva antes de ejecutarlos; no apuntar a una base histórica ni a la demo 001. Los archivos SQL/seed versionados son la fuente reproducible del esquema y dataset; los datos de esta sesión no se suben a GitHub.

## Datos anteriores, Docker y próximo bloque manual

Consultas SQL de lectura identificaron la instancia Linux PostgreSQL 18.6 en `127.0.0.1:55433`, identificador `7707318725026357291`. `trazabilidad` conserva migración **001** y los dos pre-lotes históricos; no es una recuperación completa. Las bases `recovery_int_20261117_213508` y `recovery_e2e_20261117_213508` contienen pruebas ficticias de la recuperación del día 17, no una demo operativa anterior. No se reutilizaron. Los datos nativos antiguos no se arrancaron ni validaron.

Docker denegó acceso en **un único intento** del día 18. No se repitió ni se cambiaron permisos/políticas. No es posible confirmar desde esta sesión el contenedor o volumen real de Inventario, ni producir un dump con herramientas verificadas y probar su restauración. **Respaldo lógico y restauración siguen pendientes.** Crear la demo nueva no elimina esa brecha.

Pegar únicamente este bloque en PowerShell normal desde la carpeta del repositorio recuperado. No ejecutar un script PowerShell mediante cambios de ExecutionPolicy. Resultado esperado: firmas válidas, servidor Docker accesible y un único contenedor publicando 55433; después, nombre/montaje real e identidad de la instancia. Si falla, detenerse y conservar la salida.

```powershell
$ErrorActionPreference = 'Stop'
$Recovery = (Resolve-Path ..\..).Path
$Docker = "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe"
$Python = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
Get-AuthenticodeSignature -LiteralPath $Docker, $Python | Select-Object Path, Status
& $Docker version
if ($LASTEXITCODE -ne 0) { throw 'Docker inaccesible: detenerse; no cambiar permisos.' }
& $Docker ps --all --format '{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}'
& $Docker volume ls --format '{{.Name}}|{{.Driver}}'
$Live = @(& $Docker ps --format '{{json .}}' | ForEach-Object { $_ | ConvertFrom-Json })
$Db = @($Live | Where-Object { $_.Ports -match ':55433->5432/tcp' } | Select-Object -ExpandProperty Names)
if ($LASTEXITCODE -ne 0 -or $Db.Count -ne 1) { throw 'Contenedor no identificado de forma única; detenerse.' }
& $Docker inspect --format '{{json .Mounts}}' $Db[0]
& $Python "$Recovery\respaldar_restaurar_docker.py" --source-container $Db[0]
if ($LASTEXITCODE -ne 0) { throw 'Identidad/procedencia no verificada; detenerse.' }
& $Python "$Recovery\respaldar_restaurar_docker.py" --source-container $Db[0] --all-user-databases --execute
if ($LASTEXITCODE -ne 0) { throw 'Respaldo/restauración no aprobado: conservar archivos y error.' }
Get-ChildItem -LiteralPath $Recovery -Directory -Filter 'datos-logicos_*'
```

El procedimiento existente rechaza otra identidad de cluster, verifica la imagen oficial por digest y no descarga ni arranca imágenes. Toma un snapshot de lectura, escribe dumps binarios, crea **bases nuevas** de destino y compara migraciones, huellas de filas, constraints y huérfanos. Esperado al concluir: `restored_and_verified` en `resultado.json` para cada base seleccionada; si no aparece, no declarar restauración aprobada. No elimina contenedores/volúmenes ni sobrescribe bases. La prueba portable no valida equivalencia de propietarios/ACL. Dumps privados, fuera de GitHub.

## E2E y seguridad

Las trazas originales situaban el bloqueo en `page.goto(..., waitUntil: load)` del segundo contexto, antes de la operación de negocio. Un recurso de Kaspersky tardaba unos 18.3 s: pista compatible con demora, no causa única probada. Readiness por sí sola no bastó: se conservaron los tres fallos de ese primer intento.

La corrección carga en paralelo las precondiciones independientes de cada contexto y comprueba documento HTTP válido más UI visible. Acopio autentica la segunda sesión después de crear la recepción, manteniendo una lista fresca. Calidad conserva la carrera de creación. QR inicia desde una consulta anónima inexistente y captura todas sus peticiones antes de publicar, actualizar y retirar. Se conservan todas las aserciones originales, el anonimato, códigos 201/409, conflictos y cantidades; no se bloquean recursos externos ni se amplían timeouts. Una regresión con un recurso secundario controlado retenido falla con `load` y aprueba con readiness explícita.

Resultado actual: **4/4 enfocados, 17/17 E2E, 23/23 unitarias, 113/113 integración PostgreSQL**, formato, contratos y build aprobados. No es prueba nativa Android ni CD. Redis real/Compose no se reejecutaron con Docker inaccesible. Los límites/configuración y Quality Gate permanecen intactos.

El auxiliar que recoge la salida permite hasta 600 s al proceso completo para evitar el corte prematuro de 240 s observado en la revisión anterior. No modifica el límite de 30 s de cada test, las esperas de assertions ni los tiempos del workflow CI. La suite final completa terminó en 3.8 min.

La [advisory picomatch](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) fue retirada el 18 de noviembre de 2026; picomatch sigue en 4.0.7 y no hay versión parcheada publicada. El [comentario del mantenedor](https://github.com/micromatch/picomatch/pull/235#issuecomment-6315749381) cuestiona la clasificación y advierte sobre patrones no confiables. La auditoría **completa** actual devuelve cero hallazgos, sin cambiar package/lock, omitir dev, añadir overrides o excluir auditorías. Es un cambio de la fuente de advisories, no un parche nuestro ni garantía general de seguridad. El verify remoto histórico de PR7 no se convierte por ello en aprobado: no se publicó un nuevo commit ni se reejecutó CI aquí.

Los **20 avisos Sonar, nueve críticos de mantenibilidad DDL**, siguen abiertos y separados; no se reanalizaron ni se rebajaron gates. Antes de avanzar a offline faltan identificar/respaldar/restaurar los datos accesibles con resultado verificable y resolver las decisiones pendientes; no se ejecuta el SDK señalado.
