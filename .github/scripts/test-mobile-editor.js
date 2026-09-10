import { webkit, devices } from '@playwright/test'
import assert from 'node:assert/strict'

const browser = await webkit.launch({ headless: true })
const context = await browser.newContext({ ...devices['iPhone 13'] })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(String(error)))

try {
  await page.goto('http://127.0.0.1:4173/#/', { waitUntil: 'networkidle' })
  await page.getByText('Crear documento', { exact: true }).click()
  await page.getByText('Documento', { exact: true }).click()
  await page.waitForFunction(() => {
    const frame = document.querySelector('iframe[name="frameEditor"]')
    const doc = frame?.contentDocument
    const text = (doc?.body?.innerText || '').replace(/\s+/g, ' ')
    return !!doc?.querySelector('#wlt-mobile-topbar') &&
      !!doc?.querySelector('#wlt-mobile-viewbar') &&
      !!doc?.querySelector('#wlt-mobile-formatbar') &&
      !!doc?.querySelector('canvas') &&
      !text.includes('Cargando documento')
  }, null, { timeout: 120000 })
  await page.waitForTimeout(1800)

  const initial = await page.evaluate(() => {
    const frame = document.querySelector('iframe[name="frameEditor"]')
    const doc = frame.contentDocument
    const win = frame.contentWindow
    const viewport = doc.querySelector('#viewport')
    const formatbar = doc.querySelector('#wlt-mobile-formatbar')
    const viewbar = doc.querySelector('#wlt-mobile-viewbar')
    const viewRow = doc.querySelector('.wlt-view-row')
    const editRow = doc.querySelector('.wlt-edit-row')
    const vr = viewport.getBoundingClientRect()
    const fr = formatbar.getBoundingClientRect()
    const br = viewbar.getBoundingClientRect()
    const chromeIds = ['id_hor_ruler','id_vert_ruler','id_vertical_scroll','id_horizontal_scroll','id_vscrollbar','id_hscrollbar','id_buttonTabs']
    const chrome = chromeIds.map(id => doc.getElementById(id)).filter(Boolean).map(el => {
      const r = el.getBoundingClientRect()
      const css = win.getComputedStyle(el)
      return { id: el.id, width: r.width, height: r.height, visibility: css.visibility, opacity: css.opacity }
    })
    return {
      mobile: doc.body.classList.contains('waltiva-mobile-ui'),
      viewMode: doc.body.classList.contains('waltiva-mobile-view-mode'),
      viewportWidth: vr.width,
      viewportLeft: vr.left,
      windowWidth: win.innerWidth,
      viewbarVisible: br.width > 0 && br.height > 0,
      formatbarVisible: fr.width > 0 && fr.height > 0,
      viewRowVisible: win.getComputedStyle(viewRow).display !== 'none',
      editRowVisible: win.getComputedStyle(editRow).display !== 'none',
      chrome,
    }
  })

  console.log('INITIAL_MOBILE_STATE=' + JSON.stringify(initial, null, 2))
  assert.ok(!errors.some(x => x.includes('requestIdleCallback')))
  assert.ok(initial.mobile, 'No se activó la UI móvil')
  assert.ok(initial.viewMode, 'El documento no inicia en modo lectura')
  assert.ok(initial.viewbarVisible, 'La barra inferior de lectura no está visible')
  assert.equal(initial.formatbarVisible, false, 'La barra de formato aparece antes de editar')
  assert.ok(initial.viewRowVisible && !initial.editRowVisible, 'La cabecera inicial no corresponde al modo lectura')
  assert.ok(initial.viewportWidth >= initial.windowWidth - 2, 'El documento no usa todo el ancho')
  assert.ok(Math.abs(initial.viewportLeft) <= 1, 'El editor conserva un margen lateral')
  assert.ok(initial.chrome.every(x => x.visibility === 'hidden' || x.opacity === '0' || x.width <= 1 || x.height <= 1), 'Queda regla o scrollbar visible')

  await page.evaluate(() => {
    const doc = document.querySelector('iframe[name="frameEditor"]').contentDocument
    doc.querySelector('[data-wlt-action="edit"]')?.click()
  })
  await page.waitForTimeout(120)

  const editingNoKeyboard = await page.evaluate(() => {
    const frame = document.querySelector('iframe[name="frameEditor"]')
    const doc = frame.contentDocument
    const win = frame.contentWindow
    const bar = doc.querySelector('#wlt-mobile-formatbar')
    return {
      viewMode: doc.body.classList.contains('waltiva-mobile-view-mode'),
      formatbarVisible: win.getComputedStyle(bar).display !== 'none' && bar.getBoundingClientRect().height > 0,
    }
  })
  assert.equal(editingNoKeyboard.viewMode, false, 'Editar no cambia al modo edición')
  assert.equal(editingNoKeyboard.formatbarVisible, false, 'La barra de formato debe esperar al teclado')

  const keyboard = await page.evaluate(async () => {
    const frame = document.querySelector('iframe[name="frameEditor"]')
    const doc = frame.contentDocument
    const bar = doc.querySelector('#wlt-mobile-formatbar')
    doc.body.classList.add('waltiva-mobile-keyboard-open')
    doc.documentElement.style.setProperty('--wlt-keyboard-offset', '280px')
    await new Promise(resolve => setTimeout(resolve, 80))
    const rect = bar.getBoundingClientRect()
    const css = frame.contentWindow.getComputedStyle(bar)
    return { visible: css.display !== 'none' && rect.height > 0, bottom: css.bottom }
  })
  console.log('KEYBOARD_STATE=' + JSON.stringify(keyboard))
  assert.ok(keyboard.visible, 'La barra de formato no aparece cuando abre el teclado')
  assert.ok(parseFloat(keyboard.bottom) > 250, 'La barra de formato no queda elevada sobre el teclado')
} finally {
  await browser.close()
}
