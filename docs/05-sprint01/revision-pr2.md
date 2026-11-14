# Revisión previa a integrar el PR #2

Revisión: 2026-11-12. [PR #2](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/2). Alcance: entrega técnica de demostración del primer recorrido; no aceptación productiva ni aprobación de reglas futuras.

## Conclusión

**Listo para integrar técnicamente en su rama base actual**, una vez aprobados los checks del último commit de esta actualización. No se detectaron problemas de código que bloqueen el alcance S/P/H después de revisar las correcciones documentales indicadas abajo. No se fusionó el PR.

El destino actual es `docs/revision-arquitectura-c4-sprint01`, base del PR #1. La integración posterior en `main` requiere coordinar el orden de ambos PR y, si corresponde, retargetear/revisar los checks sobre la nueva base. No se presenta `mergeable` como aprobación humana; al consultar la revisión no había reviews ni hilos pendientes.

## Coherencia revisada

| Aspecto          | Contraste y resultado                                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Alcance          | Especificación, OpenAPI, C4 y código cubren login/sesión, productor, parcela y pre-lote; acopio, lote consolidado, QR y offline no están implementados.                                                |
| Backend          | ADR-009 y C4 declaran Node 24/Express 5/JavaScript ESM. S/P/H son módulos del mismo proceso, no servicios Docker separados.                                                                            |
| Permisos         | Actor de sesión, denegación por defecto, organización y parcela asignada. Admin no hereda captura de cosecha; lector no recibe operaciones.                                                            |
| Escrituras       | Validación estricta, SQL parametrizado y FK/CHECK; captura y auditoría en una conexión/transacción. Idempotencia por actor/clave y revalidación de origen antes del reintento.                         |
| Sesiones y datos | scrypt con sal, tokens aleatorios con hash en DB, cookie HttpOnly/SameSite y Secure en producción, CSRF y comprobación de origen. UI guarda CSRF en memoria, sin tokens en localStorage.               |
| UI               | Formularios, selección de origen, confirmación con ID y consulta posterior coinciden con el E2E y las evidencias. Asignar una parcela nueva sigue siendo fixture SQL explícito, sin UI administrativa. |
| Reproducibilidad | Node 24 y PostgreSQL 18 en CI/Docker; navegador ligado a Playwright 1.65.0. Setup conserva `.env`; migración/seed repetibles sin sobrescribir cuentas.                                                 |
| Persistencia     | JSON Windows final: dos IDs idénticos antes/después, sin volumen eliminado; app/DB saludables y HTTP 200. Actions verifica el mismo comportamiento por separado.                                       |

## Hallazgos corregidos

1. **Especificación/arquitectura desactualizadas:** referencias a stack pendiente y a todos los C4 como propuestas se alinearon con ADR-009 y el corte ejecutable. Las vistas históricas de la arquitectura objetivo conservan su carácter propuesto.
2. **Contrato de cantidad incompleto:** el patrón OpenAPI permitía cero aunque la descripción y Zod lo rechazaban. Se exige cantidad positiva en el esquema y tres decimales en la respuesta; la fecha declara expresamente la regla de no futuro aplicada en servidor. No cambia la lógica ni el contrato válido del runtime.
3. **Evidencia de reinicio pendiente:** se incorporó el JSON final del usuario y se compararon los dos conjuntos completos, además del `passed` del auxiliar. El intento previo denegado del agente se conserva como antecedente.

Las correcciones no requieren repetir unitarias, integración, build o E2E locales ya aprobados. Se valida únicamente el contrato corregido y los enlaces/formato documentales. El workflow configurado se ejecuta automáticamente al publicar el nuevo commit; sus checks se consultan antes de concluir esta revisión.

## Secretos y archivos locales

Se revisaron los 3 commits iniciales del PR, hasta `6feaa68`, y 139 blobs únicos: ningún `.env`, `node_modules`, `.local`, `dist`, cluster PostgreSQL o caché de navegador versionado; ningún valor de las credenciales locales generadas, patrón de clave privada/token o ruta privada de usuario detectado. La actualización se vuelve a escanear antes de publicar. `.env.example` contiene marcadores; las contraseñas constantes de tests/CI son fixtures ficticios para bases desechables, no credenciales operativas.

Las evidencias copiadas redactan credenciales y rutas privadas; no se incorporan trazas con sesiones ni datos personales reales. Este escaneo y la revisión de límites HTTP/SQL no equivalen a una auditoría de seguridad productiva completa.

## Checks y pendientes

La cabeza revisada `6feaa68148f5821212b11b0e212011bc1cd5db5f` tiene [Actions #3 aprobado](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/43259626867): `verify` y `compose` terminaron en `success`. La actualización de cierre es documental/contractual; la conclusión final debe referirse también a los checks del SHA publicado después de esta revisión.

No bloquean la integración de la demo: acceso Docker denegado en la sesión del agente (Windows ya fue comprobado por el usuario), ratificación académica, funciones fuera del corte y reglas de mezcla/división aún no definidas. Sí impiden presentar esta entrega como productiva o implementar el siguiente recorrido sin decisión: administración real de permisos/cuentas, respaldo/restauración operativos, reglas de corrección y pesaje, y política de consolidación/cantidades.
