# Diagnóstico de seguridad — picomatch en PR #7

2026-11-17. Base revisada **3ab5b9517e460d490d21255b4837c97aa27efa35**, PR #7 abierto y **sin fusionar**. Este bloqueo es distinto de los [20 avisos Sonar/nueve críticos DDL](revision-pr7.md), que permanecen abiertos.

## Resultado y advisory exacto

**No existe actualización compatible publicada que resuelva el advisory en la consulta realizada. Verify sigue bloqueado.** No se presenta instalación reproducible ni ausencia en producción como solución del riesgo de build.

[GHSA-fc5q-39xc-vjpf / CVE-2026-112366](https://github.com/advisories/GHSA-fc5q-39xc-vjpf): ReDoS mediante extglobs repetidos de una rama; severidad high. Rango publicado **picomatch <=4.0.7**, sin versión parcheada indicada, advisory actualizada 2026-11-17. El registry consultado publica 4.0.7 como latest y ninguna versión posterior entre sus 35 versiones. [Evidencia de registry, hashes y verificaciones](evidence/logistics/picomatch-triage.json).

## Cadena y ámbito

~~~text
devDependencies: vite@8.3.8
├─ picomatch@4.0.7
└─ tinyglobby@0.2.17
   ├─ picomatch@4.0.7 (deduplicado)
   └─ fdir@6.5.0
      └─ picomatch@4.0.7 (peer deduplicado)
~~~

Los cuatro paquetes están marcados dev en el lockfile. npm audit informa cuatro entradas high propagadas por esa cadena, **no cuatro vulnerabilidades independientes**. [Reporte completo](evidence/logistics/picomatch-audit-full.json).

Vite compila la web y es herramienta de desarrollo/build, no una dependencia del servidor Express. No se encontraron imports de Vite/picomatch en el código de servidor que recibe peticiones. El [Dockerfile](../../Dockerfile) usa una etapa build con dependencias de desarrollo y una etapa final con npm ci --omit=dev --ignore-scripts; sirve dist desde Express. [Auditoría diagnóstica omit=dev](evidence/logistics/picomatch-audit-production.json): cero vulnerabilidades en esa consulta; npm ls picomatch --omit=dev vacío. **No sustituye la auditoría completa ni demuestra ausencia de cualquier vulnerabilidad posible.** Sigue existiendo el riesgo de herramientas de construcción y se conserva el bloqueo full-audit; no se afirma que la entrada HTTP pública alcance este matcher.

## Evaluación de la corrección mínima

| Alternativa comprobada | Resultado / decisión |
| --- | --- |
| Actualizar Vite estable, dependencia directa introductora | Registry latest 8.3.8, ya instalado. Depende de picomatch ^4.0.7 y tinyglobby ^0.2.17. No hay actualización estable disponible que cierre el problema |
| Actualizar tinyglobby/fdir | Latest 0.2.17 / 6.5.0, ya instalados. Tinyglobby exige picomatch ^4.0.4; fdir admite ^3 o ^4. Ninguna versión publicada de picomatch sale del rango afectado |
| Vite 8.4.0-beta.1 | También declara picomatch ^4.0.7 y tinyglobby ^0.2.17. Añade una beta sin corregir la cadena; descartada |
| Override de picomatch a otro release actual | Todos los releases publicados están afectados. No hay versión corregida cuya compatibilidad pueda justificarse. Los rangos actuales admitirían un futuro parche 4.x compatible, por lo que hoy no se necesita ni justifica un override |
| Downgrade automático o audit fix --force | No ejecutado. No demuestra remediación ante un rango que incluye versiones anteriores y puede introducir cambios mayores ajenos al objetivo |
| Alias/fork/patch local para eludir la identidad del paquete | No se adopta. Hacer desaparecer un aviso por renombrar el paquete no prueba corrección. Un fork real exigiría parche revisado, procedencia inmutable, pruebas del defecto y compatibilidad, y mantenimiento explícito; no se inventa un parche |
| Excluir dev, omitir auditoría o bajar severidad/gate | No aplicado. Omit=dev se usó solo para clasificar el ámbito; CI conserva npm audit --audit-level=high sobre el árbol completo |

Fuentes: [releases picomatch](https://github.com/micromatch/picomatch/releases), [releases Vite](https://github.com/vitejs/vite/releases), [semántica de overrides npm](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides); los valores concretos se contrastaron con npm view. No se trata el cierre de un PR referenciado por la advisory como prueba de una versión segura.

**Cambio aplicado a dependencias: ninguno**, porque no hay candidato compatible seguro publicado. Se ejecutó el gestor de paquetes para revalidar package-lock.json; sus hashes y los de package.json permanecen idénticos. No se edita el lockfile a mano ni se fuerza una modificación cosmética para aparentar una actualización.

## Instalación y comprobaciones reproducibles

Desde la raíz del repositorio, usando caché dentro del workspace:

~~~powershell
$env:npm_config_cache=(Join-Path (Get-Location) '.npm-cache')
npm.cmd view picomatch dist-tags versions --json
npm.cmd view vite@latest version dependencies engines --json
npm.cmd view tinyglobby@latest version dependencies --json
npm.cmd view fdir@latest version peerDependencies --json
npm.cmd ci --ignore-scripts
npm.cmd install --package-lock-only --ignore-scripts
npm.cmd audit --audit-level=high
npm.cmd audit --omit=dev --audit-level=high
npm.cmd ls picomatch --omit=dev
npm.cmd run format:check
npm.cmd run check
npm.cmd test
npm.cmd run build
~~~

| Comprobación local | Resultado |
| --- | --- |
| npm ci --ignore-scripts | Exit 0; instalación desde lockfile reproducida |
| Revalidación package-lock-only por npm | Exit 0; package.json/lockfile sin cambios de hash ni diff |
| Auditoría completa | Exit 1, cuatro entradas high en la cadena; bloqueo reproducido |
| Auditoría de producción, solo diagnóstico | Exit 0; no picomatch en árbol omit=dev |
| Formato y módulos/OpenAPI/enlaces | Aprobados |
| Unitarias | 23 aprobadas, 0 fallos |
| Build Vite | Aprobado; no se presenta como auditoría aprobada ni benchmark |

No se repite integración local por cambios productivos inexistentes. La ejecución remota ordinaria conserva todos sus pasos: si audit falla, verify no llega a tests; no se trasladan los resultados históricos de f8b386f a ese job fallido. Los checks del commit documental final se consultan y enlazan en el cuerpo del PR.

## Qué falta para cerrar el bloqueo

Volver a consultar advisory y registry cuando exista un release corregido verificable. Priorizar actualización compatible del introductor si existe; si el parche 4.x entra en los rangos actuales, una actualización transitoria dirigida con npm y lockfile revisado puede ser suficiente. Después ejecutar instalación limpia, auditoría completa, build/tests/Compose y comprobar el SHA remoto final. Si un introductor fijara una versión vulnerable exacta, evaluar entonces un override a una versión realmente corregida con pruebas; no antes.

El PR sigue **bloqueado para integrar** mientras verify falle. No se rebajan Quality Gate, audit, aserciones ni permisos del analizador; no se modifican migraciones ni reglas de negocio. Los 20 avisos de Sonar, incluidos nueve S1192 críticos de mantenibilidad DDL, siguen documentados por separado y no se presentan como resueltos.

La [propuesta concreta O1–O10](../03-diseno-de-software/08-especificacion-offline-cosecha.md) es trabajo documental independiente: no implementa offline ni convierte la falta de parche en autorización para integrar.
