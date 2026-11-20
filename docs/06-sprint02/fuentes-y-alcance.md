# Fuentes y alcance de la preparación

## Fuentes controladas

| Fuente leída | Identidad | Uso y limitación |
| --- | --- | --- |
| `C:\Users\leona\Downloads\ENTREGABLE-SPRINT-2.pdf` | Una página; SHA256 `59de8c246b2bd87f713067ffd62649bdc2a48954a0bf168edc0fd6ca4120399f` | Enunciado completo: ocho actividades, cinco entregables y criterio de coherencia entre arquitectura, código y pruebas. Lectura por extracción de texto; no se generó otra versión del PDF. |
| `C:\Users\leona\Downloads\Preparacion_Entrega_Sprint_2.md` | SHA256 `ed15739894f48fa73a749d992b8c5a03163266fe3cbd1f8ae3155f46b48f1519` | Dossier completo: brechas, referencias y restricciones. Es preparación, no evaluación aprobada. Permanece en su ubicación original. |
| [Escenarios Sprint 1](../01-analisis-de-sistema/08-escenarios-atributos-calidad.md) | Disponibles en el SHA de código ensayado | Fuente de las siete medidas EQ; se mantiene su condición de propuestas. |
| [PR 14](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/14) | Consulta GitHub: abierto, sin fusionar; head `2f7a28772bed67ebcce48fec2fc9c0da54a14d99`, base main `0ed299ffa31cd4666e556db38762df7bd313c4bb` | Evidencias previas Android atribuidas al PR y su documentación, no repetidas aquí. |

El PDF pide implementar el estilo y enfoque arquitectónicos; especificaciones SDD con aceptación y tareas; REST/OpenAPI; análisis de base/caché; SOLID/patrones cuando corresponda; Jest; y ensayos EQ con herramientas como k6, con simulación progresiva hasta 2.000 VU. Los entregables son código organizado, versión funcional, API documentada, Jest/cobertura y evidencias de calidad. No establece porcentaje mínimo de cobertura ni tiempo de exposición. La sugerencia de CI se materializa sin reemplazar herramientas existentes.

## Identidades Git

| Identidad | SHA | Interpretación |
| --- | --- | --- |
| main remoto consultado | `0ed299ffa31cd4666e556db38762df7bd313c4bb` | No contiene C/D por el solo hecho de existir esta preparación. |
| PR 14 / punto de partida local | `2f7a28772bed67ebcce48fec2fc9c0da54a14d99` | Código funcional y evidencia histórica conservados. |
| Incremento Jest/CI | `e0f0a8ed3115b5f533860574a5d5d01525aa3bb7` | Pruebas añadidas, configuración y lockfile. Sin cambios de reglas de producción. |
| Candidato histórico | `2758271ad96aa8735f35644efe42b2a02a9ff539` | Base38 Jest/45 node:test/8,48 %, laboratorio todavía preparado. |
| Cobertura y laboratorio nuevos | `02ca31bd03dc1626bc9f0c610405b8a673c0fe07` | 83 Jest/49 node:test; PG/Redis/sync50/k6 reales aislados y Sonar LCOV importado. |
| Registrador real CI | `20be52d72d7ebbe488a660307230d9857f44d4b5` | Mismas pruebas/producción; publica manifiesto remoto,83 Jest/49 node:test y2859/3997 líneas71,52 % comprobados en su job Jest. |
| Capacidad, HTTP y recuperación Redis | `5fd294c76f360d09ab1ade5c2d870b30d3754234` |100 Jest/52 node:test,82,66 % de backend; screening con2.000 VU y claves/IP distintas, recuperación del mismo adaptador Redis y15 negativos HTTP. [Resultados y alcance](resultados-capacidad.md). |

Los commits documentales posteriores incorporan el reporte de ese candidato. El [manifiesto](evidence/2758271ad96aa8735f35644efe42b2a02a9ff539/verification.json) contiene SHA256 de los archivos ensayados. Si cambia código, pruebas, dependencias o CI, generar nueva evidencia, sin sobrescribir la anterior. No atribuir resultados antiguos al nuevo SHA por semejanza de ramas. Para una cabeza posterior que solo cambia documentos, comparar los archivos de código con el candidato antes de reutilizar esta evidencia; CI deberá comprobar la cabeza publicada.

Se conservan manifiestos anteriores de `addab5f9` y `b9809543`; el primero cubría 41 node:test y el segundo 45. El corte nuevo mantiene esas45 y añade4 regresiones del evaluador de mediciones/ACK (49). Git conserva ruta absoluta/PATH fijo de hijo, sin modificar el entorno de los servicios activos. Los [resultados nuevos](mediciones-ejecutadas.md) no renuevan evidencia Android histórica.

`origin` local apunta a un bundle de recuperación, no a GitHub; se conserva. No se crearon clones, worktrees ni copias del repositorio. La publicación remota se limita a la rama de preparación y su PR dependiente; no fusiona ni modifica la cabeza del PR 14.

## Protección del ensayo Android

Según la [matriz D histórica](../05-sprint01/incremento-D-matriz-android.md), T0 vigente es 20/11/2026 09:29:42.446 Lima, límite exacto 21/11/2026 09:29:42.446 Lima; siguiente comprobación humana prevista desde 09:31 Lima. **Estado al corte: pendiente de comprobación.** Transcurrir el plazo no prueba el resultado.

Durante esta preparación no se accedió al dispositivo, no se ejecutó ADB/Flutter contra él, no se reinició ni reinstaló app, no se cambió sesión ni reloj y no se restableció reverse3043. No se leyó su configuración privada. La verificación final debe respetar mismo boot/ancla y tiempo monotónico, conservar consultas, bloquear confirmación por vencimiento y comprobar recuperación solo después de la verificación offline. Esta tarea no autoriza intervenir el dispositivo.

Los ensayos de carga, PostgreSQL/Redis y E2E se posponen localmente: la máquina comparte recursos con el backend del ensayo. Los tests ejecutados son secuenciales, sin `.env` ni conexiones a sus servicios. El laboratorio preparado exige **otra máquina/runner**; puertos propios por sí solos no garantizan aislamiento de CPU, disco o energía. La variable de confirmación es una guarda de operación, no una prueba automática de independencia física.

## Publicación permitida

Solo código, documentos, resultados sintéticos sanitizados y referencias públicas. Excluidos de esta entrega: secretos, cookies/CSRF, certificados/claves, SQLite/WAL, dumps, datos personales reales, APK privados, configuraciones locales y reportes del antivirus. No se inspeccionaron ni publicaron esos archivos. `coverage/` y `.local/` siguen fuera de Git; los artifacts de CI se limitan a cobertura. Las contraseñas literales de servicios de laboratorio identificadas como ficticias no deben reutilizarse fuera de él.
