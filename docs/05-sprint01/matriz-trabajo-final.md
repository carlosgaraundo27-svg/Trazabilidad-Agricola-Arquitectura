# Matriz de cumplimiento del trabajo final — 16 criterios transcritos

Actualización: 2026-11-17. Fuente: **“transcripción proporcionada por el estudiante; pendiente de cotejar con el PDF original”**. Se conserva el orden y la redacción de los 16 criterios recibidos. **No se ha leído el PDF original** en esta sesión. No se atribuye aprobación docente ni se inventan ponderaciones, notas o requisitos adicionales. Esta matriz sustituye las áreas provisionales P01–P16 del seguimiento anterior.

Los estados son una **autoevaluación técnica del alcance indicado**: cumplido = evidencia suficiente para ese alcance; parcial = parte existe, con brecha concreta; pendiente = capacidad/evidencia ausente o interpretación por confirmar. “Cumplido” no significa que todos los RF estén implementados ni que la docente haya aceptado la entrega. Las siguientes tareas son propuestas técnicas para cerrar brechas, no condiciones adicionales atribuidas a la rúbrica.

Se separa implementado (artefacto/código existente), probado (ejecución identificada) y demostrado en despliegue (evidencia de un entorno instalado y su operación). Los jobs con Compose son pruebas en runners desechables: no acreditan un entorno persistente ni despliegue continuo.

## Corte de evidencia y límites

- Código revisado: **f8b386f7cb7b527b56b725aab3eed032734b734d**, rama feat/inventario-despacho-entrega, [PR #7 abierto y sin fusionar](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/7). Main 47d827c contiene la corrección de fiabilidad de PR #6; Inventario/Logística permanecen en la rama del PR.
- Ejecución de ese SHA: [verify](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44011071762/job/133797935501), [Compose](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/44011071762/job/133797935821), [SonarCloud](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/runs/133798170585), aprobados. **23 unitarias, 113 resultados de integración PostgreSQL, 2 Redis y 16 E2E**; Compose ejecuta 13+3 E2E y verifica persistencia tras reinicio.
- [Revisión individual de 20 avisos](revision-pr7.md): **20 abiertos, incluidos nueve críticos de mantenibilidad DDL**, cinco recomendaciones VARCHAR2 de dialecto Oracle y seis await secuenciales. No se presentan como resueltos ni aceptados manualmente; gate/perfiles/exclusiones y migraciones publicadas se conservan. Gate aprobado no significa ausencia de deuda ni cobertura global demostrada.
- No se aporta evidencia de un despliegue persistente accesible, CD, DNS/CDN configurado, escala medida o ejecución k6. Las capturas y la demo local no se convierten en evidencia de estos puntos.
- **SDD: significado y expectativas pendientes de confirmar con la docente.** No se asume que sea Spec-Driven Development, diseño de software u otra interpretación, aunque existan especificaciones.

## Cumplimiento, alcance y brechas

| N.º / criterio recibido | Requisito y alcance evaluado | Estado | Brecha concreta y siguiente tarea |
| --- | --- | --- | --- |
| **1. Identificación del problema y requerimientos.** | Problema, actores, RF/HU, atributos, drivers y restricciones documentados; distinguir requisitos de alcance académico adoptado | **Cumplido** | Cotejar con PDF y mantener trazabilidad al cambiar alcance; este estado documental no implica implementar todos los RF |
| **2. Análisis y diseño del sistema.** | Diseño interno, modelo conceptual, contratos y especificaciones de los recorridos | **Parcial** | Captura offline y otras capacidades objetivo tienen decisiones pendientes. Resolver O1–O10 y actualizar diseño antes de implementar |
| **3. Arquitectura de bajo y alto nivel.** | C1–C4, módulos/puertos, decisiones y separación entre arquitectura implementada y objetivo | **Cumplido** | Mantener consistencia al incorporar móvil/despliegue; las vistas objetivo no acreditan componentes ejecutados |
| **4. Desarrollo basado en SDD.** | Interpretación literal de SDD **sin definir por inferencia** | **Pendiente** | Preguntar a la docente qué significa SDD y qué artefactos/proceso espera; después contrastar evidencia existente |
| **5. Pruebas unitarias e integración.** | Reglas, permisos, DB real, cantidades, concurrencia, idempotencia y rollback del corte implementado | **Cumplido** | Mantener suites al evolucionar; no extender este estado a offline ni capacidades sin implementar |
| **6. Pruebas End to End.** | Recorridos de origen, Acopio, Calidad, QR y Logística en navegador | **Cumplido** | Conservar 16 E2E; añadir Android/offline cuando exista el cliente. Chromium no demuestra Flutter |
| **7. Interfaz y experiencia de usuario.** | Formularios React, estados/errores y consulta QR adaptable; pruebas de interacción y tamaños | **Parcial** | Cliente móvil de campo inexistente y evaluación de uso con usuarios no aportada. Decidir plataforma y preparar validación del recorrido real |
| **8. Escalabilidad del frontend y backend.** | Capacidad de evolucionar/atender carga en W1/B1, con evidencia de límites | **Pendiente** | Hay una instancia B1 y límite por IP en memoria. Definir escenario/topología, sesiones/proxy/límites compartidos si se replica y medir; modularidad/contenerización no prueban escala |
| **9. Escalabilidad de base de datos.** | Esquema, índices, consultas acotadas y estrategia de crecimiento de PostgreSQL | **Parcial** | Integridad y concurrencia funcionales probadas; capacidad/crecimiento no medidos. Definir dataset/carga y revisar planes, conexiones y recursos antes de elegir cambios |
| **10. Configuración de dominio y/o subdominio DNS y CDN.** | Resolución de dominio/subdominio y configuración verificable de CDN según el alcance que se confirme | **Pendiente** | No hay evidencia de DNS/CDN operativos. Elegir entorno/dominio, configurar y demostrar resolución/TLS/política de caché; PUBLIC_BASE_URL no configura DNS |
| **11. Implementación de caché.** | Redis por puerto/adaptador para DTO público QR, con expiración e invalidación segura | **Cumplido** | Sin medición de mejora de rendimiento; medirla solo antes de afirmarla. Conservar guard PostgreSQL y no-store público frente a retiro |
| **12. CI/CD.** | Automatización de integración y de despliegue, evaluadas por separado | **Parcial** | CI implementada/probada; CD a entorno persistente no demostrado. Elegir staging y preparar despliegue/rollback por SHA con evidencia |
| **13. Pruebas de carga k6.** | Scripts, entorno/dataset y resultados reproducibles de carga | **Pendiente** | No hay scripts/resultados k6 versionados. Definir perfil, ejecutar baseline y documentar latencia/errores/recursos; contemplar 429 sin desactivar controles |
| **14. Código fuente y base de datos en GitHub.** | Fuente, esquema ejecutable, migraciones y datos ficticios reproducibles versionados; sin credenciales ni datos personales reales | **Cumplido** | Cotejar con docente/PDF si espera algún formato adicional de entrega de BD. No inferir que exige subir una instancia, volumen o dump con datos; mantener reconstrucción segura documentada |
| **15. Informe final.** | Documento final que consolide problema, diseño, implementación, resultados y límites frente a estos 16 criterios | **Parcial** | Documentación técnica dispersa existente; informe final consolidado no aportado. Prepararlo tras confirmar SDD/PDF, citando ejecuciones y pendientes |
| **16. Presentación y dominio del tema.** | Presentación, demostración y defensa explicable por el estudiante | **Pendiente** | No hay archivo de diapositivas/ensayo ni defensa evidenciada. Preparar guion, material y ensayo con preguntas; documentación o CI no acreditan dominio personal |

## Evidencia y nivel de demostración por criterio

| N.º | Qué está implementado/documentado | Qué está probado y dónde verificarlo | Qué está demostrado en un despliegue |
| --- | --- | --- | --- |
| 1 | [Actores](../01-analisis-de-sistema/01-actores.md), [HU](../01-analisis-de-sistema/02-historias-del-usuario.md), [RF](../01-analisis-de-sistema/03-requisitos-funcionales.md), [drivers](../01-analisis-de-sistema/06-drivers-arquitectonicos.md) y [restricciones](../01-analisis-de-sistema/05-restricciones.md) | Trazabilidad técnica revisada en especificaciones/aceptación; enlaces locales comprobados con npm run check | No aplica como prueba operativa a documentos; no se atribuye aceptación docente |
| 2 | [Diseño interno](../03-diseno-de-software/01-diseno-interno.md), [modelo conceptual](../03-diseno-de-software/02-modelo-datos-conceptual.md), [OpenAPI](../03-diseno-de-software/openapi.json), especificaciones de cada incremento | Contratos/imports/enlaces verificados; [aceptación logística](../03-diseno-de-software/07-especificacion-inventario-despacho-entrega.md) vinculada a pruebas | No hay validación en despliegue persistente; la propuesta offline no está ejecutada |
| 3 | [C4 implementado](../04-modelo-c4/modelo-c4.md), [objetivo](../04-modelo-c4/modelo-c4-objetivo.md), ADR y [composición](../../server/composition.js) | Revisión de dependencias/puertos y check de imports; C4 distingue M1/L1 pendientes | Compose reproduce el corte en CI; arquitectura completa/HA no desplegadas |
| 4 | Hay especificaciones, ADR y criterios de aceptación; su existencia no demuestra SDD sin definirlo | No evaluable hasta aclaración docente; no atribuir retrospectivamente una metodología no confirmada | No aplica una afirmación de despliegue para resolver el significado de SDD |
| 5 | [Unitarias](../../tests/unit/logistics.test.js), [integración HTTP](../../tests/integration/logistics.test.js), [rollback](../../tests/integration/logistics-rollback.test.js), [lecturas concurrentes](../../tests/integration/logistics-read-consistency.test.js) y demás suites | 23 unitarias/113 resultados PostgreSQL/2 Redis en verify del SHA citado; [salida local completa](evidence/logistics/review-integration-green.txt); mutaciones detectadas/restauradas | Pruebas contra servicios reales en CI, sin afirmar validación de una operación desplegada persistente |
| 6 | [E2E origen](../../tests/e2e/first-journey.spec.js), [Acopio](../../tests/e2e/intake.spec.js), [Calidad](../../tests/e2e/quality.spec.js), [QR](../../tests/e2e/publication.spec.js), [Logística](../../tests/e2e/logistics.spec.js) | 16 E2E Chromium en verify; 13+3 contra contenedor Compose, evidencias/artifacts del run citado | Contenedor temporal en CI demostrado; no cliente Android ni servicio persistente acreditados |
| 7 | [Web React](../../web/main.jsx), [UI Logística](../../web/logistics/Logistics.jsx), [QR público](../../web/publication/PublicPage.jsx), estilos adaptables | E2E, foco Tab, estados/errores, anchos 320/768/1024/1440; [móvil](evidence/logistics/inventory-delivery-mobile.png), [escritorio](evidence/logistics/inventory-delivery.png) | Capturas del recorrido de prueba, no estudio de UX ni despliegue móvil de campo |
| 8 | React/Vite, Express modular y [contenedores](../../compose.yaml); cliente estático compilado | Build/función individual probados; sin prueba de escalado frontend/backend | No se acreditan réplicas, escalado ni capacidad bajo carga |
| 9 | [Migraciones 001–007](../../migrations/001_initial.up.sql), FK/CHECK/UNIQUE, índices, paginación y [pool DB](../../server/db.js) | PostgreSQL real, carreras y rollback; [SQL Logística](../../tests/integration/logistics-sql.test.js), down/up solo en DB desechable | Sin crecimiento/replicación/particionado ni escala medida en un entorno persistente |
| 10 | URL configurable en [QR](../03-diseno-de-software/06-especificacion-publicacion-qr.md); no equivale a registro DNS/CDN | Validación de URL/host y no-store; sin prueba de resolución/CDN real | DNS/CDN y TLS público no demostrados |
| 11 | [Adaptador Redis](../../server/adapters/public-cache.js), puerto/casos de uso T2, TTL 300 s y versión/hash subordinados a DB | [Pruebas Redis](../../tests/redis/public-cache.test.js), [unitarias](../../tests/unit/public-query.test.js), [HTTP](../../tests/integration/publication.test.js): fría/caliente, actualización, retiro con invalidación fallida y Redis caído | Redis real en CI/Compose; sin comparación de rendimiento ni carga de un despliegue persistente |
| 12 | [Workflow CI](../../.github/workflows/ci.yml), build, audit, checks, tests y Compose con reinicio; no pipeline CD a staging | Verify/Compose/SonarCloud del SHA citado aprobados; [verificación de persistencia](../../scripts/verify-compose.js) | Runner desechable; no despliegue continuo ni servicio persistente demostrado |
| 13 | EQ-01/EQ-02 son [propuestas de escenarios](../01-analisis-de-sistema/08-escenarios-atributos-calidad.md), no resultados k6 | Sin scripts ni ejecuciones k6; duración de tests funcionales no es benchmark | Ninguna medición de carga en despliegue |
| 14 | Fuente [GitHub](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura), migrations, scripts/migrate.js y seeds/fixtures ficticios; detalle abajo | CI instala DB nueva y aplica/revierte/reaplica migraciones en entorno desechable; seed y recorridos generan datos reproducibles | Reconstrucción en CI demostrada; no se exige ni afirma publicar la BD operativa |
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

RF-03/DA01 offline no cumplidos todavía; RF-10 parcial por empaque/pallets diferidos. Parcialidades, devoluciones y correcciones posteriores siguen fuera del incremento. Reportes/ETL/Datamart permanecen proyectados dentro del sistema objetivo, sin añadirlos como un criterio 17 ni afirmar que la transcripción los exige literalmente.

[O1–O10: preguntas, recomendación, consecuencias y dependencias](../03-diseno-de-software/08-especificacion-offline-cosecha.md) permanecen propuestas. Flutter no está implementado; UI responsive no sustituye cliente móvil. El significado de SDD se consulta a la docente antes de evaluar el criterio 4.

## Orden propuesto de siguientes pasos

1. Cotejar la transcripción con el PDF al recibirlo y aclarar SDD con la docente; conservar esta fuente hasta entonces.
2. Resolver O1–O10 (incluidas retención/catálogo y tratamiento de capturas bloqueadas), delimitar Android y preparar su prueba de reinicio/sincronización; implementar solo después de decisión.
3. Elegir y demostrar un entorno persistente; después configurar DNS/CDN y automatizar CD/rollback por SHA, preservando privacidad y retiro QR.
4. Acordar dataset/escenarios, ejecutar k6 y medir frontend/backend/DB y caché. Elegir cambios de escalabilidad según resultados; conservar escenarios permitidos/abuso y límites.
5. Consolidar informe final y presentación, con evidencia por criterio, demo de respaldo y ensayo de defensa. Actualizarlos a medida que se cierren brechas.

No se fusiona PR #7 ni se implementan reglas offline mediante esta actualización documental. CI no es CD; Redis implementado no demuestra una mejora de rendimiento. [Continuidad](continuidad-inventario.md), [revisión Sonar](revision-pr7.md).
