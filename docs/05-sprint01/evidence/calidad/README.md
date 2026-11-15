# Evidencias de Calidad académica — 2026-11-15

Q1–Q9 y originales obligatorios por recepción adoptados por el usuario; sin aprobación docente ni validación agrícola. [Informe](../../calidad-implementacion.md), [especificación](../../../03-diseno-de-software/05-especificacion-calidad-lote.md).

| Archivo | Qué acredita |
| --- | --- |
| integration-final.txt | 42 resultados PostgreSQL real del conjunto: primer recorrido, Acopio y Calidad, sin omisiones. |
| e2e-final.txt | 12 E2E Chromium del conjunto, incluidos cierre completo, faltantes, posterior insuficiente y captura original en recepción. |
| contract.json | OpenAPI 3.1 válido, 17 rutas y 238 muestras reales contrastadas; formatos verificados por servidor/pruebas, Ajv sin formatos. |
| persistence.json | Reinicio real sin seed: conteos y SHA-256 de ocho tablas idénticos antes/después (50 recepciones, 24 originales, 22 lotes, 35 aportes, 12 evaluaciones, 41 eventos Calidad). |
| mutation-red.txt / mutation-restored.txt | Retirar el guard de originales produce fallo (500 en lugar de 422 con respaldo SQL); restaurado, 15 resultados Calidad pasan. |
| quality-close-red.txt | Antes de implementar la extensión, falla captura original no soportada. |
| closed-desktop.png / missing-receipt.png | UI closed y faltante identificado, capturas revisadas visualmente. |
| draft-mobile.png | Borrador a 320 px con foco por teclado y sin overflow. |
| unit-red.txt / integration-red.txt / milliseconds-red.txt | Ensayos rojos iniciales de dominio, API y milisegundos antes de corregir; no son fallos actuales. |
| integration-draft.txt / e2e-draft.txt | Evidencia parcial histórica del turno anterior, antes de implementar cierre; no sustituye los finales. |

Unitarias completas: 13 aprobadas. Build y comprobaciones de sintaxis/imports/OpenAPI/enlaces/formato aprobadas; resultados finales se guardan en unit-final.txt/check-final.txt/format-final.txt/build-final.txt. Bases nuevas dedicadas y fixtures ficticios, demo sin cambios. Migraciones 001/002, dependencias, lockfile y workflow sin cambios lógicos. No se desactivan límites de autenticación ni se omiten pruebas para aprobar.

Los checks remotos se documentarán con URL y cabeza exacta al abrir el PR. No atribuir Actions #9 de Acopio a Calidad. El PR de Calidad se deja abierto, sin fusionar.
