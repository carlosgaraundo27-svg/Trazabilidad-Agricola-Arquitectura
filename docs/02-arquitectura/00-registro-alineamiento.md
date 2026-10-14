# Registro de Alineamiento Arquitectónico

## Antecedente

El PDF de la propuesta técnica inicial describe “arquitectura modular en capas con principios hexagonales en el núcleo del negocio”. Posteriormente, la decisión arquitectónica del repositorio formalizó **Monolito Modular como estilo** y **Clean Architecture como enfoque interno**, siguiendo la distinción trabajada en la Guía 03 y retomada en la Guía 04.

## Línea arquitectónica de referencia para Sprint 01

- **Estilo global:** Monolito Modular.
- **Organización complementaria:** capas.
- **Comunicación entre clientes y backend:** API REST sobre HTTPS.
- **Enfoque interno seleccionado:** Clean Architecture.
- **Persistencia transaccional:** PostgreSQL / OLTP.
- **Caché para consultas QR:** Redis, con política de uso que debe validarse.
- **Analítica:** ETL + Datamart lógico / OLAP.
- **Despliegue:** Docker.

## Clean Architecture y Hexagonal

Clean Architecture y Arquitectura Hexagonal son enfoques relacionados en su intención de aislar el negocio de la infraestructura, pero no deben mostrarse como dos selecciones distintas si no se documenta una comparación y decisión explícita. Para mantener esta entrega internamente consistente, los diagramas y los documentos de diseño usan Clean Architecture como enfoque declarado. El principio de puertos/adaptadores puede aparecer como mecanismo de desacoplamiento, sin renombrar el enfoque principal ni presentar ambos como decisiones incompatibles.

## Aspectos que deben ratificarse antes de la implementación

1. Tecnología final del backend: NestJS o Spring Boot. La documentación recomienda NestJS, pendiente de acuerdo.
2. Tecnología exacta del portal web.
3. Umbrales de escenarios de calidad y entorno de pruebas.
4. Política de sincronización offline: conflictos, reintentos e idempotencia.
5. Si Redis queda activo desde el MVP o después de una prueba de carga.
6. Si el Datamart será un esquema separado en PostgreSQL o una base/instancia independiente.
7. Definición de roles y permisos detallados.
8. Umbrales de clasificación de calidad y transiciones permitidas de lote.

## Regla de actualización

Cualquier cambio confirmado debe reflejarse de manera consistente en el ADR correspondiente, diagramas C2/C3, matriz de componentes y documento de exposición. No se debe presentar como implementada una tecnología que solo esté propuesta.
