# Evidencia de revisión del PR #5

2026-11-16, sobre cabeza inicial b14120c. [Revisión y límites](../../revision-pr5.md).

`lock-mutation-red.txt`: retirar FOR SHARE de la lectura pública hace fallar la nueva prueba coordinada de lectura/retiro contra PostgreSQL. `hash-mutation-red.txt`: omitir comparación de hash permite contenido alterado y la nueva prueba falla. Ambos archivos productivos se restauraron exactamente antes de la verificación verde.

`integration-green.txt`: 53 resultados aprobados, cero omitidos, base PostgreSQL nueva exclusiva. Resumen unitario: 19 aprobadas, cero omitidas; build/formato/OpenAPI/imports/enlaces y audit aprobados. Las 2 pruebas Redis real y los 13 E2E se verifican en CI junto con Compose sobre el SHA publicado. El resultado final se registra en la continuidad y en GitHub, sin reutilizar checks anteriores como si pertenecieran a la nueva cabeza.

Los logs prueban corrección funcional, concurrencia y detección de regresiones; sus duraciones no son un benchmark. Se preservaron todas las pruebas existentes y las migraciones 001–005. No se ejecutó integración contra la demo.
