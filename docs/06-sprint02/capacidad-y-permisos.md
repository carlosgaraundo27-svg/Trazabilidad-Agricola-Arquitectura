# Capacidad, control de abuso y permisos: protocolo separado

Base preservada: acc1a220635a43930a7eb28725c757e1709974e2, PR15 en borrador. No modificar ni fusionar PR14. Este protocolo no altera límites, proxy, reglas de negocio o servicios productivos.

## Qué midieron los1320 HTTP429

Endpoint GET `/api/public/v1/lots/:publicId` (también `/q/:id` comparte la misma instancia). `server/http.js` monta `publicLimiter()` de `server/publication-http.js`:60 peticiones/60000ms, store MemoryStore predeterminado por proceso, sin keyGenerator propio. La versión instalada de express-rate-limit usa `ipKeyGenerator(req.ip)`, con subnet56 por defecto para IPv6. En la prueba anterior k6 usó Docker host network, destino127.0.0.1:3302, sin localIPs ni proxy; los VU compartían una IP/clave. Cambiar cookie, publicId o VU no cambia esa clave. Las180 respuestas admitidas y1320 denegadas son compatibles con tres ventanas de60; no son evidencia de saturación.

Express no configura trust proxy: valor predeterminado false; req.ip viene del socket, no se confía en X-Forwarded-For. No se cambia a true ni se simulan IP mediante cabeceras. Un despliegue detrás de proxy/NAT requiere diseño y configuración propios revisados: muchos clientes reales pueden compartir una clave. MemoryStore no es un límite distribuido entre réplicas. No se altera aquí esa deuda/configuración.

Se conservan todos los resultados de abuso anteriores. La nueva ejecución añade p99 y observación de IP/clave, policy, Retry-After y estados, sin publicar cookies/cuerpos/credenciales. El encabezado numérico X-Sprint02-VU es solo una etiqueta del observador de laboratorio; no autentica ni interviene en el limitador.

## Prueba de capacidad distinta

Modelo sintético de lectores QR **anónimos**, no usuarios autenticados: un origen IPv4 TCP distinto por VU,100 publicaciones ficticias distribuidas por VU/iteración y pausa5s por lectura (≤12/min por origen). Representa lectores con salidas de red independientes; no representa usuarios detrás del mismo NAT, CDN, red móvil, HTTPS o mezcla completa de operaciones privadas.

k6 `--local-ips` asigna orígenes reales ya disponibles en el runner Linux, rango loopback127.16.0.1–127.16.7.208 para2000. No configura IP en producción ni envía X-Forwarded-For. El observador importa el arranque productivo, usa el mismo proceso/limitador/caché y verifica por etapa: req.ip=socket.remoteAddress, trust proxy false, clave distinta por VU y número de claves igual al objetivo. Sin esa evidencia la etapa no autoriza avanzar. Si el runner no puede enlazar esos orígenes, registrar fallo; no cambiar proxy ni omitir verificación.

Progresión independiente1→10→50→100→250→500→1000→2000. Screening: rampa30s (smoke5s), meseta60s (smoke10s), bajada15s y reposo5s. **No sustituye la meseta100VU/10min del plan EQ-01 previo**, que se conserva. Un screening2000, si se alcanza, tampoco constituye aceptación de producción ni ensayo de estabilidad prolongado.

Mismo runner GitHub-hosted aislado para app, PostgreSQL/Redis y generador: interferencia declarada. Registra hardware/versiones/digests, CPU/RAM/disco libre, RSS/CPU de app, DockerCPU/RAM y presencia del generador cada3s. CPU de app procede de ticks `/proc`, con CLK_TCK consultado; es porcentaje de un núcleo, distinto del agregado del host. k6 tiene límite explícito8192 descriptores, no se modifica limitador ni pool SQL. Perfilado V8 activo para cobertura: sobrecarga declarada.

No avanzar con429,5xx, respuesta incorrecta, falta de observaciones/generador, fallo k6, p95>2s, hostCPU>70 %, appCPU>80 % de un núcleo, generador normalizado>70 % o memoria>80 %, disponibleRAM/disco<20 %. Son presupuestos conservadores de laboratorio; no umbrales del PDF. Las comprobaciones de recursos deciden entre etapas; dentro de etapa k6 aborta por5xx≥1 % tras10s y timeoutHTTP5s. Guardar p95/p99 de respuestas correctas y distribución completa, throughput total/correcto,429 y5xx separados. Las denegaciones rápidas no mejoran el percentil de éxito. Retener exit99/fallos y el límite concreto. No repetir solo para conseguir verde.

## Redis y permisos

Caída/reconexión reales del Redis dedicado, manteniendo vivo el proceso HTTP y su adaptador. Comprobar PING inaccesible, fallback200 con DTO esperado, evento de recuperación del adaptador y caché poblada; repetir lectura caliente. SEC-08: corrupción JSON, propiedad privada y hash ajeno deben producir DTO saneado y reparar solo la clave ficticia afectada. No FLUSHALL ni servicios locales.

Jest HTTP usa base `jest_http` efímera distinta de `jest_business`, ambas en runner y con URL explícita validada. Prueba SEC-01–07, sesiones expiradas/inactivas/logout, roles/ámbito, revocación antes de replay, CSRF/Origin; además JSON400/payload413/validación422/ruta404, sanitización500 y contratos503. Los fallos DB500/503 inyectados se distinguen de caída real. No ejecutar la suite HTTP local mientras D11 comparte host. Conservar denominator Jest45 archivos/3997 líneas y separar métricas Jest/Sonar.

## Reproducción y fuentes

En CI el workflow reutilizable `sprint02-measurements.yml` ejecuta `run-lab.js`, rechaza hosts no GitHub-hosted, crea credenciales efímeras, conserva JSON/logs incluso fallidos y detiene solo sus contenedores. No falsificar las variables del guard para correr en esta máquina. Artifacts por headSHA30d; HTML/LCOV Jest14d. Los resultados revisados se incorporan al directorio de evidencia por SHA después del ensayo. No hay intervención Android ni validación24h por tiempo transcurrido.

Fuentes: [k6 localIPs y asignación a VU](https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/#local-ips), [keyGenerator/store/IPv6 de express-rate-limit](https://github.com/express-rate-limit/express-rate-limit/blob/main/docs/reference/configuration.mdx), [proxy y clave IP](https://github.com/express-rate-limit/express-rate-limit/blob/main/docs/guides/troubleshooting-proxy-issues.mdx). El código/lockfile del SHA ensayado prevalece para identificar versiones exactas.
