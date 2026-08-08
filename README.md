# FEDECACAO – FAO

## Evaluación demostrativa de cambio de cobertura en Santander, Colombia

## Descripción

Este repositorio contiene un ejercicio demostrativo desarrollado en **Google Earth Engine (GEE)** para la evaluación de cambios de cobertura del suelo en el departamento de **Santander, Colombia**, en el contexto del trabajo conjunto entre **FEDECACAO y FAO**.

El ejercicio está orientado a la demostración y validación en campo de cambios de cobertura mediante el uso combinado de imágenes satelitales y productos globales de observación de la Tierra.

El análisis compara principalmente los años **2020 y 2025**, utilizando diferentes fuentes de información espacial para identificar cambios en la cobertura vegetal y arbórea.

## Objetivo

El objetivo del ejercicio es proporcionar una herramienta demostrativa que permita:

* Visualizar cambios de cobertura entre 2020 y 2025.
* Comparar imágenes Sentinel-2 de ambos períodos.
* Analizar cambios en el índice de vegetación NDVI.
* Identificar áreas clasificadas como árboles en 2020 que presentan otra cobertura en 2025.
* Identificar específicamente transiciones de árboles a cultivos.
* Analizar la pérdida histórica de cobertura arbórea entre 2001 y 2024.
* Generar estadísticas de pérdida anual de cobertura arbórea.
* Apoyar ejercicios de validación y verificación en campo con productores de cacao.

## Área de estudio

El análisis se concentra en el **departamento de Santander, Colombia**.

El límite departamental se obtiene mediante:

**FAO GAUL 2015 – Level 1**

El script filtra el departamento de Santander dentro del territorio colombiano y utiliza su geometría como área principal de análisis.

> Nota: Santander se diferencia explícitamente de Norte de Santander mediante el filtro del nombre administrativo correspondiente.

## Fuentes de datos

El script utiliza las siguientes colecciones disponibles en Google Earth Engine:

| Fuente                       | Colección                                    | Uso                                            |
| ---------------------------- | -------------------------------------------- | ---------------------------------------------- |
| FAO GAUL 2015                | `FAO/GAUL/2015/level1`                       | Límite departamental                           |
| Sentinel-2                   | `COPERNICUS/S2_SR_HARMONIZED`                | Comparación visual 2020–2025 y NDVI            |
| JRC Global Forest Cover 2020 | `JRC/GFC2020/V2`                             | Referencia de bosque para 2020                 |
| Hansen Global Forest Change  | `UMD/hansen/global_forest_change_2024_v1_12` | Pérdida histórica de cobertura arbórea         |
| Dynamic World                | `GOOGLE/DYNAMICWORLD/V1`                     | Clasificación de cobertura del suelo 2020–2025 |

Todos estos datos son consultados directamente desde Google Earth Engine; no es necesario descargar los datasets para ejecutar el script.

## Metodología

El ejercicio se estructura en siete componentes principales:

1. Definición del área de estudio.
2. Obtención y procesamiento de imágenes Sentinel-2.
3. Consulta del bosque de referencia de 2020.
4. Análisis histórico de pérdida de cobertura arbórea mediante Hansen Global Forest Change.
5. Comparación de cobertura del suelo mediante Dynamic World.
6. Visualización mediante capas y leyenda cartográfica.
7. Exportación opcional de resultados.

La metodología detallada se encuentra en:

`docs/metodologia.md`

## Comparación Sentinel-2

Se generan mosaicos anuales para 2020 y 2025 a partir de Sentinel-2 Surface Reflectance.

Las imágenes son filtradas por ubicación y porcentaje de nubosidad y posteriormente se aplica una máscara basada en la banda `QA60`.

Para cada período se genera un mosaico mediante la mediana temporal.

También se calcula:

**NDVI = (NIR − Rojo) / (NIR + Rojo)**

y se genera una capa de diferencia:

**dNDVI = NDVI 2025 − NDVI 2020**

Esta diferencia permite visualizar cambios relativos en la respuesta de la vegetación.

## Dynamic World

Dynamic World se utiliza para comparar la clase dominante de cobertura del suelo entre 2020 y 2025.

El ejercicio presta especial atención a dos transiciones:

* Árboles en 2020 → otra cobertura en 2025.
* Árboles en 2020 → cultivos en 2025.

La primera transición representa un indicador general de cambio desde la clase árboles, mientras que la segunda permite identificar específicamente áreas clasificadas como árboles en 2020 y como cultivos en 2025.

## Pérdida histórica de cobertura arbórea

Se utiliza Hansen Global Forest Change para analizar la pérdida de cobertura arbórea durante el período 2001–2024.

Se considera como referencia una cobertura arbórea mínima del **30 % de dosel** para la capa de cobertura del año 2000.

El script también genera una estadística de hectáreas de pérdida por año para el departamento de Santander.

## Exportaciones

El script incluye dos exportaciones opcionales:

### Cambio de árboles 2020–2025

Se exporta una imagen GeoTIFF mediante `Export.image.toDrive()`.

### Pérdida anual de bosque

Se exporta una tabla CSV con la pérdida anual de cobertura arbórea mediante `Export.table.toDrive()`.

Las exportaciones se generan desde Google Earth Engine hacia Google Drive.

## Ejecución

Para ejecutar el ejercicio:

1. Abrir Google Earth Engine Code Editor.
2. Crear un nuevo script.
3. Copiar el contenido de:

`gee/cambio_cobertura_santander.js`

4. Ejecutar el script.
5. Revisar las capas disponibles en el panel **Layers**.
6. Revisar los resultados estadísticos en la pestaña **Console**.
7. Ejecutar las tareas de exportación desde la pestaña **Tasks**, cuando corresponda.

## Validación en campo

Los productos utilizados en este ejercicio son fuentes de observación de la Tierra de carácter global y deben interpretarse como insumos para análisis y demostración.

La validación en campo constituye un componente importante para evaluar la correspondencia entre las clasificaciones satelitales y las condiciones observadas directamente en las fincas.

En ejercicios posteriores, el análisis puede complementarse con:

* Puntos GPS de verificación.
* Polígonos de parcelas.
* Información suministrada por productores.
* Información de cobertura y uso del suelo levantada en campo.
* Análisis específico de municipios y zonas productoras de cacao.

## Limitaciones

Los resultados deben interpretarse considerando las características y resolución espacial de cada producto.

En particular:

* Sentinel-2 tiene una resolución espacial de hasta 10 m para las bandas utilizadas en el análisis.
* Dynamic World proporciona clasificación global a 10 m, pero sus clases son estimaciones derivadas de observaciones satelitales.
* Hansen Global Forest Change trabaja a una resolución aproximada de 30 m.
* Las diferencias entre productos pueden generar discrepancias en la identificación de coberturas.
* La clasificación satelital no sustituye la validación directa en campo.
* Los resultados del presente repositorio corresponden a un ejercicio demostrativo y no deben interpretarse automáticamente como una determinación definitiva de cumplimiento normativo.

## Estructura del repositorio

```text
fedecacao-fao-cambio-cobertura/
│
├── README.md
├── .gitignore
│
├── gee/
│   └── cambio_cobertura_santander.js
│
└── docs/
    └── metodologia.md
```

## Proyecto

**FEDECACAO – FAO**

Ejercicio demostrativo de evaluación de cambio de cobertura para apoyar procesos de análisis, validación y verificación en campo en zonas productoras de cacao.

## Estado

**Versión inicial – ejercicio demostrativo**

El código y la metodología pueden ser modificados y ampliados para incorporar nuevas áreas de estudio, datos de campo, municipios, parcelas o fuentes de información.
