# Identificación de Actores del Sistema

## 1. Actores Humanos

| Actor | Responsabilidad principal |
| :--- | :--- |
| **Productor** | Registrar información de productor/parcela y entregar producto a la cadena. |
| **Recolector / Cuadrilla** | Registrar actividades de cosecha (vía app móvil offline/online) y responsable asociado al pre-lote. |
| **Operario de acopio** | Recibir, pesar, clasificar y registrar lotes en el centro de acopio. |
| **Responsable de calidad** | Registrar controles (calibre, materia seca, descarte, temperatura) y aprobar, observar o clasificar el lote. |
| **Encargado logístico** | Asignar transporte, registrar guía de remisión, vehículo, chofer y gestionar el despacho. |
| **Administrador** | Gestionar usuarios, catálogos, roles, permisos y parámetros del sistema. |
| **Comprador** | Consultar información detallada y autorizada del lote adquirido, incluyendo reportes y liquidaciones. |
| **Público (Consumidor final)** | Consultar datos públicos de trazabilidad mediante el escaneo del código QR del producto. |

## 2. Sistemas Externos (Proyectados / Servicios de Soporte)

| Sistema Externo | Responsabilidad técnica |
| :--- | :--- |
| **GPS / Servicios de Mapas** | Proveer georreferenciación para las parcelas y seguimiento logístico. |
| **Servicio de Notificaciones (Email/SMS)** | Envío de alertas de despacho, calidad o liquidaciones a los productores y compradores. |
| **Almacenamiento en la Nube (AWS S3/GCP Cloud Storage)** | Almacenar evidencias de calidad, fotos de lotes y documentos adjuntos. |