# Disponibilidad de puertos

`GET /port` combina reservas de Redis con puertos publicados por los contenedores
activos del daemon Docker. Estos últimos se identifican como
`port-reservation:owner:host:docker:<nombre>:port:<puerto>` y no son reservas
provisionales que un formulario pueda liberar.

`DockerHostPortUsageService` consulta Docker y comprueba conexiones TCP al host
configurado en `CONTAINER_PROBE_HOST`. Dentro de Docker el valor predeterminado
es `host.docker.internal`; fuera de Docker es `127.0.0.1`. Una conexión aceptada
significa ocupado; un rechazo de conexión significa libre. Un fallo al consultar
Docker o alcanzar el host no se considera disponibilidad.

La misma comprobación se aplica antes de reservar desde el formulario y antes
de crear un hold para desplegar. El bind local de la API por sí solo no permite
determinar la disponibilidad del host cuando la API corre en un contenedor.

La caché `application:compose-ports` contiene declaraciones de archivos Compose.
La ocupación real se consulta al daemon; los datos declarados no bastan para
afirmar que un puerto está disponible.
