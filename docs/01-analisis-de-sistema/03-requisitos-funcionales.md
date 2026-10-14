# Especificación de Requisitos Funcionales

## 1. Catálogo de Requisitos Funcionales (RF)

| ID | Proceso | Requerimiento |
| :--- | :--- | :--- |
| **RF-01** | Productores | Registrar productores, asociaciones, parcelas y ubicación georreferenciada. |
| **RF-02** | Certificaciones | Registrar el estado y vigencia de certificaciones agrícolas (SENASA / Global G.A.P). |
| **RF-03** | Cosecha | Registrar cosecha desde dispositivo móvil y conservar datos localmente cuando no exista conexión. |
| **RF-04** | Lote | Generar un identificador único para cada pre-lote y lote consolidado. |
| **RF-05** | Acopio | Registrar recepción y pesaje oficial del producto. |
| **RF-06** | Calidad | Registrar calibre, materia seca, descarte y temperatura de recepción. |
| **RF-07** | Clasificación | Clasificar el lote según reglas de aceptación definidas por el negocio. |
| **RF-08** | QR | Generar un código QR por lote o pallet y una vista pública de solo lectura. |
| **RF-09** | Historial | Conservar eventos del lote y restringir modificaciones de eventos cerrados. |
| **RF-10** | Inventario | Controlar existencias por estado: cuarentena, aprobado, empacado y despachado. |
| **RF-11** | Transporte | Registrar guía, vehículo, placa, chofer y precinto de seguridad. |
| **RF-12** | Reportes | Generar indicadores de mermas, rendimiento, tiempos de transporte y liquidación por productor. |

## 2. Matriz de Trazabilidad (Historias de Usuario vs. Requisitos Funcionales)

| Historia de Usuario | Descripción Simplificada | Requisitos Funcionales Asociados |
| :--- | :--- | :--- |
| **HU01** | Registro de Productores | RF-01, RF-02 |
| **HU02** | Registro Móvil de Cosecha | RF-03, RF-04 |
| **HU03** | Recepción y Pesaje en Acopio | RF-05, RF-04 |
| **HU04** | Control y Clasificación de Calidad | RF-06, RF-07, RF-09 |
| **HU05** | Generación de Identidad y QR | RF-04, RF-08 |
| **HU06** | Gestión Logística e Inventario | RF-10, RF-11 |
| **HU07** | Consulta Pública QR | RF-08, RF-09 |
| **HU08** | Analítica y Reportes | RF-12 |