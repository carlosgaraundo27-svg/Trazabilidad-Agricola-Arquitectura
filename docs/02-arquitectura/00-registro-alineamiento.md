# Registro de Alineamiento Arquitectónico

## Propósito

Registrar las diferencias entre la propuesta técnica PDF, las decisiones de arquitectura y la documentación de Sprint 01, para evitar que los diagramas y la explicación oral presenten decisiones contradictorias.

## 1. Línea arquitectónica oficial para Sprint 01

- **Estilo global:** Monolito Modular.
- **Organización complementaria:** capas.
- **Comunicación entre clientes y backend:** API REST sobre HTTPS.
- **Enfoque interno seleccionado:** Clean Architecture.
- **Persistencia transaccional:** PostgreSQL / OLTP.
- **Caché de lectura QR:** Redis en la arquitectura objetivo (ADR-005).
- **Analítica:** ETL + Datamart lógico / OLAP.
- **Despliegue:** Docker.

Esta línea debe ser coherente en las vistas C1-C4, los componentes, el diseño interno y la exposición.

## 2. Clean Architecture frente a Arquitectura Hexagonal

El PDF inicial de propuesta describe una “arquitectura modular en capas con principios hexagonales”. En el repositorio, la decisión registrada para el Sprint 01 selecciona **Clean Architecture como enfoque interno**. Ambos enfoques comparten la intención de aislar el dominio de la infraestructura, pero no deben presentarse como dos selecciones distintas sin documentar comparación y decisión explícita.

Para esta entrega se utiliza Clean Architecture como enfoque declarado. Los puertos/adaptadores pueden emplearse como técnica de desacoplamiento, sin renombrar el enfoque principal.

## 3. Stack tecnológico contradictorio en el PDF inicial

Se detectaron dos descripciones diferentes en el PDF de propuesta:

- La tabla textual de arquitectura técnica menciona Flutter para móvil y NestJS o Spring Boot para el backend, con React/Tailwind o equivalente en el portal web.
- La franja de tecnologías del diagrama de despliegue muestra Python/FastAPI.

Estas son alternativas diferentes y no deben aparecer simultáneamente como una selección final. La documentación de Sprint 01 recomienda **NestJS + TypeScript** para el backend por coherencia con un frontend React/TypeScript, pero es una recomendación pendiente de ratificación. Hasta que se apruebe la ADR tecnológica, los contenedores se describen principalmente por responsabilidad y no por framework.

## 4. Interpretación del despliegue de módulos

El diagrama físico de la propuesta inicial dibuja varios módulos de negocio como cajas Docker separadas. Esto puede interpretarse como despliegues independientes y acercarse a una arquitectura de microservicios.

Bajo la decisión actual de **Monolito Modular**, Productores, Cosecha, Acopio/Calidad, Trazabilidad, Logística/Inventario y Reportes son **módulos lógicos dentro de una sola aplicación backend desplegable**. El diagrama C2 presenta un único contenedor de backend; C3 detalla los módulos internos. Solo una decisión futura explícita permitiría extraer uno o más módulos como servicios independientes.

## 5. PostgreSQL, OLTP y Datamart

La propuesta inicial menciona PostgreSQL tanto como motor transaccional como base para el modelo analítico; algunos gráficos pueden interpretarse como dos servidores físicos distintos. Para el prototipo, el Datamart se documenta como un **almacén lógico separado** que puede comenzar en un esquema diferenciado de PostgreSQL y alimentarse por ETL. Una instancia o servidor independiente se evaluará si el volumen, las pruebas o los requisitos lo justifican.

## 6. Redis

La propuesta inicial muestra Redis como opcional en una tabla de calidad y como componente de caché en el diagrama de despliegue. La decisión ADR-005 lo incluye en la arquitectura objetivo para consultas QR. La política de TTL, invalidación y beneficio de rendimiento deben probarse. Si el equipo decide excluir Redis del MVP inicial, debe actualizar formalmente la ADR y los diagramas.

## 7. Duración del proyecto

El PDF indica 13 semanas como duración estimada en la ficha inicial, mientras la tabla del cronograma y el presupuesto mencionan 11 semanas. Se debe acordar una única duración de referencia y ajustar cronograma, recursos y presupuesto para evitar que la propuesta se contradiga.

## 8. Decisiones pendientes de ratificación o validación

1. Aprobar el backend final: NestJS recomendado; Spring Boot y FastAPI aparecen en versiones anteriores del documento.
2. Ratificar el stack del portal web y los detalles de la app móvil.
3. Aprobar los umbrales propuestos en EQ-01 a EQ-07 y definir el entorno de prueba.
4. Definir conflictos, reintentos e idempotencia en la sincronización offline.
5. Aprobar la matriz detallada de roles y permisos.
6. Confirmar el diseño físico del Datamart y el uso efectivo de Redis.
7. Reconciliar la duración del proyecto: 11 o 13 semanas.

## Regla de actualización

Cuando se confirme una decisión, actualizar a la vez su ADR, arquitectura técnica, diagramas C2/C3, matriz de componentes y guion de exposición. La documentación debe distinguir siempre entre **propuesto**, **aprobado**, **implementado** y **verificado**.
