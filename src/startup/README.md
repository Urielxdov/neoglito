# Puertos Compose al arrancar

Antes de escuchar peticiones, `CacheApplicationComposePortsService` busca archivos
`docker-compose*.yml`, `docker-compose*.yaml`, `compose.yml`, `compose.yaml` y
`compose.*.yml/yaml` en la carpeta de trabajo y sus subcarpetas. Omite `.git`,
`node_modules`, `.next`, `dist` y `build`.

La carpeta predeterminada es `process.cwd()` (la raíz al ejecutar `npm start`).
Puedes cambiarla con `APPLICATION_PORTS_ROOT`, usando una ruta accesible al backend.
En Docker, la raíz del proyecto está montada en `/app`.

El extractor YAML existente aplica `parseComposePort` de
`src/shared/application/compose-ports.ts`. El resultado se guarda como JSON en
Redis con la clave `application:compose-ports`:

```json
{
  "rootPath": "/app",
  "files": [
    {
      "filePath": "docker-compose.yml",
      "ports": [
        {
          "service": "api",
          "hostIp": null,
          "publishedPort": "3000",
          "targetPort": "3000",
          "protocol": "tcp",
          "mappingType": "one-to-one"
        }
      ]
    }
  ]
}
```

La caché no expira y se reemplaza completa en cada arranque, incluso si ya no
existen archivos Compose. Un fallo de lectura, YAML o Redis impide completar
el arranque. Todos los archivos se analizan antes de reemplazar la caché.

Se almacenan declaraciones de `services.*.ports`; el análisis no comprueba
puertos abiertos, no resuelve variables de Compose ni combina overrides.
Las reservas de despliegues se siguen restaurando mediante el servicio existente.

Para consultar el resultado: `redis-cli GET application:compose-ports`.
