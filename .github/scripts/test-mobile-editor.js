import { webkit, devices } from '@playwright/test'
import assert from 'node:assert/strict'

const browser = await webkit.launch({ headless: true })
const context = await browser.newContext({ ...devices['iPhone 13'] })
const page = await context.newPage()
const errors = []
const consoleErrors = []
page.on('pageerror', error => errors.push(String(error)))
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})

const frameSelector = 'iframe[name="frameEditor"], #iframe iframe'

async function snapshot() {
  return page.evaluate((selector) => {
    const frame = document.querySelector(selector)
    const host = document.getElementById('iframe')
    const frames = [...document.querySelectorAll('iframe')].map(f => ({ name: f.name, id: f.id, src: f.src }))
    if (!frame) return { frame: false, frames, hostHtml: host?.innerHTML?.slice(0, 800) || '' }
    const doc = frame.contentDocument
    if (!doc) return { frame: true, doc: false, src: frame.src, frames }
    const text = (doc.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 600)
    return {
      frame: true,
      doc: true,
      src: frame.src,
      frames,
      readyState: doc.readyState,
      bodyClass: doc.body?.className || '',
      topbar: !!doc.querySelector('#wlt-mobile-topbar'),
      viewbar: !!doc.querySelector('#wlt-mobile-viewbar'),
      formatbar: !!doc.querySelector('#wlt-mobile-formatbar'),
      viewport: !!doc.querySelector('#viewport'),
      canvas: !!doc.querySelector('canvas'),
      loading: text.includes('Cargando documento'),
      text,
    }
  }, frameSelector)
}

try {
  await page.goto('http://127.0.0.1:4173/#/', { waitUntil: 'networkidle' })
  await page.getByText('Crear documento', { exact: true }).click()
  await page.getByText('Documento', { exact: true }).click()

  let state = null
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(i === 0 ? 1500 : 2500)
    state = await snapshot()
    console.log(`READY_SNAPSHOT_${i}=` + JSON.stringify(state))
    if (state.frame && state.topbar && state.viewbar && state.formatbar && state.viewport && !state.loading) break
  }

  console.log('PAGE_ERRORS=' + JSON.stringify(errors))
  console.log('CONSOLE_ERRORS=' + JSON.stringify(consoleErrors.slice(-20)))
  assert.ok(state?.frame, 'No se creó el iframe de ONLYOFFICE')
  assert.ok(state?.topbar, 'No se creó la barra superior móvil')
  assert.ok(state?.viewbar, 'No se creó la barra de lectura móvil')
  assert.ok(state?.formatbar, 'No se creó la barra de formato móvil')
  assert.ok(state?.viewport, 'No se creó el viewport de ONLYOFFICE')
  assert.equal(state?.loading, false, 'ONLYOFFICE sigue mostrando Cargando documento')
  assert.ok(!errors.some(x => x.includes('requestIdleCallback')), 'requestIdleCallback sigue fallando')

  const initial = await page.evaluate((selector) => {
    const frame = document.querySelector(selector)
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
    }
  }, frameSelector)

  console.log('INITIAL_MOBILE_STATE=' + JSON.stringify(initial))
  assert.ok(initial.mobile, 'No se activó la UI móvil')
  assert.ok(initial.viewMode, 'El documento no inicia en modo lectura')
  assert.ok(initial.viewbarVisible, 'La barra inferior de lectura no está visible')
  assert.equal(initial.formatbarVisible, false, 'La barra de formato aparece antes de editar')
  assert.ok(initial.viewRowVisible && !initial.editRowVisible, 'La cabecera inicial no corresponde al modo lectura')
  assert.ok(initial.viewportWidth >= initial.windowWidth - 2, 'El documento no usa todo el ancho')
  assert.ok(Math.abs(initial.viewportLeft) <= 1, 'El editor conserva un margen lateral')

  await page.evaluate((selector) => {
    const doc = document.querySelector(selector).contentDocument
    doc.querySelector('[data-wlt-action="edit"]')?.click()
  }, frameSelector)
  await page.waitForTimeout(200)

  const editingNoKeyboard = await page.evaluate((selector) => {
    const frame = document.querySelector(selector)
    const doc = frame.contentDocument
    const win = frame.contentWindow
    const bar = doc.querySelector('#wlt-mobile-formatbar')
    return {
      viewMode: doc.body.classList.contains('waltiva-mobile-view-mode'),
      formatbarVisible: win.getComputedStyle(bar).display !== 'none' && bar.getBoundingClientRect().height > 0,
    }
  }, frameSelector)
  assert.equal(editingNoKeyboard.viewMode, false, 'Editar no cambia al modo edición')
  assert.equal(editingNoKeyboard.formatbarVisible, false, 'La barra de formato debe esperar al teclado')

  const keyboard = await page.evaluate(async (selector) => {
    const frame = document.querySelector(selector)
    const doc = frame.contentDocument
    const bar = doc.querySelector('#wlt-mobile-formatbar')
    doc.body.classList.add('waltiva-mobile-keyboard-open')
    doc.documentElement.style.setProperty('--wlt-keyboard-offset', '280px')
    await new Promise(resolve => setTimeout(resolve, 100))
    const rect = bar.getBoundingClientRect()
    const css = frame.contentWindow.getComputedStyle(bar)
    return { visible: css.display !== 'none' && rect.height > 0, bottom: css.bottom }
  }, frameSelector)
  console.log('KEYBOARD_STATE=' + JSON.stringify(keyboard))
  assert.ok(keyboard.visible, 'La barra de formato no aparece cuando abre el teclado')
  assert.ok(parseFloat(keyboard.bottom) > 250, 'La barra de formato no queda elevada sobre el teclado')
} finally {
  await browser.close()
}
