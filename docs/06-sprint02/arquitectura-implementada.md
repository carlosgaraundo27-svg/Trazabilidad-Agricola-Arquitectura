# Arquitectura implementada, SOLID y patrones

Referencia común: código `2758271ad96aa8735f35644efe42b2a02a9ff539`. Los enlaces locales corresponden a archivos conservados de ese candidato; la [matriz](matriz-cumplimiento.md) fija enlaces GitHub por SHA. No se modificó producción para demostrar un principio.

## Estilo y dependencias reales

Backend monolítico modular Express: acceso, productores, cosecha, Acopio/Calidad, trazabilidad, publicación, logística/inventario y reportes. React y Flutter son clientes; PostgreSQL es autoridad transaccional; Redis es un adaptador opcional de lectura pública. No hay despliegues independientes por módulo ni microservicios acreditados. [C4 implementado](../04-modelo-c4/modelo-c4.md) y [objetivo](../04-modelo-c4/modelo-c4-objetivo.md) conservan su distinción.

| Frontera | Código concreto | Dirección y evidencia |
| --- | --- | --- |
| Regla / validación | [harvest/domain.js](../../server/modules/harvest/domain.js), [logistics/domain.js](../../server/modules/logistics/domain.js) | No importan Express, pg ni repositorios. Zod valida entradas y BigInt conserva milésimos. Jest ejecuta ambos. |
| Caso de uso | [harvest/application.js](../../server/modules/harvest/application.js): `harvestService.create` | Recibe `repository`, `unitOfWork`, `access`, `producers`. Revalida origen antes de replay y orquesta auditoría. Jest verifica resultados con puertos ficticios. |
| Adaptador SQL | [harvest/repository.js](../../server/modules/harvest/repository.js) | SQL/mapeo fuera del caso de uso. No es invocado por Jest nuevo; la [integración API](../../tests/integration/api.test.js) existente requiere DB independiente. |
| Composición | [composition.js](../../server/composition.js): `compose` | Único ensamblado de factories/repositories; `unitOfWork = fn => db.transaction(fn)` compartido entre operaciones y auditoría. |
| Adaptador HTTP | [http.js](../../server/http.js), [publication-http.js](../../server/publication-http.js) | Autenticación, validación y códigos HTTP; invoca servicios, no integra reglas en React. |
| Cliente durable | [Android B/C](../../clients/android_b/README.md) | Outbox SQLite local, envío manual/foreground. Evidencia previa, no reejecutada aquí; no cola remota ni servicio background garantizado. |

`scripts/check.js` pasó: detecta ciertas importaciones tecnológicas en `*domain.js` e imports cruzados explícitos entre módulos, valida sintaxis y contrato. Su regex no cubre todos los imports dinámicos, alias, responsabilidades semánticas ni inversiones posibles en application/repository. No se presenta como prueba completa de Clean Architecture. Los contratos son objetos JavaScript, sin chequeo estático de interfaces.

## SOLID con alcance demostrable

| Principio | Ejemplo concreto | Evidencia y límite |
| --- | --- | --- |
| SRP | Dominio de cosecha valida; aplicación crea/reconcilia/audita; repositorio persiste. | [Jest dominio](../../tests/jest/harvest-domain.test.js) y [aplicación](../../tests/jest/harvest-application.test.js) ejecutados. SRP es separación de razones de cambio, no una afirmación por cantidad de carpetas. |
| OCP | `publicationService({cache})` permite elegir `noCache` u otro adaptador sin cambiar `query`. | [Jest consulta](../../tests/jest/publication-query.test.js) usa noCache/memoria/fallo con igual DTO. Extensión comprobada de ese puerto; no garantiza extensibilidad de todo el sistema. |
| LSP | Puerto asíncrono get/set/delete/close; miss `null`, fallo capturado por `cached`. `noCache` no debe autorizar publicación retirada. | Se prueba sustitución parcial del camino `query`; el doble mínimo no ejerce delete/close. [Prueba Redis real existente](../../tests/redis/public-cache.test.js) y [comparación preparada](../../scripts/sprint02/compare-cache.js) deben completar sustitución tecnológica; no ejecutadas localmente. |
| ISP | El caso de uso de cosecha consume métodos acotados de origen y autorización; no recibe acceso directo a todas las tablas. | Contratos visibles en los parámetros/métodos. El objeto `access` compartido es más amplio que la necesidad de un consumidor; ISP es parcial, no un cumplimiento global probado. |
| DIP | `harvestService` y `publicationService` reciben puertos; `compose` decide implementaciones. | Ninguna aplicación importa el repositorio de otro módulo; se puede probar sin pg/Express. No confundir inyección de funciones con garantía automática de todas las dependencias. |

## Patrones presentes

| Patrón | Código y responsabilidad | Motivo / verificación |
| --- | --- | --- |
| Repository | `harvestRepository`, `publicationRepository`, `reportsRepository` | Encapsulan SQL parametrizado y proyecciones. Cambiar persistencia no debería reescribir la regla. Pruebas SQL previas e integración preservadas; la suite Jest no acredita su ejecución. |
| Composition Root | `compose` en `server/composition.js` | Centraliza ensamblado y puertos entre módulos; evita que dominio elija infraestructura. Revisión de imports ejecutada con límites indicados. |
| Unit of Work | [db.js](../../server/db.js): BEGIN/COMMIT/ROLLBACK/finally release; `unitOfWork` en `compose` | Escrituras, hechos y audit comparten conexión. [Rollback logístico](../../tests/integration/logistics-rollback.test.js) y [sync](../../tests/integration/harvest-sync.test.js) existentes verifican efecto atómico en DB real; no atribuir ese resultado al fake Jest. |
| Adapter / estrategia de caché | [public-cache.js](../../server/adapters/public-cache.js): redisCache/noCache | Separa SDK Redis del caso de uso; timeouts y degradación genérica. Guard obligatorio PostgreSQL conserva retiro aunque falle invalidación. No implica mejora medida. |
| Outbox local e identidad idempotente | [especificación C](../03-diseno-de-software/13-incremento-C-captura-offline.md), [sync-application.js](../../server/modules/harvest/sync-application.js) | Confirmación+outbox SQLite atómica; recibo por identidad/cuerpo y autorización actual antes de replay. Evidencia nativa previa atribuida a PR14; 24 h/energía pendientes. |

No se añadieron factories decorativas, jerarquías ni repositorios nuevos para simular SOLID. El valor es conservar límites verificables mientras se explican sus excepciones.
