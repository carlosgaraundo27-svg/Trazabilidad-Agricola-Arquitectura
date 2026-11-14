# Modelo C4 — Primer recorrido implementado

Revisión 2026-11-12. Estas vistas representan el código existente: Acceso, Productores y Cosecha/pre-lotes, con Express 5, React/Vite y PostgreSQL 18. [ADR-009/010](../02-arquitectura/07-decisiones-primer-recorrido.md) registra las decisiones. La [arquitectura objetivo](modelo-c4-objetivo.md) conserva las vistas anteriores de offline, QR, Redis, ETL y demás módulos propuestos; no se presentan como implementados.

Los identificadores S1/W1/B1/O1/S/P/H mantienen continuidad con el diseño objetivo. Contenedor C4 significa aplicación o almacén lógico; no equivale a una imagen Docker. El portal W1 se ejecuta en el navegador y sus archivos compilados se sirven desde B1.

## 1. Alcance y evidencia

El administrador registra productores y parcelas ficticios. El recolector consulta sus parcelas asignadas y registra una cosecha/pre-lote; organización, rol y asignación limitan las operaciones. El rol lector inicia sesión pero no tiene operaciones habilitadas en este corte. No hay administración UI de usuarios/asignaciones, captura offline, consolidación de lotes, QR público, acopio/calidad, logística, analítica ni liquidaciones.

Los diagramas describen implementación, no certifican por sí solos un despliegue. [Evidencia local, Compose y CI](../05-sprint01/cierre-primer-recorrido.md) registra qué se ejecutó realmente.

## 2. C1 — Contexto del sistema S1

```mermaid
flowchart LR
  ADMIN["Persona: Administrador<br/>Registra productor y parcela"]
  CAMPO["Persona: Recolector<br/>Captura pre-lote en parcela asignada"]
  S1["Sistema S1: Primer recorrido de trazabilidad<br/>Autenticación, origen y captura de cosecha"]
  ADMIN -->|"Opera mediante navegador"| S1
  CAMPO -->|"Opera mediante navegador"| S1
```

El productor es una entidad registrada por el administrador; este corte no implementa una cuenta de productor independiente. No hay sistemas externos ejecutables en este recorrido.

## 3. C2 — Contenedores de S1

```mermaid
flowchart LR
  USUARIO["Persona: Administrador o Recolector"]
  subgraph S1["Sistema S1"]
    W1["W1: Portal web<br/>React 19 / JavaScript, compilado por Vite 8<br/>Formularios y consulta de registros"]
    B1["B1: Backend monolítico modular<br/>Node 24 / Express 5 / JavaScript ESM<br/>REST, sesión y archivos estáticos"]
    O1[("O1: PostgreSQL 18<br/>access, producers, harvest<br/>Persistencia y transacciones")]
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
    E["E: Adaptador HTTP<br/>server/http.js<br/>Validación, sesión, CSRF y rutas REST"]
    ROOT["Ensamblador<br/>server/composition.js<br/>Inyecta repositorios, contratos y transacciones"]
    S["S: Acceso<br/>server/modules/access<br/>Login, ámbitos, autorización y auditoría"]
    P["P: Productores<br/>server/modules/producers<br/>Productor, parcela y contrato de origen"]
    H["H: Cosecha<br/>server/modules/harvest<br/>Captura y consulta de pre-lotes"]
    DB["Adaptador DB / unidad de trabajo<br/>server/db.js<br/>pg y conexión transaccional compartida"]
  end
  O1[("O1: PostgreSQL")]
  W1 -->|"REST / HTTP"| E
  E -->|"Casos de uso"| S
  E -->|"Casos de uso"| P
  E -->|"Casos de uso"| H
  ROOT -->|"Compone"| S
  ROOT -->|"Compone"| P
  ROOT -->|"Compone"| H
  P -->|"authorize, scope y audit"| S
  H -->|"authorize, scope y audit"| S
  H -->|"requireHarvestOrigin"| P
  S -->|"Repositorio propio / unidad de trabajo"| DB
  P -->|"Repositorio propio / unidad de trabajo"| DB
  H -->|"Repositorio propio / unidad de trabajo"| DB
  DB -->|"SQL parametrizado"| O1
```

Cada módulo contiene `domain.js`, `application.js` y `repository.js`. Los casos de uso reciben objetos con contratos desde el ensamblador; no importan el repositorio de otro módulo. Dominio no depende de Express ni de pg. `server/http.js` es un adaptador compartido, no un módulo de negocio adicional. Los repositorios de S/P/H usan la misma conexión `tx` cuando participan en una captura.

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

## 6. Continuidad y límites

| Identificador | Elemento implementado                 | Fuente                                          |
| ------------- | ------------------------------------- | ----------------------------------------------- |
| S1            | Primer recorrido en línea             | `server/main.js`, `web/main.jsx`                |
| W1            | Portal React, un único origen con API | `web/`, `vite.config.js`, `server/http.js`      |
| B1            | Monolito modular Express              | `server/composition.js`, `server/modules/`      |
| S/P/H         | Acceso, Productores y Cosecha         | Casos de uso y repositorios de cada módulo      |
| O1            | PostgreSQL 18                         | `migrations/001_initial.up.sql`, `compose.yaml` |

La [vista objetivo](modelo-c4-objetivo.md) conserva los siete módulos y los modelos QR/offline como evolución propuesta. Express es la decisión de backend del corte actual; NestJS permanece únicamente como alternativa histórica de evolución y requeriría un nuevo ADR para adoptarse. No se crean módulos nuevos para completar los diagramas.
