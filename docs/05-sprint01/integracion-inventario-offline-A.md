# Integración de Inventario y A — 2026-11-19

Se comprobaron cabezas exactas dd18ced y5cef72e, diffs, tres checks aprobados por cabeza y ausencia de revisiones bloqueantes/hilos pendientes. Autorización del propietario condicionada a esos resultados. No se usó bypass, squash, rebase, force push ni se borraron ramas.

| Integración | Merge en main | Padres |
| --- | --- | --- |
| [PR #7](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/7) | [c8676b695ee64dcca1044104a5935bbf908c6dfe](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/commit/c8676b695ee64dcca1044104a5935bbf908c6dfe) | main47d827c y cabeza dd18ced |
| [PR #8](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/8) | [6f0294d52fe63fac2ab855e1b129688b4c844186](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/commit/6f0294d52fe63fac2ab855e1b129688b4c844186) | merge c8676b6 y cabeza5cef72e |

Se integró primero #7 y se exigió verde de mainc8676b6. Luego se cambió la base de #8 a main: merge-base dd18ced,41 archivos solo de A, sus herramientas/correcciones y documentación. No reaparecen los82 archivos del incremento Inventario como otro incremento de #8. La cabeza comprobada5cef72e no cambió. Evidencia Git: tree(c8676b6)=tree(dd18ced)=cf73e5f3711b0fe082d1fdc133d37b009143d7a1 y tree(6f0294d)=tree(5cef72e)=17dd2d0ededafb7d974fa6c2ca5d52e360d6ca5d. No hubo resolución de contenido sin probar; se comprobaron además los jobs push de cada merge real. Todos los commits se conservan como antecesores de main.

## Checks de main después de cada merge

| SHA de main | verify | Compose | Sonar |
| --- | --- | --- | --- |
| c8676b6 | [Aprobado](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44573804897/job/135735717142) | [Aprobado](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44573804897/job/135735719431) | [Aprobado](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/runs/135736151508) |
| 6f0294d | [Aprobado](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44574847318/job/135739437904) | [Aprobado](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44574847318/job/135739438939) | [Aprobado](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/runs/135740199933) |

Son ejecuciones push de esos SHA, no una auditoría local ni el fallo histórico22c6e4f. CI sigue sin acreditar CD o despliegue persistente.

## Deuda Sonar conservada

Los checks de main informan **118 issues** después de #7 y **128** después de #8,0 aceptados y0 hotspots en ambos reportes. Es el ámbito/período de código nuevo de main; no se confunde con los deltas20 de #7 y10 de #8. Aprobar el Quality Gate no resuelve esos avisos.

Se conservan los [nueve críticos DDL y demás avisos de Inventario](revision-pr7.md). El corte5cef72e conserva diez de A/herramientas: cuatro await secuenciales de la sonda transaccional, tres clases regex Python ASCII, dos literales repetidos de la gramática y uno de claridad del test. Claves/justificación en la descripción de #8. Las dos recomendaciones originales de dígitos ECMAScript se atendieron; los fallos de seguridad se corrigieron sin aceptar issues ni cambiar gates/exclusiones. No se afirma haber triado o resuelto globalmente los128 de main.

## Datos y demo

No se ejecutó Docker, SQL, migración, seed, login, reinicio o cambio de configuración de la demo durante la integración. inventory_demo_20261118_151800 conserva001–007; **merge de código no autoriza008 allí**. Para operarla seguir la versión conservada fix/demo-recuperada-inventario/dd18ced y su guía, con un solo proceso identificado. No lanzar el código nuevo para migrar/regenerarla.

El [respaldo/restauración revalidado](revision-respaldo-check.md) conserva sus reportes privados y límites: datos/restricciones, sin certificar propietarios/ACL o antigua procedencia de imagen. No se repite la recuperación.

## B: contratos terminados, entorno bloqueado

Rama docs/preparacion-B-tras-integracion, creada en el mismo repositorio desde main6f0294d, sin cambiar el árbol de código al cambiar de rama. [Contratos de B](../03-diseno-de-software/11-contratos-incremento-B.md): puertos de sesión/vault/workspace, errores, seguridad HTTP y esquema SQLite mínimo. NA-01–08/SB-01–06 son criterios nativos pendientes, no ejecuciones. No hay aplicación Flutter/Dart/Android ni prueba de dispositivo.

Kaspersky21.27 Running; no dictamen de resolución o SDK alternativo verificado en las ubicaciones inspeccionadas. No se ejecutó el SDK señalado ni se restauró cuarentena o cambiaron exclusiones. [Único paso manual y alcance de inspección](preparacion-offline-B.md). Solo tras desbloquear: verificar origen/integridad y análisis antivirus del artefacto alternativo antes de ejecutarlo, base nueva android_b_dev_*001–008/fixtures ficticios y HTTPS válido. La demo no participa.
