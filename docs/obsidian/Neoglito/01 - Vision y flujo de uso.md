---
tags:
  - neoglito
  - documentacion
actualizado: 2026-10-10
tipo: documentacion-tecnica
---

# Visión y flujo de uso

Neoglito reúne repositorios de GitHub en proyectos, encuentra archivos Docker Compose, permite configurar y ejecutar despliegues y clasifica sus contenedores. Su visión es facilitar la comprensión de sistemas distribuidos; la visualización completa de relaciones entre servicios sigue pendiente.

## Recorrido principal

1. Autenticarse con GitHub: [[04 - Autenticacion]].
2. Consultar y seleccionar repositorios de GitHub.
3. Crear un proyecto y registrar los repositorios asociados.
4. Inicializar el proyecto o buscar Compose: [[07 - Repositorios y analisis Compose]].
5. Elegir un archivo, configurar variables y puertos.
6. Lanzar un despliegue: [[08 - Despliegues Docker]].
7. Consultar puertos y clasificar los contenedores: [[09 - Puertos y clasificacion]].
8. Detener el despliegue cuando sea necesario.

El repositorio es un monorepo privado con licencia declarada `UNLICENSED`. PostgreSQL almacena entidades; Redis mantiene caché y reservas; Docker ejecuta los contenedores. Consulta [[12 - Diagnostico y limites]] para distinguir lo implementado de lo previsto.

## Fuentes del repositorio

- [README.md](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/README.md)
- [apps/web/src/pages/repository-selection-page.tsx](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/pages/repository-selection-page.tsx)
