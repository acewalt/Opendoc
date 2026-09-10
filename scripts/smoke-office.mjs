import { chromium } from '@playwright/test'

const baseUrl = process.env.WALTIVA_SMOKE_URL || 'http://127.0.0.1:4173/'
const cases = [
  { label: 'Documento', ext: 'docx' },
  { label: 'Hoja de cálculo', ext: 'xlsx' },
  { label: 'Presentación', ext: 'pptx' },
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

page.on('console', (message) => {
  if (['error', 'warning'].includes(message.type())) {
    console.log(`[browser:${message.type()}] ${message.text()}`)
  }
})
page.on('pageerror', (error) => console.log(`[pageerror] ${error.message}`))

try {
  for (const testCase of cases) {
    console.log(`\n[smoke] Probando ${testCase.ext}…`)
    await page.goto(`${baseUrl}?smoke=${Date.now()}#/`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Nuevo / Abrir archivo' }).click()

    const card = page.locator('.thumb-wrap').filter({ hasText: testCase.label }).first()
    await card.click()

    await page.locator('iframe[name="frameEditor"]').waitFor({ state: 'attached', timeout: 60_000 })
    const frame = page.frame({ name: 'frameEditor' })
    if (!frame) throw new Error(`${testCase.ext}: no se creó frameEditor`)

    await frame.waitForFunction(
      () => {
        const text = document.body?.innerText || ''
        return /(?:Archivo|Inicio|Insertar|Diseño|Datos|Presentación)/i.test(text)
      },
      undefined,
      { timeout: 150_000 },
    )

    const bodyText = (await frame.locator('body').innerText()).replace(/\s+/g, ' ')
    const spanish = /(?:Archivo|Inicio|Insertar|Diseño|Datos|Revisar|Vista)/i.test(bodyText)
    const chinese = /(?:开始|文件|插入|绘图|布局|引用|审阅|视图|数据|公式)/.test(bodyText)

    console.log(`[smoke] ${testCase.ext}: español=${spanish}, chino=${chinese}`)
    console.log(`[smoke] ${testCase.ext}: ${bodyText.slice(0, 500)}`)

    if (!spanish) throw new Error(`${testCase.ext}: el editor cargó pero no se detectó interfaz española`)
    if (chinese) throw new Error(`${testCase.ext}: todavía se detectaron etiquetas principales en chino`)
  }

  console.log('\n[smoke] Probando ruta del editor interno de gráficos…')
  await page.goto(`${baseUrl}?chart-smoke=${Date.now()}#/`, { waitUntil: 'domcontentloaded' })

  const apiUrl = new URL('v9.3.0.24-1/web-apps/apps/api/documents/api.js', baseUrl).href
  await page.addScriptTag({ url: apiUrl })

  await page.evaluate(() => {
    const old = document.getElementById('chart-editor-smoke')
    old?.remove()

    const host = document.createElement('div')
    host.id = 'chart-editor-smoke'
    document.body.appendChild(host)

    // Se omite isLocalFile intencionalmente: los editores internos de gráficos,
    // OLE y combinación se crean así desde ONLYOFFICE. Este era el caso que
    // generaba una ruta de servidor inexistente en GitHub Pages.
    window.__waltivaInternalEditorSmoke = new window.DocsAPI.DocEditor('chart-editor-smoke', {
      type: 'desktop',
      width: '800px',
      height: '600px',
      documentType: 'cell',
      document: {
        title: 'Datos del gráfico.xlsx',
        fileType: 'xlsx',
        url: 'about:blank',
        key: 'waltiva-chart-smoke',
        permissions: { edit: true },
      },
      editorConfig: {
        mode: 'editdiagram',
        lang: 'es',
      },
    })
  })

  const internalFrame = page.locator('#chart-editor-smoke').locator('xpath=following-sibling::iframe[1]')
  const fallbackFrame = page.locator('iframe[name="frameEditor"]').last()
  const frameLocator = (await internalFrame.count()) ? internalFrame : fallbackFrame
  await frameLocator.waitFor({ state: 'attached', timeout: 30_000 })

  const rawSrc = await frameLocator.getAttribute('src')
  if (!rawSrc) throw new Error('Editor de gráficos: no se generó URL para index_internal.html')

  const internalUrl = new URL(rawSrc, baseUrl)
  const expectedPath = new URL(
    'v9.3.0.24-1/web-apps/apps/spreadsheeteditor/main/index_internal.html',
    baseUrl,
  ).pathname

  console.log(`[smoke] editor interno URL: ${internalUrl.href}`)

  if (internalUrl.pathname !== expectedPath) {
    throw new Error(
      `Editor de gráficos: ruta incorrecta. Esperada ${expectedPath}, recibida ${internalUrl.pathname}`,
    )
  }

  if (internalUrl.pathname.includes('/9.3.0-90621fd167d8090903a61c79b926eb27/')) {
    throw new Error('Editor de gráficos: reapareció la carpeta de revisión de servidor')
  }

  const internalResponse = await page.request.get(internalUrl.href)
  if (!internalResponse.ok()) {
    throw new Error(`Editor de gráficos: index_internal.html respondió HTTP ${internalResponse.status()}`)
  }

  console.log(`[smoke] editor interno: HTTP ${internalResponse.status()}, ruta local correcta.`)
  console.log('\n[smoke] DOCX, XLSX, PPTX y editor interno de gráficos pasaron correctamente.')
} finally {
  await browser.close()
}