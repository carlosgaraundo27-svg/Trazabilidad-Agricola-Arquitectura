# Matriz — corte vigente C

Main0ed299f: #12→#11→#13 integrados por merge con historial, tres checks aprobados tras cada integración. Sonar134 CODE_SMELL abiertos,0 BUG/VULNERABILITY; S4036 cerrado y deuda restante conservada. PR9 d478986 reconciliado en borrador.

RF-03/DA01: C añade captura offline, identidad estable, outbox atómica, envío foreground/manual único, reintentos durables y replay con revalidación. SQLite2 local es aditivo y no cambia migraciones servidor publicadas. Android físico y base C ficticia aislada3043; [contrato y aceptación](../03-diseno-de-software/13-incremento-C-captura-offline.md). Las filas y criterios académicos originales se conservan; C no acredita ETL, datamart, validación agrícola, SLA, restauración entre dispositivos, pérdida física de clave o despliegue productivo. Estado real de pruebas/publicación en [continuidad](continuidad-inventario.md). Demo001–007 intacta, sin nueva copia de repo o herramientas reinstaladas.

## Histórico preservado

# Matriz de cumplimiento del trabajo final — 16 criterios transcritos

## Corte vigente — main consolidado y B preparado para integrar

2026-11-19, Lima. PR12 integrado en320e8bc y PR11 en e305239, conservando commits. Los tres checks de main320e8bc y de ROP5e1df50 aprobaron antes del segundo merge; verificar los posteriores de main e305239. B/#13 partía de f4eaa1a (referencia esperada confirmada) y se actualiza con ambos merges sin cambiar su núcleo Dart/Kotlin. Conflictos solo documentales resueltos conservando decisiones/históricos. Publicar cabeza actualizada, comprobar checks y luego integrar #13 por merge si no hay bloqueos. PR9 sigue borrador documental a reconciliar; no inferir implementación móvil desde su diff.

B implementado/probado en HONOR Android16/API36: nueve casos nativos de aceptación+uno preparatorio, diez unitarias, análisis/APK debug y compilación release ofuscada;17 avisos de su cabeza inicial CLOSED/FIXED. SDK independiente verificado, sin reinstalar ni ejecutar el señalado. Sin atribuir cobertura a toda NA/SB; límites de restauración/clave física/DWARF/firma release conservados.

C aprobado para rama propia: O1/O2/O3/O4/O6/O7/O9/O10 por el alcance y A/B. O5/O8 aprobados expresamente por el propietario:24h desde identidad+catálogo completos, distinto de cookie8h, bloquear confirmaciones tras reboot sin revalidar; inicial+cinco reintentos2/4/8/16/30s+jitter0–20%/Retry-After mayor íntegro, contador/plazos durables y pausa sin borrar. Mantener ID/cuerpo tras incertidumbre y aislar dueño. Solo primer plano; no aprobación docente/agrícola, PWA/iOS, nuevas reglas, sustitutos o corrección de hechos aceptados.

Avisos pendientes conservados: nueve ROP CODE_SMELL, tres S7780 de rutas Docker, nueve críticos DDL/deuda heredada. Consultar Sonar main para el cierre real S4036, sin confundir gate con cero avisos. Demo001–007 intacta, sin SQL/reinicio/aplicar008; C usará datos ficticios aislados. CSV ya exportado/analizado, soporte pendiente de presentación/dictamen; no tocar antivirus/cuarentena ni SDK señalado. Los cortes inferiores son históricos.



### Cortes históricos reconciliados

## Corte vigente — B Android, ROP revisado y seguridad separada

2026-11-19: main18d57e9 con #7/#8/#10 integrados/checks aprobados;123 avisos Sonar, una vulnerabilidad. ROP/#11 en5f738c8 abierto y aprobado, nueve CODE_SMELL conservados. S4036 Docker/PATH corregida separadamente en PR12/eeaa763 con checks aprobados, sin fusionar ni cerrar todavía el hallazgo de main; tres S7780 menores del PR12 pendientes. No se bajaron gates ni reescribieron DDL.

[B](incremento-B-android.md): sesión nativa/SQLite privados implementados en rama propia, nueve casos nativos de aceptación+uno preparatorio aprobados en HONOR Android16/API36, diez unitarias/análisis/APK aprobados. [SDK independiente verificado/analizado](sdk-android-independiente.md), anterior no ejecutado. No se atribuye código a PR9 documental/en borrador. Puertos locales confirmación/ACK de B implementados y probados. C/interfaz de captura, worker y pruebas de restauración/pérdida física de clave no se declaran implementados/validados. No completa todo RF offline por ese resultado.

CSV Kaspersky ya exportado/analizado; borrador privado actualizado, pendiente presentar al soporte y conservar caso/dictamen. Análisis negativo nuevo no resuelve incidente anterior. Demo001–007 intacta; B usa nueva base aislada001–008 y datos ficticios. Los cortes inferiores son históricos y no reabren respaldos, integraciones o exportaciones ya terminados.

## Corte vigente — ROP-01, 2026-11-19

#7/#8 ya integrados; #10 integrado por merge18d57e9 conservando commits hasta907cd26. Verify/Compose/Sonar de main aprobados; Sonar123 abiertos, cinco CLOSED/FIXED nuevos, deuda restante conservada [aquí](diagnostico-sonar-main-20261119.md). El fallo audit22c6e4f y la publicación pendiente de las secciones históricas no son estado actual. No se repiten recuperación, respaldos o integración.

[ROP-01](reporte-operativo-rop01.md) implementado en rama feat/reporte-operativo-rop01: API/pantalla de salidas y entregas por centro, antes especificado y ahora probado localmente con30 unitarias,5 resultados de integración aislada ROP y un E2E Chrome con filtros, estados, teclado y320–1440px. Publicado en [PR #11](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/11), abierto y sin fusionar; comprobar los checks de su SHA actual, registrados en la descripción; no fusionar ROP automáticamente. Consulta operativa, sin ETL/datamart/indicadores agrícolas, sin añadir criterio17. Esquema/demo001–007 intactos; desarrollo/pruebas aislados001–008 con hechos ficticios.

B sigue pendiente: #9 en borrador, solo preparación documental, sin cliente o validación Android. Mantener soporte/evento Kaspersky y protecciones. [Continuidad vigente](continuidad-inventario.md); los bloques históricos inferiores no ordenan repetir procedimientos ya cerrados. Próximos pasos actuales: revisar PR ROP por SHA; presentar el caso al soporte Kaspersky (CSV ya exportado/analizado); cotejar PDF/SDD con docente y cerrar las brechas de despliegue/carga/informe aún pendientes.

## Fuente transcrita y alcance de evaluación

Actualización: 2026-11-18. Fuente: **“transcripción proporcionada por el estudiante; pendiente de cotejar con el PDF original”**. Se conserva el orden y la redacción de los 16 criterios recibidos. **No se ha leído el PDF original** en esta sesión. No se atribuye aprobación docente ni se inventan ponderaciones, notas o requisitos adicionales. Esta matriz sustituye las áreas provisionales P01–P16 del seguimiento anterior.

Los estados son una **autoevaluación técnica del alcance indicado**: cumplido = evidencia suficiente para ese alcance; parcial = parte existe, con brecha concreta; pendiente = capacidad/evidencia ausente o interpretación por confirmar. “Cumplido” no significa que todos los RF estén implementados ni que la docente haya aceptado la entrega. Las siguientes tareas son propuestas técnicas para cerrar brechas, no condiciones adicionales atribuidas a la rúbrica.

Se separa implementado (artefacto/código existente), probado (ejecución identificada) y demostrado en despliegue (evidencia de un entorno instalado y su operación). Los jobs con Compose son pruebas en runners desechables: no acreditan un entorno persistente ni despliegue continuo.

## Corte histórico de evidencia y límites

- **2026-11-19, servidor A separado:** [plan A–D](../03-diseno-de-software/10-plan-incrementos-offline.md) y [evidencia actual](incremento-offline-A.md):25 unitarias,128 integración PostgreSQL,17 E2E existentes, check/formato/build aprobados. Recibos/008 solo en DB nuevas, demo001–007 íntegra. Flutter/SQLite/outbox no implementados. Publicación de19b291d/0256966/dd18ced autorizada y preparada localmente, pero bloqueada por credenciales Git; remoto #7 sigue22c6e4f y verify histórico fallido, no hay CI de A. Falta resultado verificable de backup/restauración. Se mantiene la fuente transcrita y SDD por aclarar, sin CD o rendimiento medido.

- **Reactivación posterior del 18 nov en C:** traslado a D: pospuesto y kit intacto. [Estado actual](reactivacion-demo-C.md): 23 unitarias/check/formato/build, salud, acceso anónimo y huellas de todas las tablas iguales tras stop/start app. Login autenticado/replay, integración/E2E/Redis/Compose no se reejecutaron antes del dump/restauración pendiente; las cifras de abajo son evidencia previa. PR #7 sigue remoto22c6e4f abierto y verify histórico fallido; cambios locales sin publicar. Esta precisión no cambia estados ni acredita CD.

- Trabajo actual en la copia independiente `RECUPERADO_20261117_213508/repos/repo-inventario`, rama local **fix/demo-recuperada-inventario**, base **22c6e4f** del PR #7. Sin publicar ni fusionar esta rama. Originales/respaldo preservados. [Guía y límites](demo-inventario-recuperada.md), [evidencia actual](evidence/demo-recuperada-20261118/resultado.json).
- **2026-11-18 local:** 23 unitarias, 113 integración PostgreSQL y 17 E2E completos aprobados; 4 casos enfocados aprobados antes de la suite. Formato/contratos/build aprobados. Los tres timeouts anteriores se reprodujeron y se corrigió la preparación/espera de tests: contextos independientes en paralelo, HTTP válido y UI visible; sin ampliar timeouts, eliminar aserciones o cambiar antivirus. Regresión nueva con recurso secundario retenido.
- **Demo nueva ficticia**, http://127.0.0.1:3026, DB inventory_demo_20261118_151800 con 001–007. Recorrido completo y repetición de entrega verificados; ledger sin cambios al replay/rechazo y persistencia tras reiniciar la **app**. UI a 390/1440 px. Es reconstrucción funcional, no recuperación de datos anteriores ni despliegue público/CD. La DB histórica trazabilidad conserva solo 001/dos pre-lotes. Contenedor/volumen real, dumps y restauración siguen **pendientes** por acceso Docker denegado. No se prueba reinicio de DB/contenedor/Windows.
- **Seguridad actual:** GHSA-fc5q-39xc-vjpf fue retirada oficialmente el 18 nov a las 15:38:56 UTC; no hay versión parcheada y picomatch continúa en 4.0.7. Auditoría completa exit 0/cero hallazgos, con package/lock intactos. No es parche aplicado ni certificación general; ver [triage](revision-picomatch.md). Los checks remotos históricos no se convierten en aprobados por esta ejecución local.
- **Histórico CI**: f8b386f tuvo [verify](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44011071762/job/133797935501), [Compose](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44011071762/job/133797935821) y [SonarCloud](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/runs/133798170585) aprobados, con 23/113/2 Redis/16 E2E. a1ec289 y 22c6e4f fallaron después en audit. Esas cifras/estados pertenecen a sus SHAs. Redis real/Compose no se reejecutaron en esta tarea.
- [20 avisos Sonar](revision-pr7.md), incluidos **nueve críticos de mantenibilidad DDL**, siguen abiertos, separados y sin nuevo análisis/aceptación manual. No se rebajaron gate/perfiles/exclusiones ni reescribieron migraciones.
- Sin CD, DNS/CDN, k6 o escalabilidad/rendimiento medidos. CI no es CD; Redis implementado no demuestra mejora medida. **SDD sigue pendiente de significado/expectativas de la docente.** Fuente transcrita pendiente de cotejar PDF; sin aprobación docente o agrícola.

## Cumplimiento, alcance y brechas

| N.º / criterio recibido | Requisito y alcance evaluado | Estado | Brecha concreta y siguiente tarea |
| --- | --- | --- | --- |
| **1. Identificación del problema y requerimientos.** | Problema, actores, RF/HU, atributos, drivers y restricciones documentados; distinguir requisitos de alcance académico adoptado | **Cumplido** | Cotejar con PDF y mantener trazabilidad al cambiar alcance; este estado documental no implica implementar todos los RF |
| **2. Análisis y diseño del sistema.** | Diseño interno, modelo conceptual, contratos y especificaciones de los recorridos | **Parcial** | Captura offline y otras capacidades objetivo tienen decisiones pendientes. Resolver O1–O10 y actualizar diseño antes de implementar |
| **3. Arquitectura de bajo y alto nivel.** | C1–C4, módulos/puertos, decisiones y separación entre arquitectura implementada y objetivo | **Cumplido** | Mantener consistencia al incorporar móvil/despliegue; las vistas objetivo no acreditan componentes ejecutados |
| **4. Desarrollo basado en SDD.** | Interpretación literal de SDD **sin definir por inferencia** | **Pendiente** | Preguntar a la docente qué significa SDD y qué artefactos/proceso espera; después contrastar evidencia existente |
| **5. Pruebas unitarias e integración.** | Reglas, permisos, DB real, cantidades, concurrencia, idempotencia y rollback del corte implementado | **Cumplido** | Mantener suites al evolucionar; no extender este estado a offline ni capacidades sin implementar |
| **6. Pruebas End to End.** | Recorridos de origen, Acopio, Calidad, QR, Logística y reporte operativo en navegador | **Cumplido en el alcance web probado** | ROP agrega recorrido de consulta/filtros/estados con evidencia local. Comprobar suite CI del SHA final; Android/offline no validados por Chromium |
| **7. Interfaz y experiencia de usuario.** | Formularios React, estados/errores y consulta QR adaptable; pruebas de interacción y tamaños | **Parcial** | Cliente móvil de campo inexistente y evaluación de uso con usuarios no aportada. Decidir plataforma y preparar validación del recorrido real |
| **8. Escalabilidad del frontend y backend.** | Capacidad de evolucionar/atender carga en W1/B1, con evidencia de límites | **Pendiente** | Hay una instancia B1 y límite por IP en memoria. Definir escenario/topología, sesiones/proxy/límites compartidos si se replica y medir; modularidad/contenerización no prueban escala |
| **9. Escalabilidad de base de datos.** | Esquema, índices, consultas acotadas y estrategia de crecimiento de PostgreSQL | **Parcial** | Integridad y concurrencia funcionales probadas; capacidad/crecimiento no medidos. Definir dataset/carga y revisar planes, conexiones y recursos antes de elegir cambios |
| **10. Configuración de dominio y/o subdominio DNS y CDN.** | Resolución de dominio/subdominio y configuración verificable de CDN según el alcance que se confirme | **Pendiente** | No hay evidencia de DNS/CDN operativos. Elegir entorno/dominio, configurar y demostrar resolución/TLS/política de caché; PUBLIC_BASE_URL no configura DNS |
| **11. Implementación de caché.** | Redis por puerto/adaptador para DTO público QR, con expiración e invalidación segura | **Cumplido** | Sin medición de mejora de rendimiento; medirla solo antes de afirmarla. Conservar guard PostgreSQL y no-store público frente a retiro |
| **12. CI/CD.** | Automatización de integración y de despliegue, evaluadas por separado | **Parcial** | CI de main18d57e9 aprobada en verify/Compose/Sonar; comprobar además el SHA de ROP. CD a entorno persistente sin demostrar. Elegir staging/despliegue/rollback con evidencia, sin rebajar gates |
| **13. Pruebas de carga k6.** | Scripts, entorno/dataset y resultados reproducibles de carga | **Pendiente** | No hay scripts/resultados k6 versionados. Definir perfil, ejecutar baseline y documentar latencia/errores/recursos; contemplar 429 sin desactivar controles |
| **14. Código fuente y base de datos en GitHub.** | Fuente, esquema ejecutable, migraciones y datos ficticios reproducibles versionados; sin credenciales ni datos personales reales | **Parcial frente a entrega final** | Inventario/A/008 y correcciones #10 publicados e integrados; ROP se publica en PR separado, no fusionado. Cotejar PDF/docente; no inferir entrega de instancia, volumen o dump privado |
| **15. Informe final.** | Documento final que consolide problema, diseño, implementación, resultados y límites frente a estos 16 criterios | **Parcial** | Documentación técnica dispersa existente; informe final consolidado no aportado. Prepararlo tras confirmar SDD/PDF, citando ejecuciones y pendientes |
| **16. Presentación y dominio del tema.** | Presentación, demostración y defensa explicable por el estudiante | **Pendiente** | No hay archivo de diapositivas/ensayo ni defensa evidenciada. Preparar guion, material y ensayo con preguntas; documentación o CI no acreditan dominio personal |

## Evidencia y nivel de demostración por criterio

| N.º | Qué está implementado/documentado | Qué está probado y dónde verificarlo | Qué está demostrado en un despliegue |
| --- | --- | --- | --- |
| 1 | [Actores](../01-analisis-de-sistema/01-actores.md), [HU](../01-analisis-de-sistema/02-historias-del-usuario.md), [RF](../01-analisis-de-sistema/03-requisitos-funcionales.md), [drivers](../01-analisis-de-sistema/06-drivers-arquitectonicos.md) y [restricciones](../01-analisis-de-sistema/05-restricciones.md) | Trazabilidad técnica revisada en especificaciones/aceptación; enlaces locales comprobados con npm run check | No aplica como prueba operativa a documentos; no se atribuye aceptación docente |
| 2 | [Diseño interno](../03-diseno-de-software/01-diseno-interno.md), [modelo conceptual](../03-diseno-de-software/02-modelo-datos-conceptual.md), [OpenAPI](../03-diseno-de-software/openapi.json), especificaciones de cada incremento | Contratos/imports/enlaces verificados; [aceptación logística](../03-diseno-de-software/07-especificacion-inventario-despacho-entrega.md) vinculada a pruebas | No hay validación en despliegue persistente; la propuesta offline no está ejecutada |
| 3 | [C4 implementado](../04-modelo-c4/modelo-c4.md), [objetivo](../04-modelo-c4/modelo-c4-objetivo.md), ADR y [composición](../../server/composition.js) | Revisión de dependencias/puertos y check de imports; C4 distingue M1/L1 pendientes | Compose reproduce el corte en CI; arquitectura completa/HA no desplegadas |
| 4 | Hay especificaciones, ADR y criterios de aceptación; su existencia no demuestra SDD sin definirlo | No evaluable hasta aclaración docente; no atribuir retrospectivamente una metodología no confirmada | No aplica una afirmación de despliegue para resolver el significado de SDD |
| 5 | [Unitarias](../../tests/unit/logistics.test.js), [integración HTTP](../../tests/integration/logistics.test.js), [rollback](../../tests/integration/logistics-rollback.test.js), [lecturas concurrentes](../../tests/integration/logistics-read-consistency.test.js) y demás suites | 23 unitarias y 113 integración PostgreSQL aprobadas localmente el 18 nov; [resultado actual](evidence/demo-recuperada-20261118/resultado.json). Dos pruebas Redis del CI histórico, no reejecutadas ahora; mutaciones previas conservadas | Pruebas contra servicios reales en CI, sin afirmar validación de una operación desplegada persistente |
| 6 | [E2E origen](../../tests/e2e/first-journey.spec.js), [Acopio](../../tests/e2e/intake.spec.js), [Calidad](../../tests/e2e/quality.spec.js), [QR](../../tests/e2e/publication.spec.js), [Logística](../../tests/e2e/logistics.spec.js) | 17 E2E completos y4 enfocados aprobados el 18 nov en Chrome firmado, incluida regresión de navegación; 16 y13+3 Compose pertenecen al CI histórico | Demo local 3026 y recorrido verificados; contenedor temporal del CI histórico. Sin cliente Android, despliegue público o recuperación de datos acreditados |
| 7 | [Web React](../../web/main.jsx), [UI Logística](../../web/logistics/Logistics.jsx), [QR público](../../web/publication/PublicPage.jsx), estilos adaptables | E2E, foco Tab, estados/errores, anchos 320/768/1024/1440; [móvil](evidence/logistics/inventory-delivery-mobile.png), [escritorio](evidence/logistics/inventory-delivery.png) | Demo local nueva a 390/1440 px verificada; capturas privadas y evidencia cuantitativa actual. No estudio de UX ni despliegue móvil de campo |
| 8 | React/Vite, Express modular y [contenedores](../../compose.yaml); cliente estático compilado | Build/función individual probados; sin prueba de escalado frontend/backend | No se acreditan réplicas, escalado ni capacidad bajo carga |
| 9 | [Migraciones 001–007](../../migrations/001_initial.up.sql), FK/CHECK/UNIQUE, índices, paginación y [pool DB](../../server/db.js) | PostgreSQL real, carreras y rollback; [SQL Logística](../../tests/integration/logistics-sql.test.js), down/up solo en DB desechable | Sin crecimiento/replicación/particionado ni escala medida en un entorno persistente |
| 10 | URL configurable en [QR](../03-diseno-de-software/06-especificacion-publicacion-qr.md); no equivale a registro DNS/CDN | Validación de URL/host y no-store; sin prueba de resolución/CDN real | DNS/CDN y TLS público no demostrados |
| 11 | [Adaptador Redis](../../server/adapters/public-cache.js), puerto/casos de uso T2, TTL 300 s y versión/hash subordinados a DB | [Pruebas Redis](../../tests/redis/public-cache.test.js), [unitarias](../../tests/unit/public-query.test.js), [HTTP](../../tests/integration/publication.test.js): fría/caliente, actualización, retiro con invalidación fallida y Redis caído | Redis real en CI/Compose; sin comparación de rendimiento ni carga de un despliegue persistente |
| 12 | [Workflow CI](../../.github/workflows/ci.yml), build, audit, checks, tests y Compose con reinicio; no pipeline CD a staging | Verify/Compose/SonarCloud de f8b386f aprobados; en a1ec289 verify falla en audit y omite tests, Compose/SonarCloud aprueban. [Verificación de persistencia](../../scripts/verify-compose.js) | CI en runner desechable; demo local iniciada manualmente no equivale a CD ni acredita servicio remoto persistente |
| 13 | EQ-01/EQ-02 son [propuestas de escenarios](../01-analisis-de-sistema/08-escenarios-atributos-calidad.md), no resultados k6 | Sin scripts ni ejecuciones k6; duración de tests funcionales no es benchmark | Ninguna medición de carga en despliegue |
| 14 | Fuente [GitHub](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura), migrations, scripts/migrate.js y seeds/fixtures ficticios; detalle abajo | CI instala DB nueva y aplica/revierte/reaplica migraciones en entorno desechable; seed y recorridos generan datos reproducibles | Reconstrucción ficticia local adicional con 001–007 demostrada; datos anteriores no recuperados y restauración pendiente. No se publica una BD operativa ni credenciales |
| 15 | Documentación RF/HU/ADR/C4/especificaciones y [evidencias de implementación](inventario-implementacion.md) | Enlaces y evidencias técnicas comprobados; no archivo final consolidado revisado | No aplica como sustituto del informe; un despliegue no prueba que exista el documento final |
| 16 | Material de apoyo y [demo ficticia](../../scripts/demo-logistics.js) disponibles | Sin presentación/ensayo/defensa evaluados | No se aporta demostración de defensa; dominio del estudiante no se infiere del repositorio |

## Criterio 14 — esquema y datos reproducibles, sin información privada

Se revisaron archivos versionados, no una base con datos reales:

- Esquema ejecutable: [001](../../migrations/001_initial.up.sql) a [007](../../migrations/007_shipments.up.sql), con versiones, claves compuestas, restricciones, índices y triggers. [migrate.js](../../scripts/migrate.js) aplica versiones transaccionalmente; [modelo conceptual](../03-diseno-de-software/02-modelo-datos-conceptual.md) no se confunde con el SQL real.
- [seed.js](../../scripts/seed.js) y seeds de Acopio/Calidad/QR/Logística preparan organizaciones/usuarios ficticios y permisos; usan datos .example.test y nombres expresamente ficticios. La contraseña se proporciona por entorno y se almacena con hash; no se incluye su valor en esta matriz.
- [logistics-fixture.js](../../scripts/logistics-fixture.js) y [demo-logistics.js](../../scripts/demo-logistics.js) crean hechos ficticios nuevos y composición 37.125+36.000=73.125 kg. No convierten históricos en movimientos ni admiten automáticamente lotes antiguos.
- .gitignore excluye .env, .local, dependencias y resultados locales. La revisión de nombres versionados no encontró .env, claves .pem/.key/.p12, archivos credentials ni dumps .dump/.backup. Es una comprobación acotada del árbol actual, no una certificación de todo el historial Git.
- No subir secretos, contraseñas operativas, tokens, volúmenes/dumps reales, contactos o datos personales. Ejemplos de CI y cuentas ficticias no son credenciales válidas de un despliegue. Si la docente pide un archivo de datos adicional, generarlo exclusivamente con fixtures sintéticos y revisar su contenido antes de versionarlo.

Reconstrucción reproducible (solo entorno ficticio aislado, desde la raíz del repositorio; configurar valores locales sin publicarlos):

~~~powershell
npm.cmd ci --ignore-scripts
npm.cmd run setup:env
# Configurar .env local: claves propias, ALLOW_DEMO_SEED=true y entorno no productivo.
docker compose up --build -d --wait
docker compose exec -T app node scripts/seed.js
docker compose exec -T app node scripts/demo-logistics.js --complete
~~~

La app aplica migraciones al arrancar. Cada demo crea un lote nuevo; no es un mecanismo de reintento ni una carga de históricos. [Guía de entorno](../../tecnologia/primer-recorrido.md), [comandos y límites logísticos](inventario-implementacion.md). Las pruebas down/up usan bases nuevas desechables, nunca la demo ni datos operativos.

## Pendientes funcionales relacionados, sin añadir criterios a la transcripción

RF-03/DA01 offline no cumplidos todavía; RF-10 parcial por empaque/pallets diferidos. Parcialidades, devoluciones y correcciones posteriores siguen fuera del incremento. ROP-01 operativo implementado y probado en su rama, con CI propio por verificar; ETL/Datamart e indicadores agrícolas permanecen proyectados, sin añadir criterio17 ni atribuirlo literalmente a la transcripción.

[O1–O10: preguntas, recomendación, consecuencias y dependencias](../03-diseno-de-software/08-especificacion-offline-cosecha.md) permanecen propuestas. Flutter no está implementado; UI responsive no sustituye cliente móvil. El significado de SDD se consulta a la docente antes de evaluar el criterio 4.

## Histórico del bloqueo de CI — no confundir con los avisos Sonar

**Histórico del 17 nov.** El18nov la advisory fue retirada y audit completo local aprobó con el mismo lockfile; eso no reejecuta los jobs remotos antiguos ni constituye un parche. Los 20 avisos Sonar siguen abiertos. Ver corte actual y guía de demo antes de interpretar las notas siguientes.

El [verify de a1ec289](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44188460340/job/134411156005) falló antes de formato/tests por npm audit --audit-level=high. La [advisory GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), actualizada el 2026-11-17, informa ReDoS en picomatch hasta 4.0.7, sin versión parcheada indicada en esa consulta. Lockfile contiene Vite 8.3.8 → picomatch 4.0.7, también mediante tinyglobby/fdir; npm audit local reproduce cuatro entradas high en esa cadena, no cuatro defectos independientes. Esto no prueba que una entrada pública de esta app alcance el matcher: requiere triage de exposición, pero el gate de auditoría sí está bloqueado.

[Compose de a1ec289](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44188460340/job/134411156649) y [SonarCloud](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/runs/134411475306) aprobaron. La deuda de 20 avisos/nueve DDL continúa separada de esta advisory. La integración de PR #7 no está habilitada mientras la comprobación pertinente permanezca fallida. [Triage específico y evidencia](revision-picomatch.md): registry confirma latest picomatch 4.0.7, Vite 8.3.8/tinyglobby 0.2.17/fdir 6.5.0 ya instalados; ningún release corregido disponible en esta consulta. Instalación limpia y revalidación del lockfile por npm no lo cambian; audit completo sigue fallando, audit omit=dev solo diagnostica producción. Siguiente tarea: aplicar un parche publicado verificable o evaluar otra solución en un incremento específico, sin afirmar remediación mientras tanto. No ejecutar audit fix --force sin revisar su propuesta de cambio mayor, ni omitir audit, excluir dependencias o rebajar severidad para obtener verde. En esta tarea solo se documenta, sin cambiar package.json/package-lock.json ni reglas offline.

## Histórico — orden propuesto de siguientes pasos

1. Identificar volumen y obtener/restaurar dumps con el bloque PowerShell de la guía; no avanzar a offline suponiendo recuperados datos anteriores. Mantener auditoría completa y ejecutar CI del SHA que se publique: el retiro oficial de la advisory no actualiza jobs históricos. Sin merge. Cotejar PDF y aclarar SDD con la docente.
2. Resolver O1–O10 (incluidas retención/catálogo y tratamiento de capturas bloqueadas), delimitar Android y preparar su prueba de reinicio/sincronización; implementar solo después de decisión.
3. Elegir y demostrar un entorno persistente; después configurar DNS/CDN y automatizar CD/rollback por SHA, preservando privacidad y retiro QR.
4. Acordar dataset/escenarios, ejecutar k6 y medir frontend/backend/DB y caché. Elegir cambios de escalabilidad según resultados; conservar escenarios permitidos/abuso y límites.
5. Consolidar informe final y presentación, con evidencia por criterio, demo de respaldo y ensayo de defensa. Actualizarlos a medida que se cierren brechas.

No se fusiona PR #7 ni se implementan reglas offline mediante esta actualización documental. CI no es CD; Redis implementado no demuestra una mejora de rendimiento. [Continuidad](continuidad-inventario.md), [revisión Sonar](revision-pr7.md).
