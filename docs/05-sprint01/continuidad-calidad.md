# Continuidad: propuesta de Calidad

2026-11-14. Rama local `docs/especificacion-calidad`, worktree `repo-calidad-spec/`, base `d09d8be` de Acopio. El PR #3 permanece abierto y sin fusionar; main sigue en `94d3eab`. No hay un PR nuevo de calidad ni implementación de ese recorrido.

La revisión de Acopio corrigió UUID equivalentes y lectura compuesta de saldos; también se sincronizó el logout del E2E tras un fallo real de CI. [Informe](revision-pr3.md). Últimos checks de Acopio: [Actions #9](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/43612344618), verify/compose success en `d09d8bea26c40722727756630fc8e3cb5779cd81`. Conclusión técnica: listo para integrar el alcance académico si el mantenedor lo autoriza; no se fusionó.

Leer [05-especificacion-calidad-lote.md](../03-diseno-de-software/05-especificacion-calidad-lote.md): unidades/validaciones, estados y resultado manual separados de inventario, permisos por centro, auditoría/cierre, pantallas/API candidatos, QC-01–18 y trazabilidad con RF-06/RF-07. Q1–Q9 están sin aprobar. El ejemplo numérico no es una regla de aceptación.

Decisiones pendientes: calibre/catálogo/unidad; muestreo/métodos; significado de descarte; temperatura de recepción frente a lectura posterior; modo manual y categoría; completitud/precisión/cierre; responsables y separación de funciones; cardinalidad/corrección; proyección de calidad compatible con el lote inmutable. El catálogo funcional y la matriz general de seguridad siguen siendo propuestas externas a esta adopción.

Antes de implementar, el usuario debe adoptar explícitamente las reglas del prototipo y dejar constancia de qué validó, si corresponde, un responsable agrícola o la docente. La aceptación académica no se presupone. Aprobar calidad no habilita despacho, modifica inventario ni deduce kg del porcentaje de muestra. D4 de recepción conserva la revisión independiente ya adoptada.

Al retomar, comprobar ramas/cabezas/checks. Conservar `feat/acopio`, sus ramas locales de respaldo y `docs/especificacion-acopio`. No trasladar esta propuesta a main como si dependiera de Acopio ya integrado. Actualizar el borrador con las respuestas antes de cerrar contratos, transiciones o SQL; no hay tareas de implementación autorizadas para Calidad.

Esta rama añade documentación solamente. Verificación pertinente: enlaces locales, filas de decisiones/aceptación y formato; no se repiten pruebas de aplicación aprobadas para redactar el borrador. El resumen del workspace `CONTINUIDAD_ACOPIO.md` conserva ramas, archivos y estado de la revisión.
