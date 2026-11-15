# Calidad académica: implementación y evidencia

2026-11-15. Q1–Q9 y obligatoriedad de originales por recepción adoptadas por el usuario; **sin aprobación docente ni validación agrícola**. Base main `829f79e` (merge de #3 preservando commits). Rama `feat/calidad`; especificación documental anterior conservada en `docs/especificacion-calidad` y en el historial. [Especificación](../03-diseno-de-software/05-especificacion-calidad-lote.md), [ADR-012](../02-arquitectura/09-decisiones-calidad.md), [guía](../../tecnologia/calidad.md), [OpenAPI](../03-diseno-de-software/openapi.json), [C4](../04-modelo-c4/modelo-c4.md).

## Resultado y límites

Persistencia, API y UI permiten listar lotes, crear evaluación única, guardar/consultar draft, registrar mediciones y cerrar con decisión humana justificada. Permisos por centro/organización, versión y bloqueo del registro serializan escritura/cierre. Operación, evento con antes/después, auditoría y resultado idempotente usan la misma transacción. Closed e historia se protegen contra modificación/borrado/truncate ordinarios. Calidad no modifica masa, aportes, consolidación ni stock y `dispatchAuthorized=false` con cualquier resultado.

Acopio admite temperatura original al crear nueva recepción: °C, instante, observador, procedencia y método; responsable/fecha de registro del servidor. Original, recepción, evento y auditoría se confirman juntos y se vuelven inmutables. Mantener ese campo opcional conserva clientes anteriores y permite representar ausencia; la consecuencia explícita es bloquear Calidad. No se fabrican datos ni se completan históricos. Calidad consulta originales mediante contrato y solo captura posteriores. Cerrar exige originales de todas las recepciones, con respaldo SQL y sin ruta alternativa de aprobación.

RF-06 tiene cobertura de temperatura completa **en cada evaluación cerrada**, junto con materia seca %, conteos y calibre académico g/fruto. Sigue **parcial frente al objetivo productivo**: sin categoría comercial, integración instrumental ni validación agrícola; históricos sin original no pueden cerrarse. RF-07 es **parcial**: resultado manual justificado, sin reglas agrícolas/umbrales ni categorías comerciales. Q2 no certifica representatividad; Q3 no extrapola descarte a kg.

## Validación local

- 13 unitarias aprobadas, sin omisiones: unidades, formato/precisión, rangos matemáticos, conteos, fechas y redondeo exacto informativo.
- 42 resultados de integración HTTP/PostgreSQL real aprobados, incluido primer recorrido, Acopio y Calidad: captura, versiones, cierre completo y faltantes con/sin posterior, tres decisiones manuales, ámbito, replay/revocación, concurrencia, SQL inmutable, no backfill y rollback real de eventos/auditoría. La prueba down/up conserva su alcance y ahora recorre las cuatro migraciones en orden inverso.
- 12 E2E Chromium aprobados: recorridos anteriores y cinco nuevos de Calidad/temperatura original; pérdida de respuesta/replay, conflicto de creación, cierre/recarga closed, faltantes identificados, aislamiento y captura original en recepción. Sin errores de página en los recorridos instrumentados. Capturas revisadas; sin overflow a 320/768/1024/1440 px y foco por teclado comprobado.
- Build, sintaxis/imports/OpenAPI/enlaces y formato aprobados en sus comprobaciones; los resultados finales de contrato/persistencia/CI se registran en el [índice de evidencia](evidence/calidad/README.md).

La ejecución conjunta inicial detectó fixtures que consumían el límite de login y un selector de estado ambiguo durante carga. Se corrigió preparación/sincronización de pruebas, sin elevar límites, ampliar timeouts, omitir pruebas ni quitar aserciones de éxito. Se corrigieron también nombres accesibles de selectores y una fecha original que mostraba solo la fracción: ahora incluye fecha, hora de Lima y milisegundos.

Pruebas en nuevas bases dedicadas del cluster nativo de pruebas, sin tocar demo ni completar registros anteriores. Dependencias, lockfile, workflow y migraciones 001/002 conservados. La migración 003 del borrador se conserva; 004 amplía Acopio y exige originales al cerrar. Ver evidencia para distinguir comprobaciones locales de checks remotos: no se atribuye una CI antigua a una cabeza nueva.
