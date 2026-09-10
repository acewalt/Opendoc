import fs from 'node:fs'
import zlib from 'node:zlib'

const WEBAPPS_COMMIT = '5238ddb434246a1542a6a04b6639d6b64a79befc' // ONLYOFFICE DocumentServer v7.5.1
const BASE = `https://raw.githubusercontent.com/ONLYOFFICE/web-apps/${WEBAPPS_COMMIT}/apps`
const editors = ['documenteditor', 'spreadsheeteditor', 'presentationeditor']

const CUSTOM_ES = {
  documenteditor: {
    'DE.Views.FileMenu.btnDisableOnlineCaption': 'Desactivar vista previa/edición en línea',
    'DE.Views.FileMenu.btnDownloadOnlineCaption': 'Descargar documento',
    'DE.Views.FileMenu.btnEnableOnlineCaption': 'Activar vista previa/edición en línea',
    'DE.Views.FileMenu.btnFeedbackCaption': 'Comentarios',
    'DE.Views.FileMenu.btnSetDefaultCaption': 'Establecer como aplicación predeterminada',
    'DE.Views.FileMenu.btnUnInstallCaption': 'Desinstalar',
    'DE.Views.FileMenuPanels.RecentFiles.txtOpenRecent': 'Abrir archivo reciente',
    'DE.Views.ImageSettingsAdvanced.textPositionAbs': 'Posición absoluta',
    'DE.Views.TableSettings.textColBanded': 'Columnas con bandas',
    'DE.Views.Toolbar.capBtnPageColor': 'Color de página',
    'DE.Views.Toolbar.textRmb': 'Símbolo de renminbi',
    'DE.Views.Toolbar.tipPageColor': 'Cambiar el color de la página',
  },
  spreadsheeteditor: {
    'SSE.Controllers.Main.txtAverage': 'Promedio',
    'SSE.Controllers.Main.txtCount': 'Recuento',
    'SSE.Controllers.Main.txtCountNums': 'Recuento numérico',
    'SSE.Controllers.Main.txtMax': 'Máximo',
    'SSE.Controllers.Main.txtMin': 'Mínimo',
    'SSE.Controllers.Main.txtMultipleItems': '(Varios elementos)',
    'SSE.Controllers.Main.txtProduct': 'Producto',
    'SSE.Controllers.Main.txtStdDev': 'Desviación estándar',
    'SSE.Controllers.Main.txtStdDevp': 'Desviación estándar de la población',
    'SSE.Controllers.Main.txtSum': 'Suma',
    'SSE.Controllers.Main.txtVar': 'Varianza',
    'SSE.Controllers.Main.txtVarp': 'Varianza de la población',
    'SSE.Controllers.Print.textWarning': 'Advertencia',
    'SSE.Controllers.Print.warnCheckMargings': 'Márgenes incorrectos',
    'SSE.Controllers.Toolbar.warnNoRecommended': 'Para crear un gráfico, seleccione las celdas que contienen los datos que desea usar.<br>Si las filas y columnas tienen nombres y desea usarlos como etiquetas, inclúyalos en la selección.',
    'SSE.Views.ChartSettingsDlg.textPercent': 'Porcentaje',
    'SSE.Views.ChartWizardDialog.errorComboSeries': 'Para crear un gráfico combinado, seleccione datos de al menos dos series.',
    'SSE.Views.ChartWizardDialog.errorMaxPoints': 'El número máximo de puntos por serie en un gráfico es 4096.',
    'SSE.Views.ChartWizardDialog.errorMaxRows': 'El número máximo de series de datos por gráfico es 255.',
    'SSE.Views.ChartWizardDialog.errorSecondaryAxis': 'El tipo de gráfico seleccionado requiere un eje secundario que ya está siendo utilizado por el gráfico. Seleccione otro tipo de gráfico.',
    'SSE.Views.ChartWizardDialog.errorStockChart': 'El orden de las filas es incorrecto. Para crear un gráfico de cotizaciones, organice los datos en la hoja en este orden: apertura, máximo, mínimo y cierre.',
    'SSE.Views.ChartWizardDialog.textRecommended': 'Gráficos recomendados',
    'SSE.Views.ChartWizardDialog.textSecondary': 'Eje secundario',
    'SSE.Views.ChartWizardDialog.textSeries': 'Serie',
    'SSE.Views.ChartWizardDialog.textTitle': 'Insertar gráfico',
    'SSE.Views.ChartWizardDialog.textTitleChange': 'Cambiar tipo de gráfico',
    'SSE.Views.ChartWizardDialog.textType': 'Tipo',
    'SSE.Views.ChartWizardDialog.txtSeriesDesc': 'Seleccione el tipo de gráfico y el eje para la serie de datos',
    'SSE.Views.FileMenu.btnDisableOnlineCaption': 'Desactivar vista previa/edición de hojas de cálculo en línea',
    'SSE.Views.FileMenu.btnDownloadOnlineCaption': 'Descargar documento',
    'SSE.Views.FileMenu.btnEnableOnlineCaption': 'Activar vista previa/edición de hojas de cálculo en línea',
    'SSE.Views.FileMenu.btnFeedbackCaption': 'Comentarios',
    'SSE.Views.FileMenu.btnSetDefaultCaption': 'Establecer como aplicación predeterminada',
    'SSE.Views.FileMenu.btnUnInstallCaption': 'Desinstalar',
    'SSE.Views.FileMenuPanels.RecentFiles.txtOpenRecent': 'Abrir archivo reciente',
    'SSE.Views.FillSeriesDialog.textAuto': 'Autorrelleno',
    'SSE.Views.FillSeriesDialog.textCols': 'Columnas',
    'SSE.Views.FillSeriesDialog.textDate': 'Fecha',
    'SSE.Views.FillSeriesDialog.textDateUnit': 'Unidad de fecha',
    'SSE.Views.FillSeriesDialog.textDay': 'Día',
    'SSE.Views.FillSeriesDialog.textGrowth': 'Crecimiento',
    'SSE.Views.FillSeriesDialog.textLinear': 'Lineal',
    'SSE.Views.FillSeriesDialog.textMonth': 'Mes',
    'SSE.Views.FillSeriesDialog.textRows': 'Filas',
    'SSE.Views.FillSeriesDialog.textSeries': 'Serie en',
    'SSE.Views.FillSeriesDialog.textStep': 'Incremento',
    'SSE.Views.FillSeriesDialog.textStop': 'Límite',
    'SSE.Views.FillSeriesDialog.textTitle': 'Series',
    'SSE.Views.FillSeriesDialog.textTrend': 'Tendencia',
    'SSE.Views.FillSeriesDialog.textType': 'Tipo',
    'SSE.Views.FillSeriesDialog.textWeek': 'Semana',
    'SSE.Views.FillSeriesDialog.textYear': 'Año',
    'SSE.Views.FillSeriesDialog.txtErrorNumber': 'El valor introducido no es válido. Se requiere un número entero o decimal.',
    'SSE.Views.TableSettings.textColBanded': 'Columnas con bandas',
    'SSE.Views.Toolbar.capInsertChartRecommend': 'Gráficos recomendados',
    'SSE.Views.Toolbar.textDown': 'Abajo',
    'SSE.Views.Toolbar.textFillLeft': 'Izquierda',
    'SSE.Views.Toolbar.textFillRight': 'Derecha',
    'SSE.Views.Toolbar.textRmb': 'Símbolo de renminbi',
    'SSE.Views.Toolbar.textSeries': 'Series',
    'SSE.Views.Toolbar.textUp': 'Arriba',
    'SSE.Views.Toolbar.tipInsertChartRecommend': 'Insertar gráficos recomendados',
    'SSE.Views.Toolbar.txtFillNum': 'Rellenar',
    'SSE.Views.Toolbar.txtYuan': 'Yuan chino',
  },
  presentationeditor: {
    'PE.Views.FileMenu.btnDisableOnlineCaption': 'Desactivar vista previa/edición de presentaciones en línea',
    'PE.Views.FileMenu.btnDownloadOnlineCaption': 'Descargar documento',
    'PE.Views.FileMenu.btnEnableOnlineCaption': 'Activar vista previa/edición de presentaciones en línea',
    'PE.Views.FileMenu.btnFeedbackCaption': 'Comentarios',
    'PE.Views.FileMenu.btnSetDefaultCaption': 'Establecer como aplicación predeterminada',
    'PE.Views.FileMenu.btnUnInstallCaption': 'Desinstalar',
    'PE.Views.FileMenuPanels.RecentFiles.txtOpenRecent': 'Abrir archivo reciente',
    'PE.Views.HeaderFooterDialog.textFooter': 'Texto del pie de página',
    'PE.Views.HeaderFooterDialog.textTitle': 'Configuración de encabezado y pie de página',
    'PE.Views.TableSettings.textColBanded': 'Columnas con bandas',
    'PE.Views.Toolbar.capBtnInsHeader': 'Encabezado y pie de página',
    'PE.Views.Toolbar.textRmb': 'Símbolo de renminbi',
    'PE.Views.Toolbar.tipEditHeader': 'Editar encabezado y pie de página',
  },
}

function extractModuleObject(text, moduleName) {
  const marker = `define("${moduleName}",`
  let pos = text.indexOf(marker)
  if (pos < 0) throw new Error(`${moduleName}: módulo no encontrado`)
  pos = text.indexOf('{', pos + marker.length)
  if (pos < 0) throw new Error(`${moduleName}: objeto no encontrado`)
  const start = pos
  let depth = 0
  let quote = null
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (quote) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        return Function(`"use strict"; return (${text.slice(start, i + 1)});`)()
      }
    }
  }
  throw new Error(`${moduleName}: objeto sin cierre`)
}

async function downloadJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Waltiva-localization' } })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
  return JSON.parse((await response.text()).replace(/^\uFEFF/, ''))
}

async function downloadBytes(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Waltiva-localization' } })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
  return Buffer.from(await response.arrayBuffer())
}

function writeWithGzip(path, data) {
  const raw = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')
  fs.writeFileSync(path, raw)
  fs.writeFileSync(`${path}.gz`, zlib.gzipSync(raw, { level: 9 }))
}

for (const editor of editors) {
  const path = `public/web-apps/apps/${editor}/main/app.js`
  let text = fs.readFileSync(path, 'utf8')
  const zhModule = `${editor}/main/locale/zh.json`
  const esModule = `${editor}/main/locale/es.json`
  const zhDefine = `define("${zhModule}",`
  const esDefine = `define("${esModule}",`
  const zhRequire = `require(["${zhModule}"`
  const esRequire = `require(["${esModule}"`
  const defaultZh = 'defLang="zh",currentLang=defLang'
  const defaultEs = 'defLang="es",currentLang=defLang'

  if ((text.match(new RegExp(zhDefine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length !== 1) {
    throw new Error(`${editor}: define zh inesperado`)
  }
  if ((text.match(new RegExp(zhRequire.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length !== 1) {
    throw new Error(`${editor}: require zh inesperado`)
  }
  if ((text.match(new RegExp(defaultZh.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length !== 1) {
    throw new Error(`${editor}: defLang zh inesperado`)
  }
  if (text.includes(esDefine) || text.includes(esRequire) || text.includes(defaultEs)) {
    throw new Error(`${editor}: el bundle ya parece localizado`)
  }

  const zh = extractModuleObject(text, zhModule)
  const officialEs = await downloadJson(`${BASE}/${editor}/main/locale/es.json`)
  const overrides = CUSTOM_ES[editor]
  const finalEs = {}
  const missing = []
  const mismatches = []

  for (const key of Object.keys(zh)) {
    let value
    if (Object.prototype.hasOwnProperty.call(officialEs, key)) value = officialEs[key]
    else if (Object.prototype.hasOwnProperty.call(overrides, key)) value = overrides[key]
    else {
      missing.push(key)
      continue
    }
    if (Array.isArray(value) !== Array.isArray(zh[key]) || typeof value !== typeof zh[key]) mismatches.push(key)
    finalEs[key] = value
  }

  const unusedOverrides = Object.keys(overrides).filter(key => !Object.prototype.hasOwnProperty.call(zh, key))
  if (missing.length) throw new Error(`${editor}: faltan ${missing.length} traducciones: ${missing.join(', ')}`)
  if (mismatches.length) throw new Error(`${editor}: tipos incompatibles: ${mismatches.join(', ')}`)
  if (unusedOverrides.length) throw new Error(`${editor}: overrides no usados: ${unusedOverrides.join(', ')}`)
  if (Object.keys(finalEs).length !== Object.keys(zh).length) throw new Error(`${editor}: esquema final incompleto`)

  const payload = JSON.stringify(finalEs)
  text = text.replace(zhDefine, `${esDefine}${payload});${zhDefine}`)
  text = text.replace(zhRequire, esRequire)
  text = text.replace(defaultZh, defaultEs)
  writeWithGzip(path, text)
  console.log(`${editor}: ${Object.keys(finalEs).length} claves en español (${Object.keys(overrides).length} específicas del fork)`)
}

const formulaDir = 'public/web-apps/apps/spreadsheeteditor/main/resources/formula-lang'
for (const name of ['es.json', 'es_desc.json']) {
  const raw = await downloadBytes(`${BASE}/spreadsheeteditor/main/resources/formula-lang/${name}`)
  JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, ''))
  writeWithGzip(`${formulaDir}/${name}`, raw)
  console.log(`formula-lang/${name}: añadido`)
}

const apiPath = 'public/web-apps/apps/api/documents/api.js'
let apiText = fs.readFileSync(apiPath, 'utf8')
const apiOld = 'editorConfig:{lang:"en",canCoAuthoring'
const apiNew = 'editorConfig:{lang:"es",canCoAuthoring'
if ((apiText.match(/editorConfig:\{lang:"en",canCoAuthoring/g) || []).length !== 1) {
  throw new Error('DocsAPI: fallback en inesperado')
}
apiText = apiText.replace(apiOld, apiNew)
writeWithGzip(apiPath, apiText)

const homePath = 'src/views/HomeView.vue'
let homeText = fs.readFileSync(homePath, 'utf8')
homeText = homeText.replace("text: 'Loading'", "text: 'Cargando...'")
fs.writeFileSync(homePath, homeText)

const aboutPath = 'src/views/AboutView.vue'
let aboutText = fs.readFileSync(aboutPath, 'utf8')
aboutText = aboutText.replace('This is an about page', 'Acerca de Waltiva')
fs.writeFileSync(aboutPath, aboutText)

const handlerPath = 'src/components/DocumentHandler.vue'
let handlerText = fs.readFileSync(handlerPath, 'utf8')
const replacements = new Map([
  ["console.log('app has loading')", "console.log('Editor cargado')"],
  ["console.error('Error opening file:', error)", "console.error('Error al abrir el archivo:', error)"],
  ["console.error('Failed to initialize editor:', error)", "console.error('Error al inicializar el editor:', error)"],
  ["console.error('Failed to load OnlyOffice API:', error)", "console.error('No se pudo cargar la API de ONLYOFFICE:', error)"],
  ["console.log('Save document event:', event)", "console.log('Evento de guardado del documento:', event)"],
  ["console.log('Write file event:', event)", "console.log('Evento de escritura del archivo:', event)"],
  ["console.warn('No data provided in writeFile event')", "console.warn('El evento de escritura no contiene datos')"],
  ["throw new Error('Invalid image data: expected Uint8Array')", "throw new Error('Datos de imagen no válidos: se esperaba Uint8Array')"],
  ["throw new Error('Invalid file name')", "throw new Error('Nombre de archivo no válido')"],
  ["console.error('Error handling writeFile:', error)", "console.error('Error al procesar la escritura del archivo:', error)"],
])
for (const [from, to] of replacements) handlerText = handlerText.replace(from, to)
if (!handlerText.includes("lang: 'es'")) throw new Error('DocumentHandler no inicializa editorConfig.lang en es')
fs.writeFileSync(handlerPath, handlerText)

console.log('Localización española preparada sin modificar lógica del editor.')
