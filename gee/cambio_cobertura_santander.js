// ============================================================================
// PROYECTO FEDECACAO – FAO
// Ejercicio demostrativo de evaluación en campo de cambio de cobertura
// con productores de cacao
//
// ÁREA DE ENFOQUE: Departamento de SANTANDER, Colombia
// Plataforma: Google Earth Engine – Code Editor (JavaScript)
// ============================================================================

// ----------------------------------------------------------------------------
// 1. ÁREA DE ESTUDIO: límite del departamento de Santander
//    Fuente: FAO GAUL 2015 (nivel 1 = departamentos)
// ----------------------------------------------------------------------------
var gaul1 = ee.FeatureCollection('FAO/GAUL/2015/level1');

var santander = gaul1
  .filter(ee.Filter.eq('ADM0_NAME', 'Colombia'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Santander')); // Excluye Norte de Santander

var geometria = santander.geometry();

Map.centerObject(santander, 8);
Map.addLayer(
  ee.Image().paint(santander, 0, 2),
  {palette: ['#FF0000']},
  'Límite de Santander'
);

// ----------------------------------------------------------------------------
// 2. IMÁGENES SENTINEL-2: mosaicos de comparación visual "antes / después"
//    Fuente: COPERNICUS/S2_SR_HARMONIZED (reflectancia de superficie, 10 m)
//    Año base: 2020 (referencia EUDR) | Año reciente: 2025
// ----------------------------------------------------------------------------
function enmascararNubes(img) {
  var qa = img.select('QA60');
  var sinNubes = qa.bitwiseAnd(1 << 10).eq(0)   // nubes opacas
             .and(qa.bitwiseAnd(1 << 11).eq(0)); // cirros
  return img.updateMask(sinNubes)
            .divide(10000)
            .select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12'])
            .copyProperties(img, ['system:time_start']);
}

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(geometria)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30));

var mosaico2020 = s2.filterDate('2020-01-01', '2020-12-31')
  .map(enmascararNubes).median().clip(santander);

var mosaico2025 = s2.filterDate('2025-01-01', '2025-12-31')
  .map(enmascararNubes).median().clip(santander);

var visRGB = {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3};
Map.addLayer(mosaico2020, visRGB, 'Sentinel-2 · 2020 (color verdadero)', false);
Map.addLayer(mosaico2025, visRGB, 'Sentinel-2 · 2025 (color verdadero)', false);

// NDVI de cada período y su diferencia (útil para explicar "verdor" en campo)
var ndvi2020 = mosaico2020.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndvi2025 = mosaico2025.normalizedDifference(['B8', 'B4']).rename('NDVI');
var difNDVI  = ndvi2025.subtract(ndvi2020).rename('dNDVI');

Map.addLayer(difNDVI,
  {min: -0.4, max: 0.4, palette: ['#a50026', '#f7f7f7', '#006837']},
  'Cambio de NDVI 2020→2025 (rojo = pérdida de vegetación)', false);

// ----------------------------------------------------------------------------
// 3. BOSQUE DE REFERENCIA 2020 (línea base tipo EUDR)
//    Fuente: JRC Global Forest Cover 2020, Comisión Europea (10 m)
// ----------------------------------------------------------------------------
var bosque2020JRC = ee.ImageCollection('JRC/GFC2020/V2')
  .mosaic().clip(santander);

Map.addLayer(bosque2020JRC, {palette: ['#0b6623']},
  'Bosque 2020 (JRC – referencia EUDR)', false);

// ----------------------------------------------------------------------------
// 4. PÉRDIDA HISTÓRICA DE COBERTURA ARBÓREA 2001–2024
//    Fuente: Hansen Global Forest Change v1.12 (30 m)
// ----------------------------------------------------------------------------
var gfc = ee.Image('UMD/hansen/global_forest_change_2024_v1_12');

// Cobertura arbórea del año 2000 (umbral: 30 % de dosel)
var bosque2000 = gfc.select('treecover2000').gte(30).selfMask().clip(santander);
Map.addLayer(bosque2000, {palette: ['#c8e6c9']},
  'Cobertura arbórea 2000 (≥30 % dosel)', false);

// Año de pérdida (1 = 2001 ... 24 = 2024)
var perdida = gfc.select('lossyear')
  .updateMask(gfc.select('loss'))
  .clip(santander);

Map.addLayer(perdida,
  {min: 1, max: 24, palette: ['#ffff00', '#ff9800', '#e53935', '#6a1b9a']},
  'Pérdida de bosque 2001–2024 (amarillo = antigua, morado = reciente)');

// Gráfico: hectáreas perdidas por año en Santander
var areaPorAnio = ee.Image.pixelArea().divide(10000) // m² → hectáreas
  .addBands(gfc.select('lossyear'));

var estadisticas = areaPorAnio.reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'anio'}),
  geometry: geometria,
  scale: 30,
  maxPixels: 1e13
});

var grupos = ee.List(ee.Dictionary(estadisticas).get('groups'));
var perdidaAnual = ee.FeatureCollection(grupos.map(function (el) {
  var d = ee.Dictionary(el);
  return ee.Feature(null, {
    anio: ee.Number(d.get('anio')).add(2000),
    hectareas: ee.Number(d.get('sum')).round()
  });
}));

print(ui.Chart.feature.byFeature(perdidaAnual, 'anio', 'hectareas')
  .setChartType('ColumnChart')
  .setOptions({
    title: 'Pérdida anual de cobertura arbórea en Santander (Hansen GFC)',
    hAxis: {title: 'Año', format: '####'},
    vAxis: {title: 'Hectáreas'},
    legend: {position: 'none'},
    colors: ['#d62828']
  }));

// ----------------------------------------------------------------------------
// 5. CAMBIO DE COBERTURA 2020 → 2025 CON DYNAMIC WORLD (10 m, casi tiempo real xd)
//    Fuente: GOOGLE/DYNAMICWORLD/V1
//    Clases: 0 agua, 1 árboles, 2 pastos, 3 vegetación inundada, 4 cultivos,
//            5 arbustos, 6 construido, 7 suelo desnudo, 8 nieve/hielo
// ----------------------------------------------------------------------------
var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(geometria);

var dw2020 = dw.filterDate('2020-01-01', '2020-12-31')
  .select('label').mode().clip(santander);
var dw2025 = dw.filterDate('2025-01-01', '2025-12-31')
  .select('label').mode().clip(santander);

var paletaDW = ['419BDF', '397D49', '88B053', '7A87C6',
                'E49635', 'DFC35A', 'C4281B', 'A59B8F', 'B39FE1'];

Map.addLayer(dw2020, {min: 0, max: 8, palette: paletaDW},
  'Cobertura del suelo 2020 (Dynamic World)', false);
Map.addLayer(dw2025, {min: 0, max: 8, palette: paletaDW},
  'Cobertura del suelo 2025 (Dynamic World)', false);

// 5a. Cambio principal para el ejercicio: árboles (2020) → otra cobertura (2025)
var cambioArboles = dw2020.eq(1).and(dw2025.neq(1)).selfMask();
Map.addLayer(cambioArboles, {palette: ['#FF00FF']},
  'CAMBIO: árboles 2020 → otra cobertura 2025');

// 5b. Transición específica: árboles (2020) → cultivos (2025)
var arbolesACultivos = dw2020.eq(1).and(dw2025.eq(4)).selfMask();
Map.addLayer(arbolesACultivos, {palette: ['#FFA500']},
  'CAMBIO: árboles 2020 → cultivos 2025', false);

// Superficie de cada transición (escala 30 m para agilizar la demostración;
// cambiar a scale: 10 para el cálculo definitivo)
function areaHa(imagenBinaria, etiqueta) {
  var ha = imagenBinaria.multiply(ee.Image.pixelArea()).divide(10000)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geometria,
      scale: 30,
      maxPixels: 1e13
    });
  print(etiqueta, ha);
}

areaHa(cambioArboles,    'Hectáreas: árboles 2020 → otra cobertura 2025');
areaHa(arbolesACultivos, 'Hectáreas: árboles 2020 → cultivos 2025');

// 6. LEYENDA (Dynamic World) para acompañar la demostración en campo

var nombresDW = ['Agua', 'Árboles', 'Pastos', 'Veg. inundada', 'Cultivos',
                 'Arbustos', 'Construido', 'Suelo desnudo', 'Nieve/hielo'];

var leyenda = ui.Panel({style: {position: 'bottom-left', padding: '8px'}});
leyenda.add(ui.Label('Cobertura del suelo (Dynamic World)',
  {fontWeight: 'bold', fontSize: '13px'}));

nombresDW.forEach(function (nombre, i) {
  var caja = ui.Label('', {
    backgroundColor: '#' + paletaDW[i],
    padding: '8px', margin: '2px 6px 2px 0'
  });
  leyenda.add(ui.Panel([caja, ui.Label(nombre, {fontSize: '12px'})],
    ui.Panel.Layout.Flow('horizontal')));
});
Map.add(leyenda);

// 7. EXPORTACIONES OPCIONALES (aparecen en la pestaña "Tasks")

Export.image.toDrive({
  image: cambioArboles.unmask(0).toByte(),
  description: 'Cambio_Arboles_Santander_2020_2025',
  folder: 'Output_CC',
  region: geometria,
  scale: 10,
  maxPixels: 1e13
});

Export.table.toDrive({
  collection: perdidaAnual,
  description: 'Perdida_anual_bosque_Santander_Hansen',
  folder: 'Output_CC',
  fileFormat: 'CSV'
});

// ============================================================================
// NOTAS PARA EL EJERCICIO DEMOSTRATIVO:
// - Active/desactive capas en el panel "Layers" para comparar 2020 vs 2025.
// - El año base 2020 coincide con la fecha de corte del Reglamento EUDR,
//   relevante para el cacao de exportación.
// - Para enfocarse en una zona cacaotera (p. ej. San Vicente de Chucurí,
//   El Carmen de Chucurí, Landázuri, Rionegro), dibuje un polígono con las
//   herramientas de geometría y reemplace "geometria" por ese polígono,
//   o use FAO/GAUL/2015/level2 filtrando por ADM2_NAME (municipios).
// - Los productos globales (Hansen, Dynamic World, JRC) son indicativos:
//   el ejercicio en campo sirve precisamente para validarlos con los
//   productores (puntos GPS de verificación).
// ============================================================================