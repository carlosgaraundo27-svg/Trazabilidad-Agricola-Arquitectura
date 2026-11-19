# Diagnóstico de Sonar main — corte 2026-11-19

Main confirmado **6f0294d52fe63fac2ab855e1b129688b4c844186**, verify/Compose/Sonar aprobados según la [evidencia documental del borrador #9](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/blob/6e1642b73bf517f14ad04108f685e0eab26091a6/docs/05-sprint01/integracion-inventario-offline-A.md). #9 sigue abierto, en borrador, cabeza6e1642b: B es preparación documental, no cliente ni validación Android. No se repitieron integración, recuperación o respaldo; demo001–007 sin operaciones.

## Inventario y comparación

Consulta pública api/issues/search de la rama main: **144 registros =128 OPEN +16 CLOSED/FIXED**. Los128 abiertos son **123 CODE_SMELL y5 VULNERABILITY;0 BUG abiertos**. No interpretar144 como aumento de abiertos ni el gate como ausencia de vulnerabilidades heredadas. Se conservan un [resumen JSON](evidence/sonar-main-20261119/resumen.json) y el [inventario completo CSV](evidence/sonar-main-20261119/inventario.csv), sin usuarios/secretos: clave, origen, regla, archivo/línea, tipo/severidad, impacto y decisión para cada uno.

| Origen en los128 abiertos | Cantidad | Evidencia de clasificación |
| --- | ---: | --- |
| Heredados anteriores al incremento Inventario | 98 | Restante actual con primeras detecciones anteriores al incremento; código/archivos previos. No se presentan como98 introducidos por los merges |
| Incorporados con Inventario/#7 | 20 | Coincidencia por regla/archivo/mensaje con los20 del reporte conservado critical-after.json:9 DDL S1192,5 VARCHAR2 y6 await |
| Incorporados con A/herramientas/#8 | 10 | Archivos scripts/backup y tests/backup añadidos en A;2 literales,3 clases Python,1 claridad de excepción y4 await |
| Estado REOPENED actual | 0 | Campo status actual; **no prueba ausencia de reaperturas históricas** |

Las claves de issue de main no siempre son las del PR; el contraste usa firma regla/archivo/mensaje y conserva clave/línea actuales. No se compara solo el contador20 del PR con128 de toda main. Las medidas históricas disponibles son51→81→99→118→128;99 corresponde a b664fee,118 a c8676b6 y128 a6f0294d. No hay análisis main47d827c en esa respuesta, aunque sus checks históricos consten aprobados: no se inventa un inventario histórico completo para ese SHA.

**Límite de reaperturas:** se consultó api/issues/changelog para los144 registros; todas las respuestas públicas disponibles fueron vacías. Por tanto, las reaperturas pasadas quedan **indeterminadas**, no clasificadas como nuevas ni certificadas como inexistentes. Los16 FIXED actuales tampoco se declaran reabiertos. La creación/actualización de una clave por sí sola no demuestra una transición de estado.

## Prioridad y correcciones acotadas

| Prioridad | Regla / ubicación en main | Impacto y tratamiento |
| --- | --- | --- |
| P1 seguridad media,4 issues | githubactions:S6505/S8543, .github/workflows/ci.yml:52 y80; claves AaHagHqFGiVmDmX-BZYP/Q/R/S | npx permite instalación implícita y ejecución de una versión no esperada si el paquete falta. Sustituir ambos usos por node node_modules/@playwright/test/cli.js; npm ci --ignore-scripts, versión/lock y audit siguen intactos. El CLI instalado verificado es1.65.0; no se afirman paquetes parcheados por este cambio |
| P1 fiabilidad media,1 issue | javascript:S8786, scripts/check.js:92; AaHagHp_GiVmDmX-BZYE | Regex no anclada repite barridos ante muchas etiquetas sin cerrar; puede bloquear la comprobación de documentación. TDD reprodujo timeout del proceso hijo con200000 corchetes; escáner lineal conserva la extracción previa y supera la misma regresión con límite2s. No es un benchmark |
| P2 seguridad baja, pendiente | javascript:S4036, scripts/verify-compose.js:27; AaHagHqDGiVmDmX-BZYO | docker se resuelve por PATH. Requiere resolver/verificar binario de forma multiplataforma sin romper CI/local; no se ejecutó Docker ni se confunde PATH controlado del runner con una garantía para todos los equipos |
| P2 funcional/accesibilidad potencial | S6479/S6819/S6772 en componentes web, detallados en inventario | Reproducir identidad de filas reordenables/semántica/espaciado antes de cambiar UI. Sin defecto nuevo demostrado aquí; no se hace refactor cosmético masivo |
| P3 mantenibilidad | Repeticiones/regex/await/complejidad restantes | Revisar dependencias y semántica, no paralelizar transacciones ni ampliar Unicode para reducir contador |

No hay BUG abierto de Sonar que se oculte tras estas prioridades. Una alerta CODE_SMELL con impacto de fiabilidad puede tener una reproducción concreta, como S8786. Los avisos de new Error(), por sí solos, no demuestran diferencia de comportamiento que justifique una campaña de cambios.

**Migraciones:** no se reescribe ninguna001–008 publicada. Los nueve críticos DDL de Inventario permanecen documentados; VARCHAR2 es recomendación de dialecto Oracle, no una sustitución válida en PostgreSQL. No se aceptan/suprimen issues ni se debilita el gate.

## Validación y alcance de entrega

Rama separada fix/sonar-ci-y-enlaces desde main6f0294d; #9 no se modifica. Las correcciones afectan solo al workflow y al comprobador de enlaces, sin producción transaccional, esquema, paquetes o lockfile.28 unitarias aprobadas localmente, incluidas dos nuevas de extracción/agotamiento de tiempo; check de contratos/enlaces y formato aprobados. El workflow corregido debe validarse también en el SHA publicado del PR, sin atribuirle checks antiguos.

El inventario adjunto es el corte **previo a las correcciones**, no un contador nuevo de main: main no se modifica mientras el PR permanezca abierto. Si Sonar del PR deja de señalar esos cinco issues, no implica haber resuelto los123 restantes ni haber triado todas las interacciones de UI.
