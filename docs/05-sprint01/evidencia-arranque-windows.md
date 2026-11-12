# Evidencia de arranque en Windows — 2026-11-12

Continuación de la [evidencia anterior](evidencia-primer-recorrido.md). [Guía actualizada](../../tecnologia/arranque-windows.md). Fecha local: 12 de noviembre de 2026, America/Lima.

## Resultado y alcance

La demo quedó en `http://localhost:3000`, con API/frontend existentes y PostgreSQL **nativo** 18.6 en loopback 55432. No se añadieron módulos ni se modificó código de aplicación, SQL, pruebas, Dockerfile o Compose. Docker continúa bloqueado por acceso denegado; la ruta nativa no acredita contenedores.

Se usaron los binarios existentes y un cluster nuevo en `arranque-runtime/pg-data-20261112`, con SCRAM y credenciales generadas en `.env` ignorado. No se tocaron los datos previos en `repo/.local/pg-data`. `initdb` terminó con código 0, aunque emitió mensajes sobre creación/re-ejecución con token restringido; el log se conserva. SQL confirmó versión 18.6, usuario `demo` y directorio nuevo esperado.

## Resultados reales

| Comprobación                           | Resultado                                                                 | Evidencia                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compose config / up                    | Configuración código 0; arranque código 1 por acceso al motor             | [Docker](evidence/2026-11-12/docker.txt)                                                                                                                |
| Build Vite                             | Código 0; 16 módulos transformados                                        | [Build](evidence/2026-11-12/build.txt)                                                                                                                  |
| Unitarias                              | 4 aprobadas; 0 fallos/omitidas                                            | [Unitarias](evidence/2026-11-12/unit.txt)                                                                                                               |
| Integración PostgreSQL                 | 11 resultados aprobados: 10 subcasos y contenedor; 0 omitidos             | [Integración](evidence/2026-11-12/integration-native.txt)                                                                                               |
| E2E estándar                           | 1 aprobado, código 0; cierre asistido del servidor de prueba              | [E2E](evidence/2026-11-12/e2e-native.txt)                                                                                                               |
| E2E con servidor externo explícito     | 1 aprobado en 1.8 s, código 0; servidor detenido después                  | [E2E externo](evidence/2026-11-12/e2e-external-native.txt)                                                                                              |
| Contratos, sintaxis, imports y enlaces | Código 0                                                                  | [Check](evidence/2026-11-12/check.txt)                                                                                                                  |
| Formato del código existente           | Código 0                                                                  | [Formato](evidence/2026-11-12/format.txt)                                                                                                               |
| Auditoría npm                          | Código 0; 0 vulnerabilidades reportadas al ejecutar                       | [Auditoría](evidence/2026-11-12/audit.txt)                                                                                                              |
| Migración y seed de demo               | Códigos 0; migración `001`, datos ficticios                               | [Migración](evidence/2026-11-12/migrate.txt), [seed](evidence/2026-11-12/seed.txt)                                                                      |
| Recorrido UI adicional                 | Productor/parcela HTTP 201; pre-lote guardado, recarga y consulta SQL     | [Resultado](evidence/2026-11-12/ui-create.json), [captura](evidence/2026-11-12/ui-create.png)                                                           |
| Reinicio de app y PostgreSQL           | Parada DB limpia; nuevos PID; mismo pre-lote visible al ingresar otra vez | [Reinicio](evidence/2026-11-12/native-restart.json), [resultado UI](evidence/2026-11-12/ui-restart.json), [captura](evidence/2026-11-12/ui-restart.png) |

Las pruebas corrieron desde `repo` con dependencias existentes; el código ejecutable trasladado a `repo-github` se comprobó por hash. No se reinstalaron las herramientas presentes. Se descargaron el Chromium y Headless Shell 158.0.8127.18, revisión 1254, requeridos por Playwright 1.65.0, en `arranque-runtime/playwright-browsers`. No se utilizó la revisión 1228. [Instalación](evidence/2026-11-12/browser-install.txt).

## Interfaz, backend y persistencia

Chromium aislado navegó contra la aplicación real, sin mocks. `/health` devolvió `status: ok` después de consultar PostgreSQL; el HTML devolvió 200. Como administrador se crearon `Productor verificación c4b7c65a` y `Parcela verificación c4b7c65a` desde sus formularios. Se asignó la parcela al recolector mediante el fixture SQL existente, porque no hay UI de asignaciones. Como `campo@example.test` se registraron 125.500 kg con fecha 2026-11-12.

Pre-lote: `db3b6a63-40ff-4ab5-b7be-cf1992e9b5b8`. SQL confirmó su fila y parcela; la UI lo recuperó tras recargar. Se detuvo la aplicación, se paró limpiamente PostgreSQL con `pg_ctl -m fast -w stop`, se iniciaron ambos otra vez y un nuevo navegador recuperó el mismo ID. No se recreó ni volvió a sembrar la DB para esa comprobación.

No hubo excepciones JavaScript ni respuestas HTTP inesperadas en la verificación adicional. El `401` inicial de `/api/v1/auth/me` sin sesión es esperado y se registró aparte. El primer auxiliar lo clasificó incorrectamente como error; se conserva localmente el resultado original. Se corrigió esa clasificación concreta del auxiliar y se repitió el recorrido completo. No se alteraron las pruebas del repositorio.

El E2E existente comprueba recarga, cuatro anchos (320, 768, 1024, 1440), ausencia de overflow horizontal, errores JavaScript y logout. La captura posterior al reinicio se inspeccionó visualmente. Esto no acredita auditoría WCAG ni metas de rendimiento EQ.

## Bases y credenciales

- Demo: `trazabilidad_dev_20261112`.
- Integración: `recorrido_test_20261112`.
- E2E: `recorrido_e2e_20261112`.

Las tres bases están separadas en el cluster nuevo. Integración ensaya down/up solo en su base desechable. La demo conserva `TEST_ALLOW_DB_WRITE=false` en `.env`.

La [comprobación por hashes y escaneo de credenciales](evidence/2026-11-12/preservation-and-secret-check.json) confirmó 80 archivos originales sin cambios, 39 archivos ejecutables/configuración idénticos en el clon y ningún valor de las credenciales generadas en los archivos preparados.

El `.env` original y el del clon contienen las mismas credenciales locales, sin mostrarlas en logs/documentación. `git check-ignore -v .env` identifica `.gitignore:22:.env`; `git ls-files --error-unmatch .env` falla como corresponde a un archivo no seguido. `.dockerignore` también lo excluye. `.env.example` mantiene sus bytes y marcadores originales. El escaneo de los archivos preparados y las evidencias contra las dos credenciales generadas no encontró esos valores en archivos para versionar. Las constantes ficticias de pruebas preexistentes no se usaron como contraseña de la demo.

## Clon y comparación antes del traslado

El primer clon falló con `schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS (0x8009030e)`. Funcionó al usar `git -c http.sslBackend=openssl` solo en esa orden, sin deshabilitar TLS ni cambiar configuración global. El clon completo conserva 75 commits en la rama base; `--is-shallow-repository` devuelve `false`.

- `origin/main`: `186b0d9e1af32c567bbbe21c7f91f321ec3d0dd3`. Comparación inicial: 58 archivos solo locales, 13 diferentes, 9 iguales.
- Base documental: `origin/docs/revision-arquitectura-c4-sprint01`, `38a85e38b647729d4a122d4b35e6f8297103a2a4`. Comparación: 57 solo locales, 6 diferentes, 17 iguales. No hubo archivos exclusivos remotos que eliminar.
- Se creó `chore/verificacion-primer-arranque` desde esa base. Se revisaron los seis diffs: `.gitignore`, README principal, índice documental y tres aclaraciones de alcance en arquitectura/C4. Después se trasladaron 57 añadidos y esas 6 modificaciones. Los archivos iguales se conservaron.

[Comparación con main](evidence/2026-11-12/comparison-main.json), [comparación con base](evidence/2026-11-12/comparison-base.json), [traslado](evidence/2026-11-12/transfer.json). Guía y evidencia nuevas se actualizan en el clon para conservar los 80 archivos originales. No se inicializó Git en `repo`, ni se hizo commit, push, merge o modificación del PR remoto.

## Bloqueos e intentos conservados

1. `docker version`, `docker info --format '{{.OSType}}'` y `docker compose up --build -d --wait`: acceso denegado a `npipe:////./pipe/docker_engine`, con advertencia sobre `<USER_HOME>\.docker\config.json`. Compose sí valida. Comprobación manual: los dos primeros comandos en una terminal normal deben mostrar Client/Server y `linux`. No se cambiaron permisos ni políticas.
2. Antes de arrancar el cluster adicional, integración falló por `ECONNREFUSED 127.0.0.1:55432`; E2E no pudo iniciar su webServer por lo mismo. [Integración inicial](evidence/2026-11-12/integration.txt), [E2E inicial](evidence/2026-11-12/e2e.txt). Estos intentos no cuentan como aprobados.
3. El E2E estándar ejecutó el test, pero quedó esperando el cierre de su servidor en 3001. Detener ese proceso conocido permitió finalizar con código 0. La variante ya soportada de servidor externo terminó normalmente. La causa concreta de la espera no se determinó; no se declara resuelto el cierre automático.

Pendientes: arranque/persistencia mediante Docker, estado WSL desde una terminal con acceso, CI remota y aceptación académica. El servidor externo E2E quedó detenido; app nativa 3000 y PostgreSQL 55432 quedaron activos. No se avanzó a nuevos módulos.
