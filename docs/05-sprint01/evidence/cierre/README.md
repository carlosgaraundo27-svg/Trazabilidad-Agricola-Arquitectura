# Evidencias del cierre

Resultados de la revisión del primer recorrido desde el clon de trabajo. Los logs seleccionados registran el fallo previo de cierre, la corrección, las pruebas actuales y la mutación de regresión. Se excluyen `.env`, datos PostgreSQL, dependencias y trazas con sesiones.

Los resultados de Compose local y CI remota se registran por separado en el [informe de cierre](../../cierre-primer-recorrido.md); los resultados locales nativos no acreditan Docker.

[CI remota](ci-remota.json) y [Compose en Actions](compose-ci.txt) registran el SHA probado, los dos jobs aprobados y el ID preservado tras reiniciar los contenedores. No contienen el `.env` efímero del runner.
