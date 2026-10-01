# Trazabilidad y Gestión Comercial de Palta Hass

## Autor
Carlos Leonardo Garaundo Cuya

## Descripción
Propuesta técnica de arquitectura de software para la trazabilidad y gestión comercial de productos agrícolas (Palta Hass) en una cadena de suministro peruana. La plataforma centraliza la información desde la cosecha hasta la entrega, utilizando el "lote" como unidad central de trazabilidad, permitiendo consultas públicas mediante código QR.

## Caso de Estudio
Cadena de suministro agrícola peruana - Palta Hass.

## Curso
Arquitectura de Software - Semestre 2026
Universidad Nacional de San Cristóbal de Huamanga (UNSCH)



|🥑 Comprensión del caso de negocio |
| :--- |
| **Contexto:** El proyecto modela una plataforma para asegurar la trazabilidad operativa y comercial de la palta Hass en Perú. |
| **Problema a resolver:** Falta de integración de información en los distintos puntos de la cadena (productor, cosecha, acopio, calidad, inventario, transporte, entrega), lo que dificulta conocer el origen, recorrido y mermas de los lotes. |
| **Propuesta de valor:**<br>• Centralizar la información en un repositorio transaccional único.<br>• Permitir la generación de códigos QR para la consulta pública (solo lectura) de la trazabilidad del lote.<br>• Proteger datos internos mediante roles y permisos. |
| **Alcance arquitectónico inicial:** Arquitectura modular en capas (Presentación, Aplicación/API, Dominio, Infraestructura, Analítica) con una API REST integrando una app móvil de campo, un portal web administrativo y la consulta pública QR. Base de datos PostgreSQL. |