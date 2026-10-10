---
tags:
  - neoglito
  - deployment
  - documentacion-tecnica
funcionalidad: deployment
actualizado: 2026-10-10
---

# Deployment · preparación Compose

## Archivo independiente

prepare lee el archivo autorizado y parsea YAML con merge keys habilitadas. Si falla lectura/parseo, responde 400. Exige un objeto services no vacío y cada servicio como objeto. Crea una copia superficial de cada servicio antes de modificarlo.

Aplica variables, valida mirrorPorts, modifica publicaciones y adapta listeners si procede; después traduce bind mounts. Establece name y metadatos:

```yaml
name: neoglito-<deploymentId>
x-neoglito:
  projectDirectory: /app/repo/usuario/api
  sourceComposePath: /app/repo/usuario/api/docker-compose.yml
```

Guarda el resultado en `DEPLOYMENT_COMPOSE_DIRECTORY` o `.neoglito/deployments`, resuelto desde el cwd. El archivo se llama `.neoglito-<deploymentId>.compose.yml`. mkdir solicita modo 0700 y writeFile modo 0600 con flag wx: no sobrescribe un archivo existente. Esos modos no equivalen a una configuración de ACL garantizada en Windows.

El original permanece sin cambios. El YAML generado puede contener valores sensibles enviados como environment. No se elimina al detener ni en la compensación de un despliegue fallido.

## Variables

| Comprobación | Comportamiento |
| --- | --- |
| environment omitido | Usa lista vacía |
| environment suministrado | Debe ser array |
| key | String que cumpla `[A-Za-z_][A-Za-z0-9_]*` |
| value | String sin carácter NUL; puede ser vacío |
| service | Si aparece, debe identificar un servicio existente |
| service omitido | Aplica a todos los servicios |
| Repetición del par servicio/key en la petición | 400, incluso si se combina una asignación global y una específica |

Para servicios modificados convierte environment de lista a mapa o copia su mapa previo. Conserva variables no sobrescritas. Cada `$` del valor recibido se escribe como `$$` para tratarlo como literal ante Compose. No reemplaza todas las interpolaciones del archivo ni carga automáticamente las variables descubiertas por análisis.

## Publicaciones

ports debe ser array. Cada cambio debe señalar un servicio existente, targetPort string, protocol tcp/udp y publishedPort string o null. Busca una publicación original no usada que coincida en **targetPort, protocol y hostIp**. No usa mappingType para encontrarla ni para validar el cambio.

Sin modo espejo conserva el target original. Un publishedPort null deja la asignación de host a Docker. En sintaxis larga conserva opciones del mapping y cambia published; en sintaxis corta reconstruye host/publicado/target/protocolo. Los mappings no incluidos en la petición se conservan.

Valida publicaciones explícitas como entero decimal o rango `inicio-fin`, entre 1 y 65535 y con inicio ≤ fin. Después recorre **todo el YAML final** y reúne cada puerto TCP fijo, expandiendo rangos. Rechaza duplicados numéricos incluso con hostIp diferentes. UDP conserva su configuración pero no forma parte de las reservas TCP. Interpolaciones en published como `${HOST_PORT}` no satisfacen la validación numérica.

La validación no reemplaza `docker compose config` ni verifica todas las opciones y restricciones de Compose. El target y tamaños de rangos no reciben una validación completa equivalente a la del puerto publicado.

## Rutas y recursos

El runtime usa `--project-directory` con el directorio original al ejecutar archivos actuales. Esto mantiene el contexto para las rutas relativas que resuelve Compose. Los bind mounts long syntax con type bind y source string, y los short syntax reconocidos con fuente de ruta, se resuelven desde ese directorio y se traducen mediante ContainerRuntimePort.

La sintaxis corta reconocida pasa a larga conservando read_only, propagation y selinux reconocidos. Volúmenes nombrados y anónimos permanecen como tales. La traducción detallada depende de mounts y daemon; consultar [[Container - Docker y rutas]].

Si un servicio tenía container_name, se sustituye por `neoglito-<id>-<service>`. En networks y volumes con objeto, name explícito y external falsy, se cambia name al prefijo del despliegue. Los recursos externos mantienen sus referencias y pueden compartirse; los bind mounts también pueden compartir datos. El aislamiento del proyecto Compose no garantiza aislamiento de todo almacenamiento.

## Compatibilidad de registros antiguos

deploymentRuntimeProjectName reconstruye el proyecto explícito solo cuando el basename coincide exactamente con el archivo generado esperado para ese ID. En otras rutas devuelve undefined y conserva la selección antigua de Compose.

readSource devuelve ruta y dirname para archivos antiguos que apuntan al original. Para archivos generados actuales lee x-neoglito y devuelve sus campos string, o null si faltan. No captura errores de lectura/parseo: consultar puertos activos puede fallar si el YAML ya no existe.

## Fuentes del código

- [src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts)
- [src/deployment/application/ports/deployment-compose.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/ports/deployment-compose.port.ts)
- [src/shared/application/compose-ports.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/compose-ports.ts)
