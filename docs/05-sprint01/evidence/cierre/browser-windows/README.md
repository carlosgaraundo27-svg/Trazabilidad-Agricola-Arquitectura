# Chromium compatible y Compose Windows

Revisión 2026-11-12. Se usa Playwright instalado 1.65.0, sin actualizar dependencias ni modificar el lockfile. Ruta elegida explícitamente: `<WORKSPACE>/.arranque-runtime/playwright-browsers`.

- [Compatibilidad e instalador](browser-compatibility-check.json): Chromium y Headless Shell revisión 1254 presentes, lanzamiento 158.0.8127.18; instalador código 0, sin nueva descarga.
- [Arranque del usuario](user-compose-start.json): `passed: true`.
- [E2E del usuario](user-compose-e2e.json): código 0, 1 aprobado en 2.6 segundos.
- [Persistencia del usuario](user-compose-restart.json): `passed: true`; mismo ID no vacío antes y después del reinicio.
- [E2E repetido por el agente](agent-compose-e2e.json): código 0, 1 aprobado en 1.5 segundos.
- [Reinicio intentado por el agente](agent-compose-restart-denied.json): acceso al motor denegado en el primer comando, antes de detener contenedores.

Los dos fallos iniciales buscaban `chromium_headless_shell-1254` bajo `.arranque-runtime`, mientras otra instalación anterior estaba bajo `arranque-runtime`. Se conservan ambos directorios sin mover ni borrar archivos. La guía establece una única ruta absoluta para instalación y test en la misma terminal.

El reinicio adicional después de la repetición del agente se solicitó en la PowerShell normal. Hasta recibir su JSON no se considera verificado ese último reinicio; el reinicio local anterior ya tiene evidencia de persistencia real. Las rutas privadas y credenciales se redactan en estas copias. No se incluyen `.env`, binarios de navegador ni trazas de sesión.
