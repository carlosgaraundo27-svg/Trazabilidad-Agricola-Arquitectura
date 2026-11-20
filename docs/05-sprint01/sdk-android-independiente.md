# Herramientas independientes para Android B

2026-11-19 (Lima). SDK señalado conservado sin ejecutar ni restaurar cuarentena. No se cambiaron exclusiones, protecciones, políticas persistentes de PowerShell o ubicación del repositorio. El CSV ya está exportado y analizado; el caso anterior sigue pendiente de presentación y dictamen del soporte Kaspersky. Ninguno de los controles siguientes acredita falso positivo o eliminación efectiva al reiniciar.

## Procedencia e integridad

- [Instalación oficial Flutter](https://docs.flutter.dev/install/manual), [catálogo Windows](https://storage.googleapis.com/flutter_infra_release/releases/releases_windows.json): Flutter **3.50.0 estable**, Dart **3.14.0**, revisión **ab2912035e160d9cad6306df307576da6128ebdb**, engine **371f77202a73e8dff57a8b3bff75bca55c090aee**. Es la misma versión/revisión del SDK señalado; se instaló independientemente, no se presenta como un parche de la alerta.
- [ZIP oficial](https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.50.0-stable.zip):1868535132bytes; SHA256 oficial/local **35fb843409c80a1c69b64bbae1756bba437222f909622d83540e266e1759aab8**. Herramientas bajo `C:/Users/leona/Tools/flutter-official-3.50.0-20261119`, fuera del proyecto y del SDK señalado.
- Extracción con rechazo de traversal, enlaces y colisiones. Scripts flutter.bat, dart.bat, shared.bat, update_engine_version.ps1, update_dart_sdk.ps1 y auxiliar de salida revisados, con hashes privados. Se usó ruta extendida para archivos largos sin cambiar políticas de Windows. El propietario autorizó expresamente ExecutionPolicy Bypass/Unblock-File del lanzador oficial; no autoriza scripts arbitrarios ni cambios de antivirus.
- Android bajo `C:/Users/leona/Tools/android-sdk-b-20261119/sdk`: PlatformTools37.0.3, CommandLineTools23.0, API36rev2, BuildTools36.0.0 y NDK28.2.13676358. URLs de [repositorio oficial Google](https://dl.google.com/android/repository/repository2-1.xml); tamaños y SHA1 publicados comparados, SHA256 locales conservados. SHA1 es la integridad ofrecida en ese catálogo, no una prueba suficiente de seguridad. adb.exe/android.exe tienen firma Authenticode válida GoogleLLC.
- NDK [r28c Windows](https://dl.google.com/android/repository/android-ndk-r28c-windows.zip):748118221bytes; SHA1 oficial/local086bba43ff2f5eb0e387b15c8278bb4e0d89ba1d; SHA256 local6bec98ac2354d8a919760889a1a41d020132e5e8cfa1b1fe51610a72c36a466b. Extraído/analizado antes de ejecutar compiladores.
- Licencia Android SDK aceptada explícitamente por el propietario. El nuevo CLI no genera el registro que exige el cargador Gradle anterior; se registró únicamente el hash de ese texto exacto ya aceptado. No se omitió comprobación ni aceptó otra licencia. Java Oracle26.0.1 existente y firmado; Gradle9.5.0 admite esa versión. Wrapper HTTPS con SHA256 oficial fijado en el proyecto.

## Análisis previo a ejecución

Kaspersky21.27 actualizado, sin exclusiones o desactivación. Horas transcritas del reporte, cuya zona no está incluida; no se reasigna una zona a eventos antiguos. Reportes completos privados en `.local/sonar-reportes-20261119`, excluidos de Git y conservados.

| Objeto / perfil | Inicio–fin, 19 nov | Procesados | Detecciones / sospechas / errores | Limitaciones |
| --- | --- | ---: | --- | --- |
| ZIP Flutter / $0242 |16:44:43–16:50:28|150856|0/0/0|5 elementos con contraseña |
| Instalación Flutter / $0244 |17:00:57–17:02:02|19232|0/0/0|5 elementos con contraseña |
| ZIPs e instalación Android / $0246 |17:17:18–17:19:33|181861|0/0/0|0 protegidos/omitidos/corruptos |
| ZIP e instalación NDK / $0334 |20:29:57–20:32:12|23695|0/0/0|0 protegidos/omitidos/corruptos |

Los cinco elementos protegidos son fixtures ZIP del paquete archive en .pub-preload-cache; no se descifraron ni se afirma cobertura completa. La cabecera del análisis indica Scan archives:No aunque el reporte enumera objetos internos: se conserva esa limitación. Modo report-only, sin desinfección, restauración, cuarentena o borrado. La consola advierte que ignora el parámetro de acción en modo no interactivo; la cabecera y los resultados efectivos son la evidencia, no ese parámetro aislado.

Después de los controles se ejecutaron version/doctor, análisis/pruebas Dart y compilación. No se encontró una nueva detección en estas ejecuciones; procedencia, checksum, firma y resultados negativos no sustituyen el dictamen sobre el incidente anterior. El borrador privado de soporte incorpora esta distinción y conserva su versión anterior. No se envió nada al proveedor.

## Dispositivo y límites

HONOR X6b Plus, Android16/API36, autorización RSA confirmada por el propietario. Tras no aparecer interfaz ADB inicialmente, el propietario vinculó depuración inalámbrica y ADB terminó mostrando un dispositivo autorizado. Identificador y direcciones solo en evidencia privada. Sin emulador, controlador ajeno o ejecución como administrador. El backend B usa loopback HTTPS3042 con ADB reverse; la demo3026 y su base001–007 no se consultaron ni modificaron.

La [preparación B](preparacion-offline-B.md) registra los resultados de software; tener SDK/compilación disponibles no acredita por sí solo aceptación nativa.
