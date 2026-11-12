# Cierre reproducible del primer recorrido

Fecha: 2026-11-12. Alcance: autenticación, productor, parcela y pre-lote. Backend Express decidido en ADR-009; [C4 implementado](../04-modelo-c4/modelo-c4.md). No se añadieron módulos de negocio.

## Evidencia local desde el clon

Las comprobaciones actuales se ejecutaron desde `repo-github`, con Node 24.16.0, dependencias del lockfile y Chromium 158.0.8127.18, revisión 1254. PostgreSQL nativo 18.6 usa 55432 y bases nuevas y dedicadas para integración/E2E. La demo y los datos del respaldo `repo` no se modificaron.

| Comprobación                           | Resultado                                                                |
| -------------------------------------- | ------------------------------------------------------------------------ |
| Build Vite                             | Aprobado                                                                 |
| Unitarias                              | 4 aprobadas, 0 omitidas                                                  |
| Integración PostgreSQL                 | 12 resultados aprobados: 10 subcasos API, contenedor y ciclo de servidor |
| E2E automático                         | 1 aprobado, finalización en unos 2–3 segundos sin intervención           |
| Sintaxis, contratos, imports y enlaces | Aprobados                                                                |
| Formato                                | Aprobado                                                                 |
| Auditoría npm                          | 0 vulnerabilidades reportadas al ejecutar                                |

Los logs de esta revisión están en [evidence/cierre](evidence/cierre/README.md). Las [evidencias anteriores](evidencia-arranque-windows.md) se conservan como históricas; no sustituyen los resultados de esta revisión.

## Corrección del cierre E2E

Antes del cambio, el recorrido UI aprobaba pero el proceso quedaba en `Terminating the WebServer`. Una ejecución acotada a 20 segundos reprodujo el bloqueo. El launcher de Playwright 1.65 usa un shell y `taskkill /T /F` en Windows; la [configuración gracefulShutdown se ignora en Windows](https://playwright.dev/docs/test-webserver).

Ahora `globalSetup` crea directamente un hijo Node mediante `fork`, espera su mensaje de listo y devuelve una función de cierre por IPC. El servidor deja de aceptar conexiones, cierra pg y termina. No hay ruta HTTP de apagado, reutilización automática de servidores ni cambio de permisos. Si el padre desaparece, la desconexión IPC también inicia el cierre; existe un límite de cierre con fallo visible.

La prueba `server-lifecycle.test.js` inicia el servidor en un puerto efímero, comprueba `/health`, exige código 0 y vuelve a ocupar el puerto después del cierre. Al invertir temporalmente la condición del mensaje `stop`, falló por timeout de 5 segundos; se restauró el archivo y la prueba pasó. No se omitieron pruebas ni se redujeron aserciones.

## Compose local

Docker funciona en la PowerShell del usuario según su comprobación `hello-world`. Esta sesión sigue recibiendo acceso denegado al motor; no se cambian permisos ni políticas. Se validaron las configuraciones base y override sin conectar al motor.

El respaldo ocupa 3000 (app) y 55432 (PostgreSQL). El `.env` local del clon selecciona `APP_PORT=3002`; la DB Compose permanece privada. El override E2E publica solamente `127.0.0.1:55433`.

Se solicitó ejecutar `node --env-file-if-exists=.env scripts/verify-compose.js` en la PowerShell normal y entregar su JSON de resultados. **El resultado de esa ejecución local sigue pendiente de recepción.** No se atribuyen a esta sesión contenedores levantados ni persistencia comprobada con el Docker local hasta recibir evidencia.

Los comandos reproducibles, seed no destructivo, recorrido UI y reinicio sin borrar volúmenes se describen en la [guía](../../tecnologia/arranque-windows.md). `verify-compose.js --restart` compara los IDs existentes antes/después; no vuelve a sembrar ni elimina registros.

## CI remota

El workflow separa dos jobs:

- `verify`: formato, contratos, unitarias, integración PostgreSQL, build y E2E con cierre automático.
- `compose`: build de imágenes, migración/seed, recorrido UI contra app/db Compose y reinicio conservando los IDs y el volumen.

Ambos usan Node 24 y PostgreSQL 18. Las credenciales Compose se generan en `.env` efímero y no se suben como artefacto. Los logs de los auxiliares redactan las credenciales. La limpieza usa `down` sin eliminar volúmenes.

Resultado consultado: [Actions #1, ejecución 43252832569](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/actions/runs/43252832569), commit `e599c6ba070a412154bd4db1c222c00f8651ce12`, conclusión `success`. Los jobs `verify` y `compose` terminaron con `success`, sin pasos omitidos en las comprobaciones. [Resumen de API](evidence/cierre/ci-remota.json).

En Compose remoto, app/DB quedaron saludables, migración `001` y seed aprobaron, el recorrido UI pasó en 2.0 segundos y el pre-lote `76d89dfa-539c-4d5f-89ed-5227e812558e` estuvo presente antes y después de `down` y `up`. Ambos auxiliares terminaron con `passed: true`; el volumen se conservó. [Extracto del log real](evidence/cierre/compose-ci.txt). Es evidencia de contenedores en Ubuntu/Actions, no del Docker local de Windows.

[PR #2](https://github.com/carlosgaraundo27-svg/Trazabilidad-Agricola-Arquitectura/pull/2) abierto, sin fusionar, desde `chore/verificacion-primer-arranque` hacia la rama documental de #1. El árbol publicado coincide con el índice revisado. La actualización documental posterior a esta ejecución no cambia el código ejecutable; revisar también los checks del último SHA del PR.
