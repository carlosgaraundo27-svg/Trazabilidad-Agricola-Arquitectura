# Evidencia focalizada de revisión del PR #3

2026-11-14. [Informe](../../revision-pr3.md).

- `unit-red.txt`: UUID sin normalizar reproducido; hipótesis decimal descartada, sin cambio de pesaje.
- `integration-red.txt`: replay UUID 409 y saldo compuesto incoherente reproducidos en PostgreSQL real.
- `integration-green.txt`: 15 resultados de Acopio aprobados tras corregir (14 subcasos y contenedor).
- `unit-summary.json`: resumen de las 5 unitarias del archivo afectado aprobadas; no se presenta como salida cruda.

Bases dedicadas de pruebas; sin modificar demo ni borrar volúmenes. Rutas privadas saneadas. La ejecución automática de CI del último SHA se consulta al publicar; los checks de la cabeza anterior no sustituyen los nuevos.
