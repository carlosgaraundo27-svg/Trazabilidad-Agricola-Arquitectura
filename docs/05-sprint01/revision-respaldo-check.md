# Revisión del CHECK y revalidación del respaldo — 2026-11-19

## Restricción y diferencia exacta

Tabla `intake.receipt_temperatures`, restricción `receipt_temperatures_value_c_check`, tipo CHECK validado. `value_c` es numeric sin typmod y NOT NULL. Definiciones completas leídas de los snapshots:

Original:

```sql
CHECK ((((value_c >= '-999999.99'::numeric) AND (value_c <= 999999.99)) AND (scale(value_c) <= 2)))
```

Restaurada:

```sql
CHECK (((value_c >= '-999999.99'::numeric) AND (value_c <= 999999.99) AND (scale(value_c) <= 2)))
```

La comparación cruda fallaba exclusivamente en `constraints[119].definition` de los reportes originales: agrupación `(A AND B) AND C` frente a `A AND B AND C`. No cambian columna, casts, constantes, operadores o escala. PostgreSQL documenta que [pg_get_constraintdef reconstruye la definición, no devuelve el DDL original](https://www.postgresql.org/docs/18/functions-info.html). El AND ternario es asociativo incluso con NULL; la equivalencia no se basa solo en comparar ejemplos.

Origen y restauración existentes corren en PostgreSQL **18.6 (Debian18.6-1.pgdg13+2), x86_64 Linux**, versión numérica180006, comprobada de nuevo mediante SQL de solo lectura. El TOC original identifica servidor18.6 y pg_dump18.6; formato custom1.16-0/gzip. **No se registraron las versiones exactas originales de pg_restore/psql**: no se infieren del pg_dump. El auxiliar corregido las registra en cualquier ejecución futura. La nueva validación usa Node24.16.0/pg8.23.1 y Python3.12.10, sin Docker ni herramientas PostgreSQL CLI. Las firmas de Node/Python se comprobaron en la revisión precedente; no se ejecutó ningún SDK.

## Prueba aislada y resultado

`scripts/backup/probe-check.js` creó una base nueva `backup_check_*` en el cluster identificado. Nunca abre la demo ni aplica sus migraciones. Ejecutó **80 inserciones comprobadas** sobre cuatro tablas: ambas definiciones, con columna nullable y con NOT NULL. Incluye0,−0, ±12.34, ±999999.99, límites vecinos, ±1000000, exceso de escala incluso ceros finales, NULL, NaN y ±Infinity. Resultado idéntico en ambas representaciones:

- Rango y escala válidos: aceptado.
- Fuera del rango, escala>2 y valores no finitos: SQLSTATE23514.
- NULL: aceptado por CHECK aislado (UNKNOWN), rechazado por NOT NULL con23502, igual que en la tabla real.
- Las27 combinaciones true/false/NULL de A/B/C coinciden usando IS NOT DISTINCT FROM.
- Control negativo real: cambiar `<=999999.99` a `<999999.99` rechaza el límite antes válido; detectado.

No se modificó el esquema original. Tablas de prueba revertidas en su base aislada; base y evidencia privada conservadas. [Semántica CHECK](https://www.postgresql.org/docs/18/ddl-constraints.html), [numeric/NaN/Infinity](https://www.postgresql.org/docs/18/datatype-numeric.html).

## Corrección limitada del comparador

`scripts/backup/snapshot_compare.py` permite **solo las dos cadenas exactas anteriores**, para la identidad exacta de esta restricción, tipo c, validated=true y metadatos idénticos. No elimina CHECK del análisis, no borra paréntesis globalmente ni normaliza constantes, Unicode, casts, orden, operadores u otras restricciones. Las demás partes de ambos snapshots siguen comparándose estrictamente.

Conserva `rawMatchesSnapshot=false` y la diferencia textual; añade `matchesSnapshot=true` tras aplicar esa única regla, con `representationDifferences` y nombre de regla. Cambiar límite, escala, AND→OR, identidad, validación, tipo, filas/hashes, migraciones o huérfanos sigue fallando. Una alteración de Unicode también falla.

TDD: el comparador estricto reprodujo dos fallos para la agrupación equivalente; tras la corrección, **nueve pruebas Python aprobadas**. Incluyen CLI que sale con código distinto de0 para discrepancia real, inmutabilidad de entradas, guardas del helper real con dobles de I/O, metadatos/Unicode estrictos y rechazo de imagen sin digest oficial. Dobles sintéticos no son respaldos. CI conserva sus gates y añade esta suite.

El auxiliar público `scripts/backup/restore_docker.py` conserva failed_validation y lanza error antes de asignar éxito cuando hay diferencia real o huérfanos. Se retiró el retorno anticipado privado que declaraba imagen verificada con un placeholder local. La verificación oficial vuelve a ser obligatoria, sin fallback. El antiguo punto de entrada privado delega en la versión versionada; versiones anteriores preservadas. No se ejecutó un nuevo dump/restore ni se repitió un intento Docker denegado.

## Nueva evidencia sobre la restauración existente

La primera comparación contra la base restaurada viva rechazó además un dato corrupto del reporte antiguo: `receipt_temperatures_unit_check` aparecía como `CHECK ((unit = '�C'::text))`, mientras el catálogo real usa `CHECK ((unit = '°C'::text))`. La causa de esa corrupción del reporte no se atribuye sin evidencia a PostgreSQL o a la restauración. Se guardó el nuevo fallo, con exit1. No se añadió ninguna excepción para Unicode.

Para resolverlo, `scripts/backup/revalidate_report.py` recogió snapshots nuevos de **ambas bases en transacciones READ ONLY**, con default_transaction_read_only=on y cluster esperado. Comprobó que tablas/filas/hashes/migraciones/FK de la fuente siguen iguales al snapshot del dump conservado; verificó tamaño y SHA-256 del archivo. El CHECK de unidad real en origen y destino coincide exactamente en `°C`; el único delta entre catálogos vivos es la agrupación conocida del CHECK numérico.

Nueva evidencia privada: `status=restored_snapshot_verified`, `rawMatchesSnapshot=false`, **matchesSnapshot=true**, **foreignKeysValid=true**, migraciones **001–007**, exit0. Se enlaza criptográficamente con el reporte/dump y la prueba aislada; se preservan los tres reportes y dumps anteriores, incluido el status falso de éxito, sin sobrescribirlos. La revalidación genera otro archivo exclusivo dentro de .local y no imprime credenciales.

**Alcance acreditado:** datos/restauración existente equivalentes al snapshot conservado y catálogos vivos equivalentes bajo la regla limitada. No es un nuevo respaldo ni acredita propietarios/ACL. La afirmación antigua officialHttpsVerified=true con repositoryDigest=local **no es válida**; la procedencia de esa imagen no quedó acreditada por el reporte antiguo. No convertir esta revalidación de datos en una certificación de imagen o de ACL.

## Reproducción sin exponer datos

Pruebas sin Docker: `python -m unittest discover -s tests/backup -v` y `node --test tests/unit/harvest-sync.test.js`. La sonda requiere BACKUP_PROBE_URL apuntando al catálogo postgres local y BACKUP_EXPECTED_SYSTEM_ID explícito; crea su propia base aleatoria. Revalidate exige URL de lectura de fuente y restauración concreta, BACKUP_NODE verificado, reporte y prueba privados existentes y un archivo de salida nuevo bajo .local. No copiar credenciales a documentación/CLI/chat. Esta tarea no requiere repetir el procedimiento manual de respaldo.
