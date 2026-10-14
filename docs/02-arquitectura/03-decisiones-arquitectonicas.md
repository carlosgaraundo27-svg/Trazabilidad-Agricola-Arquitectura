# Decisiones Arquitectónicas

## 1. Propósito

Este documento registra las decisiones arquitectónicas principales adoptadas para el sistema de **Trazabilidad y Gestión Comercial de Palta Hass**.

Cada decisión se relaciona con los drivers arquitectónicos previamente identificados y establece la respuesta técnica seleccionada, su justificación, alternativas consideradas y consecuencias.

La estructura sigue el enfoque de **Architecture Decision Record (ADR)** indicado en la Guía 03.

---

## ADR-001 — Selección de Monolito Modular

**Estado:** Aceptada

**Driver relacionado:** DA04

### Contexto

El sistema debe integrar en una misma solución los procesos de productores, cosecha, acopio, calidad, trazabilidad, inventario, logística y reportes. Estos procesos comparten información central del lote y requieren consistencia transaccional.

Al mismo tiempo, el sistema debe poder evolucionar hacia nuevos cultivos y mantener una separación clara entre responsabilidades.

### Decisión

Adoptar **Monolito Modular** como estilo arquitectónico principal.

El backend se desplegará como una unidad, pero internamente estará dividido en módulos funcionales con límites y responsabilidades claramente definidos.

### Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| **Monolito tradicional** | ❌ Mayor riesgo de acoplamiento y dificultad de mantenimiento si crece sin modularización. |
| **Monolito Modular** | ✅ Buen equilibrio entre separación, simplicidad operacional y evolución. |
| **Microservicios** | ⚠️ Viable a futuro, pero introduce complejidad de despliegue, comunicación y consistencia distribuida no necesaria para el alcance actual. |

### Justificación

El monolito modular permite mantener centralizada la información del lote y simplificar el despliegue inicial, mientras conserva límites internos que podrían permitir una futura extracción de módulos.

### Consecuencias

**Positivas**
- Menor complejidad operacional.
- Consistencia transaccional centralizada.
- Fácil despliegue mediante Docker.
- Separación interna de funcionalidades.
- Evolución gradual.

**Negativas**
- Todos los módulos comparten el mismo proceso de despliegue.
- Un error en el backend puede afectar varios módulos.
- El escalamiento individual de módulos es limitado mientras permanezcan dentro del monolito.

---

## ADR-002 — Aplicación de Clean Architecture

**Estado:** Aceptada

**Driver relacionado:** DA02, DA04

### Contexto

La lógica de trazabilidad debe conservar reglas de negocio sobre lotes, eventos, calidad, inventario y estados sin quedar acoplada a PostgreSQL, Redis, frameworks, clientes móviles o servicios externos.

### Decisión

Utilizar **Clean Architecture** como enfoque arquitectónico interno.

Las responsabilidades se organizan en:

1. Dominio.
2. Aplicación.
3. Presentación / Adaptadores.
4. Infraestructura.

Las dependencias deben dirigirse hacia el núcleo del dominio.

### Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| **Capas simples sin regla explícita de dependencia** | ⚠️ Fácil de iniciar, pero permite que el negocio termine dependiendo de infraestructura. |
| **Clean Architecture** | ✅ Mejor separación de negocio y tecnología. |
| **Microservicios + arquitectura distribuida** | ❌ Excesivo para el alcance actual. |

### Justificación

La trazabilidad del lote es el núcleo del sistema y debe poder probarse y evolucionar independientemente de las tecnologías utilizadas.

### Consecuencias

**Positivas**
- Mayor mantenibilidad.
- Mejor testabilidad.
- Menor acoplamiento tecnológico.
- Facilita reemplazar implementaciones.

**Negativas**
- Mayor cantidad de interfaces y estructuras.
- Requiere disciplina para conservar la dirección de dependencias.

---

## ADR-003 — Comunicación mediante API REST

**Estado:** Aceptada

**Driver relacionado:** DA01 y necesidad de integración de múltiples clientes

### Contexto

El sistema tendrá diferentes consumidores de los servicios: una aplicación móvil de campo, un portal web administrativo/operativo y una interfaz pública de consulta QR.

La aplicación móvil necesita sincronizar información posteriormente cuando recupere la conectividad.

### Decisión

Utilizar una **API REST sobre HTTPS** como mecanismo principal de comunicación entre clientes y backend.

### Justificación

REST permite separar las interfaces de usuario de la lógica del backend y facilita que diferentes clientes utilicen los mismos casos de uso.

### Consecuencias

**Positivas**
- Separación entre clientes y backend.
- Reutilización de servicios.
- Integración sencilla de aplicaciones móviles y web.
- Soporte adecuado para sincronización.

**Negativas**
- Requiere definir contratos y versionado de API.
- Las operaciones offline deben resolverse mediante lógica de sincronización del cliente y del backend.

---

## ADR-004 — PostgreSQL como persistencia transaccional principal

**Estado:** Aceptada

**Driver relacionado:** DA02 / RC04

### Contexto

La plataforma necesita mantener información estructurada de productores, parcelas, lotes, eventos, calidad, inventario y logística, además de conservar relaciones entre dichas entidades.

### Decisión

Utilizar **PostgreSQL** como base de datos transaccional principal (OLTP).

### Justificación

El sistema requiere una fuente central de información consistente para el ciclo de vida del lote y sus relaciones operativas.

### Consecuencias

**Positivas**
- Persistencia centralizada.
- Soporte para relaciones transaccionales.
- Fuente principal para los procesos operativos.
- Base consistente para el procesamiento analítico posterior.

**Negativas**
- Las consultas públicas de alta frecuencia no deben depender exclusivamente de la base transaccional.
- El crecimiento analítico debe gestionarse mediante una estructura separada.

---

## ADR-005 — Redis para consultas públicas QR

**Estado:** Aceptada

**Driver relacionado:** DA03

### Contexto

La consulta pública mediante QR puede generar muchas lecturas repetitivas sobre información de trazabilidad que cambia con menor frecuencia que otras operaciones transaccionales.

El atributo de calidad de rendimiento exige que estas consultas no sobrecarguen innecesariamente la base de datos principal.

### Decisión

Incorporar **Redis como caché** para la información pública de trazabilidad consultada mediante QR.

### Justificación

La caché permite reducir consultas repetitivas contra PostgreSQL y separar parcialmente la carga pública de lectura de la carga transaccional.

### Consecuencias

**Positivas**
- Menor presión sobre PostgreSQL.
- Mejor tiempo de respuesta para consultas frecuentes.
- Permite absorber picos de lecturas QR.

**Negativas**
- Introduce gestión de expiración e invalidación de caché.
- Redis no será la fuente definitiva de los datos transaccionales.

---

## ADR-006 — Separación OLTP / OLAP mediante ETL y Datamart

**Estado:** Aceptada

**Driver relacionado:** DA05

### Contexto

Los reportes requieren indicadores de mermas, rendimiento, tiempos de transporte y liquidación por productor.

Estas consultas analíticas pueden tener patrones de acceso diferentes a las operaciones transaccionales.

### Decisión

Mantener **PostgreSQL como OLTP** y construir un **Datamart OLAP** alimentado mediante procesos ETL.

### Justificación

La separación evita que las consultas analíticas complejas interfieran directamente con las operaciones transaccionales.

### Consecuencias

**Positivas**
- Separación de cargas.
- Mejor soporte para indicadores y análisis histórico.
- Menor impacto sobre las transacciones operativas.

**Negativas**
- Los datos analíticos pueden no ser instantáneos.
- Se requiere diseñar y mantener procesos ETL.

---

## ADR-007 — Containerización con Docker

**Estado:** Aceptada

**Restricción relacionada:** RC05

### Contexto

La solución debe poder ejecutarse de forma consistente entre el entorno de desarrollo y un servidor Cloud.

### Decisión

Utilizar **Docker** para containerizar los componentes de la solución.

### Justificación

La containerización permite estandarizar el entorno de ejecución y facilitar el despliegue.

### Consecuencias

**Positivas**
- Portabilidad.
- Reproducibilidad del entorno.
- Facilita despliegue Cloud.
- Simplifica la preparación de ambientes.

**Negativas**
- Requiere gestionar imágenes, redes, variables de entorno y almacenamiento persistente.

---

## ADR-008 — Seguridad, autenticación y exposición controlada del QR

**Estado:** Aceptada

**Driver relacionado:** DA06

### Contexto

El sistema combina información operativa interna con una interfaz pública de consulta mediante código QR. Los requisitos de calidad establecen autenticación y autorización por roles, comunicaciones cifradas y restricciones sobre la información pública.

### Decisión

Aplicar una estrategia de seguridad basada en:

- **HTTPS** para las comunicaciones.
- **Autenticación** para usuarios internos.
- **Autorización basada en roles (RBAC)** para las funciones administrativas y operativas.
- **Separación del modelo público de trazabilidad** respecto de la información interna.
- **Control de exposición de datos** para impedir que la consulta QR revele datos personales, financieros u otra información no autorizada.
- Registro de acciones críticas para fines de auditoría.

### Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Acceso público directo a los datos del lote | ❌ No garantiza control de exposición de información interna. |
| Seguridad únicamente en la interfaz | ❌ No es suficiente; los controles deben aplicarse en el backend. |
| Seguridad centralizada en backend + vista pública controlada | ✅ Permite aplicar las reglas de acceso independientemente del cliente. |

### Justificación

La consulta QR debe proporcionar trazabilidad útil al consumidor sin convertir el mecanismo público en un acceso a la información privada del sistema.

### Consecuencias

**Positivas**
- Reduce la exposición de información sensible.
- Centraliza los controles de acceso.
- Mantiene separadas las vistas internas y públicas.
- Refuerza la auditoría de acciones críticas.

**Negativas**
- Incrementa la complejidad de autenticación, autorización y gestión de sesiones o tokens.
- Requiere mantener correctamente los roles y permisos.


---

## 2. Matriz de trazabilidad de decisiones

| Driver / Restricción | Decisión arquitectónica | Resultado |
|---|---|---|
| **DA01 - Operación desconectada** | ADR-003 API REST | App móvil sincroniza con backend. |
| **DA02 - Inmutabilidad y auditoría** | ADR-002 Clean Architecture + ADR-004 PostgreSQL | Reglas de negocio centralizadas y persistencia transaccional. |
| **DA03 - Consultas QR rápidas** | ADR-005 Redis | Carga pública de lectura desacoplada de PostgreSQL. |
| **DA04 - Nuevos cultivos** | ADR-001 Monolito Modular + ADR-002 Clean Architecture | Módulos y dominio preparados para evolución. |
| **DA05 - Separación analítica** | ADR-006 ETL + Datamart | OLTP separado de OLAP. |
| **DA06 - Seguridad** | ADR-008 Seguridad y control de exposición | Acceso interno protegido y consulta QR limitada a información autorizada. |
| **RC05 - Despliegue containerizado** | ADR-007 Docker | Portabilidad y despliegue consistente. |

---

## 3. Cadena de decisión arquitectónica

La propuesta completa queda trazada de la siguiente forma:

```text
NECESIDAD DEL NEGOCIO
        ↓
REQUISITOS
        ↓
ATRIBUTOS DE CALIDAD
        ↓
DRIVERS ARQUITECTÓNICOS
        ↓
DECISIONES ARQUITECTÓNICAS (ADR)
        ↓
ESTILO: MONOLITO MODULAR
        ↓
ENFOQUE: CLEAN ARCHITECTURE
        ↓
COMPONENTES Y MÓDULOS
        ↓
TECNOLOGÍAS Y DESPLIEGUE
```

La relación evita seleccionar tecnologías antes de justificar la estructura arquitectónica.

---

## 4. Decisión arquitectónica consolidada

La propuesta final se resume en:

> **Un Monolito Modular como estilo global, estructurado internamente mediante Clean Architecture, expuesto mediante API REST, con PostgreSQL como OLTP, Redis como caché para consultas QR, Datamart para OLAP y Docker para el despliegue.**

Esta decisión responde directamente a los drivers identificados y mantiene la solución dentro del alcance razonable del proyecto.
