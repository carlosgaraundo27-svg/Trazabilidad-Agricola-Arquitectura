# Especificación: primer recorrido en línea

Fecha: 2026-11-11. Base: PR #1, commit 38a85e38b647729d4a122d4b35e6f8297103a2a4. Estado: implementación de demostración autorizada por el encargo; no constituye ratificación docente ni aprobación de políticas del negocio.

## Decisiones previas a implementar

RF-01/HU01: alta de productor y parcela georreferenciada. RF-03/HU02: solo captura en línea en este incremento; no satisface todavía RC01 ni RF-03 completo. RF-04: UUID de pre-lote generado en servidor. RF-13/ADR-008: autenticación y autorización mínimas, sin administración completa de cuentas.

Se conservan ADR-001–004 y 007–008: monolito modular, dependencias hacia el dominio, REST y PostgreSQL. Stack para esta demostración: Node 24, Express 5, JavaScript ESM y React con Vite; lockfile fija versiones. NestJS era una recomendación, no una restricción ratificada. Se prefiere un adaptador HTTP pequeño para comprobar los contratos; cambiarlo por NestJS no debe modificar dominio/casos de uso. No se implementan todavía Redis/QR, ETL, móvil, certificaciones, asociaciones, recepción ni consolidación. Permanecen en arquitectura objetivo.

## Mapa de módulos y orden

| id | Responsabilidad | Dependencia |
|---|---|---|
| access | Identidad, sesión, permisos, asignaciones | contratos compartidos |
| producers | Productores, parcelas y validación de origen | actor autorizado |
| harvest | Cosecha, pre-lote e idempotencia | contrato público de producers |

Orden: access → producers → harvest → web. Los otros cuatro módulos C3 permanecen proyectados. Entradas HTTP llaman casos de uso; estos reciben repositorios por inyección. Solo la raíz de composición conoce adaptadores SQL. Una conexión por transacción, incluyendo auditoría; ningún módulo escribe tablas ajenas.

## Permisos y supuestos revisables

Una organización representa un ámbito de demostración, no una política multitenant ya aprobada. El actor deriva de la sesión; nunca del body. Denegación por defecto.

| Operación | Administrador | Recolector | Otros/anónimo |
|---|---|---|---|
| Login | cuenta activa | cuenta activa | 401 credenciales inválidas |
| Productores y parcelas: crear | su organización | 403 | 403/401 |
| Productores y parcelas: listar | su organización | solo origen de parcelas asignadas | 403/401 |
| Pre-lotes: crear/listar | 403 | parcelas asignadas de su organización | 403/401 |

Administrador no hereda permiso de capturar cosecha. Asignaciones y cuentas se suministran mediante seed, sin endpoint administrativo en esta entrega. El E2E usa un productor/parcela nuevos y asigna la parcela mediante fixture SQL, como preparación explícita; no se concede acceso universal al recolector.

## Validaciones y límites técnicos

- JSON estricto, rechaza campos desconocidos; cuerpos hasta 16 KiB. UUID válidos para referencias.
- Productor: nombre requerido, texto recortado 1–120 caracteres. No se pide DNI/RUC ni unicidad de nombre porque no están definidos.
- Parcela: productor existente del mismo ámbito, nombre 1–120, latitud numérica [-90,90], longitud [-180,180]. Coordenadas no prueban propiedad legal ni límites catastrales.
- Pre-lote: parcela accesible; fecha/hora ISO 8601 con zona, no futura; cantidad decimal positiva con hasta 3 decimales, máximo técnico 999999999.999; unidad explícita kg/unidad. Estos límites y unidades son supuestos de demostración, sin conversión ni conservación de masa inferida. Responsable es el usuario autenticado.
- Una captura crea una cosecha y un pre-lote; es un caso de uso acotado, no restringe la cardinalidad conceptual futura. Estado de aceptación técnica registrado, sin estados de calidad o inventario.
- Idempotency-Key UUID requerido para POST /pre-lots, único por actor; mismo contenido normalizado devuelve el mismo recurso, contenido distinto 409. Reintentos revalidan asignación y sesión. No hay cola offline ni reenvío automático tras recargar navegador.

## Contrato HTTP v1

Base /api/v1. JSON. Error: {error:{code,message,requestId}}. No incluir stack, SQL, credenciales ni existencia de recursos ajenos. Colecciones: {items:[],limit:100}; se rechaza offset inválido y se admite offset entero >=0 para páginas siguientes. Detalle de campos y ejemplos en [OpenAPI](openapi.json).

| Método / ruta | Entrada | Respuesta |
|---|---|---|
| POST /auth/login | email, password | 200 {user,csrfToken}, cookie opaca HttpOnly SameSite=Strict |
| GET /auth/me | cookie | 200 {user,csrfToken} |
| POST /auth/logout | cookie + CSRF | 204, revoca sesión |
| GET /producers | cookie | 200 colección filtrada |
| POST /producers | name | 201 productor |
| GET /parcels | cookie | 200 colección filtrada |
| POST /parcels | producerId,name,latitude,longitude | 201 parcela |
| GET /pre-lots | cookie | 200 colección filtrada |
| POST /pre-lots | parcelId,harvestedAt,quantity,unit + Idempotency-Key | 201 nuevo / 200 repetición, {id,harvestId,parcelId,harvestedAt,quantity,unit,status,createdBy,createdAt} |

400 JSON/headers inválidos; 401 sin sesión/vencida; 403 rol, CSRF u origen incorrectos; 404 recurso inexistente o ajeno; 409 clave reutilizada con otro contenido; 422 validación; 429 límite de login; 500 fallo interno genérico; /health retorna 503 si DB falla. Escrituras autenticadas requieren X-CSRF-Token ligado a sesión y Origin igual a APP_ORIGIN si se envía. Login exige Origin permitido cuando exista. Sesiones de 8 horas, tokens aleatorios de 32 bytes y hash SHA-256 en DB, contraseñas scrypt con sal; cookie Secure en producción. HTTP solo en localhost de desarrollo. Limitador de login en memoria apto para una instancia; múltiples instancias requieren almacenamiento compartido.

## Modelo físico y atomicidad

Migración 001: schemas access, producers, harvest. access.organizations, users, sessions, parcel_assignments y audit; producers.producers y parcels; harvest.harvests y pre_lots. UUID PK, timestamptz UTC; quantity numeric(12,3), coordenadas double precision con CHECK; FK compuestas con organization_id impiden referencias entre ámbitos. Índices para FK/consultas; UNIQUE(actor_id,request_key) evita doble captura concurrente. Datos sensibles: nombres/geolocalización internos; contraseñas y sesiones restringidos; no endpoints públicos de datos.

Cada alta incluye auditoría actor/acción/recurso/fecha/resultado en la misma transacción. Pre-lote, cosecha y auditoría se confirman juntos. Si auditoría falla, rollback de toda la operación. Los intentos rechazados se registran en log estructurado sin payload ni credenciales. No hay modificación/borrado ordinario de auditoría o cosechas en API. Retención legal, borrado de datos, respaldo y restauración quedan pendientes antes de uso real; seed usa solo ficción.

## Criterios de aceptación y comprobación

1. Login válido, consulta de sesión y logout; credenciales incorrectas, cuenta inactiva, sesión vencida y ausencia de sesión se rechazan.
2. Administrador crea productor/parcela georreferenciada; recolector no puede crearlos. Datos de otra organización nunca aparecen.
3. Recolector captura y consulta un pre-lote de parcela asignada; se conserva origen, cantidad, unidad, fecha, responsable e ID único tras reiniciar la aplicación.
4. Parcela no asignada/ajena o inexistente: 404 sin escritura. Payload inválido/futuro/no finito/cantidad cero: 422 sin escritura.
5. Repetición y concurrencia con misma clave: un solo pre-lote/cosecha/auditoría; distinto contenido: 409; permiso revocado: 404 aunque la clave ya exista.
6. Fallo de auditoría revierte escritura. FK/CHECK impiden datos inválidos aun fuera de HTTP.
7. UI accesible por teclado, labels, estados vacío/carga/error/éxito, selección de origen y confirmación con ID. Sin secretos en almacenamiento web. Diseño provisional sobrio verde y tierra, formularios de una columna en móvil y contenido centrado en escritorio; no existe sistema visual previo.
8. Unitarias Node test para validación/permisos; integración HTTP y SQL con PostgreSQL real en CI, motor PostgreSQL WASM opcional local, sin confundirlos; E2E Playwright contra servidor y DB. CI instala desde lock, audita dependencias, prueba, construye web y ejecuta E2E con PostgreSQL.

## Estructura, estilo y comandos previstos

server/modules/{access,producers,harvest}/{domain,application,repository}.js; server/http.js entrada, server/main.js composición; web/ React; migrations/ SQL; scripts/ entorno; tests/{unit,integration,e2e}. Funciones ESM con nombres descriptivos; ejemplo: await unitOfWork(async tx => repository.create(tx, actor, input)). No dependencias HTTP/SQL en dominio. Validar entradas, no versionar secretos y no modificar documentos previos para aparentar aprobación.

npm ci --ignore-scripts; npm test; npm run test:integration; npm run build; npm run test:e2e. Instrucciones exactas y evidencia se entregan en tecnologia/primer-recorrido.md y docs/05-sprint01/evidencia-primer-recorrido.md.

## Decisiones pendientes

Ratificación docente y stack; política organizacional y administración de asignaciones; altas/bajas, recuperación de cuenta y MFA; identificadores legales/duplicados de productor; catálogo definitivo y precisión de unidades; correcciones/anulación e inmutabilidad histórica; cardinalidades de consolidación/división y pallets; RF-12 y fórmulas; sincronización durable offline; proyección QR/revocación Redis; ETL, metas EQ y recuperación. No se consideran cerradas por esta implementación.
