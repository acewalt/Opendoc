import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'

// Start Vite (or its production preview) before running this script.
const baseURL = process.env.WALTIVA_TEST_URL || 'http://127.0.0.1:4173/'
const browser = await chromium.launch({ headless: true })
const cases = [
  {
    name: 'Ecuaciones',
    id: 'tlbtn-insertequation',
    category: 'Fracciones',
    insertMethod: 'asc_AddMath',
  },
  {
    name: 'SmartArt',
    id: 'tlbtn-insertsmartart',
    category: 'Lista',
    insertMethod: 'asc_createSmartArt',
  },
]

async function runCase(theme, scenario) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  await context.addInitScript((selectedTheme) => {
    if (selectedTheme === 'aurora-dark') {
      localStorage.setItem('waltiva.interface-theme', selectedTheme)
    } else {
      localStorage.removeItem('waltiva.interface-theme')
    }
  }, theme)
  const page = await context.newPage()
  page.setDefaultTimeout(30_000)
  const errors = []
  const failedSmartArtRequests = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.url().includes('/SmartArts.bin') && !response.ok()) {
      failedSmartArtRequests.push(`${response.status()} ${response.url()}`)
    }
  })

  try {
    await page.goto(baseURL)
    await page.getByText('Crear documento', { exact: true }).click()
    await page.getByText('Documento', { exact: true }).click()
    const frame = page.frameLocator('iframe[name="frameEditor"]')
    await frame.getByText('Insertar', { exact: true }).first().click({ timeout: 60_000 })
    const editor = page.frames().find((candidate) => candidate.name() === 'frameEditor')
    assert.ok(editor, 'No se encontró el iframe del editor')
    await expect.poll(() => editor.evaluate(() => !!window.DE?.getController('Toolbar')?._state.activated))
      .toBe(true)
    await expect.poll(() => editor.evaluate(() => document.documentElement.getAttribute('data-waltiva-theme')))
      .toBe(theme === 'aurora-dark' ? theme : null)

    // Observe the real insertion call; always invoke the original SDK method.
    await editor.evaluate(({ insertMethod }) => {
      const api = window.DE.getController('Toolbar').api
      const original = api[insertMethod]
      window.__insertMenuRegression = { calls: [], errors: [] }
      api[insertMethod] = function (...args) {
        try {
          const result = original.apply(this, args)
          window.__insertMenuRegression.calls.push(args)
          return result
        } catch (error) {
          window.__insertMenuRegression.errors.push(String(error))
          throw error
        }
      }
    }, scenario)

    const button = frame.locator(`#${scenario.id} > .dropdown-toggle`)
    const menu = frame.locator(`#${scenario.id} > .dropdown-menu`)
    const category = menu.locator(':scope > li').filter({
      has: frame.locator(':scope > a', { hasText: new RegExp(`^${scenario.category}$`) }),
    })
    const categoryAnchor = category.locator(':scope > a')
    const submenu = category.locator(':scope > .dropdown-menu')

    async function openCategory() {
      await button.click()
      await expect(menu).toBeVisible()
      await categoryAnchor.hover()
      await expect(submenu).toBeVisible()
      await expect(submenu.locator('.dataview .item').first()).toBeVisible()
    }

    async function checkGeometry() {
      // Menu.el points to the parent LI in ONLYOFFICE; measure the actual UL.
      const row = await categoryAnchor.boundingBox()
      const child = await submenu.boundingBox()
      assert.ok(row && child, 'La categoría y su galería deben ser visibles')
      const rightGap = Math.abs(child.x - (row.x + row.width))
      const leftGap = Math.abs(row.x - (child.x + child.width))
      assert.ok(Math.min(rightGap, leftGap) <= 10,
        `La galería está separada de la categoría: ${JSON.stringify({ row, child })}`)
      assert.ok(child.y <= row.y + row.height && child.y + child.height >= row.y,
        'La galería debe quedar a la altura de su categoría')
      assert.ok(child.x >= 0 && child.x + child.width <= 1601,
        `La galería sale del ancho de la ventana: ${JSON.stringify(child)}`)
      return { row, child }
    }

    async function moveIntoTemplate() {
      const template = submenu.locator('.dataview .item').first()
      const row = await categoryAnchor.boundingBox()
      const target = await template.boundingBox()
      assert.ok(row && target)
      // Move across the category boundary as a person would, without a locator
      // click that could silently reopen a menu or skip the mouseleave timer.
      await page.mouse.move(row.x + row.width / 2, row.y + row.height / 2)
      await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 20 })
      await page.waitForTimeout(800)
      await expect(submenu).toBeVisible()
      await expect(template).toBeVisible()
      return template
    }

    await openCategory()
    const geometry = await checkGeometry()
    await moveIntoTemplate()
    await page.mouse.click(...await submenu.locator('.dataview .item').first().boundingBox()
      .then((rect) => [rect.x + rect.width / 2, rect.y + rect.height / 2]))
    await expect.poll(() => editor.evaluate(() => window.__insertMenuRegression.calls.length)).toBe(1)
    const insertion = await editor.evaluate(() => window.__insertMenuRegression)
    assert.equal(insertion.errors.length, 0, JSON.stringify(insertion.errors))
    assert.notEqual(insertion.calls[0][0], undefined, 'La selección debe proporcionar un tipo de plantilla al SDK')
    await expect.poll(() => editor.evaluate(() => window.DE.getController('Toolbar')._state.can_undo))
      .toBe(true)
    await expect(menu).toBeHidden()

    // The same galleries must remain usable after inserting and closing them.
    await openCategory()
    await checkGeometry()
    await moveIntoTemplate()
    await page.keyboard.press('Escape')
    await expect(submenu).toBeHidden()
    // ONLYOFFICE may close just the nested menu on the first Escape.
    if (await menu.isVisible()) await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()

    await openCategory()
    const canvas = frame.locator('#id_main').first()
    const canvasBox = await canvas.boundingBox()
    assert.ok(canvasBox, 'No se encontró el área del documento')
    await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height - 50)
    await expect(menu).toBeHidden()
    await expect(submenu).toBeHidden()
    assert.deepEqual(failedSmartArtRequests, [], 'Faltan los recursos binarios de SmartArt')
    assert.deepEqual(errors, [], 'El editor produjo errores de JavaScript')
    console.log(`PASS ${theme} / ${scenario.name}: ` + JSON.stringify({ geometry, inserted: insertion.calls[0][0] }))
  } catch (error) {
    console.error(`FAIL ${theme} / ${scenario.name}`, { errors, failedSmartArtRequests })
    throw error
  } finally {
    await context.close()
  }
}

try {
  for (const theme of ['aurora-dark', 'native']) {
    for (const scenario of cases) await runCase(theme, scenario)
  }
} finally {
  await browser.close()
}
