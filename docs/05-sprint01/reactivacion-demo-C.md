# Reactivación de la demo existente en C: — 2026-11-18

El traslado a D: queda pospuesto por decisión expresa. Carpeta **única de trabajo**: `C:\Users\leona\Documents\Proyect_Final_Arquitectura\RECUPERADO_20261117_213508\repos\repo-inventario`. Rama `fix/demo-recuperada-inventario`; HEAD verificado antes de actuar `0256966abc7d578464017dae7bb0e700653f4f1e`, limpio. Los commits posteriores de esta tarea solo documentan el estado; obtener su SHA con `git rev-parse HEAD`. No se reorganizaron carpetas. El kit `MIGRACION_D_20261118_215214` queda congelado: sus validaciones sobre el origen deberán revisarse cuando se retome el traslado, sin modificarlo ahora. Sus comprobaciones de D: no bloquean C:.

## Servicio y datos efectivos

Demo existente **ficticia**, no regenerada ni presentada como recuperación de datos anteriores: **http://127.0.0.1:3026**. Configuración privada preservada: `.local/demo-20261118_151800/demo.env`. Cuenta ficticia `inventario@example.test`; contraseña únicamente en `credenciales-locales.txt` del mismo directorio. No imprimir configuración, cookies, contraseñas o dumps ni añadirlos a Git.

SQL de solo lectura confirmó `inventory_demo_20261118_151800`, host `127.0.0.1:55433`, cluster PostgreSQL `7707318725026357291`, migraciones **001–007**, cuatro pre-lotes, dos lotes, una entrada, cuatro movimientos, un despacho y una entrega. `trazabilidad` con 001 y dos pre-lotes históricos sigue sin representar recuperación completa. No se arrancaron directorios físicos originales ni se recrearon bases, migraciones o seeds.

La aplicación se inició con la configuración existente, imponiéndola sobre variables heredadas para evitar apuntar a otra DB. `/health` y `/` devolvieron 200; `/api/v1/auth/me` sin sesión devolvió 401. Navegador anónimo: formulario de acceso visible a **390/1440 px**, sin desbordamiento. La espera inicial del auxiliar falló; la inspección mostró el formulario sin errores JavaScript. Se reutilizó `navigateReady` existente, sin modificar aserciones, límites o antivirus. No se atribuye la demora a Kaspersky.

Tras parar el proceso propio identificado por ejecutable/fecha y volver a iniciar **solo la aplicación**, coincidieron las huellas SHA-256 y conteos de **todas las tablas**, junto con el ledger. La primera consola del agente no admitía stdin; esa parada concreta fue abrupta. No se reiniciaron PostgreSQL, contenedores ni Windows. Una operación por tipo: admisión, reserva, salida y entrega, todas de **73.125 kg**. El stock entregado ya estaba persistido; no se volvió a descontar ni se enviaron mutaciones de negocio. Esto no sustituye una nueva prueba de replay autenticado.

**Límite actual:** falta respaldo lógico/restauración verificable. No se intentó login autenticado (crea sesión), replay HTTP, seeds ni pruebas que escriben DB antes de ese respaldo. Las pruebas autenticadas/17 E2E/113 integración/replay 200 y rechazo 409 de la guía anterior son evidencia previa del 18 de noviembre, distinta de las lecturas actuales. No se afirma que este login se haya probado de nuevo.

## Arranque y parada en C:

Desde PowerShell normal, un solo proceso, sin repetir seeds:

```powershell
Set-Location -LiteralPath 'C:\Users\leona\Documents\Proyect_Final_Arquitectura\RECUPERADO_20261117_213508\repos\repo-inventario'
& 'C:\Program Files\nodejs\node.exe' .local/reactivacion-C-20261118/servidor.mjs
```

El lanzador privado rechaza otro directorio, otra DB/origen/puerto y el puerto ocupado. No hace migraciones, seeds ni cambios de datos. Para detener una ejecución interactiva: **Ctrl+C**, o escribir `parar` y Enter en esa misma consola. Si el proceso lo mantiene el agente, detener esa ejecución concreta; no iniciar una segunda. La disponibilidad al terminar la sesión depende de la permanencia del proceso; comprobar `/health` antes de usarla.

## Único bloque para Docker y respaldo/restauración en PowerShell normal

El acceso Docker ya fue denegado en esta sesión; no se repitió el intento ni se cambiaron permisos. Tampoco se encontraron `pg_dump`, `pg_restore` o `psql` locales verificados disponibles en PATH. El nombre efectivo del contenedor/volumen sigue **sin verificar**. Ejecutar este bloque una vez desde PowerShell normal. Detiene únicamente el lanzador propio identificado si está activo; no detiene PostgreSQL ni Docker. Si cualquier guarda falla, conservar salida y no continuar con escrituras.

```powershell
$ErrorActionPreference = 'Stop'
$Root = 'C:\Users\leona\Documents\Proyect_Final_Arquitectura\RECUPERADO_20261117_213508\repos\repo-inventario'
Set-Location -LiteralPath $Root
$Out = Join-Path $Root '.local/reactivacion-C-20261118'
$Docker = "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe"
$Python = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
foreach ($Tool in @($Docker, $Python)) {
    if ((Get-AuthenticodeSignature -LiteralPath $Tool).Status -ne 'Valid') {
        throw 'Firma no válida; detenerse sin ejecutar la herramienta.'
    }
}
& $Docker version --format '{{json .Server}}'
if ($LASTEXITCODE -ne 0) { throw 'Docker denegado: conservar salida; no repetir ni cambiar permisos.' }
$Rows = @(& $Docker ps --format '{{json .}}' | ForEach-Object { $_ | ConvertFrom-Json })
if ($LASTEXITCODE -ne 0) { throw 'No se pudo inventariar Docker.' }
$Db = @($Rows | Where-Object { $_.Ports -match ':55433->5432/tcp' })
if ($Db.Count -ne 1) { throw 'Instancia no identificada de forma única; no adivinar.' }
& $Docker inspect --format '{{json .Mounts}}' $Db[0].Names
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron identificar mounts/volúmenes.' }
$LabelsJson = & $Docker inspect --format '{{json .Config.Labels}}' $Db[0].Names
if ($LASTEXITCODE -ne 0) { throw 'No se pudo identificar el proyecto Compose.' }
$Labels = $LabelsJson | ConvertFrom-Json
[ordered]@{
    project = $Labels.'com.docker.compose.project'
    service = $Labels.'com.docker.compose.service'
    workingDirectory = $Labels.'com.docker.compose.project.working_dir'
} | ConvertTo-Json
$State = Get-Content -Raw -Encoding UTF8 -LiteralPath "$Out\servidor.json" | ConvertFrom-Json
if ($State.root -ne $Root) { throw 'El recibo no pertenece a esta carpeta.' }
$App = Get-Process -Id $State.pid -ErrorAction SilentlyContinue
if ($App) {
    if ($App.Path -ne 'C:\Program Files\nodejs\node.exe' -or
        [Math]::Abs((([DateTimeOffset]::Parse($State.at)).LocalDateTime - $App.StartTime).TotalSeconds) -gt 10) {
        throw 'El PID pudo reutilizarse; no detenerlo.'
    }
    Stop-Process -Id $State.pid -ErrorAction Stop
    if (-not $App.WaitForExit(5000)) { throw 'La aplicación no terminó; no continuar.' }
}
$Probe = [Net.Sockets.TcpClient]::new()
try { $Probe.Connect('127.0.0.1', 3026); $Occupied = $true } catch { $Occupied = $false } finally { $Probe.Dispose() }
if ($Occupied) { throw '3026 sigue ocupado; identificar su proceso antes del respaldo.' }
& $Python "$Out\respaldar_restaurar_docker.py" --source-container $Db[0].Names --database inventory_demo_20261118_151800 --execute
if ($LASTEXITCODE -ne 0) { throw 'Respaldo/restauración no aprobado: preservar archivos y error; no regenerar datos.' }
Get-ChildItem -LiteralPath $Out -Directory -Filter 'datos-logicos_*' | Select-Object FullName
```

Resultados esperados: contenedor real publicando 55433, sus mounts y etiquetas Compose; imagen PostgreSQL verificada contra digest oficial y cluster esperado. Dump custom privado bajo `.local/reactivacion-C-20261118/datos-logicos_*`; restauración en una **base nueva** `recovery_restore_*`, sin sobrescribir ninguna fuente. `resultado.json` debe registrar `restored_and_verified`, `matchesSnapshot:true` y `foreignKeysValid:true` para la demo, con 001–007. Se comparan schema, filas/huellas, constraints y huérfanos; no se afirma equivalencia de propietarios/ACL. Si Docker vuelve a denegar acceso, no insistir; el respaldo queda pendiente.

No usar `compose up` para reparar la demo, ni mover almacenamiento Docker. Tras revisar el resultado real, volver a iniciar **la misma demo C:** con el comando anterior y su DB original, no con la restauración de prueba. Entonces ejecutar login/recorrido y replay de entrega sin regenerar fixtures. Conservar toda evidencia nueva separada de `.local/demo-20261118_151800/`.

## PR #7 e incorporación preparada, no publicada

Consulta remota actual: [PR #7](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/7) **abierto y sin fusionar**, cabeza `22c6e4f61bf2f575b0106af1d262a0b11de8c040`, rama `feat/inventario-despacho-entrega`, base main `47d827c`. Esa cabeza es antecesora del trabajo recuperado, sin divergencia al comparar.

Faltan allí `19b291d` (sincronización E2E y regresión de recurso secundario) y `0256966` (demo ficticia, evidencia y límites), además del commit documental de esta reactivación. Los dos primeros suman 12 archivos, +470/−33 líneas, sin cambiar código de producción, migraciones o dependencias. Incorporarlos por avance directo preserva ambos commits; no cherry-pick, squash, force push o merge del PR. El origin recuperado sigue siendo el bundle local de respaldo; **no ejecutar push sin remoto explícito**. Bundle y resumen de incorporación se conservan privados en `.local/reactivacion-C-20261118/`; no deben subirse.

Antes de publicar, consultar de nuevo la cabeza remota y exigir que siga siendo antecesora; si avanzó, conservar ambos historiales y revisar. Solo después se puede usar `git push` normal hacia la URL del repositorio y `HEAD:refs/heads/feat/inventario-despacho-entrega`, sin force. No se ejecutó push ni se modificó el PR en esta tarea. Comprobar verify/Compose/Sonar del SHA efectivamente publicado; no trasladar resultados de otro SHA.

Checks remotos consultados del **22c6e4f**: [verify falla en npm audit](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44193301118/job/134428054443), dejando los pasos posteriores omitidos; [Compose aprobado](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44193301118/job/134428054833). El análisis/comentario Sonar de esa cabeza indica gate aprobado con **20 avisos abiertos**, incluidos **nueve críticos DDL**, no resueltos ni aceptados por esta tarea. Ver [revisión por hallazgo](revision-pr7.md).

La advisory picomatch fue retirada según la evidencia oficial previa del 18 nov y la auditoría **completa** local de esa ejecución dio cero, sin parche ni cambio de lock. No se repitió instalación/auditoría sin cambios que lo justificaran; tampoco se convierte el fallo remoto histórico en verde. Auditoría de producción no sustituye completa. Sin exclusiones, gate reducido o pruebas debilitadas.

## Evidencia actual y pendientes de cierre

Actuales: **23/23 unitarias**, contratos/imports/OpenAPI/enlaces, formato y build aprobados; salud, acceso anónimo y persistencia de todas las tablas tras stop/start app. Evidencia privada en `.local/reactivacion-C-20261118/`: checks, snapshots de lectura, recibo de proceso, traza/capturas y estado remoto. Esos snapshots **no son respaldos lógicos**.

Pendientes antes del cierre: identificar volumen y verificar dump/restauración; probar acceso autenticado y replay sobre demo respaldada; publicar avances sin reescribir historial si se decide incorporarlos y comprobar CI del SHA final. Integración/17 E2E/Redis/Compose no se reejecutaron ahora; distinguir las ejecuciones previas. No hay despliegue público/CD ni rendimiento medido. RF-10 sigue parcial por empaque/pallets; parcialidades, devoluciones y correcciones posteriores se difieren. O1–O10 siguen propuestas sin implementar; sin aprobación docente/agrícola. No se ejecutó el SDK señalado ni se modificó el antivirus.
