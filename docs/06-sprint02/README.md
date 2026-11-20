# Sprint 2: implementación y validación de la arquitectura

Preparación de entrega de Trazabilidad y Gestión Comercial de Palta Hass. Corte documental: 20/11/2026. **Cumplimiento parcial; no es aprobación docente ni certificación de rendimiento.** Se leyó completo el enunciado oficial de una página antes de implementar esta preparación.

## Lectura y entrega

1. [Fuentes, alcance y SHA](fuentes-y-alcance.md): control del PDF y dossier, rama y protección del ensayo Android.
2. [Matriz de ocho actividades y cinco entregables](matriz-cumplimiento.md): evidencia y faltantes en cada fila.
3. [Reporte de verificación](reporte-verificacion.md): resultados ejecutados, cobertura, fallos y deuda.
4. [Arquitectura, SOLID y patrones](arquitectura-implementada.md): vínculos a código y límites de la interpretación.
5. [Trazabilidad SDD](trazabilidad-sdd.md): RF, aceptación, tareas, archivos y pruebas.
6. [Validación EQ-01 a EQ-07](validacion-atributos.md): medidas, PostgreSQL, Redis, carga y criterios de interrupción.
7. [Guía reproducible y demostración](guia-demostracion.md): comandos seguros, laboratorio externo y API.
8. [Evidencia sanitizada por SHA](evidence/README.md).

Código ensayado: [`addab5f9101a5d6288fb325d1adda395553d967c`](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/commit/addab5f9101a5d6288fb325d1adda395553d967c). Jest: 38/38; node:test: 41/41; OpenAPI/límites de imports: aprobados. Cobertura Jest del backend: **339/3997 líneas, 8,48 %**. El PDF no fija mínimo porcentual. Las pruebas anteriores se conservan.

La rama `chore/preparacion-sprint02` parte de PR 14, cabeza `2f7a28772bed67ebcce48fec2fc9c0da54a14d99`. El PR de preparación debe tener como base `feat/offline-captura-outbox-sync` para aislar su diff. Ambos quedan abiertos, sin fusión. Esto no convierte el incremento offline en parte de main (`0ed299ffa31cd4666e556db38762df7bd313c4bb`, consultado en GitHub).

**Pendientes materiales:** mediciones PostgreSQL/Redis reales y k6 en otra máquina; matriz HTTP negativa completa; 50 pendientes en 60 s; comprobación del ensayo Android de 24 h; corte de energía; monitoreo mensual; ETL/Datamart y decisiones agrícolas pendientes. No ejecutar los procedimientos históricos de Android desde esta preparación.

Los documentos históricos siguen en [Sprint 1](../05-sprint01/README.md), [diseño](../03-diseno-de-software/01-diseno-interno.md) y [C4](../04-modelo-c4/modelo-c4.md). No se trasladaron ni copiaron.
