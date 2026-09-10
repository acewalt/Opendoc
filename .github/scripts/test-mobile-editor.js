const { webkit, devices } = require('@playwright/test');
const assert = require('node:assert/strict');

(async () => {
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));

  await page.goto('http://127.0.0.1:4173/#/', { waitUntil: 'networkidle' });
  await page.getByText('Crear documento', { exact: true }).click();
  await page.getByText('Documento', { exact: true }).click();
  await page.waitForFunction(() => {
    const frame = document.querySelector('iframe[name="frameEditor"]');
    const doc = frame?.contentDocument;
    const text = (doc?.body?.innerText || '').replace(/\s+/g, ' ');
    return !!doc?.querySelector('#wlt-mobile-topbar') && !!doc?.querySelector('#wlt-mobile-formatbar') && !!doc?.querySelector('canvas') && !text.includes('Cargando documento');
  }, null, { timeout: 120000 });
  await page.waitForTimeout(1800);

  const state = await page.evaluate(() => {
    const frame = document.querySelector('iframe[name="frameEditor"]');
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    const viewport = doc.querySelector('#viewport');
    const formatbar = doc.querySelector('#wlt-mobile-formatbar');
    const vr = viewport.getBoundingClientRect();
    const fr = formatbar.getBoundingClientRect();
    const chromeIds = ['id_hor_ruler','id_vert_ruler','id_vertical_scroll','id_horizontal_scroll','id_vscrollbar','id_hscrollbar','id_buttonTabs'];
    const chrome = chromeIds.map(id => doc.getElementById(id)).filter(Boolean).map(el => {
      const r = el.getBoundingClientRect();
      const css = win.getComputedStyle(el);
      return { id: el.id, width: r.width, height: r.height, visibility: css.visibility, opacity: css.opacity };
    });
    return {
      mobile: doc.body.classList.contains('waltiva-mobile-ui'),
      viewportWidth: vr.width,
      viewportLeft: vr.left,
      windowWidth: win.innerWidth,
      formatbarVisible: fr.width > 0 && fr.height > 0,
      chrome,
    };
  });

  console.log('MOBILE_STATE=' + JSON.stringify(state, null, 2));
  assert.ok(!errors.some(x => x.includes('requestIdleCallback')));
  assert.ok(state.mobile, 'No se activó la UI móvil');
  assert.ok(state.formatbarVisible, 'La barra móvil no está visible');
  assert.ok(state.viewportWidth >= state.windowWidth - 2, 'El documento no usa todo el ancho');
  assert.ok(Math.abs(state.viewportLeft) <= 1, 'El editor conserva un margen lateral');
  assert.ok(state.chrome.every(x => x.visibility === 'hidden' || x.opacity === '0' || x.width <= 1 || x.height <= 1), 'Queda regla o scrollbar visible');

  const lift = await page.evaluate(async () => {
    const doc = document.querySelector('iframe[name="frameEditor"]').contentDocument;
    const bar = doc.querySelector('#wlt-mobile-formatbar');
    const before = bar.getBoundingClientRect().top;
    doc.documentElement.style.setProperty('--wlt-keyboard-offset', '280px');
    await new Promise(resolve => setTimeout(resolve, 80));
    return before - bar.getBoundingClientRect().top;
  });
  console.log('KEYBOARD_TOOLBAR_LIFT=' + lift);
  assert.ok(lift > 220, 'La barra móvil no sube por encima del teclado');

  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
