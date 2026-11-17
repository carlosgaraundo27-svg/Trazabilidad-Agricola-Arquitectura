# Continuidad — Inventario, Reserva, Despacho y Entrega

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
