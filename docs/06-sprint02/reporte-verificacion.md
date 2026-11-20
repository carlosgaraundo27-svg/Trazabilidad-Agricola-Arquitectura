# Reporte de verificación y faltantes

## Resultado ejecutado

Candidato `2758271ad96aa8735f35644efe42b2a02a9ff539`, Node `v24.16.0`, Windows, procesos secuenciales. [Manifiesto íntegro sanitizado](evidence/2758271ad96aa8735f35644efe42b2a02a9ff539/verification.json). El registrador elimina URLs de servicios y opciones DB heredadas de los subprocesos, no carga `.env` y no accede al teléfono. `node:test` existente usa también PGlite en memoria para catálogo; no representa PostgreSQL servidor.

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| Jest ESM/V8, `--runInBand --coverage` | 4 suites, **38 aprobadas**, 0 fallidas/pendientes | Código real de reglas y casos de uso; puertos ficticios en memoria; sin red. |
| node:test, `--test-concurrency=1` | **45 aprobadas**, 0 fallidas | 38 previas más 3 guardas de laboratorio y 4 verificaciones del plan k6. No se eliminaron pruebas anteriores. |
| `node scripts/check.js` | Aprobado | Sintaxis modular, límites actuales de imports, OpenAPI y enlaces. No es una auditoría completa de arquitectura ni del contrato en ejecución. |
| `npm run format:check` | **Falló localmente: 25 archivos CRLF** | Archivos heredados de la copia Windows; Git conserva blobs LF. No se reformateó código activo ni se cambió la regla. |
| Diagnóstico Prettier `--end-of-line auto` | Aprobado | Aísla finales de línea como causa; es diagnóstico, no reemplazo del gate obligatorio. CI Linux debe verificar el comando original. |
| Auditoría npm del lockfile | 18 moderadas, 0 altas/críticas | Nuevas transitivas de Jest; detalle más abajo. No equivale a cero vulnerabilidades. |
| PostgreSQL/Redis reales, k6, Playwright y Flutter locales | **No ejecutados** | Comparten recursos con el backend del ensayo Android; ejecución trasladada a otro host/CI. |
| Ensayo Android 24 h / corte físico de energía | **Pendientes** | No se intervinieron ni se declararon aprobados. |

El registrador devuelve exit 1 por el fallo local de formato y conserva ese estado. Las duraciones de tests en el manifiesto no son latencias de negocio ni benchmarks. Los cambios de este PR son preparación, pruebas, CI y documentación; no alteran reglas, migraciones ni clientes de producción.

Revisión de sensibilidad: [mutación focal en memoria](evidence/addab5f9101a5d6288fb325d1adda395553d967c/mutation-check.json). Un hook Node cargó solo en el proceso de test la fórmula incorrecta que descuenta `delivered` otra vez de `onHand`; el test de conservación falló (exit1, 1 fallo/3). Sin ese hook, 3/3 aprobados. El hash del archivo productivo siguió idéntico al manifiesto; no se editó ni copió producción. Es una comprobación focal de la regresión node:test, no un score global de mutación ni un resultado de rendimiento.

## Cobertura realmente medida

`jest.config.js` incluye **todos los 45 archivos `server/**/*.js`**, también HTTP, repositorios, composición y arranque no importados por las pruebas. Sin negaciones de paths, comentarios de exclusión, supresiones ni umbral artificial. Los tests no están en el denominador productivo.

| Métrica V8 | Cubierto / total | Porcentaje |
| --- | ---: | ---: |
| Líneas | 339 / 3997 | 8,48 % |
| Sentencias | 339 / 3997 | 8,48 % |
| Funciones | 19 / 73 | 26,02 % |
| Ramas | 72 / 110 | 65,45 % |

Las métricas de funciones/ramas V8 tienen denominadores dependientes de instrumentación y de archivos no ejecutados; **65,45 % de ramas no describe 65,45 % de reglas del sistema verificadas**. Importar un módulo también ejecuta declaraciones: 100 % de líneas de `sync-domain.js` no significa que `payloadDigest` esté probado por Jest (funciones 0 % allí). El reporte por archivo permite detectar estas diferencias.

Se ejecutan normalización/validación de cosecha, frontera temporal usando reloj solo del proceso Jest, idempotencia online/revalidación con puertos ficticios, cantidades BigInt e invariantes de inventario, DTO público/guard de publicación y comportamiento frío/caliente/degradado con dobles. No se falsea una transacción SQL: el UoW ficticio no acredita locks, aislamiento ni rollback.

**Zonas sin cobertura Jest:** 37 archivos del backend sin líneas ejecutadas; todos los repositorios SQL, composición/arranque/HTTP, seguridad real de sesiones/password, Acopio/Calidad, productores, trazabilidad y reportes; aplicación logística y aplicación sync. En publicación solo se ejercita consulta, no comandos publish/withdraw. Adaptador Redis real no ejecutado; `noCache` sí se usa parcialmente. Web React y cliente Flutter están fuera de esta métrica de backend y sin cobertura Jest; conservan Playwright y Flutter test como herramientas propias. No se suman resultados `node:test` o pruebas históricas para aumentar este porcentaje.

Artefactos generados: `coverage/jest/index.html`, `lcov.info`, `coverage-summary.json` y `coverage-final.json`. HTML y LCOV quedan ignorados localmente, reproducibles por comando y publicados por el job Jest de CI durante 14 días bajo `jest-coverage-<head-SHA>`, incluso con fallos de tests cuando se hayan producido archivos. La ausencia de archivos falla el upload. El job usa exactamente el head del PR; verify/Compose previos se conservan. No hay nueva configuración de análisis Sonar: **generar LCOV o subirlo a Actions no prueba que Sonar lo haya importado**. Esa integración requiere configurar análisis CI y comprobar su log/métrica; sigue pendiente sin cambiar gate ni secretos.

Fuentes de configuración: [ESM en Jest](https://jestjs.io/docs/ecmascript-modules) y [cobertura y reporteros](https://jestjs.io/docs/configuration). La API ESM de VM continúa experimental; se conserva la advertencia en logs.

## Comparación funcional de caché disponible

Resultados de Jest con dobles, **no mediciones PostgreSQL/Redis reales**:

| Condición / 2 consultas | Guard de publicación | Snapshots | Resultado |
| --- | ---: | ---: | --- |
| Memoria, primera fría + segunda caliente | 2 | 1 | DTO aprobado en ambas. |
| noCache | 2 | 2 | Mismo DTO; retirada posterior 404. |
| GET/SET simulados fallidos | 2 | 2 | Mismo DTO; 4 eventos genéricos de degradación. |
| Caché aún caliente, retirada | DB decide | Sin snapshot adicional | 404; clave antigua no autoriza acceso. |
| DB simulada caída con caché caliente | Falla | Sin snapshot adicional | 503, no se sirve copia sin autorización. |

Corrupción JSON, hash ajeno y propiedad privada producen miss/relectura. No se atribuye ahorro en ms, consultas reales por segundo ni disponibilidad a este resultado. [Medición real preparada](validacion-atributos.md).

## Dependencias y deuda conservada

Jest `30.5.2` se incorporó como devDependency exacta con scripts de instalación bloqueados. El diff del lockfile no cambia versiones preexistentes; amplía/reorganiza el árbol transitivo, de ahí su tamaño. Su necesidad viene de A7/E4 del PDF; no se reemplazó node:test. No se ejecutó `audit fix --force` ni se añadieron overrides para aprobar.

La auditoría identifica 18 nodos moderados arrastrados por dos avisos: [glob: cancelación y recorrido](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) y [minimatch: amplificación de patrones](https://github.com/advisories/GHSA-g3hv-75wg-m249). Alcance observado: descubrimiento/transformación/cobertura de tests; no importados por `server/main.js` y excluidos por `npm ci --omit=dev` de la imagen final. Esto reduce exposición de runtime, no elimina el riesgo en CI, donde un PR puede consumir recursos. Job Jest limitado a 5 min, paths estáticos y runner desechable. El gate existente `npm audit --audit-level=high` permanece igual; `npm audit` completo da exit 1 por moderadas. Revisar compatibilidad y corrección de transitivas antes del cierre docente o a más tardar el 27/11/2026; responsable de seguimiento: mantenedor del proyecto. No aplicar downgrades/forzados sin ensayo separado.

Se conserva deuda previa de [diagnóstico Sonar de main](../05-sprint01/diagnostico-sonar-main-20261119.md) y cuatro S9382 del fixture Android documentados en [D](../05-sprint01/incremento-D-matriz-android.md). No se declaran resueltos. El resumen/versionado de OpenAPI todavía describe un alcance anterior pese a contener rutas nuevas; sus 40 paths validados no sustituyen una revisión editorial/semántica completa. Los README históricos contienen estados de sus cortes, por eso este índice registra el estado actual sin reescribirlos.

## Publicación y revisión de CI

[PR15](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/15), borrador sobre PR14, sin fusión. El [primer CI de `46c27927`](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44762832966) aprobó verify, Compose y Jest. Se comprobó el artifact `jest-coverage-46c27927ee75511d65d71e38b28374b20daf9642`, ID14642416660, no expirado al consultar. Esto acredita subida de cobertura en Actions, no ingestión Sonar ni mediciones EQ de carga.

Sonar **falló** en esa primera cabeza: Security B y Reliability D, requeridas A. Se conservaron gate y severidades. La revisión corrigió búsqueda de Git por PATH usando rutas protegidas explícitas; quitó URLs HTTP ficticias usadas como reserva de validación; eliminó ordenación innecesaria de claves, simplificó selección de duración y regex y ajustó construcción/nombres de funciones. También añadió cuatro regresiones aisladas del plan k6: una prueba falló por aceptar etapas heredadas `toString`/`constructor`; se corrigió con comprobación de propiedad propia. Las pruebas del script usan dobles en VM de Node, sin HTTP ni k6 real; no simulan usuarios ejecutados ni cobertura de producción adicional.

El candidato `2758271ad96aa8735f35644efe42b2a02a9ff539` incorpora esas correcciones y nueva evidencia local completa (38 Jest/45 node:test). El análisis intermedio `b9809543` ya cumplió fiabilidad, pero seguía fallando seguridad por S4036 en la ruta Windows de Git; se añadió PATH fijo para el subproceso, quitando variantes heredadas sin cambiar el entorno global. No se presenta ninguno de esos gates fallidos como aprobado. Persisten avisos S9382 por awaits deliberadamente secuenciales en planes SQL de una misma transacción, creación de fixtures con dependencias y muestras frías/calientes/reconexión: paralelizarlos alteraría el experimento o su carga. Revisarlos como deuda de scripts, sin supresiones ni convertir muestras secuenciales en concurrentes para eliminar avisos. La lectura independiente de hashes del registrador sí se paralelizó.

**Comprobación remota del candidato, distinta de las pruebas locales:** [CI 44764600317](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44764600317) y Sonar aprobaron Jest, verify y Compose para `2758271`. El [registro sanitizado](evidence/2758271ad96aa8735f35644efe42b2a02a9ff539/ci-remoto.json) fija SHA, URLs y artifact. El log remoto de Jest confirma38/38 y cobertura de líneas **8,48 %**, no88,48 %. Se verificó el artifact `jest-coverage-2758271ad96aa8735f35644efe42b2a02a9ff539`, ID14641284260,199117 bytes, no expirado al consultar. Verify incluye las suites Redis/integración PostgreSQL/Playwright del workflow; son pruebas funcionales remotas, no las mediciones SQL/caché/k6 pendientes.

El aviso Windows `AaH5lhSIFpA4IEPfanba` / S4036 se comprobó por API Sonar en estado **CLOSED/FIXED**. El nuevo análisis mantiene8 CODE_SMELL abiertos:6 S9382 secuenciales con las razones anteriores y2 S7780 de estilo de literales Windows. Sin BUG/VULNERABILITY nuevos abiertos en ese corte; no significa cero deuda global. Sonar informa **0,0 % de cobertura de código nuevo**, aunque el gate apruebe: LCOV de Actions no tiene importación Sonar verificada. No confundir esa métrica con el8,48 % Jest del backend completo. La cabeza documental posterior debe comprobar sus propios checks, sin trasladar automáticamente este aprobado a otro SHA.

## Cierre pendiente

Comprobar los checks de la cabeza documental final, ejecutar el laboratorio externo y adjuntar resultados fallidos o exitosos con SHA/entorno/dataset; resolver o aceptar explícitamente brechas docentes. Mantener PR de preparación y PR14 sin fusionar. La preparación queda revisable y reproducible, con validación cuantitativa incompleta.
