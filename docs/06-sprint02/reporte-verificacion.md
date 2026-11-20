# Reporte de verificación y faltantes

## Resultado actual y alcance

Preparación en [PR15, borrador](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/15), sobre PR14, ambos sin fusionar. Producción, reglas, migraciones y clientes se conservan. El PDF exige Jest y reporte de cobertura, pero **no fija porcentaje mínimo**. El gate Sonar del proyecto exige por separado 80 % en código nuevo; no se cambió.

| Evidencia ejecutada | Resultado | Entorno / SHA |
| --- | --- | --- |
| Jest | **83 aprobadas, 8 suites**, sin fallidas/pendientes | Local Windows/PGlite en memoria y CI Linux/PostgreSQL 18. |
| node:test | **49 aprobadas**, sin fallidas | 45 anteriores conservadas + 4 regresiones del evaluador de carga/ACK. |
| Jest local: líneas productivas | **2857/3997 = 71,47 %** | [Manifiesto 02ca31b](evidence/02ca31bd03dc1626bc9f0c610405b8a673c0fe07/verification.json), Node 24.16.0. |
| Jest remoto: líneas productivas | **2859/3997 = 71,52 %** | PostgreSQL 18, [job Jest de 02ca31b](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44809169009/job/136540971159). Diferencia de adaptador DB, no mezclar ambos resultados. |
| Static check / OpenAPI / enlaces | Aprobado | Local02ca31b y verify remoto. |
| Formato local | **Falló por CRLF**; diagnóstico auto aprobado | El registrador conserva exit1; no sustituye el gate. Formato Linux original aprobado en verify remoto. |
| verify y Compose | **Aprobados remotamente** | [CI02ca31b](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44809169009): integración SQL/Redis y Playwright conservados. |
| Laboratorio específico | Completado con límite de carga observado | [Mediciones y análisis](mediciones-ejecutadas.md); runner independiente, ficción, sin servicios locales. |
| Sonar02ca31b | **LCOV importado; gate fallido por cobertura nueva75,5 <80** | Seguridad/fiabilidad/mantenibilidad A; duplicación nueva0; hotspots revisados100 %. Corrección posterior ejecuta el registrador real en CI; comprobar su propio SHA. |

**Corrección comprobada:** [CI20be52d](evidence/20be52d72d7ebbe488a660307230d9857f44d4b5/ci-remoto.json) de20be52d72d7ebbe488a660307230d9857f44d4b5 aprobó Jest, verify, Compose, laboratory, sonar y SonarCloud Code Analysis. Sonar importó los tres LCOV y el gate quedó **OK,87,1 % de cobertura nueva**. El paso real record-tests confirmó83Jest/49node:test y2859/3997 líneas71,52 %, con formato Linux original aprobado. No es87,1 % de Jest: Sonar incluye herramientas/laboratorio y condiciones.

El [índice de evidencia](evidence/README.md) distingue cada corte. No atribuir checks de02ca31b a una cabeza posterior. La cabeza final y sus checks se registran también en la descripción del PR existente.

## Cobertura Jest y zonas restantes

Se mantiene exactamente `collectCoverageFrom: ["server/**/*.js"]`: **45 archivos y3997 líneas**, incluidos los no importados; sin negaciones, exclusiones ni cambios de reglas para aprobar. Base histórica:339/3997=8,48 %,38 tests; nunca88,48 %. El aumento procede de ejecutar reglas y casos de uso reales, no de sumar node:test o pruebas históricas.

Nuevas suites: [políticas logísticas](../../tests/jest/logistics-policies.test.js), [reportes](../../tests/jest/reports-application.test.js), [sync aplicación](../../tests/jest/harvest-sync-application.test.js) y [negocio persistido](../../tests/jest/persisted-business.test.js). Comprueban cantidades/estados/transporte, UTC/cursor, permisos y ausencia de acceso al repositorio tras rechazo, timeout503, intención/replay/hash/actor, catálogo revocado, publish/withdraw, rollback si falla auditoría y flujo real cosecha→acopio→calidad→reserva→salida→entrega sin doble descuento. La suite persistida local usa PGlite efímero; en CI valida expresamente PostgreSQL dedicado127.0.0.1:55442/jest_business. Nunca hereda la base del ensayo.

Siguen sin líneas Jest ejecutadas las capas HTTP, `main.js` y varias rutas de error/contención. Redis real se mide en el laboratorio y en verify, pero su adaptador solo tiene cobertura Jest parcial. El manifiesto contiene cada archivo y funciones/ramas; ejecutar declaraciones no prueba automáticamente todos sus comportamientos. Web React y Flutter no forman parte de este porcentaje backend; se conservan sus herramientas Playwright y Flutter test, sin ejecutar Flutter/dispositivo local.

HTML/LCOV/reportes completos: artifact `jest-coverage-<head-SHA>`,14d; HTML `coverage/jest/index.html`. Falta de artifact falla el upload. LCOV adicional c8 contiene ejecución V8 real de herramientas y laboratorio; incluye también archivos no ejecutados de server/scripts/raíz mediante `--all`. Se importa por separado y **no se presenta como cobertura Jest**. k6 ejecuta JS fuera de Node y no genera automáticamente LCOV V8 para su script; su prueba VM es una simulación de control, no una medición de carga.

## Sonar y endurecimiento

El usuario confirmó SONAR_TOKEN existente y análisis automático desactivado. El scan CI usa acción v7 fijada a SHA, espera el gate y descarga LCOV del mismo head. Log02ca31b: sensor JavaScript/TypeScript Coverage analiza `coverage/jest/lcov.info`, `coverage/jest-tools/lcov.info` y `coverage/lab/lcov.info`, sin paths sin resolver. Publicar artifacts por sí solo no acreditaba importación; ahora el log y métricas sí la confirman.

Se conservaron fallos intermedios: primer scan falló por ruta relativa de metadata; después hubo credenciales ficticias fijas señaladas por S6698 y acción sin SHA (S7637). Se corrigieron con contraseña PG efímera aleatoria en memoria, enmascarada antes de GITHUB_ENV, y acción fijada. No hay valores en argumentos/artifacts ni secretos entregados. El gate02ca31b quedó únicamente por cobertura nueva75,5 %. El registrador ejecutado realmente en20be52d añadió evidencia y cobertura de ese trabajo:87,1 % nuevo, gate aprobado, sin excluir archivos ni bajar80.

Windows Git conserva ruta absoluta de instalación protegida, PATH fijo solo del hijo y retirada de variantes heredadas. S4036 `AaH5lhSIFpA4IEPfanba` quedó CLOSED/FIXED según [comprobación histórica](evidence/2758271ad96aa8735f35644efe42b2a02a9ff539/ci-remoto.json). No confundir Linux CI con ejecución de la rama Windows. Persisten avisos de estilo y secuencialidad sin supresión. SQL de la misma transacción, fixtures dependientes, muestras none/fría/caliente/degradada, replay sync y etapas k6/reposo son deliberadamente secuenciales: paralelizarlos cambia estados, cachés, ventanas o carga. Solo lecturas independientes de hashes se paralelizan.

## Fallos, deuda y pendientes

El primer laboratorio309fd38 falló por comparar orden de claves JSON del ACK, pese a50HTTP201 y cinco replays200; se preservó en [lab-first](evidence/309fd38e9f30f3aafe43dd6c501152cd459b5769/lab-first/run.json). Se corrigió el validador semántico, conservando payload canónico, clientCaptureId y preLotId; regresiones aceptan reordenación y rechazan contenido alterado. Los fallos iniciales de fixture Jest se corrigieron usando el schema canónico de guía y comparación del DTO serializado, sin cambiar reglas productivas.

Jest 30.5.2 y c8 12.0.0 son devDependencies exactas, instalación sin scripts; no se cambiaron versiones preexistentes ni se ejecutó audit fix/overrides. Auditoría tras c8: **19 moderadas,0 altas/críticas**; antes18. Avisos transitivos glob/minimatch de herramientas, no cero riesgo CI. El gate `npm audit --audit-level=high` permanece. Runners desechables y timeouts limitan exposición; revisar transitivas antes del cierre o27/11/2026. Deuda previa [Sonar main](../05-sprint01/diagnostico-sonar-main-20261119.md) y decisiones agrícolas siguen vigentes.

Pendientes concretos: cobertura HTTP/errores/contención adicional; matriz negativa HTTP íntegra cuantificada; carga admitida distribuida hasta 2000 con controles intactos; datasets y repeticiones representativos SQL/Redis; recuperación Redis medida; Android50 capturas/SQLite real y comprobación24h; corte de energía no autorizado/no ejecutado; disponibilidad mensual; ETL/Datamart y ratificación agrícola/docente. Ningún resultado de servidor cierra estos criterios por sí solo.

**Android D11 no intervenido ni aprobado**: sin teléfono, ADB, Flutter, cuenta/sesión, reloj, instalación, reverse3043 o servicios asociados. No se hicieron cortes de energía ni nuevas copias de repositorio/documentos históricos.
