# Decisiones de implementación del primer recorrido

Fecha: 2026-11-11. Complementa las ADR existentes; no cambia su estado académico. [Especificación previa](../03-diseno-de-software/03-especificacion-primer-recorrido.md).

## ADR-009 — Stack y alcance de demostración

Estado: aceptado como decisión técnica del primer recorrido el 2026-11-12. La aceptación académica de la entrega y las reglas de negocio pendientes se evalúan por separado.

Node 24 + Express 5 + JavaScript ESM, React/Vite y pg. Frente a NestJS/TypeScript recomendado en la arquitectura objetivo conservada, Express permite comprobar el recorrido con un adaptador pequeño, sin convertir módulos en servicios. El coste es menor ayuda estática de tipos y necesidad de contratos, validación e imports verificados. Se conserva PostgreSQL y Clean Architecture; no se crea un ORM ni framework propio. Versiones exactas en lockfile.

B1 implementa S Acceso y Permisos, P Productores y H Cosecha, un único proceso. W1 se compila por separado y B1 sirve sus estáticos para operar en un solo origen. O1 es PostgreSQL. Los restantes componentes de C3, M1/L1, K1 y J1/A1 permanecen en la arquitectura objetivo. Este corte en línea no sustituye el alcance completo offline ni la proyección QR de C4.

## ADR-010 — Sesión, permisos y transacción

Estado: decisión técnica de demostración; política de negocio pendiente.

Sesión opaca en cookie HttpOnly/SameSite Strict, Secure al usar producción, expiración de ocho horas y revocación en servidor; CSRF ligado a sesión. Contraseñas con scrypt y sal. Se evita almacenar credenciales o tokens en localStorage. HTTPS se termina en proxy en despliegue público; HTTP queda acotado al entorno local.

Se adopta denegación por defecto, organización como ámbito y asignación explícita de parcela para cosecha. Administrador no captura pre-lotes. No se implementa administración de cuentas/asignaciones; el seed demuestra ámbitos distintos. La matriz general sigue propuesta: esta selección no ratifica permisos financieros, de aprobación o publicación.

Acceso expone scope/audit; Productores expone requireHarvestOrigin; Cosecha coordina con una misma unidad de trabajo. Auditoría crítica obligatoria: si falla, rollback. La clave UUID de idempotencia pertenece al actor, se serializa con advisory lock PostgreSQL y tiene restricción UNIQUE de respaldo. Asignaciones se bloquean FOR SHARE dentro de la transacción para que una revocación no compita con una captura en curso. Repetición con distinto payload normalizado devuelve 409; se revalida el ámbito antes de consultar repetición.

## Supuestos y pendientes sin cerrar

- Organización y asignaciones: confirmar modelo real y responsables de mantenimiento.
- kg/unidad, cantidad positiva y precisión técnica: catálogo y límites definitivos pendientes. No hay conversiones ni pesaje oficial.
- Una cosecha por comando y un pre-lote por cosecha en este adaptador no decide las cardinalidades de consolidación/división. No existen tablas de lote consolidado/pallet en la migración.
- No hay validación catastral, DNI/RUC, unicidad comercial de productor ni aprobación inferida.
- RF-02, asociaciones de RF-01, RC01/RF-03 offline y RF-13 completo no están terminados.
- Ratificación docente, recuperación/MFA, retención y borrado, restauración, multirréplica del limitador de login, QR/Redis, ETL, liquidaciones y metas EQ siguen pendientes.

## Correspondencia con C4 y despliegue

Los identificadores S1/W1/B1/O1/S/P/H se conservan. La [vista C4 canónica](../04-modelo-c4/modelo-c4.md) representa C1–C4 del corte implementado con Express/React, incluida la captura de pre-lote en H. La [arquitectura objetivo](../04-modelo-c4/modelo-c4-objetivo.md) conserva QR, offline y los demás módulos proyectados. NestJS no es un requisito ni una decisión pendiente que bloquee este backend; adoptarlo en otra etapa requeriría un nuevo ADR.

| Vista      | Implementación del corte                          | Aún proyectado                         |
| ---------- | ------------------------------------------------- | -------------------------------------- |
| C2         | W1 React, B1 Node/Express, O1 PostgreSQL          | M1/L1, K1 Redis, J1/A1 e integraciones |
| C3         | S/P/H y adaptadores REST en B1                    | Q/T1/G/F                               |
| C4         | Funciones y contratos de captura de pre-lote en H | Consulta pública QR en T1              |
| Despliegue | Un contenedor app y PostgreSQL, red DB privada    | Proxy TLS público, analítica y caché   |
