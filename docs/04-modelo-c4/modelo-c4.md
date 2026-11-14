# Modelo C4 — Primer recorrido y Acopio académico

Revisión 2026-11-14. Estas vistas representan Acceso, Productores, Cosecha/pre-lotes, Acopio y consolidación en Trazabilidad, con Express 5, React/Vite y PostgreSQL 18. Acopio responde a D1–D7 adoptadas por el usuario solo para prototipo académico: sin validación agrícola ni aprobación docente. [ADR-009/010](../02-arquitectura/07-decisiones-primer-recorrido.md) registra las decisiones. La [arquitectura objetivo](modelo-c4-objetivo.md) conserva las vistas anteriores de offline, QR, Redis, ETL y demás módulos propuestos; no se presentan como implementados.

Los identificadores S1/W1/B1/O1/S/P/H/Q/T1 mantienen continuidad con el diseño objetivo. Contenedor C4 significa aplicación o almacén lógico; no equivale a una imagen Docker. El portal W1 se ejecuta en el navegador y sus archivos compilados se sirven desde B1.

## 1. Alcance y evidencia

El administrador registra productores y parcelas ficticios. El recolector consulta sus parcelas asignadas y registra una cosecha/pre-lote; organización, rol y asignación limitan las operaciones. Una cuenta sin concesiones no tiene operaciones de Acopio. El operario recibe/pesa/confirma/consolida solo en centros con concesión por acción; otra persona autorizada revisa las discrepancias. El lote queda pendiente de calidad y sin despacho. No hay administración UI de usuarios/asignaciones, captura offline, QR público, aprobación de calidad, logística, analítica ni liquidaciones. [Decisiones de Acopio](../02-arquitectura/08-decisiones-acopio.md).

Los diagramas describen implementación, no certifican por sí solos un despliegue. [Evidencia local, Compose y CI](../05-sprint01/cierre-primer-recorrido.md) registra qué se ejecutó realmente.

## 2. C1 — Contexto del sistema S1

```mermaid
flowchart LR
  ADMIN["Persona: Administrador<br/>Registra productor y parcela"]
  CAMPO["Persona: Recolector<br/>Captura pre-lote en parcela asignada"]
  ACOPIO["Persona: Operario de acopio<br/>Recibe, pesa y consolida en su centro"]
  RESPONSABLE["Persona: Responsable de discrepancias<br/>Revisa capturas de otra persona"]
  S1["Sistema S1: Trazabilidad académica<br/>Origen, cosecha, recepción y consolidación"]
  ADMIN -->|"Opera mediante navegador"| S1
  CAMPO -->|"Opera mediante navegador"| S1
  ACOPIO -->|"Opera en su ámbito autorizado"| S1
  RESPONSABLE -->|"Revisión independiente"| S1
```

El productor es una entidad registrada por el administrador; este corte no implementa una cuenta de productor independiente. No hay sistemas externos ejecutables en este recorrido.

## 3. C2 — Contenedores de S1

```mermaid
flowchart LR
  USUARIO["Persona: Administrador, Recolector,<br/>Operario o Responsable"]
  subgraph S1["Sistema S1"]
    W1["W1: Portal web<br/>React 19 / JavaScript, compilado por Vite 8<br/>Formularios y consulta de registros"]
    B1["B1: Backend monolítico modular<br/>Node 24 / Express 5 / JavaScript ESM<br/>REST, sesión y archivos estáticos"]
    O1[("O1: PostgreSQL 18<br/>access, producers, harvest,<br/>intake, traceability<br/>Persistencia y transacciones")]
  end
  USUARIO -->|"Interacción en navegador"| W1
  W1 -->|"JSON / HTTP, mismo origen local"| B1
  B1 -->|"Entrega HTML, JS y CSS"| W1
  B1 -->|"SQL parametrizado / pg, TCP"| O1
```

Docker Compose ejecuta `app` (B1 y archivos de W1) y `db` (O1). No hay servidor Vite de desarrollo en ese despliegue. El puerto publicado es `APP_PORT` —3000 por defecto, 3002 en la sesión de revisión— y la DB permanece en red privada. El override E2E publica opcionalmente DB en loopback 55433, distinto del PostgreSQL nativo 55432. El volumen `pgdata` conserva datos al recrear contenedores.

HTTP está limitado a la demostración local; el modo de producción exige un origen HTTPS y proxy TLS. Las [instrucciones de arranque](../../tecnologia/primer-recorrido.md) no equivalen a una configuración productiva completa.

## 4. C3 — Componentes del backend B1

```mermaid
flowchart TB
  W1["W1: Portal React"]
  subgraph B1["B1: Un proceso Node / Express"]
    E["E: Adaptador HTTP<br/>server/http.js + intake-http.js<br/>Validación, sesión, CSRF y rutas REST"]
    ROOT["Ensamblador<br/>server/composition.js<br/>Inyecta repositorios, contratos y transacciones"]
    S["S: Acceso<br/>server/modules/access<br/>Login, ámbitos, autorización y auditoría"]
    P["P: Productores<br/>server/modules/producers<br/>Productor, parcela y contrato de origen"]
    H["H: Cosecha<br/>server/modules/harvest<br/>Captura y consulta de pre-lotes"]
    Q["Q: Acopio<br/>server/modules/intake<br/>Recepción, pesaje, revisión y coordinación"]
    T1["T1: Trazabilidad<br/>server/modules/traceability<br/>Lotes, composición y eventos"]
    DB["Adaptador DB / unidad de trabajo<br/>server/db.js<br/>pg y conexión transaccional compartida"]
  end
  O1[("O1: PostgreSQL")]
  W1 -->|"REST / HTTP"| E
  E -->|"Casos de uso"| S
  E -->|"Casos de uso"| P
  E -->|"Casos de uso"| H
  E -->|"Recepción y lotes"| Q
  ROOT -->|"Compone"| S
  ROOT -->|"Compone"| P
  ROOT -->|"Compone"| H
  ROOT -->|"Compone"| Q
  ROOT -->|"Compone"| T1
  P -->|"authorize, scope y audit"| S
  H -->|"authorize, scope y audit"| S
  H -->|"requireHarvestOrigin e intakeOrigin(s)"| P
  Q -->|"requireCenter y audit"| S
  Q -->|"intakeOrigin(s)"| H
  Q -->|"consumed, consolidate y list"| T1
  S -->|"Repositorio propio / unidad de trabajo"| DB
  P -->|"Repositorio propio / unidad de trabajo"| DB
  H -->|"Repositorio propio / unidad de trabajo"| DB
  Q -->|"Repositorio propio / misma transacción"| DB
  T1 -->|"Repositorio propio / misma transacción"| DB
  DB -->|"SQL parametrizado"| O1
```

Cada módulo contiene `domain.js`, `application.js` y `repository.js`. Los casos de uso reciben objetos con contratos desde el ensamblador; no importan el repositorio de otro módulo. Dominio no depende de Express ni de pg. `server/http.js` es un adaptador compartido, no un módulo de negocio adicional. Los repositorios de S/P/H/Q/T1 propagan la misma conexión `tx`. Q coordina la consolidación; T1 no llama de vuelta a Q. Las FK y los triggers entre esquemas respaldan la integridad en el motor compartido, sin imports de repositorios ajenos en código.

## 5. C4 — Código del registro de pre-lote

Esta vista amplía H mediante funciones y archivos JavaScript reales, sin inventar clases de un framework. Es una relación de llamadas/contratos, no un diagrama de procesos independientes.

```mermaid
flowchart TD
  HTTP["server/http.js<br/>POST /api/v1/pre-lots"]
  DOMAIN["harvest/domain.js<br/>Validación de cantidad, fecha y unidad"]
  CREATE["harvest/application.js<br/>harvestService.create(actor, input, key)"]
  AUTH["accessService.authorize<br/>Permiso prelot:create"]
  TX["server/db.js<br/>transaction(fn), BEGIN / COMMIT / ROLLBACK"]
  ORIGIN["producersService.requireHarvestOrigin<br/>Revalida ámbito y parcela asignada"]
  REPO["harvest/repository.js<br/>lockKey, findRequest, create y get"]
  AUDIT["accessService.audit<br/>Registro obligatorio en la misma tx"]
  HTTP --> DOMAIN
  HTTP --> CREATE
  CREATE --> AUTH
  CREATE --> TX
  CREATE --> ORIGIN
  CREATE --> REPO
  CREATE --> AUDIT
```

La clave de idempotencia UUID está acotada al actor, con bloqueo transaccional y restricción UNIQUE. La repetición idéntica recupera el resultado; un payload diferente devuelve 409. Si falla la auditoría, se revierte cosecha y pre-lote. La migración `001` y las pruebas de integración contienen la evidencia ejecutable de estas reglas.

## 6. C4 — Código de la consolidación en Q/T1

Esta vista amplía Q y T1 del C3. Las flechas representan llamadas/contratos en un proceso y una transacción, sin servicios separados.

```mermaid
flowchart TD
  HTTP["intake-http.js<br/>POST /api/v1/lots"]
  INPUT["traceability/domain.js<br/>lotInput: IDs distintos, orden estable"]
  Q["intake/application.js<br/>command y consolidate"]
  S["access.requireCenter<br/>Sesión, acción y centro; bloqueo compartido"]
  QR["intake/repository.js<br/>Idempotencia y recepciones FOR UPDATE"]
  T1["traceability/application.js<br/>Compatibilidad y aportes completos"]
  TR["traceability/repository.js<br/>Lote, composición y evento"]
  AUDIT["access.audit<br/>Misma transacción PostgreSQL"]
  HTTP --> INPUT
  HTTP --> Q
  Q --> S
  Q --> QR
  Q --> T1
  T1 --> TR
  Q --> AUDIT
```

La revisión de discrepancias conserva medición y declaración; otra persona autorizada aprueba antes de la confirmación. H = neto confirmado, S = H − aportes. Recepciones se bloquean ordenadas y cada una tiene un aporte único: no parcialidades ni doble consumo. Lote, aportes, evento, auditoría y resultado idempotente se confirman juntos o se revierten. El total se deriva de aportes con numeric exacto. Triggers impiden cambiar, borrar o truncar hechos/eventos y agregar composición a un lote cerrado. Calidad permanece pendiente y no existe permiso/ruta de despacho.

## 7. Continuidad y límites

| Identificador | Elemento implementado                                | Fuente                                                               |
| ------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| S1            | Primer recorrido y Acopio académico                  | `server/main.js`, `web/main.jsx`                                     |
| W1            | Portal React, un único origen con API                | `web/`, `vite.config.js`, `server/http.js`                           |
| B1            | Monolito modular Express                             | `server/composition.js`, `server/modules/`                           |
| S/P/H/Q/T1    | Acceso, Productores, Cosecha, Acopio y consolidación | Casos de uso y repositorios de cada módulo                           |
| O1            | PostgreSQL 18                                        | `migrations/001_initial.up.sql`, `002_intake.up.sql`, `compose.yaml` |

La [vista objetivo](modelo-c4-objetivo.md) conserva los siete módulos y los modelos QR/offline como evolución propuesta. Express es la decisión de backend del corte actual; NestJS permanece únicamente como alternativa histórica de evolución y requeriría un nuevo ADR para adoptarse. Q y la consolidación de T1 corresponden al código y a la especificación académica; calidad, QR y las demás capacidades objetivo siguen fuera del corte.
