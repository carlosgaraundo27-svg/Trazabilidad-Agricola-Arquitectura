# Corrección separada de la vulnerabilidad Docker/PATH

Base main18d57e9, rama fix/docker-ejecutable-confiable. ROP-01/#11 permanece separado y sin fusionar. Sin cambios de Quality Gate, perfiles, supresiones o aceptación de issues.

## Hallazgo y exposición

Sonar confirma una VULNERABILITY abierta: **javascript:S4036**, clave **AaHagHqDGiVmDmX-BZYO**, scripts/verify-compose.js:27 del main observado, severidad MINOR. spawnSync("docker",...) hereda PATH. Si un directorio anterior contiene un ejecutable docker ajeno, la herramienta puede ejecutarlo con los permisos y entorno del proceso, incluidos secretos locales/CI y acceso potencial al daemon. Argumentos fijos/shell=false no evitan seleccionar un programa incorrecto.

Es una herramienta local/CI, no un endpoint HTTP o entrada del usuario del reporte. Un runner con PATH íntegro reduce exposición, pero no garantiza la integridad del entorno de cada desarrollador. No se afirma explotación ni ejecución maliciosa observada.

## Cambio

El resolver admite solo /usr/bin/docker en Linux y C:\Program Files\Docker\Docker\resources\bin\docker.exe en Windows. No consulta PATH, variables de configuración, CWD, where/which o perfiles. Rechaza redirección de ruta canónica y plataformas no revisadas; no hay fallback.

- Linux: archivo regular ejecutable, propietario root y archivo/todos los directorios antecesores sin escritura de grupo/otros. Un enlace hacia ubicación ajena, propietario no privilegiado o permiso0777 impide ejecutar.
- Windows: instalación estándar en C:, firma Authenticode válida de Docker y propietarios/ACL de archivo/cadena Program Files limitados a SYSTEM, Administradores o TrustedInstaller. Comprobación con PowerShell de sistema, NoProfile/NonInteractive y PSModulePath de sistema, sin administrador, ExecutionPolicy o script elegido por el usuario. Si la comprobación no está disponible o devuelve falso, rechaza.
- verify-compose usa el resolver dentro de su manejo de errores y conserva reporte/fallo no-cero. El reinicio Docker de test-compose reutiliza el mismo resolver: no queda una resolución por PATH en ese recorrido relacionado. No modifica contenedores/volúmenes en esta revisión local.

El código confía en la administración privilegiada del sistema operativo y en archivos del sistema así instalados; no promete proteger un equipo cuyo root/administrador ya esté comprometido. macOS, instalaciones portables o rutas distintas requieren una política revisada, no un override libre. Esta limitación es explícita y falla antes de ejecutar.

## Pruebas y alcance real

Regresiones nuevas de selección con PATH atacante, symlink/redirección, UID no privilegiado, escritura en archivo/directorio, falta de ejecutabilidad/archivo, error de lectura, firma/ACL negativas y plataforma no admitida. No lanzan Docker ni requieren un daemon. La validación de Windows se prueba con respuestas controladas; no se presenta como prueba de una instalación Docker real de Windows (binario estándar ausente en este equipo). CI Linux/Compose del SHA publicado debe comprobar el recorrido real.

La vulnerabilidad de **main sigue abierta mientras la corrección esté en PR**; no se declara resuelta por aprobar el gate del PR. El inventario123/una vulnerabilidad de main se conserva hasta nueva integración autorizada y reanálisis. Los nueve críticos DDL y demás CODE_SMELL siguen pendientes. No reescribir migraciones ni repetir pruebas de respaldo/demo para este cambio.

## Continuidad de Android

El CSV Kaspersky ya fue exportado y analizado, con original y copia privada preservados. El pendiente del incidente es presentar el caso al soporte y guardar identificador/dictamen, no reexportar. No se publica su contenido. La instalación oficial nueva está separada del SDK señalado y requiere checksum, inspección y análisis Kaspersky actualizado de ZIP/instalación antes de ejecutarse; esos controles no resuelven por sí solos el incidente anterior. B requiere Android real y no se declara validado por pruebas web/SQLite de escritorio.
