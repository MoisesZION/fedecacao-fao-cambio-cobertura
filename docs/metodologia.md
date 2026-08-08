# Metodología

## 1. Introducción

Este documento describe la metodología utilizada en el ejercicio demostrativo de evaluación de cambio de cobertura desarrollado para el proyecto **FEDECACAO – FAO** en el departamento de Santander, Colombia.

El análisis utiliza información satelital disponible en Google Earth Engine para comparar condiciones de cobertura entre los años **2020 y 2025**, complementándolas con información histórica de pérdida de cobertura arbórea.

El propósito principal es demostrar un flujo de trabajo que pueda ser utilizado posteriormente como apoyo a procesos de evaluación y validación en campo.

---

## 2. Área de estudio

El área de análisis corresponde al departamento de Santander, Colombia.

La geometría se obtiene de la colección:

`FAO/GAUL/2015/level1`

El script realiza dos filtros:

* País: Colombia.
* Departamento: Santander.

La geometría resultante se utiliza como región de análisis para las operaciones espaciales y estadísticas.

La selección excluye explícitamente el departamento de Norte de Santander.

---

## 3. Comparación temporal mediante Sentinel-2

### 3.1 Fuente

Se utiliza la colección:

`COPERNICUS/S2_SR_HARMONIZED`

correspondiente a imágenes Sentinel-2 de reflectancia de superficie.

El análisis considera dos períodos:

* 2020: año base.
* 2025: año reciente de comparación.

### 3.2 Filtrado

Las imágenes se filtran espacialmente utilizando la geometría de Santander.

También se aplica un filtro de porcentaje de nubosidad:

`CLOUDY_PIXEL_PERCENTAGE < 30`

Posteriormente se aplica una máscara utilizando la banda `QA60` para excluir píxeles asociados con nubes opacas y cirros.

Los valores de reflectancia se escalan dividiéndolos por 10.000.

### 3.3 Mosaicos anuales

Para cada año se genera un mosaico mediante la mediana temporal:

* `mosaico2020`
* `mosaico2025`

Los mosaicos son recortados al límite de Santander.

Para visualización se utiliza una composición RGB de color verdadero:

* B4: rojo
* B3: verde
* B2: azul

---

## 4. Índice de vegetación NDVI

Se calcula el NDVI para cada período mediante las bandas NIR y rojo de Sentinel-2.

El cálculo se realiza mediante:

`normalizedDifference(['B8', 'B4'])`

Se generan:

* `ndvi2020`
* `ndvi2025`

Posteriormente se calcula la diferencia:

`dNDVI = NDVI2025 - NDVI2020`

La capa resultante permite visualizar cambios relativos en la respuesta espectral de la vegetación entre ambos períodos.

Una diferencia negativa representa una disminución relativa del NDVI, mientras que una diferencia positiva representa un incremento relativo.

El dNDVI debe interpretarse como un indicador de cambio de la respuesta de la vegetación y no como una clasificación directa de cambio de uso del suelo.

---

## 5. Referencia de bosque para 2020

Se incorpora el producto:

`JRC/GFC2020/V2`

como referencia de cobertura forestal para el año 2020.

La capa se utiliza principalmente con fines de visualización y contexto espacial dentro del ejercicio.

La utilización de esta información como referencia no implica que el producto constituya por sí mismo una delimitación definitiva de las áreas forestales para propósitos regulatorios.

---

## 6. Pérdida histórica de cobertura arbórea

### 6.1 Fuente

Se utiliza:

`UMD/hansen/global_forest_change_2024_v1_12`

del conjunto Hansen Global Forest Change.

### 6.2 Cobertura arbórea de referencia

Se utiliza la banda:

`treecover2000`

con un umbral de:

**30 % de cobertura de dosel**

La máscara resultante representa áreas con cobertura arbórea igual o superior al umbral seleccionado.

### 6.3 Pérdida anual

La banda:

`lossyear`

permite identificar el año de pérdida de cobertura arbórea.

Los valores representan años relativos desde 2000:

* 1 = 2001
* 2 = 2002
* ...
* 24 = 2024

El script convierte estos valores a años calendario y calcula la superficie afectada.

### 6.4 Cálculo de superficie

La superficie se calcula utilizando:

`ee.Image.pixelArea()`

Los resultados se convierten de metros cuadrados a hectáreas mediante una división por 10.000.

Posteriormente se realiza una reducción espacial sobre la geometría de Santander.

El resultado es una serie anual de hectáreas de pérdida de cobertura arbórea.

---

## 7. Dynamic World

### 7.1 Fuente

Se utiliza:

`GOOGLE/DYNAMICWORLD/V1`

Dynamic World proporciona una clasificación de cobertura del suelo basada en imágenes Sentinel-2.

Las clases utilizadas por el ejercicio son:

| Valor | Clase               |
| ----: | ------------------- |
|     0 | Agua                |
|     1 | Árboles             |
|     2 | Pastos              |
|     3 | Vegetación inundada |
|     4 | Cultivos            |
|     5 | Arbustos            |
|     6 | Construido          |
|     7 | Suelo desnudo       |
|     8 | Nieve/hielo         |

### 7.2 Clasificación anual

Para 2020 y 2025 se selecciona la banda:

`label`

y se calcula la clase modal de cada período.

Esto produce:

* `dw2020`
* `dw2025`

La clase modal representa la categoría más frecuente dentro de las observaciones disponibles para el período analizado.

---

## 8. Identificación de cambio de cobertura

### 8.1 Árboles 2020 → otra cobertura 2025

Se identifica mediante:

`dw2020.eq(1).and(dw2025.neq(1))`

El resultado representa píxeles clasificados como árboles en 2020 que presentan una clase diferente en 2025.

Este resultado debe interpretarse como un indicador de posible cambio de cobertura y requiere validación adicional.

### 8.2 Árboles 2020 → cultivos 2025

Se identifica mediante:

`dw2020.eq(1).and(dw2025.eq(4))`

Esta máscara representa específicamente áreas clasificadas como árboles en 2020 y cultivos en 2025.

La transición es de especial interés para ejercicios relacionados con cambios de cobertura en áreas agrícolas.

---

## 9. Cálculo de superficies

Las superficies se calculan mediante el área de los píxeles:

`ee.Image.pixelArea()`

Los valores se convierten a hectáreas.

Para agilizar el ejercicio demostrativo se utiliza una escala de cálculo de **30 m**.

Para un análisis definitivo se debe evaluar la escala apropiada de acuerdo con el producto utilizado, la resolución espacial de los datos y el objetivo específico del análisis.

En particular, no debe asumirse que utilizar una escala de 10 m convierte automáticamente todos los productos en información de 10 m de resolución.

---

## 10. Visualización

El script incorpora diferentes capas cartográficas para facilitar la interpretación:

* Límite de Santander.
* Sentinel-2 2020.
* Sentinel-2 2025.
* Diferencia de NDVI.
* Bosque de referencia 2020.
* Cobertura arbórea de 2000.
* Pérdida de cobertura arbórea 2001–2024.
* Dynamic World 2020.
* Dynamic World 2025.
* Árboles 2020 → otra cobertura 2025.
* Árboles 2020 → cultivos 2025.

También se incorpora una leyenda para las clases de Dynamic World.

Las capas pueden activarse o desactivarse desde el panel **Layers** de Google Earth Engine.

---

## 11. Exportaciones

El script incorpora dos exportaciones opcionales.

### 11.1 Raster de cambio de cobertura

Se exporta la máscara:

**Árboles 2020 → otra cobertura 2025**

mediante `Export.image.toDrive()`.

El resultado se envía a Google Drive dentro de la carpeta:

`Output_CC`

### 11.2 Tabla de pérdida anual

Se exporta la colección de estadísticas anuales mediante:

`Export.table.toDrive()`

El formato de salida es CSV.

---

## 12. Validación en campo

La interpretación de los resultados satelitales debe complementarse con observaciones de campo.

Para un ejercicio de validación con productores de cacao pueden utilizarse:

* Coordenadas GPS.
* Fotografías georreferenciadas.
* Polígonos de parcelas.
* Información declarada por los productores.
* Observaciones de cobertura.
* Información sobre cambios recientes de uso del suelo.

Los puntos de campo pueden utilizarse posteriormente para evaluar la correspondencia entre las clasificaciones satelitales y las condiciones observadas directamente.

---

## 13. Posible ampliación a municipios

El script actual utiliza Santander como unidad principal de análisis.

Para realizar análisis más detallados pueden utilizarse límites administrativos de nivel municipal mediante colecciones apropiadas de nivel 2.

También puede reemplazarse la geometría departamental por:

* Polígonos definidos por el usuario.
* Parcelas de productores.
* Zonas de interés.
* Áreas de proyectos específicos.

Para el análisis de zonas cacaoteras pueden considerarse, entre otros, municipios como San Vicente de Chucurí, El Carmen de Chucurí, Landázuri y Rionegro.

---

## 14. Limitaciones metodológicas

Los resultados deben considerarse dentro de las limitaciones de cada fuente de información.

### Sentinel-2

La presencia de nubes, sombras, disponibilidad temporal de imágenes y características de la máscara de calidad pueden afectar los mosaicos anuales.

### Dynamic World

Las clases corresponden a estimaciones de cobertura del suelo derivadas de observaciones satelitales. Una transición entre clases no constituye por sí misma evidencia definitiva de un cambio físico ocurrido en campo.

### Hansen Global Forest Change

El producto tiene una resolución aproximada de 30 m y está orientado al análisis de cambios de cobertura arbórea a escala global.

### Productos de referencia

Las diferencias metodológicas entre productos pueden producir discrepancias espaciales y temporales.

Por esta razón, los resultados de diferentes fuentes no deben combinarse automáticamente como si fueran observaciones equivalentes.

---

## 15. Interpretación

El ejercicio debe entenderse como una herramienta de **detección y visualización de posibles cambios de cobertura**, no como un mecanismo automático de determinación de cumplimiento normativo.

La identificación de una transición satelital debe ser considerada como un insumo para análisis posterior y, cuando corresponda, validación documental y de campo.

El objetivo de la demostración es mostrar cómo diferentes fuentes de observación de la Tierra pueden combinarse para orientar procesos de identificación, priorización y validación de áreas de interés.

---

## 16. Reproducibilidad

El código utiliza colecciones disponibles directamente en Google Earth Engine.

Por esta razón, el repositorio GitHub contiene principalmente el código y la documentación metodológica, mientras que los datasets de observación de la Tierra permanecen alojados en Google Earth Engine.

Para reproducir el ejercicio se requiere:

1. Una cuenta con acceso a Google Earth Engine.
2. Acceso al Google Earth Engine Code Editor.
3. Copiar o importar el script `gee/cambio_cobertura_santander.js`.
4. Ejecutar el código.
5. Revisar las capas y resultados generados.

Los resultados pueden variar con futuras actualizaciones de los datasets o cambios en las colecciones utilizadas.

---

## 17. Estado del ejercicio

**Versión:** 1.0
**Tipo:** Ejercicio demostrativo
**Área:** Santander, Colombia
**Período principal:** 2020–2025

El ejercicio puede evolucionar posteriormente hacia un flujo de trabajo orientado a municipios, parcelas o puntos de verificación de productores.
