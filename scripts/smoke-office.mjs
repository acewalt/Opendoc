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

  console.log('\n[smoke] DOCX, XLSX y PPTX cargaron en español.')
} finally {
  await browser.close()
}
