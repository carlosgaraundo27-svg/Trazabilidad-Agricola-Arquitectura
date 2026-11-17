# Revisión individual de PR #7 y avisos SonarCloud

2026-11-16. Cabeza recibida **40679b4ad2b686292e6576426a1f7128de517477**, base main 47d827c. PR #7 abierto, sin fusionar. Se revisaron código, pruebas, 006/007, permisos y los [20 avisos por clave](evidence/logistics/critical-after.json); el check de 40679b4 confirma 20 abiertos, 0 aceptados y Quality Gate aprobado. No hay comentarios de revisión externos pendientes en GitHub al consultar este corte. Este documento distingue severidad del analizador de bloqueo técnico observado.

**Actualización de seguridad 2026-11-17:** el bloqueo de picomatch se diagnostica en la [revisión separada](revision-picomatch.md). No hay release compatible corregido publicado en la consulta; verify sigue fallando y PR #7 no debe integrarse. Esto no cambia ni resuelve los 20 avisos Sonar/nueve DDL descritos abajo.

## Los nueve críticos DDL — plsql:S1192

Todas las filas son CODE_SMELL/CRITICAL, no BUG ni VULNERABILITY. Las líneas corresponden a 40679b4. Se conservan **abiertas** en Sonar; no se modifica gate, perfil, exclusiones ni estado manual. Los valores repetidos se enumeraron en el archivo para verificar el contexto, sin confundir bloques SQL distintos con un único ámbito de constantes.

| Clave / archivo:línea | Problema concreto | Impacto | Corrección propuesta o justificación verificable |
| --- | --- | --- | --- |
| AaHmZCEveKABQuiq77EN / migrations/006_inventory.up.sql:10 | released aparece en catálogo, coherencia de liberación, evento y constante del guard (4 usos) | Una futura modificación solo del catálogo podría divergir de liberación/eventos | Conservar contratos explícitos; el guard ya usa released_state. CONSTANT tiene ámbito del bloque y no sustituye CHECK/eventos externos. Probar quarantine→released solo con closed/accepted y versión exacta; actualización posterior protegida |
| AaHmZCEveKABQuiq77ER / migrations/006_inventory.up.sql:10 | quarantine en default, catálogo, coherencia y guard de admisión (4) | Cambiar un valor sin actualizar default/guard impediría admisión o dejaría estado incoherente | Default/INSERT de admisión y rechazo de liberación ajena probados contra PostgreSQL. No reemplazar DDL por una constante inaccesible. Futuro cambio contractual requiere migración adicional |
| AaHmZCEveKABQuiq77EM / migrations/006_inventory.up.sql:26 | dispatched en catálogo de movimientos, índice de salida única y catálogo de eventos (3) | Divergencia podría romper la protección de doble salida o identificación del movimiento | Conservar el predicado explícito del índice UNIQUE. Carreras de dos salidas y entrega repetida verifican un solo descuento. No introducir una función de estado solo para reducir el contador |
| AaHmZCEveKABQuiq77EO / migrations/006_inventory.up.sql:26 | admitted en catálogo, dos ramas de vínculo shipment_id, índice único y eventos (5) | Divergencia comprometería admisión única y vínculo nulo solo para ingreso | Doble admisión con claves distintas, UNIQUE de admisión y SQL con masa errónea probados. Los contratos independientes requieren el mismo vocabulario; mantenerlo documentado, sin editar migración aplicada |
| AaHmZCCgeKABQuiq77D_ / migrations/007_shipments.up.sql:6 | draft en default, catálogo, coherencia temporal y constante del guard (4) | Default y transiciones podrían divergir al evolucionar estados | Guard usa draft_state; DDL mantiene valores explícitos. Crear draft y cancelar sin movimientos adicionales está probado. Sin un cambio de dominio, no corresponde reconstruir CHECK/índices |
| AaHmZCCgeKABQuiq77EB / migrations/007_shipments.up.sql:6 | delivered en catálogo, dos CHECK, índice activo, constante del guard y guard de entrega (6) | Un cambio aislado podría permitir segundo despacho o entrega incoherente | Estado final conserva índice activo y entrega única. Se prueban dos confirmaciones y H=0 después de entregar; entrega total SQL ligada a salida. Los dos guards tienen ámbitos distintos |
| AaHmZCCgeKABQuiq77EE / migrations/007_shipments.up.sql:6 | in_transit en catálogo, CHECK de fecha/transporte, índice y constante (5) | Riesgo de salida sin transporte/fecha o de habilitar otro despacho | Se conservan CHECK/índice y constante local del guard. Pruebas: 15 null/vacío/espacios, fecha límite 1 ms, salida/cancelación concurrentes y bloqueo posterior |
| AaHmZCCgeKABQuiq77EF / migrations/007_shipments.up.sql:6 | cancelled en catálogo, CHECK temporal y constante del guard (3) | Estado final podría reabrirse o conservar fecha de salida inválida | Cancelación solo draft/reserved; guard impide salida/reapertura de cancelado. La reserva se libera por movimiento transaccional. No cambiar el catálogo histórico para borrar el aviso |
| AaHmZCCgeKABQuiq77EI / migrations/007_shipments.up.sql:6 | reserved en catálogo, CHECK temporal, índice activo y constante (4) | Riesgo de admitir reservas simultáneas si catálogo e índice divergen | Índice UNIQUE y bloqueo de entrada, más pruebas de dos reservas y stock insuficiente. Guard usa reserved_state. Conservar predicado legible y revisar juntos contrato, guard y pruebas en cambios futuros |

**Evaluación:** riesgo de mantenimiento futuro, sin defecto de integridad reproducido en el corte. Una constante local PL/pgSQL no es una constante global SQL: [declaraciones](https://www.postgresql.org/docs/18/plpgsql-declarations.html). Extraer funciones para CHECK exige conservar su semántica inmutable y revalidar filas cuando cambian; los [CHECK](https://www.postgresql.org/docs/18/ddl-constraints.html) y [predicados de índices](https://www.postgresql.org/docs/18/sql-createindex.html) tienen contratos propios. No se adopta SQL dinámico, catálogo mutable ni funciones auxiliares solo para ocultar duplicación. No se afirma que estos nueve estén corregidos o aceptados por Sonar.

## Cinco avisos de dialecto — plsql:VarcharUsageCheck

| Clave / archivo:línea | Problema notificado | Impacto de aplicarlo literalmente | Resolución verificable |
| --- | --- | --- | --- |
| AaHmZCEveKABQuiq77EJ / migrations/006_inventory.up.sql:11 | reference varchar(120) recomienda VARCHAR2 | PostgreSQL estándar de esta instalación no ofrece ese tipo Oracle; rompería admisión/migración | Conservar límite 120, validación API y varchar; migración ejecutada en PostgreSQL real |
| AaHmZCEveKABQuiq77EK / migrations/006_inventory.up.sql:11 | evidence_ref varchar(500) recomienda VARCHAR2 | Migración inválida; perder límite cambiándolo a text sin criterio | Conservar varchar(500), evidencia obligatoria y DTO interno |
| AaHmZCEveKABQuiq77EL / migrations/006_inventory.up.sql:13 | release_reason varchar(500) recomienda VARCHAR2 | Romper liberación o alterar contrato de longitud | Conservar tipo/límite y motivo auditado obligatorio |
| AaHmZCCgeKABQuiq77D8 / migrations/007_shipments.up.sql:25 | evidence_ref de entrega varchar(500) recomienda VARCHAR2 | Romper creación de entregas o límite | Conservar varchar(500); entrega y fallo real de escritura probados |
| AaHmZCCgeKABQuiq77D9 / migrations/007_shipments.up.sql:82 | reference de guía histórica varchar(120) recomienda VARCHAR2 | Romper registro histórico/guía única | Conservar varchar(120), normalización y clave compuesta; corrección/cancelación no permite reutilización |

[Tipos de caracteres PostgreSQL 18](https://www.postgresql.org/docs/18/datatype-character.html) documenta varchar(n). Se justifican como recomendaciones de dialecto no aplicables, sin marcarlas manualmente falsas ni excluir SQL. Esta conclusión no se extiende a todas las reglas PL/SQL: ocho S1192 aplicables se corrigieron antes y permanecen en el historial.

## Seis await en bucle — javascript:S9382

| Clave / archivo:línea | Problema notificado / caso concreto | Impacto | Resolución verificable |
| --- | --- | --- | --- |
| AaHmZCF1eKABQuiq77Ev / scripts/test-compose.js:63 | await fetch dentro del sondeo health tras reiniciar app | Un sondeo concurrente sin límite puede acumular peticiones; quitar await no comprueba recuperación | Secuencia intencional: deadline 60 s, timeout 2 s por fetch y pausa 500 ms. Compose prueba recuperación real y termina si no recupera |
| AaHmZCF4eKABQuiq77E2 / scripts/logistics-fixture.js:28 | await creación de pre-lote por cantidad ficticia | El ID creado alimenta la recepción siguiente; fire-and-forget rompe origen y manejo de fallos | Conservar secuencia de cada cadena. Paralelizar cadenas completas sería posible, sin necesidad funcional ni mejora de rendimiento afirmada |
| AaHmZCF4eKABQuiq77E3 / scripts/logistics-fixture.js:40 | await recepción del pre-lote recién creado | Confirmación requiere ID y recepción persistida | Conservar pre-lote→recepción→confirmación por servicio, no insertar hechos ficticios a medias ni fingir histórico |
| AaHmZCF4eKABQuiq77E4 / scripts/logistics-fixture.js:54 | await confirmación antes de consolidar | Consolidación exige todas las recepciones confirmadas | Conservar barrera secuencial; pruebas de composición real 37.125+36.000=73.125 kg y variantes |
| AaHmZCF3eKABQuiq77E0 / scripts/seed-logistics.js:42 | await INSERT usuario dentro de una transacción/conexión | Cada concesión depende del usuario/FK; no esperar dificulta rollback y propaga errores fuera del callback | Conservar orden y await en una única transacción; ON CONFLICT permite seed repetido sin stock/backfill |
| AaHmZCF3eKABQuiq77E1 / scripts/seed-logistics.js:47 | await INSERT de concesiones específicas | Deben completarse o revertirse todas antes del commit; compartir una conexión no crea transacciones paralelas | Conservar transacción y cada permiso explícito; tests revocan cada concesión y rechazan acción/replay ajenos |

## Revisión del recorrido

| Etapa | Invariantes revisadas y pruebas |
| --- | --- |
| Admisión | Cantidad real igual a aportes inmutables; una entrada por lote; quarantine; doble admisión/replay concurrentes; sin movimientos de históricos no admitidos |
| Liberación | Acción independiente, motivo/versiones, Calidad closed/accepted del mismo lote/centro y versión; pending/draft/observed/rejected bloqueados; Calidad/QR no conceden permiso |
| Reserva | Lote completo, H sin cambio y U=H−R; índice activo y bloqueo lote→entrada→despacho; dos reservas distintas y stock insuficiente; sin expiración automática |
| Cancelación previa | reserved libera R, draft no genera movimiento ni avance de inventario; evento/audit/request en ambos; carrera con salida tiene un ganador; posterior a salida bloqueada |
| Salida | Transporte completo, fecha válida, versiones y concesión; H=A−salida, R=reservado−liberado−salida; una salida por entrada incluso con claves distintas |
| Entrega | Cantidad recibida igual a despacho; T=salida−entrega y E=entrega. H no resta entrega. Entrega única/replay estable; sin merma ni devolución automática |
| Atomicidad | Operación, versión, movimiento, evento, auditoría, guía/entrega y clave en misma transacción. 42 fallos reales verifican rollback; evento faltante no se trata como éxito |
| Lecturas concurrentes | Entrada antes de despacho; nueva barrera PostgreSQL enfrenta lectura de detalle/historia con salida, mostrando snapshot previo coherente y estado/evento posterior al commit |
| Privacidad QR | Proyección pública aprobada/permitida, sin transporte, destino, contactos, actores internos ni datos financieros. Prueba compara DTO antes/después de operaciones logísticas; G no escribe caché pública |

Revisión independiente de solo lectura del mismo HEAD: sin bloqueo funcional observado, dos mejoras de cobertura incorporadas (draft y lectura concurrente). La prueba nueva se mutó quitando FOR SHARE del repositorio: ambas vistas fallaron por no bloquear la salida; fuente restaurada y contrastada con Git. [Mutación detectada](evidence/logistics/mutation-read-snapshot-red.txt). No se modificaron migraciones 001–007 ni comportamiento productivo para el triage.

## Migraciones y criterio de integración

006/007 ya se ejecutaron en entornos de prueba: este incremento las trata como publicadas. Sus bytes quedan intactos respecto a 40679b4; no se reescribe historia ni se añade una migración vacía para hacer desaparecer avisos de origen. Si surge un defecto funcional, corregir con 008+ y prueba de upgrade con filas existentes, además de instalación limpia; conservar estado/cantidades/históricos. La prueba down/up solo usa base nueva desechable, nunca demo.

**Dictamen técnico:** no se encontró un defecto productivo aplicable que bloquee integrar el alcance académico; las nueve S1192 se conservan como deuda de mantenibilidad documentada por clave. Listo técnicamente si la nueva cabeza conserva verify/Compose/SonarCloud aprobados. Esto no equivale a aprobar todo el sistema objetivo, acreditar despliegue continuo ni aprobación docente/agrícola. PR #7 debe permanecer **sin fusionar** por instrucción del usuario. Los checks del SHA final se registran en el cuerpo del PR; no trasladar resultados entre SHAs.

La revisión local completa aprobó **113 resultados PostgreSQL** en una base nueva, incluidos los dos snapshots concurrentes; 23 unitarias, formato y check de módulos/contratos/enlaces también aprobaron. [Salida íntegra](evidence/logistics/review-integration-green.txt). Las migraciones conservan sus [hashes Git](evidence/logistics/review-migration-hashes.json). Reproducir pruebas con los comandos/base nueva de [implementación](inventario-implementacion.md). [Estado inicial de checks](evidence/logistics/pr7-review-initial.json); [continuidad](continuidad-inventario.md). Offline queda solo especificado y pendiente de decisión.
