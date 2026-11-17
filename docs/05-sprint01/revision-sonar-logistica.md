# Revisión de hallazgos SonarCloud de Logística

## Historial y alcance del reporte

El análisis inicial del PR #7 sobre 9429a2d notificó 61 CODE_SMELL. La siguiente cabeza c91a90a añadió un **BLOCKER de seguridad**, `githubactions:S8482`, clave `AaHmZtM-2XsEZRRQrjcs`, en el workflow temporal `logistics-review.yml:14`: patrón curl→node. No se atribuye a las reglas de inventario. [Reporte completo anterior](evidence/logistics/critical-before.json).

Ese workflow fue retirado y sustituido por una lectura urllib/json de Python que trata la respuesta remota como datos. No se evalúa ni ejecuta contenido descargado. No se añade una supresión ni se marca el hallazgo como falso positivo. HEAD local d857fbd fue publicado como c4682c75f727ecc863b1fbf319c6c293a9446b69: verify, Compose y SonarCloud aprobaron; el análisis quedó en 28 avisos y 0 aceptados manualmente.

Los 33 avisos JavaScript aplicables del primer reporte se corrigieron sin rebajar controles: validación de stock/transporte/entrega separada de la orquestación; metadatos de evento como objeto; selector de bloqueo explícito; política pura fuera del cierre; retorno Promise booleano uniforme; output y label/span; clase decimal concisa y new Error. La complejidad crítica `javascript:S3776` de 21 se eliminó del comando al separar políticas. [Triage inicial, histórico](evidence/logistics/sonar-triage.json).

## Reevaluación de S1192

La clasificación inicial de los 17 S1192 como no aplicables por dialecto fue demasiado amplia. PostgreSQL **sí admite CONSTANT dentro de PL/pgSQL**, con alcance del bloque; [documentación PostgreSQL 18](https://www.postgresql.org/docs/18/plpgsql-declarations.html). Se corrige lo aplicable sin introducir SQL dinámico, funciones ficticias ni quitar CHECK/FK/triggers:

| Claves del primer reporte | Resolución concreta |
| --- | --- |
| AaHmZCEveKABQuiq77EQ | SQLSTATE 23514 declarado una vez en inventory.guard_entry y reutilizado por todas sus excepciones |
| AaHmZCEveKABQuiq77EP | version_field y mutable_fields declarados una vez; comparación NEW/OLD usa la misma lista inmutable, conservando avance obligatorio de versión |
| AaHmZCCgeKABQuiq77EH | SQLSTATE como constante local en guard_shipment y guard_amount; estados y lista de campos mutables también explícitos en guard_shipment |
| AaHmZCCgeKABQuiq77D-, AaHmZCCgeKABQuiq77EA, AaHmZCCgeKABQuiq77EC, AaHmZCCgeKABQuiq77ED, AaHmZCCgeKABQuiq77EG | Cada campo requerido de transporte se comprueba una vez con COALESCE(length(trim(...)),0)>0. Guía usa la columna generada canónica; claim_guide reutiliza NEW.guide_reference después de generarse. Null/vacío/espacios siguen rechazados |

La prueba SQL se amplía con **15 rechazos**: cinco campos de transporte por null, vacío y espacios. Mantiene las aserciones previas y comprueba que el despacho sigue reservado con los mismos kg/versión después de esos fallos. La batería PostgreSQL nueva conserva 109 resultados aprobados, sin omisiones, incluida migración down/up, carreras y 42 escenarios de rollback real.

Quedan repeticiones deliberadas entre sentencias DDL y funciones, que una constante local no puede sustituir globalmente:

| Claves iniciales agrupadas | Literal/contexto conservado y evaluación |
| --- | --- |
| AaHmZCEveKABQuiq77EN / AaHmZCEveKABQuiq77ER | released/quarantine en default, catálogo CHECK, coherencia de liberación, evento y guard. La función ya tiene su constante local cuando hay más de un uso. Son contratos distintos, no referencias a una constante global existente |
| AaHmZCEveKABQuiq77EM / AaHmZCEveKABQuiq77EO | dispatched/admitted en catálogo de movimientos, vínculo nullable a despacho, índice de admisión/salida única y catálogo de eventos. Compartirlos mediante SQL dinámico o funciones solo para reducir el contador añadiría dependencia innecesaria a la integridad |
| AaHmZCCgeKABQuiq77D_, AaHmZCCgeKABQuiq77EB, AaHmZCCgeKABQuiq77EE, AaHmZCCgeKABQuiq77EF, AaHmZCCgeKABQuiq77EI | Estados de despacho usados por CHECK de coherencia temporal/transporte, índice de reserva activa y guard de transición. La función ahora usa constantes; los CHECK e índices mantienen valores explícitos |

Estos nueve casos se documentan como **avisos de mantenibilidad revisados que pueden permanecer abiertos**, no como defectos funcionales ni como falsos positivos cerrados en Sonar. No se oculta el riesgo de divergencia futura: cualquier cambio de estados debe actualizar DDL, guard y pruebas juntos. La cifra final se confirma con el análisis de la nueva cabeza, no con el conteo local de cadenas.

## Otros avisos conservados y límites

- Cinco plsql:VarcharUsageCheck recomiendan VARCHAR2 (Oracle). Aquí se usa el tipo válido varchar(n) de [PostgreSQL 18](https://www.postgresql.org/docs/18/datatype-character.html), con límites intencionales. Son avisos de dialecto no aplicables; sustituirlo por VARCHAR2 rompería migraciones.
- Seis javascript:S9382: tres await del fixture encadenan pre-lote→recepción→confirmación; dos del seed pertenecen a una misma conexión/transacción de cuentas y concesiones; el sondeo health tiene plazo de 60 s, timeout de petición de 2 s y pausa de 500 ms. Se conserva secuencia y no se declara mejora de rendimiento por paralelizarla.

No se modifican Quality Gate, perfiles, exclusiones, permisos del analizador ni estados manuales de hallazgos. Las migraciones 001–005 permanecen intactas. 006/007 pertenecen al PR aún no integrado; pruebas en bases desechables nuevas, sin backfill ni borrado de históricos de la demo. El PR #7 sigue abierto y sin fusionar. Las decisiones son académicas, sin aprobación docente ni validación agrícola.
