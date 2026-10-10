---
tags:
  - neoglito
  - repository
  - documentacion-tecnica
funcionalidad: Repository
actualizado: 2026-10-10
---

# Repository · clonación paso a paso

## 1. Validar la URL y extraer el nombre

CloneRepositoryUseCase usa new URL, exige protocolo https y hostname github.com. Toma el último segmento no vacío del pathname y quita el sufijo `.git` en minúsculas. El resultado debe cumplir `[a-zA-Z0-9._-]+` y ser no vacío. Un fallo se transforma en 400 “cloneUrl debe ser una URL HTTPS válida de GitHub”.

No comprueba que haya exactamente dos segmentos owner/repo, que el owner sea válido ni que la URL corresponda a un repositorio existente. Tampoco rechaza explícitamente puerto, query, fragmento o credenciales embebidas. Estos controles describen la validación local; GitHub/Git todavía pueden rechazar la solicitud.

`git@github.com:owner/repo.git`, URLs HTTP y hosts distintos no pasan. El registro de metadatos no aplica esta validación de URL, así que puede aceptar una cadena no vacía que falle al clonar más tarde.

## 2. Buscar conexión y resolver el destino

Después de validar cloneUrl, busca conexión por userId. Usa el username persistido en esa conexión, no el owner de la URL. El username debe cumplir `[a-zA-Z0-9-]+`.

El destino se calcula con `resolve(process.cwd(), 'repo', username, repositoryName)`. Comprueba que relative desde la raíz repo no empiece por `..`. La carpeta se basa en el cwd del backend al ejecutar, no en una variable configurable del módulo.

Ejemplo ilustrativo: clonar `https://github.com/equipo/catalogo.git` con conexión username `ana` produce `<cwd>/repo/ana/catalogo`. Otro owner con un repositorio también llamado catalogo apunta al mismo destino para esa usuaria.

La comprobación es léxica, sin realpath ni inspección de symlinks. La regex admite caracteres como puntos; no debe interpretarse como una validación completa de nombres GitHub o de nombres de archivo específicos de Windows.

## 3. Reutilizar si access funciona

El helper exists llama fs.access y retorna true si termina; cualquier error devuelve false. No verifica que sea un directorio, que contenga `.git`, que coincida el remote, que el clone esté completo o que su contenido siga accesible en GitHub.

Si existe, retorna inmediatamente la ruta: no descifra el token, no hace fetch/pull, no consulta branch/commit ni compara el origen. La copia puede estar desactualizada o pertenecer a otra URL con el mismo nombre corto. La relación con Project tampoco forma parte del destino.

No hay lock entre comprobar y clonar. Dos requests o dos clones de análisis concurrentes pueden intentar el mismo destino. El resultado depende del proceso Git y del estado del filesystem; no existe una política de espera/reutilización del trabajo en curso.

## 4. Preparar autenticación ASKPASS

Cuando el destino no existe, el caso de uso descifra accessToken y llama al puerto Git. El adaptador:

1. Crea un directorio temporal bajo tmpdir con prefijo github-clone-.
2. Define askpass.sh dentro de él.
3. Dentro del try crea recursivamente el padre del destino.
4. Escribe el script con modo 0700 y aplica chmod 0700.
5. Ejecuta Git.
6. En finally elimina el directorio temporal recursivamente.

El script usa un shebang `/bin/sh` y responde a prompts que contengan Username o Password, imprimiendo las variables GIT_USERNAME o GIT_PASSWORD mediante printf. Para otros prompts termina con código 1.

El script no contiene el valor literal del token; se resuelve desde el entorno del hijo. Los modos POSIX no equivalen a una configuración explícita de ACL Windows. El entorno debe permitir ejecutar ese helper, por ejemplo mediante el soporte correspondiente de la instalación de Git; no hay una variante del script para PowerShell ni una detección de plataforma.

## 5. Ejecutar Git

```text
Ejecutable: git
Argumentos: [clone, cloneUrl, destination]
Entorno: process.env más
  GIT_ASKPASS=<ruta askpass.sh>
  GIT_USERNAME=<username de conexión>
  GIT_PASSWORD=<token descifrado>
  GIT_TERMINAL_PROMPT=0
stdio: [ignore, ignore, pipe]
```

spawn no activa shell. No se concatena un comando shell, ni se introducen los datos como código dentro del script. El adaptador no configura windowsHide, timeout, AbortSignal, cwd específico, profundidad de clonación, rama, submódulos ni una ruta configurable al ejecutable Git.

stdout se ignora. stderr se acumula completo como string, sin límite configurado. Un evento error rechaza con 500 “No fue posible ejecutar Git”. Al cerrar con código 0 resuelve; otro código rechaza con 500 y el stderr recortado en el mensaje “No fue posible clonar el repositorio: …”. No hay redacción adicional de stderr ni clasificación por causa.

## 6. Limpiar y devolver

El finally limpia el directorio temporal tanto en éxito como en fallo de las operaciones dentro del try. No borra el destino de un clone fallido. Un error de limpieza también puede propagarse; no hay catch independiente para conservar otro error.

En éxito devuelve destination; el controlador lo transforma en `{pathSystem}`. No guarda la ruta en Repository, no crea un Project y no registra un estado de clonación. La siguiente solicitud puede reutilizar un destino parcial si access funciona.

## Límites operativos del recorrido

Sin timeout ni cancelación explícita, el request puede permanecer pendiente mientras Git siga activo. Los clones persisten entre solicitudes; no hay endpoint de actualización o limpieza. El análisis posterior lee esa copia local, por lo que un cambio remoto no se incorpora automáticamente. Para rutas bajo Docker, la traducción usada en despliegues pertenece a [[Container - Docker y rutas]], no a este clonador.

Volver a [[Repository - Indice]].

## Fuentes del código

- [src/repository/application/use-cases/repository/clone-repository.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/use-cases/repository/clone-repository.use-case.ts)
- [src/shared/infrastructure/git/git-repository-cloner.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/git/git-repository-cloner.service.ts)
- [src/shared/application/repository-cloner.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/repository-cloner.port.ts)
- [src/repository/presentation/repository.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/presentation/repository.controller.ts)
