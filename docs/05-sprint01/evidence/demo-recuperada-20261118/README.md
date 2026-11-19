# Evidencia local — demo reconstruida 2026-11-18

[Resultado estructurado](resultado.json). Base 22c6e4f; cambios en rama fix/demo-recuperada-inventario, sin publicar ni fusionar. Cantidades proceden de eventos reales de una base nueva ficticia preparada con migraciones/seed/fixtures existentes. No son movimientos recuperados de históricos.

Pruebas: 23 unitarias,113 integración PostgreSQL,4 casos enfocados y17 E2E completos; cero fallos en los resultados finales. Se conservan los tres timeouts previos y el primer intento insuficiente de readiness en .local/demo-20261118_151800; los resultados finales no los borran. Regresión: UI visible con recurso secundario retenido falla usando load y aprueba con commit+UI explícita. Preparación de contextos independientes en paralelo, sin ampliar timeouts, alterar antivirus, eliminar aserciones o simular respuestas de negocio.

La entrega repetida con la clave original respondió200 y con una clave nueva409, sin alterar hashes/conteos del ledger. Se detuvo/reinició exclusivamente la app en3026 y sus registros coincidieron; no se probó reinicio de PostgreSQL/Docker/Windows. Capturas privadas a 390 y 1440 px verificadas.

Auditoría completa aprobada sin cambiar package/lock porque GHSA-fc5q-39xc-vjpf fue retirada por su fuente. No es parche ni certificación de ausencia de riesgos. Veinte avisos Sonar/nueve DDL continúan abiertos; no hubo nuevo análisis.

Dockerdenegó acceso en un intento. Contenedor/volumenreal, dump lógico y restauración permanecen pendientes: no confundir la prueba funcional con recuperación o restauración de datos anteriores. Logs, hashes detallados, credenciales y trazas quedan privados bajo.local y fuera del versionado.
