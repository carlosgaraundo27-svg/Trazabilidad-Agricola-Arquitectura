# Revisión arquitectónica previa al Sprint 2

**Fecha:** 2026-11-06. **Base revisada:** commit 186b0d9e1af32c567bbbe21c7f91f321ec3d0dd3.  
**Motivo:** observaciones comunicadas por el estudiante sobre estilo arquitectónico y modelos C4. No se dispone de una rúbrica adicional ni del detalle literal de la evaluación docente.

## 1. Diagnóstico

La elección de monolito modular es razonable para el alcance documentado. La debilidad principal estaba en su especificación y en la coherencia visual: el estilo no establecía contratos y propiedad de datos; el C2 mezclaba lógica y despliegue; el C3 combinaba capas, módulos y entidades; el enfoque dibujaba puertos dependientes de tecnologías.

La revisión mejora la documentación. **No equivale a aprobación de la docente ni autoriza automáticamente el avance académico al Sprint 2.**

## 2. Correcciones documentales realizadas

| Hallazgo en la base | Corrección | Evidencia |
|---|---|---|
| Monolito modular descrito principalmente como lista de módulos; Acceso y Permisos ausente en algunas listas. | Siete módulos, propietarios de datos, contratos internos, límites transaccionales y costes de la decisión. | [Estilo](../02-arquitectura/01-estilo-arquitectonico.md). |
| C2 usa un marco de despliegue y muestra QR como posible aplicación separada sin resolverlo. | Frontera del sistema; QR como ruta de W1; almacén local L1; ETL J1; O1/A1 lógicos. | [C2](../04-modelo-c4/modelo-c4.md#3-c2--contenedores-de-s1). |
| C3 mezcla módulos, capas, entidades y ETL, dificultando reconocer el backend. | Componentes de grano grueso dentro de B1, contratos y salidas por módulo. | [C3](../04-modelo-c4/modelo-c4.md#4-c3--componentes-del-backend-b1). |
| Los niveles no mantienen una ampliación explícita. | S1 → B1 → T1 → consulta QR; propósito, audiencia y leyenda en cada nivel. | [Modelo C4](../04-modelo-c4/modelo-c4.md). |
| Flechas desde puertos a PostgreSQL/Redis contradicen la inversión de dependencias. | Adaptadores implementan interfaces interiores; separación entre dependencia y ejecución. | [Enfoque](../02-arquitectura/02-enfoque-arquitectonico.md). |
| Diagrama de componentes duplicado y API fuera del backend. | C3 como vista canónica; matriz de requisitos conserva su función. | [Componentes](../02-arquitectura/04-componentes-arquitectonicos.md). |
| Despliegue no muestra claramente el recurso PostgreSQL compartido. | Una instancia, dos esquemas, proxy público y red privada. | [Despliegue](../02-arquitectura/05-arquitectura-tecnica-despliegue.md). |
| GPS y mapas aparecen como un mismo sistema remoto. | Distinción entre capacidad del dispositivo y proveedor de mapas. | [Actores](../01-analisis-de-sistema/01-actores.md). |
| Secuencias extensas y caché sin proyección pública previa al guardado explícita. | Cinco participantes por secuencia; confirmación por registro; filtrado antes de cachear. | [Diseño interno](../03-diseno-de-software/01-diseno-interno.md). |

## 3. Pendientes prioritarios con criterio de cierre

**P0:** resolver para cerrar la revisión de arquitectura y planificar una implementación coherente.  
**P1:** resolver antes de desarrollar o aceptar la funcionalidad afectada. La prioridad es una recomendación técnica, no una rúbrica oficial.

| Prioridad | Problema o decisión | Propuesta de trabajo | Evidencia para darlo por cerrado | Responsable propuesto |
|---|---|---|---|---|
| P0 | Validación docente de estilo y C4 | Presentar las vistas corregidas y explicar sus fronteras. | Observaciones revisadas y aceptación expresa de la docente. | Estudiante/equipo + docente |
| P0 | Stack sin ratificar | Evaluar NestJS/React/Flutter frente a experiencia y tiempo; registrar una ADR tecnológica con versión y alternativas descartadas. | Una selección coherente en ADR, C2 y despliegue. | Equipo técnico |
| P0 | Mezcla/división de pre-lotes y pallets sin regla definitiva | Confirmar cardinalidades, cantidades, unidades y conservación de masa; definir si un pallet admite varios lotes. | Ejemplos de consolidación/división y modelo de datos aprobados. | Responsable de negocio + equipo |
| P0 | Alcance comercial de RF-12 insuficiente | Precisar origen de precios/descuentos, fórmula, aprobación y responsable de liquidaciones; decidir si se calculan o solo se reportan. | RF/HU y responsable de datos consistentes, sin inventar un módulo financiero. | Equipo + docente/negocio |
| P0 | Frontera del Sprint 2 desconocida | Contrastar la rúbrica antes de comprometer entregables. | Backlog acotado con criterios de aceptación y dependencias. | Equipo + docente |
| P1 | Reintentos offline no especificados | Definir ID estable, alcance de unicidad, respuesta repetida y mismo ID con contenido distinto; confirmar permisos al sincronizar. | Contrato API y casos: pérdida de respuesta, reinicio, duplicado y conflicto. | Backend + móvil |
| P1 | Estado del lote e inventario puede duplicarse | Definir estados, transiciones permitidas, propietario y atomicidad de operación/evento. | Tabla de transiciones y prueba de rollback de operación y evento. | Dominio + datos |
| P1 | Publicación QR y revocación en caché | Aprobar lista de campos, cambios de publicación, TTL, invalidación y respuesta segura ante fallo. | Contrato público y pruebas de ausencia de datos privados/revocación. | Backend + seguridad |
| P1 | Matriz de permisos pendiente | Definir acción y ámbito del recurso: propietario, organización y lote adquirido, además del rol. | Pruebas negativas entre usuarios con el mismo rol y distinto recurso. | Equipo + negocio |
| P1 | ETL sin contrato operativo | Definir fuente, frecuencia, marca de avance, reproceso y frescura visible del reporte. | Reejecución sin duplicados, reconciliación y medición EQ-07. | Datos + backend |
| P1 | Metas de calidad sin mediciones | Acordar carga, volumen, entorno y criterio EQ-01–EQ-07. | Resultados reproducibles cuando exista implementación. | Equipo + docente |
| P1 | Recuperación y operación | Especificar logs sin datos sensibles, respaldo y restauración, manejo de errores y secretos. | Restauración demostrada y evidencia de manejo de fallos. | Equipo técnico |

## 4. Preguntas de negocio que cambian el diseño

- ¿Un pre-lote se consume completo al consolidar o puede repartirse? ¿Cómo se conserva su cantidad y origen?
- ¿Se permite mezclar parcelas, productores o fechas en un lote? ¿Con qué restricciones?
- ¿Un pallet contiene un solo lote o varios? ¿Su QR representa al pallet o a un lote?
- ¿Quién aprueba un cambio de estado, una corrección histórica y la publicación de un evento?
- ¿La liquidación se calcula dentro de la plataforma o proviene de un sistema/archivo externo?
- ¿Qué información exacta puede ver un comprador y cómo se verifica su relación con el lote?

No fijar cardinalidades ni fórmulas como hechos del negocio hasta resolver estas preguntas.

## 5. Criterios de revisión del Sprint 01

- [x] El estilo describe estructura, contratos, datos, beneficios y limitaciones.
- [x] Los C4 distinguen sistema, contenedor, componente y código propuesto.
- [x] Los niveles mantienen nombres y una ampliación identificable.
- [x] Los diagramas incorporan propósito, relaciones y leyendas.
- [x] Las dependencias Clean apuntan hacia contratos interiores.
- [x] La topología distingue separación lógica de aislamiento físico.
- [ ] La docente acepta las correcciones.
- [ ] El equipo ratifica tecnologías y reglas de negocio críticas.
- [ ] Se acuerda el alcance y criterios de aceptación del Sprint 2.

Las casillas documentales indican que el contenido está presente, no que el sistema haya superado pruebas.

## 6. Orden de trabajo recomendado

Primero revisar estilo y C1–C4 con la docente. Después cerrar las decisiones P0 y seleccionar el alcance del Sprint 2. Como candidato técnico, un recorrido acotado sería registrar productor/parcela, capturar y sincronizar un pre-lote, recibirlo y consultar una proyección QR autorizada; su inclusión depende de la rúbrica y capacidad del equipo.

A partir de ese alcance se derivan contratos API, esquema lógico, reglas de seguridad y pruebas. Redis, ETL y las integraciones se mantienen en la arquitectura objetivo; cualquier reducción para el MVP se registra en ADR y se refleja en los diagramas.
