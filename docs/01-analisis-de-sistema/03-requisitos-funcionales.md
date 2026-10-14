# Especificación de Requisitos Funcionales

## 1. Catálogo de Requisitos Funcionales (RF)

| ID | Proceso | Requerimiento |
| :--- | :--- | :--- |
| **RF-01** | Productores | Registrar productores, asociaciones, parcelas y ubicación georreferenciada. |
| **RF-02** | Certificaciones | Registrar el estado y vigencia de certificaciones agrícolas. |
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
| **RF-13** | Administración de accesos | Gestionar usuarios internos, roles y permisos para proteger las operaciones según las responsabilidades de cada actor. |

**Nota sobre RF-13:** se formaliza como requisito porque la propuesta ya asigna al administrador la gestión de usuarios, roles y permisos, y la arquitectura incluye autenticación y autorización. Este requisito hace trazable el componente de seguridad; debe confirmarse con el docente/equipo al aprobar el catálogo.

## 2. Matriz de trazabilidad (Historias de Usuario vs. Requisitos Funcionales)

| Historia de Usuario | Descripción simplificada | Requisitos relacionados |
|---|---|---|
| **HU01** | Registro de productores y parcelas | RF-01, RF-02 |
| **HU02** | Registro móvil de cosecha | RF-03, RF-04 |
| **HU03** | Recepción y pesaje en acopio | RF-05, RF-04 |
| **HU04** | Control y clasificación de calidad | RF-06, RF-07, RF-09 |
| **HU05** | Generación de identidad y QR | RF-04, RF-08 |
| **HU06** | Gestión logística e inventario | RF-10, RF-11 |
| **HU07** | Consulta pública QR | RF-08, RF-09 |
| **HU08** | Analítica y reportes | RF-12 |
| **HU09** | Administración de usuarios y permisos | RF-13 |

## 3. Requisitos especialmente influyentes en arquitectura

- **RF-03 y RF-04:** condicionan la captura offline, sincronización e identificación de lotes.
- **RF-08 y RF-09:** justifican el módulo de Trazabilidad, la consulta QR y el historial de eventos.
- **RF-10 y RF-11:** justifican el módulo de Logística e Inventario.
- **RF-12:** justifica ETL y Datamart para reportes.
- **RF-13:** justifica autenticación, autorización, gestión de roles y controles por operación.
