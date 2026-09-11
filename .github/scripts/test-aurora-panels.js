import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'

// Start Vite (or its production preview) before running this script.
const baseURL = process.env.WALTIVA_TEST_URL || 'http://127.0.0.1:4173/'
const browser = await chromium.launch({ headless: true })

async function checkSurfaces(editor, leftId, theme) {
  const surfaces = await editor.evaluate((selectedLeftId) => {
    const read = (selector) => {
      const element = document.querySelector(selector)
      if (!element) throw new Error(`Missing panel element: ${selector}`)
      const bounds = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom,
        width: bounds.width, height: bounds.height,
        radius: style.borderTopLeftRadius,
        background: style.backgroundColor, image: style.backgroundImage,
      }
    }
    return {
      left: read(`#${selectedLeftId}`), leftRoot: read('#left-menu'),
      right: read('#view-right-menu > .right-panel'), rightRoot: read('#right-menu'),
      leftRail: read('#view-left-menu > .tool-menu-btns'),
      rightRail: read('#view-right-menu > .tool-menu-btns'),
      rightContent: read('#view-right-menu > .right-panel > .settings-panel.active'),
    }
  }, leftId)

  if (theme !== 'aurora-dark') {
    assert.equal(surfaces.left.radius, '0px', 'Aurora rounding must not leak into native themes')
    assert.equal(surfaces.right.radius, '0px', 'Aurora rounding must not leak into native themes')
    return surfaces
  }

  for (const side of ['left', 'right']) {
    const surface = surfaces[side]
    const root = surfaces[`${side}Root`]
    const rail = surfaces[`${side}Rail`]
    assert.equal(surface.radius, '8px', `${side}: expected a rounded content surface`)
    assert.ok(surface.image.includes('gradient'), `${side}: expected the Aurora panel gradient`)
    assert.equal(rail.image, 'none', `${side}: icon rail must remain solid graphite`)
    assert.equal(rail.background, root.background, `${side}: icon rail must match the shell`)
    assert.ok(Math.abs(surface.y - root.y - 6) <= 1, `${side}: missing 6px top gutter`)
    assert.ok(Math.abs(root.bottom - surface.bottom - 6) <= 1, `${side}: missing 6px bottom gutter`)
    assert.ok(surface.x >= root.x && surface.right <= root.right,
      `${side}: panel must stay inside its native layout region`)
    assert.equal(rail.width, 40, `${side}: native icon-rail width must be preserved`)
  }
  assert.equal(surfaces.rightContent.image, 'none', 'Properties must not create a nested gradient card')
  assert.equal(surfaces.rightContent.radius, '0px', 'Properties must not create a nested rounded card')
  return surfaces
}

async function runCase(theme) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  await context.addInitScript((selectedTheme) => {
    if (selectedTheme === 'aurora-dark') localStorage.setItem('waltiva.interface-theme', selectedTheme)
    else localStorage.removeItem('waltiva.interface-theme')
  }, theme)
  const page = await context.newPage()
  page.setDefaultTimeout(30_000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  try {
    await page.goto(baseURL)
    await page.getByText('Crear documento', { exact: true }).click()
    await page.getByText('Documento', { exact: true }).click()
    const frame = page.frameLocator('iframe[name="frameEditor"]')
    await frame.getByText('Inicio', { exact: true }).first().click({ timeout: 60_000 })
    const editor = page.frames().find((candidate) => candidate.name() === 'frameEditor')
    assert.ok(editor, 'The document editor iframe must exist')
    await expect.poll(() => editor.evaluate(() => !!window.DE?.getController('Toolbar')?._state.activated))
      .toBe(true)
    await expect.poll(() => editor.evaluate(() => document.documentElement.getAttribute('data-waltiva-theme')))
      .toBe(theme === 'aurora-dark' ? theme : null)

    await frame.locator('#left-btn-navigation').click()
    await expect(frame.locator('#left-panel-navigation')).toBeVisible()
    if (!await frame.locator('#id-paragraph-settings').isVisible()) {
      await frame.locator('#id-right-menu-text').click()
    }
    await expect(frame.locator('#id-paragraph-settings')).toBeVisible()
    const initial = await checkSurfaces(editor, 'left-panel-navigation', theme)

    if (theme === 'aurora-dark') {
      await frame.locator('#left-btn-searchbar').click()
      await expect(frame.locator('#left-panel-search')).toBeVisible()
      await expect(frame.locator('#left-panel-navigation')).toBeHidden()
      await checkSurfaces(editor, 'left-panel-search', theme)
      await frame.locator('#left-btn-navigation').click()
      await expect(frame.locator('#left-panel-navigation')).toBeVisible()

      // Real dropdown selection exercises fixed menu coordinates and hit testing.
      const lineRule = frame.locator('#paragraph-combo-line-rule')
      await lineRule.locator('.dropdown-toggle').click()
      const lineMenu = lineRule.locator('.dropdown-menu')
      await expect(lineMenu).toBeVisible()
      await lineMenu.locator(':scope > li > a').first().click()
      await expect(lineMenu).toBeHidden()

      // Same native SDK method used by Toolbar.onTablePickerSelect(columns, rows).
      await editor.evaluate(() => window.DE.getController('Toolbar').api.put_Table(3, 3))
      await expect(frame.locator('#id-right-menu-table')).toBeEnabled()
      if (!await frame.locator('#id-table-settings').isVisible()) {
        await frame.locator('#id-right-menu-table').click()
      }
      await expect(frame.locator('#id-table-settings')).toBeVisible()
      await page.setViewportSize({ width: 1280, height: 720 })
      await expect.poll(() => editor.evaluate(() => window.innerWidth)).toBe(1280)
      await checkSurfaces(editor, 'left-panel-navigation', theme)

      const properties = frame.locator('#view-right-menu > .right-panel')
      await properties.hover()
      await page.mouse.wheel(0, 2000)
      await expect.poll(() => properties.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
      const advanced = frame.locator('#table-advanced-link')
      await expect(advanced).toBeInViewport()
      await advanced.click({ trial: true })
      await checkSurfaces(editor, 'left-panel-navigation', theme)
    }

    assert.deepEqual(errors, [], 'The editor must not produce JavaScript errors')
    console.log(`PASS ${theme} / sidebars: ` + JSON.stringify({
      left: initial.left, right: initial.right,
      interactions: theme === 'aurora-dark' ? 'navigation, search, line spacing, table scroll, resize' : 'theme isolation',
    }))
  } finally {
    await context.close()
  }
}

try {
  for (const theme of ['aurora-dark', 'native']) await runCase(theme)
} finally {
  await browser.close()
}
