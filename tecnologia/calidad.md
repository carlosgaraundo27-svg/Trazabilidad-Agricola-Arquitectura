# Ejecutar Calidad del prototipo académico

Q1–Q9 y cobertura obligatoria de originales adoptadas por el usuario; sin aprobación docente ni validación agrícola. [Especificación](../docs/03-diseno-de-software/05-especificacion-calidad-lote.md), [ADR-012](../docs/02-arquitectura/09-decisiones-calidad.md), [evidencia](../docs/05-sprint01/calidad-implementacion.md).

## Preparar entorno

Usar el [arranque existente](primer-recorrido.md): Node 24, PostgreSQL, variables locales y dependencias del lockfile, sin nuevas dependencias. Las migraciones 003/004 son aditivas; `npm run migrate` aplica las pendientes. En Compose, `docker compose up --build -d` aplica migraciones mediante el arranque existente y conserva el volumen. No borrar volúmenes ni ejecutar down de migraciones sobre la demo o datos que se deban conservar.

Los fixtures de demostración (`npm run seed`, solo en el entorno ficticio configurado) añaden `calidad@example.test` para Norte y `calidad2@example.test` para Sur con `DEMO_PASSWORD`; la contraseña se configura localmente. Concesiones explícitas `quality:read/create/update/close`, sin herencia por rol. Operarios anteriores no adquieren Calidad. No existe UI administrativa productiva de cuentas/concesiones en este incremento.

## Recorrido

1. Entrar como operario autorizado y registrar una **nueva** recepción. En “Temperatura original de recepción”, activar “Documentar temperatura original” y escribir valor en °C, instante de medición en hora de Lima, observador, procedencia/evidencia y método. No se prellenan mediciones. Responsable y fecha del registro son del servidor.
2. Si no existe esa lectura, se puede registrar la recepción sin ella. La interfaz advierte que impedirá cerrar Calidad y que no se permite completarla después en este incremento. No inventar una lectura para evitar el bloqueo. Recepciones, pesos y revisiones existentes permanecen intactos.
3. Confirmar y consolidar según [Acopio](acopio.md), incluyendo revisión independiente de discrepancias cuando corresponda. El lote mantiene su composición y netos; la condición pendiente al consolidar es histórica.
4. Entrar como responsable de Calidad en el centro autorizado. Crear una evaluación única por lote. Identificar muestra y capturar pesos individuales g/fruto, materia seca %, conteos examinados/descartados y sus responsables/momentos/procedencias/métodos. Guardar draft incompleto es válido; una observación incluida debe estar completa y ser válida. No hay afirmación de representatividad.
5. Revisar “Temperaturas originales de recepción”. Se muestran originales de solo lectura o exactamente las referencias/IDs pendientes. Las nuevas temperaturas en Calidad son **posteriores a consolidación** y nunca sustituyen originales.
6. Guardar el borrador, revisar los datos y elegir aprobado/observado/rechazado con justificación. El backend exige muestra, pesos, materia seca, conteos y original de **cada recepción** para cualquier resultado. Una sola ausencia bloquea el cierre con 422, incluso si hay una posterior. La UI también bloquea el botón.
7. Al cerrar, consultar versión, responsable, fecha y eventos. No hay reapertura, corrección ni reevaluación. Un segundo cierre distinto o modificación recibe 409. Un replay idéntico autorizado devuelve 200 sin otro cierre. Ante conflicto, consultar la versión actual; ante respuesta no confirmada, “Reintentar misma operación” conserva la intención y la clave.

Dos decimales son resolución técnica del software, sin atribución instrumental; no se redondea una captura. El porcentaje de descarte se informa a dos decimales con mitad hacia arriba y no se convierte en kilos ni descuenta inventario. Aprobar Calidad no habilita despacho.

## Recepciones históricas

Las originales ausentes siguen ausentes. No existe endpoint, formulario o script de incorporación histórica en este incremento; SQL ordinario también rechaza añadir una original después del evento de recepción. No usar un draft de Calidad para transcribirla ni etiquetar como original una lectura posterior.

Cualquier incorporación desde evidencia original requiere un procedimiento futuro explícito y auditado: validar el documento y la recepción, preservar medición/unidad/instante/observador, identificar autorización y actor de incorporación, conservar evidencia y motivo y registrar un nuevo hecho enlazado con auditoría transaccional. La política de autorización/revisión de ese procedimiento debe definirse antes de habilitarlo. No implica sobrescribir recepciones, modificar closed ni desactivar controles. Sin evidencia original, el cierre permanece bloqueado.

## Comprobaciones

`npm test`, `npm run check`, `npm run format:check`, `npm run build`. Para integración/E2E usar bases **dedicadas y diferentes**, `DATABASE_URL`, `TEST_ALLOW_DB_WRITE=true` y `DEMO_PASSWORD` ficticia: `npm run test:integration` y `npm run test:e2e`. Integración incluye down/up de todas las migraciones en su base desechable; nunca apuntarla a la demo. E2E sirve `dist`: compilar antes de probar tras cambiar UI. Los fixtures de Calidad usan los servicios internos para preparar lotes sin consumir intentos HTTP de login; las interacciones de usuario conservan el login real y el límite de autenticación.
