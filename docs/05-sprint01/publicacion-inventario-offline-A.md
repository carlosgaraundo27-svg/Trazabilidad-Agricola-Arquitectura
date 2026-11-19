# Publicación y checks por SHA — 2026-11-19

**Corte posterior:** [restauración existente revalidada con comparador limitado y evidencia nueva](revision-respaldo-check.md), [revisión A y recomendaciones atendidas](revision-offline-A.md). Los checks de la tabla inferior son los SHA publicados antes de esas correcciones; no se atribuyen a un nuevo HEAD. Los reportes originales de respaldo se conservan, y el resultado de revalidación independiente sustituye el pendiente de comparación descrito más abajo, sin certificar imagen/ACL.

Consulta de GitHub posterior a la publicación manual del propietario. No se reintentó autenticación Git local, no se cambió origin (bundle privado), ni se fusionó ningún PR. Referencias públicas verificadas mediante colección branches y metadatos/compare de PR; no confundirlas con refs/remotes/origin conservadas del respaldo.

| Línea | Cabeza publicada | Base del PR | Estado |
| --- | --- | --- | --- |
| [Inventario #7](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/7) | dd18ceddd185d72e32db7c5047e53bd5369434b7 | main47d827c | Abierto, sin fusionar |
| [Offline A #8](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/8) | ce9c3f68f43e435d0dc44c0e4f8f8148b54d54fc | feat/inventario-despacho-entrega en dd18ced | Creado en esta tarea, abierto, sin fusionar |

#8 contiene cuatro commits propios (d282d1b/25a2a81/9c9cb3c/ce9c3f6),25 archivos; compare remoto ahead4/behind0, merge-base=dd18ced. Archivos remotos coinciden con git diff local dd18ced..ce9c3f6: endpoint/servicio/contrato de recibos, migración008, pruebas y documentación de A. Inventario no incorpora008 ni módulos sync. No hay cambios de Android, Flutter, lockfile o CI en ese incremento. B sigue solo preparado, en [su contrato](preparacion-offline-B.md).

## Checks remotos actuales

| SHA | verify | Compose | Sonar |
| --- | --- | --- | --- |
| dd18ced | [Aprobado](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44562488137/job/135695247119) | [Aprobado](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44562488137/job/135695246322) | [Aprobado](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/runs/135695717284) |
| ce9c3f6 | [Aprobado](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44562937753/job/135696872314) | [Aprobado](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44562937753/job/135696871968) | [Aprobado](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/runs/135697325402) |

Ambos verify pasan audit completo, formato, contratos, unitarias, Redis, integración PostgreSQL, build y E2E; ambos Compose incluyen comprobación tras reinicio. No hay fallo actual que corregir en esas ejecuciones. El fallo de22c6e4f es histórico, no el resultado de dd18ced. Los números locales25/128/17 se conservan como evidencia local anterior; no se inventan conteos del log remoto. CI no es CD ni benchmark.

## Sonar pendiente, sin ocultarlo con el gate

En dd18ced, el check informa20 issues y0 aceptados. La [revisión por hallazgo](revision-pr7.md) conserva nueve S1192 críticos de mantenibilidad DDL, cinco recomendaciones VARCHAR2 de dialecto Oracle y seis await secuenciales justificados. No se modificaron migraciones001–007, Quality Gate, perfiles o exclusiones ni se aceptaron manualmente.

En ce9c3f6, el check de #8 informa **dos issues nuevos**,0 aceptados y0 hotspots; no significa que los20 heredados hayan desaparecido. Las dos anotaciones señalan server/modules/harvest/sync-domain.js:22 y recomiendan usar `\d` en lugar de `[0-9]`:

- [AaH0ksqFZIP8Y-tWH56o](https://sonarcloud.io/project/issues?id=carlosgaraundo27-svg_Trazabilidad-Agricola-Arquitectura&issues=AaH0ksqFZIP8Y-tWH56o&open=AaH0ksqFZIP8Y-tWH56o&pullRequest=8).
- [AaH0ksqFZIP8Y-tWH56p](https://sonarcloud.io/project/issues?id=carlosgaraundo27-svg_Trazabilidad-Agricola-Arquitectura&issues=AaH0ksqFZIP8Y-tWH56p&open=AaH0ksqFZIP8Y-tWH56p&pullRequest=8).

Se documentan abiertos; son recomendaciones de sintaxis, no un fallo de CI ni motivo para cambiar las aserciones de precisión decimal. No se modificó producción en esta revisión.

## Respaldo: evidencia encontrada, aceptación pendiente

Hay tres resultados privados bajo .local/reactivacion-C-20261118/datos-logicos_*:105222_69034b,110148_09ad23 y110301_aa555c del19nov. Los dos primeros declaran failed_validation. El último declara restored_and_verified **pero matchesSnapshot=false**: ese status no es válido como certificado.

Revisión offline de los tres: dump existe, tamaño151555bytes y SHA-256 coinciden con su propio manifiesto; cluster7707318725026357291; migraciones001–007 y foreignKeysValid=true, huérfanos0. Source/restored coinciden excepto constraints[119].definition: intake.receipt_temperatures.receipt_temperatures_value_c_check. La fuente representa `(A AND B) AND C` y la restauración `A AND B AND C`, con los mismos límites y escala. Es una diferencia de representación de agrupación; no se borran paréntesis globalmente ni se altera el reporte para convertir false en true.

El helper local tenía comentado el raise que impedía declarar éxito tras una discrepancia. Se preservó esa versión privada y se restauró la guarda original; regresión offline detecta el fallo anterior y comprueba que las tres combinaciones de discrepancia interrumpen la validación. No se ejecutó Docker, dump, restore, SQL ni el procedimiento de respaldo de nuevo. Los reportes/dumps permanecen intactos, fuera de Git.

**Estado:** existe dump y evidencia de restauración, pero respaldo **no aceptado como completo** por comparación estricta fallida y status inconsistente. Próximo paso de datos: revisar y probar explícitamente una comparación semántica de esa restricción contra la evidencia existente, conservar comparación cruda y generar un dictamen independiente; no repetir automáticamente el respaldo ni normalizar texto SQL de forma indiscriminada. Propietarios/ACL siguen fuera de la garantía del procedimiento. No usar login/recorrido para modificar la demo antes de cerrar este punto.
