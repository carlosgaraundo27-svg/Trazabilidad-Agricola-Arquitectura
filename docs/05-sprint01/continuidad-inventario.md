# Continuidad — Inventario, Reserva, Despacho y Entrega

## Estado vigente — revisión ROP y vulnerabilidad separada, 2026-11-19

Rama activa **fix/docker-ejecutable-confiable**, desde main18d57e9. [Corrección S4036](correccion-docker-path.md): resolver Docker por ruta fija/canónica y verificación de permisos, sin PATH/fallback.31 unitarias/check/formato locales aprobados; publicar como PR separado de ROP y comprobar su SHA. Main conserva123 avisos/una vulnerabilidad hasta integración autorizada y reanálisis, no se silencian hallazgos ni cambia el gate.

**ROP-01/#11** permanece abierto y sin fusionar. Referencia28962fe revisada: sin defecto funcional/seguridad nuevo;7 pruebas enfocadas aprobadas. Actualización documental5f738c8 conserva la lógica y corrige el pendiente Kaspersky; verify/Compose/Sonar de esa cabeza aprobados. Sus9 CODE_SMELL siguen documentados (8 await secuenciales del fixture y foco de tabla desplazable). [Revisión en su propia rama](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/blob/5f738c8/docs/05-sprint01/revision-rop01.md).

**CSV ya exportado y analizado:** original/copia privada y borrador para soporte conservados fuera de Git. El pendiente del incidente es **presentar el caso al soporte** y conservar identificador/dictamen. No volver a pedir exportación. No se publica contenido, rutas o hashes del informe privado.

**SDK independiente autorizado:** Flutter estable3.50.0/revisiónab291203 del catálogo oficial actual, ZIP SHA-256 verificado en carpeta de herramientas separada del proyecto y del SDK señalado. Misma revisión registrada en el incidente: no implica falso positivo o resolución. Kaspersky actualizado informa análisis ZIP terminado sin detecciones, con5 objetos protegidos por contraseña como límite. Instalación/inspección/análisis posteriores aún deben quedar verificados antes de ejecutar; B y pruebas Android pendientes, sin avance a C. Ver estado final del procedimiento privado y entrega antes de asumir herramientas habilitadas.

No se ejecutó Docker local, SDK señalado, restauración de cuarentena, modificación de políticas/exclusiones, demo001–007 o nuevas copias del repositorio. El servidor de desarrollo ROP se detuvo de forma identificada antes de cambiar de rama; no afirmar3041 activo desde esta rama de seguridad.

## Histórico — cierre #10 y ROP-01

## Estado vigente — diagnóstico Sonar, incidente Dart y reporte propuesto, 2026-11-19

La primera publicación de #10 (81b1482) aprobó verify/Compose/Sonar, pero dejó S2699 sobre la prueba hija: se añadió aserción explícita sin debilitar el timeout ni la validación. El detalle está en el diagnóstico; el estado final depende de los checks de la nueva cabeza, enlazados en #10.

Carpeta activa única en C:, rama fix/sonar-ci-y-enlaces desde main6f0294d. PR #7/#8 ya integrados; no se repitieron merges, recuperación o respaldo. Main mantiene verify/Compose/Sonar aprobados. #9 sigue abierto/en borrador en6e1642b y contiene la preparación documental de B, sin cliente ni validación Android. Su continuidad/matriz más reciente se revisó desde ese commit; esta rama de corrección parte de main y no incorpora por accidente el borrador #9.

**Sonar128:** [diagnóstico e inventario por regla/archivo/impacto](diagnostico-sonar-main-20261119.md). API devuelve144 registros:128 abiertos/16 FIXED. Los128 son98 heredados,20 del incremento Inventario y10 de A/herramientas;123 CODE_SMELL y5 VULNERABILITY,0 BUG abiertos. No REOPENED actual; reaperturas pasadas indeterminadas porque144 respuestas de historial públicas están vacías. No confundir totales de main con delta del PR ni inventar transiciones. Nueve críticos DDL siguen abiertos; no se reescribieron migraciones ni se aceptaron issues o cambiaron gates.

**Corrección publicada:** [PR #10](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/10), abierto para revisión y sin fusionar, base main. Commits fe65b30 (CLI local de Playwright 1.65.0 en dos pasos CI, cuatro avisos de seguridad) y c0936d2 (recorrido lineal de enlaces tras reproducir timeout con 200000 corchetes); diagnóstico documental en 0244a18. Las 28 unitarias, check y formato locales están aprobados. Los checks de la cabeza final se registran en el PR; consultar su SHA actual, sin trasladar el resultado de una cabeza anterior. Pendiente PATH de docker, de menor impacto, y el resto documentado. Main conserva sus 128 avisos mientras #10 permanezca sin fusionar. Antes del push se revisaron archivos privados y candidatos a secretos; .local, dumps y el paquete privado de soporte quedaron excluidos.

**Android:** [evidencia y candidato oficial](incidente-dart-y-alternativa.md). B sigue bloqueado. Borrador privado para soporte en .local/sonar-reportes-20261119/BORRADOR-SOPORTE-KASPERSKY.md, sin envío. ZIP Dart anterior rehash coincide; hash del ejecutable/evento/fecha exacta no disponibles. Candidato Flutter3.47.9/Dart3.13.7 con metadatos oficiales/engine distinto, HEAD200 y SHA esperado; no descargado/escaneado/ejecutado ni declarado limpio. No checksum como prueba de seguridad. Instrucción histórica cerrada: CSV ya exportado y analizado; pendiente presentar el caso al soporte; no restaurar cuarentena o cambiar protecciones.

**Reportes:** [ROP-01 propuesto](../03-diseno-de-software/12-primer-reporte-operativo.md): salidas/entregas por centro para encargado logístico con shipment:read, cantidades exactas y duración de hechos concluidos. Lectura operativa, no ETL/Datamart ni RF-12 completo. Sin fórmulas agrícolas, liquidaciones o reglas no acordadas implementadas.

Demo001–007 sin SQL, login, migrate/seed o reinicios. Sin ejecución SDK/antivirus alterado, D: o copias completas. Los bloques inferiores son históricos; las prohibiciones antiguas de merge no deshacen las integraciones ya autorizadas.

## Histórico — CHECK equivalente y restauración revalidada, 2026-11-19

Continuar en la única carpeta activa, rama feat/offline-servidor-recibos. Base publicada de esta revisión ce9c3f6; los commits nuevos de herramientas/recomendaciones/documentación avanzan A conservando su historia, sin mover Inventario de dd18ced ni fusionar PR. Origin sigue siendo el bundle privado: publicar solo hacia la URL GitHub explícita. HEAD final con git rev-parse HEAD; verificar los checks de ese SHA, sin trasladar el verde de ce9c3f6.

**Endurecimiento posterior:** Sonar de f18867c rechazó rutas/argumentos CLI de las herramientas nuevas. Se corrigieron con alcance .local, rechazo de enlaces/traversal y validación de identificadores junto al proceso; doce regresiones Python aprobadas. Nueva revalidación exit0 en .local/publicacion-20261119/revalidacion-1795106883086.json, sin mutaciones. No se debilitó el gate ni se aceptaron avisos para volver a verde; comprobar checks del commit que incorpora el endurecimiento.

El análisis de c53a7d5 confirmó resueltas las rutas y Session, pero exigió cerrar también los switches/SQL de run. Se reemplazó el reenvío genérico por reconstrucción desde una gramática fija por herramienta: sin flags de salida arbitrarios, SQLCLI libre, plantillas externas o snapshots malformados. Catorce regresiones Python cubren comandos válidos e inyección real; el fallo histórico se conserva y se verifica el SHA posterior, sin asumir verde.

**Prioridad datos resuelta en su alcance:** [definiciones completas, versiones, pruebas y límites](revision-respaldo-check.md). El CHECK numérico original/restaurado solo difiere en agrupación AND. PostgreSQL18.6 aislado:80 inserciones y27 casos ternarios equivalentes; un límite realmente cambiado se detecta. Comparador versionado permite únicamente las dos cadenas exactas para esa restricción/metadatos, sin omitir otros CHECK o diferencias. Nueve regresiones Python y CLI no-cero ante discrepancia; guardas de fallo e imagen oficial obligatorias. El helper privado anterior delega en la versión corregida, sin ejecutar un nuevo Docker/dump/restore.

**Evidencia nueva:** .local/publicacion-20261119/revalidacion-1795106369563.json, status restored_snapshot_verified, rawMatchesSnapshot=false, matchesSnapshot=true, foreignKeysValid=true,001–007, exit0. Capturada de ambas bases vivas en READ ONLY, UTF8 y visibilidad completa; filas/hashes/migraciones/FK de origen siguen iguales al snapshot conservado y dump SHA/tamaño coinciden. La primera comparación también rechazó el carácter U+FFFD en el CHECK de unidad del reporte antiguo; fallo conservado. El catálogo original/restaurado usa°C idéntico; no se añadió excepción Unicode. Los tres reportes/dumps viejos quedan intactos, incluido el éxito inconsistente. Datos de restauración comprobados; propietarios/ACL y procedencia de imagen antigua no acreditados por esa validación. No llamar completa una certificación que incluya esos ámbitos.

**Revisión #8:** [identidad, permiso antes del replay, inmutabilidad, concurrencia, conflictos y UoW](revision-offline-A.md). Quince resultados propios de A aprobados en DB nueva y26 unitarias generales. Dos recomendaciones de dígitos atendidas con `\d` equivalente, manteniendo `[1-9]` y precisión. Consultar Sonar del SHA final antes de declarar cerradas las anotaciones. Veinte avisos/nueve críticos DDL de #7 siguen abiertos. [PR #7](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/7) y [#8](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/8) se mantienen abiertos y sin fusionar; checks y SHA final se registran en la entrega y descripción del PR tras publicar.

Demo sin mutaciones: solo lecturas en transacciones read-only para la revalidación; pruebas y DDL en bases nuevas. Sin SDK, antivirus, D: o copias nuevas. [B diseñado, aún no implementado](preparacion-offline-B.md); incidente pendiente del dictamen del proveedor. Los bloques siguientes son históricos.

## Histórico — publicación confirmada y preparación B, 2026-11-19

Único repositorio activo: RECUPERADO_20261117_213508/repos/repo-inventario. Rama feat/offline-servidor-recibos; HEAD ce9c3f68f43e435d0dc44c0e4f8f8148b54d54fc. Esta revisión actualiza documentación local sin cambiar de rama ni alterar los SHA publicados. Origin sigue siendo el bundle privado; referencias GitHub comprobadas por API, no por refs/remotes/origin del respaldo. El índice LEER_PRIMERO.md es el corte anterior y enlaza aquí; este bloque sustituye su estado de publicación pendiente.

**Publicados y verificados:** [PR #7](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/7), cabeza dd18ceddd185d72e32db7c5047e53bd5369434b7, base main47d827c; [PR #8 de A](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/8), creado sin duplicación, cabeza ce9c3f6, base feat/inventario-despacho-entrega en dd18ced. Ambos abiertos, sin fusionar. Diff remoto de A:4 commits/25 archivos propios; no008 ni código sync en Inventario. Pruebas/servidor/contratos A y su documentación están separados de #7.

**Checks actuales por SHA:** verify/Compose/Sonar aprobados en ambos. El audit fallido de22c6e4f queda histórico. [Enlaces de los seis checks y avisos Sonar](publicacion-inventario-offline-A.md): #7 mantiene20 issues/0 aceptados, incluidos nueve críticos DDL; #8 informa dos recomendaciones nuevas sobre `[0-9]` frente a `\d`, abiertas y documentadas, no resueltas por aprobar el gate. No se rebajaron pruebas, gates, perfiles o exclusiones; no hubo fallo real actual de CI que corregir.

**Respaldo encontrado, no aceptado:** tres reportes en .local/reactivacion-C-20261118/datos-logicos_* del19nov. Dumps y SHA/tamaños comprobados offline, FK sin huérfanos y migraciones001–007. En todos matchesSnapshot=false por una única diferencia de agrupación AND en la definición de un CHECK de temperatura. El último status restored_and_verified contradice esa comparación: helper local tenía comentado el raise y sobreescribía el fallo con éxito. Se preservó el helper modificado y se restauró su guarda original, con regresión offline; reportes y dumps intactos. No repetir respaldo ni declarar completo. Próximo paso: dictamen de comparación semántica explícita de esa restricción con evidencia existente, sin alterar los campos crudos. Propietarios/ACL no verificados.

**B preparado, no implementado:** [contrato de sesión/vault/SQLite y NA-01–08/SB-01–06](preparacion-offline-B.md). Node24.16 y Python3.12.10 firmados válidos, SQLite stdlib3.49.1; Java26.0.1 firmado pero compatibilidad Android no probada. Flutter/Dart/adb/emulator ausentes de PATH; rutas habituales Android Studio/SDK ausentes. No ejecutar el SDK señalado. Exportación del evento ya cumplida; paso actual del propietario: presentar el caso con detección/origen al soporte; registrar dictamen antes de herramientas nuevas verificadas y smoke real Android. No restaurar cuarentena/excluir archivos ni cambiar antivirus. Diseño/contratos avanzan sin SDK; C/D siguen pendientes.

Demo001–007 intacta, sin SQL, login, seeds, migraciones, reinicios o procedimientos Docker nuevos. No mover a D:, crear clones ni fusionar PR. [Informe detallado de esta revisión](publicacion-inventario-offline-A.md). Las secciones siguientes se conservan como historia, no como estado actual.

## Histórico — espacio de trabajo identificado, 2026-11-19

**Única carpeta para abrir en Codex:** `C:\Users\leona\Documents\Proyect_Final_Arquitectura\RECUPERADO_20261117_213508\repos\repo-inventario`. Es un repositorio independiente: `.git` directorio, git-dir=common-dir propio, sin commondir externo/alternates. El workspace padre no tiene Git. Su `LEER_PRIMERO.md` es el índice local de carpetas y enlaza aquí; este bloque es el único procedimiento vigente. Los bloques inferiores quedan históricos.

**Rama activa:** feat/offline-servidor-recibos; HEAD recibido **9c9cb3c06f725ffcb5975d27d69777e0c29e53d2**, limpio antes de esta organización. Código A en d282d1b/25a2a81, documentación A en9c9cb3c; esta actualización solo añade documentación y se guarda aparte, sin cambiar de rama. HEAD documental actual: `git rev-parse HEAD`. Objetivo: verificar respaldo/restauración y publicar Inventario antes de Flutter, sin nuevos módulos.

### Relación real de ramas y publicación

| Línea | Referencia local observada | Publicación verificada el19nov |
| --- | --- | --- |
| main | **No hay rama local main**. refs/remotes/origin/main apunta a47d827c; es referencia conservada del bundle | main GitHub=**47d827c1ac2ae0fe3c8050279f5e0ecdcd562d05** |
| Inventario / #7 | feat/inventario-despacho-entrega y fix/demo-recuperada-inventario=**dd18ceddd185d72e32db7c5047e53bd5369434b7** | [PR #7](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/7) abierto, sin fusionar; rama remota aún=**22c6e4f61bf2f575b0106af1d262a0b11de8c040** |
| Offline A | feat/offline-servidor-recibos=9c9cb3c al inicio; tres commits de A después de dd18ced, más la organización documental actual | No apareció rama remota A en la consulta; publicación no realizada/verificada |

Relación de antecesores, sin merges nuevos:

```text
47d827c main publicado
  ... 22c6e4f PR #7 publicado
        19b291d -> 0256966 -> dd18ced Inventario local / demo recuperada
                              d282d1b -> 25a2a81 -> 9c9cb3c offline A local
                                                    + organización documental
```

Comprobación antes de esta edición: main→Inventario local0/19 de diferencia; Inventario→A0/3; main→A0/22. Cambian solo los conteos de A al añadir el commit documental. No es que A esté integrado en main o en #7. Los tres commits19b291d/0256966/dd18ced faltan en la cabeza publicada de #7. El origin **no apunta a GitHub**, sino a `C:\Users\leona\Documents\Proyect_Final_Arquitectura\RECUPERACION_20261117_211416\all-refs.bundle`; no hacer push/fetch/prune suponiendo un remoto público. El GitHub del proyecto es `https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura.git`. No se cambió configuración/remoto ni se repitió ningún push.

### Demo y datos: estado actual y pendientes

URL prevista **http://127.0.0.1:3026**. Windows netstat firmado no mostró entradas de3026/3037/3038/3001 en esta revisión; no se presenta como demo iniciada. Las sondas TCP cortas dieron10035/espera: por sí solas no certifican puerto libre. Un proceso Node observado no se atribuyó al proyecto ni se detuvo. No se cambió de rama ni se inició servidor, Docker, PostgreSQL o SDK.

Inventario usa **inventory_demo_20261118_151800**, migraciones **001–007**, configuración privada `.local/demo-20261118_151800/demo.env`. La contraseña está únicamente en su archivo privado local, nunca imprimirlo. A necesita **008** y una DB **nueva/aislada**: no usar demo.env, migrar la demo ni ejecutar seeds otra vez. Los directorios físicos PG18 de los originales se conservan sin arrancarlos. Proyecto/volumen efectivo Docker y dump/restauración siguen pendientes de evidencia nueva; no se ejecutó SQL o respaldo durante esta organización.

El [bloque PowerShell de respaldo existente](reactivacion-demo-C.md#único-bloque-para-docker-y-respaldorestauración-en-powershell-normal) y `.local/reactivacion-C-20261118/RESPALDAR_POWERSHELL_NORMAL.ps1` continúan conservados. Copiar su contenido en PowerShell normal, sin modificar ExecutionPolicy. Primero revisar si ya existe resultado del usuario; no repetir respaldos/intentonas a ciegas. Exigir dump privado, restauración en base nueva y `restored_and_verified`/comparación aprobada. Los resultados de lectura y las pruebas de A no sustituyen esa evidencia. No se recibió ni halló un resultado nuevo en la carpeta prevista.

### Cambiar entre Inventario y offline A

No cambiar archivos/rama debajo de un servidor activo, aunque solo parezca un cambio documental. **Primero detener únicamente la ejecución identificada de este repositorio** con Ctrl+C o `parar` en la consola del lanzador. No matar todos los node.exe ni PostgreSQL. Si no puede identificarse el proceso o puerto, detener el procedimiento; no forzar el switch. El estado Git limpio tampoco prueba que no haya servidor.

En la carpeta única, comprobar Git y puertos **antes de elegir una de las dos versiones**:

```powershell
Set-Location -LiteralPath 'C:\Users\leona\Documents\Proyect_Final_Arquitectura\RECUPERADO_20261117_213508\repos\repo-inventario'
git status --short --branch
if ($LASTEXITCODE -ne 0) { throw 'No continuar fuera del repositorio.' }
$Pending = @(git status --porcelain=v1 --untracked-files=normal)
if ($LASTEXITCODE -ne 0 -or $Pending.Count) { throw 'Conservar/revisar y guardar los cambios antes de cambiar de rama; no reset, clean o stash automático.' }
$Netstat = Join-Path $env:WINDIR 'System32\netstat.exe'
if ((Get-AuthenticodeSignature -LiteralPath $Netstat).Status -ne 'Valid') { throw 'Herramienta no verificada; detenerse.' }
$Tcp = @(& $Netstat -ano -p TCP)
if ($LASTEXITCODE -ne 0) { throw 'No se pudo comprobar la tabla TCP.' }
$Related = @($Tcp | Where-Object { $_ -match '^\s*TCP\s+\S+:(3026|3037|3038|3001)\s+' })
if ($Related.Count) { $Related; throw 'Hay entradas de puertos del proyecto: identificar estado/proceso y confirmar parada antes de continuar.' }
# Si se usó otro puerto, comprobarlo también y cerrar su servidor identificado.
git log -1 --oneline
```

Los archivos ignorados (`.local`, configuración, credenciales) no aparecen en ese status: conservarlos. No ponerlos en Git para conseguir árbol limpio. Si hay trabajo, guardar mediante commits revisados en su rama o acordar su conservación antes del cambio; nunca descartarlo automáticamente.

**Opción Inventario:** después de cumplir las comprobaciones, ejecutar solo este destino:

```powershell
git switch fix/demo-recuperada-inventario
if ($LASTEXITCODE -ne 0) { throw 'Switch rechazado; conservar todo y revisar.' }
git status --short --branch
git log -1 --oneline
# Esperado: dd18ced. Mismas fuentes que feat/inventario-despacho-entrega local.
& 'C:\Program Files\nodejs\node.exe' .local/reactivacion-C-20261118/servidor.mjs
```

No necesita008. Usa la demo ya existente001–007, sin seed/migrate. El lanzador rechaza otro directorio, DB o puerto ocupado. Parar con Ctrl+C o `parar` en esa misma consola. No ejecutar operaciones que escriben datos antes del respaldo verificable. La [guía funcional del recorrido](demo-inventario-recuperada.md) conserva los pasos; los resultados publicados allí son históricos.

**Opción A:** después de parar Inventario y repetir las comprobaciones, ejecutar solo este destino:

```powershell
git switch feat/offline-servidor-recibos
if ($LASTEXITCODE -ne 0) { throw 'Switch rechazado; conservar todo y revisar.' }
git status --short --branch
git log -1 --oneline
# No iniciar el lanzador demo.env bajo esta versión.
```

Elegir una DB NUEVA/aislada y configuración propia001–008 para probar A, con puerto distinto de3026. Seguir [reproducción y evidencia A](incremento-offline-A.md#reproducción-sin-tocar-datos-existentes), nunca reutilizar DATABASE_URL heredada de Inventario. No aplicar down de008 contra recibos aceptados ni conectar después la versión Inventario a esa base de A como si fuera su demo. No hay cliente Flutter/SQLite/outbox por este cambio de rama.

### Tres siguientes pasos y verificaciones de esta organización

1. Recibir/revisar el respaldo/restauración o, si no existe, ejecutar una vez el bloque preparado desde PowerShell normal, con la app identificada detenida; conservar salida y datos.
2. Publicar los tres commits de Inventario desde PowerShell normal con las credenciales del propietario, sin exponerlas. No repetir el fallo desde esta sesión ni publicar HEAD de A. Comando autorizado, condicionado a que el remoto no haya avanzado de forma divergente:

```powershell
git -c http.sslBackend=openssl push https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura.git dd18ced:refs/heads/feat/inventario-despacho-entrega
```

3. Verificar cabeza y verify/Compose/Sonar del SHA publicado, después login/recorrido/replay de demo respaldada y cierre de Inventario; revisar A como incremento dependiente. No fusionar #7. Fallo remoto histórico22c6e4f en audit≠auditoría completa local posterior0; no hay CI remoto de A. Los20 avisos Sonar/nueve críticos DDL siguen abiertos.

Esta tarea solo revisa metadatos, carpetas y documentación; no repite suites/build/audit, pushes, Docker o pruebas SQL. La evidencia anterior de A es25 unitarias/128 integración/17 E2E, no ejecución nueva. No se movieron carpetas/copias completas/volúmenes/SDK ni se cambió de rama. Originales, datos y kit D conservados. B–D siguen propuestos; no ejecutar el SDK detectado ni sus antiguos comandos de bootstrap. Sin aprobación docente/agrícola inferida.

## Histórico — servidor A separado y publicación bloqueada, 2026-11-19

Carpeta única conservada: `C:\Users\leona\Documents\Proyect_Final_Arquitectura\RECUPERADO_20261117_213508\repos\repo-inventario`. Rama activa **feat/offline-servidor-recibos**, base **dd18ced**, código en **d282d1b/25a2a81**; commit documental actual con `git rev-parse HEAD`. La rama local **feat/inventario-despacho-entrega** avanzó por comparación de referencia22c6e4f→dd18ced conservando19b291d/0256966/dd18ced; **fix/demo-recuperada-inventario** sigue en dd18ced. Sin force, squash, merge o cambio del origin/bundle. [Plan A–D](../03-diseno-de-software/10-plan-incrementos-offline.md), [implementación/evidencias/SDK](incremento-offline-A.md).

Publicación autorizada intentada y bloqueada: Schannel sin credenciales; OpenSSL, con TLS válido, no puede usar wincredman. No se cambió almacén/permisos/políticas. PR #7 consultado de nuevo: **abierto, sin fusionar, remoto22c6e4f**; verify histórico falla en audit, Compose histórico aprobado. Auditoría **completa actual dd18ced aprobada**, sin package/lock cambiados; no convierte CI remoto en verde. Comando de avance directo para PowerShell normal en la evidencia; no publicar A sobre la rama de #7. Faltan resultado de ese push y checks del SHA efectivamente publicado. Los20 avisos/nueve críticos DDL siguen abiertos, sin análisis de A remoto ni gate reducido.

Servidor A implementado/probado en DB **nuevas offline_a_***: PUT sync, canonización, recibo inmutable, dueño fijo y UoW compartida para alta/audit/recibo; revalida sesión/rol/asignación después de esperar identidad y antes de replay. Migración008 aditiva, sin backfill; down con recibos bloqueado. **25 unitarias,128 integración PostgreSQL y17 E2E**, formato/contratos/build aprobados. Pérdida real de respuesta postcommit, nuevo proceso Node, carreras y rollback incluidos. No equivale a Android/offline completo ni CD; B–D siguen planificados.

**Demo preservada, no migrada:** inventory_demo_20261118_151800 mantiene001–007 y huellas de todas las tablas iguales; ledger73.125kg sin doble descuento. Al leer estado final,3026 no respondía; no se arrancó ni regeneró la demo. Para operarla con su versión anterior: guardar/commit de trabajo, `git switch fix/demo-recuperada-inventario`, después `node .local/reactivacion-C-20261118/servidor.mjs`; Ctrl+C o `parar` detiene esa consola. No ejecutar migrate/seed del incremento A contra demo.env.

No se encontró resultado nuevo del respaldo/restauración en ubicaciones previstas ni se recibió ruta/salida del usuario: **pendiente de verificar**, no declarar que terminó. No repetir Docker denegado; bloque único anterior conservado. Capturas de lectura no son dumps. Flutter/Dart no están en PATH; dart.exe señalado sigue ausente. ZIP coincide con registro previo; HEAD oficial actual expone CRC32C, sin nueva comparación MD5 ni prueba de seguridad. No ejecutar/restaurar SDK o seguir sus antiguos comandos de bootstrap. D: pospuesto y kit intacto.

Siguiente: recibir/verificar backup/restauración y push normal de #7, comprobar CI de su SHA; después revisar A como rama dependiente. B requiere herramientas de procedencia verificable y NA-01–08 real en Android; no implementado. Sin aprobación docente/agrícola. Este bloque prevalece sobre estados actuales históricos inferiores.

## Histórico — continuar en C:, traslado pospuesto, 2026-11-18

Carpeta única: `C:\Users\leona\Documents\Proyect_Final_Arquitectura\RECUPERADO_20261117_213508\repos\repo-inventario`. Rama **fix/demo-recuperada-inventario**, HEAD al iniciar **0256966abc7d578464017dae7bb0e700653f4f1e**, limpio; los cambios nuevos de esta tarea son documentales y su SHA se obtiene con `git rev-parse HEAD`. Conservar originales/respaldos y el kit MIGRACION_D_20261118_215214 intactos. D: no se activa ni sus checks bloquean C:.

[Estado y único bloque PowerShell de respaldo](reactivacion-demo-C.md). Demo existente **http://127.0.0.1:3026**, configuración privada `.local/demo-20261118_151800/demo.env`, DB **inventory_demo_20261118_151800**, cluster **7707318725026357291** en 55433 y migraciones **001–007**. Sin seeds/migraciones nuevos. Iniciar desde la raíz con `node .local/reactivacion-C-20261118/servidor.mjs`; detener con Ctrl+C o `parar` en esa consola. No imprimir contraseñas ni iniciar dos servidores.

Comprobaciones **de esta reactivación**: salud/página200, me anónimo401, pantalla de acceso390/1440, huellas/conteos de todas las tablas iguales tras stop/start de solo la app; una admisión/reserva/salida/entrega de73.125kg, sin descuento adicional. 23 unitarias, check/formato/build aprobados. Primera parada propia abrupta por stdin cerrado; no se probó reinicio de DB/contenedor/Windows. El auxiliar visual inicial falló por codificación/espera; al usar navigateReady existente aprobó sin cambiar límites/aserciones. No se atribuye causa al antivirus.

**Respaldo lógico/restauración y volumen efectivo pendientes** por Docker denegado previamente, sin repetir el intento aquí ni cambiar permisos. Copia privada del helper existente bajo `.local/reactivacion-C-20261118/`, que escribe dumps/restauraciones nuevos sin tocar fuentes. Antes de login (crea sesión), replay o nuevas operaciones: ejecutar el bloque y revisar `restored_and_verified`. No se probaron ahora login autenticado, integración, E2E completos, Redis o Compose; los resultados 23/113/17 y replay200/nueva clave409 de la nota anterior son evidencia previa, no ejecución nueva. Las huellas no sustituyen un dump restaurable.

PR #7 consultado: **abierto, no fusionado**, cabeza **22c6e4f**, rama feat/inventario-despacho-entrega. Faltan allí **19b291d** y **0256966**, además de este estado documental; avance directo posible sin divergencia observada, preservando commits. Incorporación preparada localmente, **sin push**, sin cambiar origin (bundle local), sin force/merge. Verify remoto22c6e4f sigue fallido en audit, Compose aprobado; no atribuir verde remoto al audit local previo. Los **20 avisos Sonar/nueve críticos DDL siguen abiertos**. No se repitió instalación/auditoría sin cambios; retirada de advisory documentada previamente no es parche nuestro.

Siguiente tarea ejecutable: respaldo/restauración de la demo, login/replay con evidencia nueva, incorporación/publicación y checks del SHA final antes de evaluar cierre. O1–O10 siguen pendientes según la sección final de la especificación; no ejecutar Flutter/Dart/SDK, implementar offline ni fusionar PR. Este bloque sustituye afirmaciones de estado actual inferiores; conserva su historia.

## Histórico — demo reconstruida y E2E, 2026-11-18

Continuar en la copia RECUPERADO_20261117_213508/repos/repo-inventario, rama local fix/demo-recuperada-inventario, base 22c6e4f; no usar originales para cambios nuevos. [Guía](demo-inventario-recuperada.md), [evidencia](evidence/demo-recuperada-20261118/resultado.json), matriz actualizada con los 16 criterios transcritos; PDF/SDD sin resolver. Este estado sustituye las afirmaciones de estado actual de las notas históricas inferiores.

Demo **NUEVA FICTICIA**, no recuperación de datos anteriores: http://127.0.0.1:3026, DB inventory_demo_20261118_151800, migraciones001–007. Cuenta inventario@example.test; contraseña solo en .local/demo-20261118_151800/credenciales-locales.txt. Hay lote de 73.125 kg aprobado ficticiamente y sin admisión para recorrido manual, más lote automatizado entregado. Scripts/seed/fixtures existentes sin cambios. Entrega replay 200, nueva clave 409, ledger sin cambios y una sola salida/entrega; persistencia tras stop/start de la **app**, no DB/contenedor/Windows. UI 390/1440 comprobada. No repetir seeds para comprobar persistencia.

SQL 55433 identifica trazabilidad 001/dos pre-lotes y bases recovery_* de pruebas del 17 nov; no prueba demo anterior de Inventario. Nativas/respaldos físicos no arrancados. Docker denegó acceso en **un intento**; no repetir desde esta sesión ni cambiar permisos/políticas. Identidad del volumen, dump lógico/restauración pendientes: pegar el único bloque de PowerShell normal de la guía. No sustituir ese resultado por el nuevo fixture ni por integración aprobada.

Checks del 18 nov: 23 unitarias, 113 integración en DB inventory_int_20261118_151800,4 enfocados y17 E2E completos, formato/check/build aprobados. Se reprodujeron tres timeouts de navegación; readiness sola no bastó. Cambio final: preparar contextos independientes en paralelo y esperar documento/UI sin recursos secundarios; todas las aserciones y límites originales conservados. Regresión nueva de recurso retenido roja con load, verde con commit+UI. No se bloqueó Kaspersky ni se confirma causa única a partir de su demora de 18.3 s.

GHSA-fc5q-39xc-vjpf retirada oficialmente el 18 nov; registry latest 4.0.7 sin release parcheado. Auditoría **completa** exit 0/cero hallazgos con package/lock intactos; retiro de advisory, no parche nuestro ni certificación de ausencia de riesgo. Mantener patrones confiables. No afirmar verde remoto sin nueva ejecución. Los 20 avisos Sonar/nueve DDL siguen abiertos, sin gate/perfil/exclusiones modificados. Fuente y detalle en revision-picomatch.md.

No ejecutar Flutter/Dart/SDK ni diagnose-android.js. O1–O10 siguen propuestas, sin implementación. Sin publicación/merge de PR #7. Antes de offline: respaldo/restauración verificable y decisiones pendientes. CI no es CD, caché no rendimiento medido; pallets/parcialidades/devoluciones/correcciones posteriores continúan diferidos. Sin aprobación docente/agrícola.


Estado documental vigente 2026-11-17: matriz actualizada con los 16 criterios transcritos por el estudiante, pendiente de cotejo PDF y significado docente de SDD; ver última sección. O1–O10 pendientes, PR #7 sin fusionar. Las notas fechadas antes se conservan como historial.

2026-11-16. Rama feat/inventario-despacho-entrega, [PR #7 abierto, sin fusionar](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/7). Base main **47d827c1ac2ae0fe3c8050279f5e0ecdcd562d05**: PR #6 corrigió los ocho defectos de fiabilidad y fue integrado conservando commits; verify/compose/SonarCloud de ese main aprobaron. [Revisión](revision-sonar-main.md), [checks posteriores al merge](evidence/sonar-main/after.json). Las notas anteriores sobre main rojo quedan sustituidas por esa comprobación, sin modificar el gate.

D1=A–D9=A **adoptadas** para el prototipo académico con las precisiones del usuario. [Especificación](../03-diseno-de-software/07-especificacion-inventario-despacho-entrega.md), [ADR-014](../02-arquitectura/11-decisiones-inventario-despacho.md), [implementación/comandos/evidencias](inventario-implementacion.md). La rama documental e2fe6df se incorporó conservando historia. PR #7 implementa G, UI, contratos, migraciones aditivas 006/007 y pruebas; no atribuirlo a main mientras siga abierto.

Admisión única explícita en cuarentena por cantidad real/evidencia actual; Calidad closed/accepted habilita solicitar liberación logística, sin liberar ni despachar automáticamente. Reserva de lote completo sin TTL reduce disponibilidad; salida H→T una sola vez; entrega T→E sin segundo descuento de H. Cancelación previa libera R atómicamente. Transporte completo antes de salir; guías históricas únicas por organización/centro, solo regla de demostración. Correcciones previas auditadas; edición ordinaria/cancelación/devolución posterior bloqueadas. RF-10 parcial, sin empaque simulado. Transporte fuera del DTO/caché QR.

No inventar pérdidas, conversiones ni movimientos históricos. La muestra no reduce inventario. Cantidades exactas en milésimas; fixture 37.125+36.000=73.125 kg, nunca un lote fijo de 1000 kg. Permisos por acción/organización/centro revalidados antes del replay; transacción única para operación, movimiento, evento, audit y clave. Bloqueos lote→entrada→despacho y versiones. Sin aprobación docente, validación agrícola ni mejora de rendimiento afirmada.

Revisión de HEAD y .local/inventory-export.json: el export publica objetos Git; se verificaron árboles/commits. [Triage](revision-sonar-logistica.md): retirado workflow diagnóstico inseguro, corregidos defectos JavaScript y ocho repeticiones SQL aplicables. En 4453ec7 verify/compose/SonarCloud aprobaron; **20 advertencias abiertas**, incluidas **nueve S1192 críticas de mantenibilidad DDL**, cinco VARCHAR2 de dialecto Oracle y seis await secuenciales justificados. Sin BUG/VULNERABILITY ni issues aceptadas en esa evidencia. Las nueve DDL siguen como deuda abierta, sin declararlas falsos positivos ni ocultarlas. [Resultado por SHA](evidence/logistics/critical-after.json). Consultar los checks de la cabeza final por separado en PR #7.

Pruebas: PostgreSQL real, barreras concurrentes, cada permiso, 42 fallos reales de rollback, guías históricas, precisión de 1 ms, tres E2E logísticos y 13 previos, Redis real en CI, reinicio Compose preservando hechos/cantidades. Mutaciones de elegibilidad/estado/masa detectadas y restauradas. No reducir límites de acceso ni aserciones. Los tiempos de pruebas no son benchmarks.

Pendientes: pallets/empaque con composición/origen, parcialidades, devoluciones, correcciones posteriores, traslados y conciliación requieren decisiones nuevas. Offline, reportes/ETL/Datamart, CD persistente, escala medida, k6, DNS/CDN, informe y presentación conservan pendientes propios. CI no equivale a CD; caché funcional no demuestra rendimiento.

**PDF oficial de los 16 criterios no accesible**. La [matriz P01–P16](matriz-trabajo-final.md) sigue provisional, sin títulos/ponderaciones oficiales ni nota inventada. Al obtener el PDF, sustituir correspondencia por sus criterios literales conservando evidencia.

Integración local solo en bases nuevas del cluster exclusivo .acopio-runtime puerto 55434. La suite revierte migraciones: nunca demo/datos reales. Conservar evidencia/bases y detener únicamente ese cluster al finalizar. La demo crea hechos ficticios nuevos y requiere ALLOW_DEMO_SEED=true fuera de producción; no rellena históricos. Mantener PR #7 abierto sin merge.

## Revisión adicional y siguiente incremento — 2026-11-16

[Revisión por clave de los 20 avisos](revision-pr7.md): nueve S1192 DDL documentados individualmente, cinco VARCHAR2 no aplicables a PostgreSQL y seis await secuenciales justificados. No se cambian 001–007, gate, perfiles, exclusiones ni aceptación manual. Nuevas pruebas de cancelación draft sin movimiento y lectura de detalle/historia con barrera contra salida; mutación de FOR SHARE detectada/restaurada. El dictamen y checks de cabeza final constan en PR #7, que permanece sin fusionar.

[Especificación offline](../03-diseno-de-software/08-especificacion-offline-cosecha.md) y ADR-015 son propuestas sin código; O1–O10 requieren respuesta. Flutter aún no existe; recomendación Android+SQLite no cambia la referencia móvil ni adopta PWA. PDF oficial no accesible en esta sesión; ruta/enlace solicitados, matriz con columnas implementado/probado/despliegue/pendiente sigue provisional.

## Matriz con transcripción y decisiones offline — 2026-11-17

La [matriz](matriz-trabajo-final.md) ya utiliza exactamente los 16 criterios transcritos por el estudiante, con fuente “transcripción proporcionada por el estudiante; pendiente de cotejar con el PDF original”. Sustituye P01–P16 provisionales, conserva las carpetas y no afirma lectura del PDF/aprobación docente/ponderaciones. Cada criterio tiene alcance, estado cumplido/parcial/pendiente, evidencia, brecha/tarea y separación implementado/probado/despliegue. SDD queda pendiente de aclaración con la docente.

Se revisaron esquema, migraciones/seed/fixtures ficticios, comandos reproducibles y exclusión de secretos/datos personales para GitHub. Caché funcional no equivale a rendimiento medido y CI no acredita CD. Los 20 avisos Sonar, incluidos nueve críticos DDL, siguen documentados abiertos; no se alteran gate, pruebas ni migraciones.

La [propuesta offline](../03-diseno-de-software/08-especificacion-offline-cosecha.md) añade O1–O10 como pregunta/recomendación/consecuencia/dependencia y preparación Android. No hay cliente Flutter versionado; flutter/adb/emulator no encontrados en PATH de esta sesión, sin afirmar inexistencia de SDK fuera de PATH. No se instala ni implementa nada offline. PR #7 permanece sin fusionar. Orden siguiente: PDF/SDD → decisiones offline → entorno persistente/DNS-CDN/CD → k6/medición/escala → informe/presentación.

### Bloqueo de auditoría descubierto al publicar la matriz

En a1ec289 verify falló en npm audit por GHSA-fc5q-39xc-vjpf, picomatch@4.0.7 en Vite/tinyglobby/fdir; tests de verify omitidos por el fallo previo. Advisory actualizada 2026-11-17, sin versión corregida indicada en la consulta. Compose y SonarCloud sí aprobaron. Los resultados 23/113/2/16 son de f8b386f, no del verify fallido. Los 20 avisos/nueve DDL permanecen aparte. PR #7 sin fusionar y bloqueado para integrar mientras audit falle. Documentado en matriz; no se cambian dependencias, gate ni pruebas en esta tarea. Priorizar triage/parche compatible en incremento específico antes de integrar.

## Diagnóstico picomatch y propuesta concreta offline — 2026-11-17

[Revisión de seguridad](revision-picomatch.md): GHSA-fc5q-39xc-vjpf/CVE-2026-112366, <=4.0.7; ningún release corregido publicado. Vite 8.3.8/tinyglobby 0.2.17/fdir 6.5.0 ya son latest y siguen introduciéndolo. Clasificación dev/build, no runtime Express final omit=dev; esto no resuelve audit completo. npm ci y revalidación del lockfile por npm exit 0 con hashes package/lock idénticos; auditfull exit 1 (4 high en misma cadena), auditprod diagnóstico exit 0; 23 unitarias/formato/check/build aprobados. No cambios de dependencias/override/QualityGate/migraciones/pruebas. Verify y PR #7 siguen bloqueados; consultar checks del SHA documental final en PR. No fusionar. Los 20 avisos/nueve críticos DDL permanecen separados y abiertos.

La [propuesta O1–O10](../03-diseno-de-software/08-especificacion-offline-cosecha.md) ahora es concreta para aprobar: Flutter Android + SQLite; O5 habilitación local 24 h/campos mínimos y continuidad del mismo boot (reboot sin red conserva previos pero bloquea nuevas confirmaciones hasta validar online); O6 cookie 8 h/jar seguro+CSRF, sin refresh, prueba nativa NA-01–08 solo diseñada por falta de SDK/proyecto; O7 mismo ID/cuerpo inmutable y replay PUT, sin sustituir tras intento; O8 inicial + 5 reintentos y pausa respetando Retry-After; O9 espacios por organización/actor, logout offline no afirma revocación remota y nunca borra cola ni deja B enviar A. Valores pendientes de aceptación académica, nada offline implementado.
