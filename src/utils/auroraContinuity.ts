import {
  WALTIVA_THEME_ATTRIBUTE,
  WALTIVA_THEME_STORAGE_KEY,
  type WaltivaThemeId,
} from './waltivaTheme'

const FRAME_SELECTOR = [
  'iframe[name="frameEditor"]',
  '#iframe iframe',
  'iframe[src*="/web-apps/apps/documenteditor/"]',
  'iframe[src*="/web-apps/apps/spreadsheeteditor/"]',
].join(', ')

const CONTINUITY_LINK_ID = 'waltiva-aurora-continuity-styles'
const CANVAS_SURFACE_LINK_ID = 'waltiva-aurora-canvas-surface-styles'
const SCROLLBAR_LINK_ID = 'waltiva-aurora-scrollbar-styles'
const TOOLBAR_BUTTONS_LINK_ID = 'waltiva-aurora-toolbar-buttons-styles'
const PANEL_CORNERS_LINK_ID = 'waltiva-aurora-panel-corners-styles'
const LIGHT_OVERRIDE_LINK_ID = 'waltiva-aurora-light-styles'
const LIGHT_FINAL_LINK_ID = 'waltiva-aurora-light-final-styles'
const SPREADSHEET_LINK_ID = 'waltiva-aurora-spreadsheet-styles'
const CUSTOM_OPTION_ATTRIBUTE = 'data-waltiva-theme-option'

const AURORA_DARK: WaltivaThemeId = 'aurora-dark'
const AURORA_LIGHT: WaltivaThemeId = 'aurora-light'

const NATIVE_BASE_LABELS: Record<WaltivaThemeId, readonly string[]> = {
  [AURORA_DARK]: ['contraste oscuro', 'contrast dark', 'oscuro', 'dark'],
  [AURORA_LIGHT]: ['claro', 'light', 'clásico claro', 'clasico claro', 'classic light'],
}

const observedFrames = new WeakSet<HTMLIFrameElement>()
const retryTimers = new WeakMap<HTMLIFrameElement, number>()
const documentObservers = new WeakMap<Document, MutationObserver>()
const documentRafIds = new WeakMap<Document, number>()
const syncedNativeBase = new WeakMap<Document, WaltivaThemeId>()
const syncingNativeBase = new WeakSet<Document>()

function getStylesheetUrl(path: string): string {
  return new URL(path, document.baseURI).href
}

function isSpreadsheetDocument(doc: Document): boolean {
  try {
    return doc.location.pathname.includes('/web-apps/apps/spreadsheeteditor/')
  } catch {
    return false
  }
}

function ensureStylesheet(
  doc: Document,
  id: string,
  path: string,
  keepLast = false,
): boolean {
  if (!doc.head) return false

  const href = getStylesheetUrl(path)
  const existing = doc.getElementById(id) as HTMLLinkElement | null
  if (existing) {
    if (existing.href !== href) existing.href = href
    if (keepLast && doc.head.lastElementChild !== existing) doc.head.appendChild(existing)
    return true
  }

  const link = doc.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = href
  doc.head.appendChild(link)
  return true
}

function normalizeLabel(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
}

function getActiveAuroraTheme(doc: Document): WaltivaThemeId | null {
  const value = doc.documentElement?.getAttribute(WALTIVA_THEME_ATTRIBUTE)
  return value === AURORA_DARK || value === AURORA_LIGHT ? value : null
}

function getDirectMenuItems(menu: Element): HTMLElement[] {
  return Array.from(menu.querySelectorAll<HTMLElement>('li')).filter(
    (item) => item.closest('.dropdown-menu') === menu,
  )
}

function findNativeBaseItem(doc: Document, theme: WaltivaThemeId): HTMLElement | null {
  const labels = NATIVE_BASE_LABELS[theme]
  const menus = Array.from(doc.querySelectorAll<HTMLElement>('.dropdown-menu'))

  for (const menu of menus) {
    const items = getDirectMenuItems(menu)
    const candidate = items.find((item) => {
      if (item.hasAttribute(CUSTOM_OPTION_ATTRIBUTE)) return false
      return labels.includes(normalizeLabel(item.textContent))
    })
    if (candidate) return candidate
  }

  return null
}

function getItemControl(item: HTMLElement): HTMLElement {
  return item.querySelector<HTMLElement>('a, button, [role="menuitem"]') ?? item
}

function restoreCustomTheme(theme: WaltivaThemeId): void {
  try {
    window.localStorage.setItem(WALTIVA_THEME_STORAGE_KEY, theme)
  } catch {
    // localStorage may be unavailable in privacy-restricted contexts.
  }

  window.dispatchEvent(
    new StorageEvent('storage', {
      key: WALTIVA_THEME_STORAGE_KEY,
      newValue: theme,
    }),
  )
}

/**
 * Writer/PDF need a matching native ONLYOFFICE base so their canvas assets are
 * repainted consistently. Spreadsheet is different: forcing a native theme
 * click there races Waltiva's custom-theme handler and can collapse Aurora
 * Light back onto the dark native base. Spreadsheet therefore keeps Waltiva's
 * own active theme and gets its canvas colours from aurora-spreadsheet.css.
 */
function syncNativeThemeBase(doc: Document): boolean {
  if (isSpreadsheetDocument(doc)) {
    syncedNativeBase.delete(doc)
    syncingNativeBase.delete(doc)
    return true
  }

  const theme = getActiveAuroraTheme(doc)

  if (!theme) {
    if (!syncingNativeBase.has(doc)) syncedNativeBase.delete(doc)
    return true
  }

  if (syncedNativeBase.get(doc) === theme) return true
  if (syncingNativeBase.has(doc)) return false

  const nativeItem = findNativeBaseItem(doc, theme)
  if (!nativeItem) return false

  syncingNativeBase.add(doc)
  syncedNativeBase.set(doc, theme)

  getItemControl(nativeItem).click()

  window.setTimeout(() => {
    restoreCustomTheme(theme)

    window.requestAnimationFrame(() => {
      restoreCustomTheme(theme)
      syncingNativeBase.delete(doc)
    })
  }, 0)

  return true
}

function installStylesheets(doc: Document): boolean {
  if (!doc.head) return false

  const continuityReady = ensureStylesheet(
    doc,
    CONTINUITY_LINK_ID,
    './waltiva/themes/aurora-continuity.css?v=2',
  )
  const canvasReady = ensureStylesheet(
    doc,
    CANVAS_SURFACE_LINK_ID,
    './waltiva/themes/aurora-canvas-surface.css?v=1',
  )
  const scrollbarReady = ensureStylesheet(
    doc,
    SCROLLBAR_LINK_ID,
    './waltiva/themes/aurora-scrollbars.css?v=1',
  )
  const toolbarButtonsReady = ensureStylesheet(
    doc,
    TOOLBAR_BUTTONS_LINK_ID,
    './waltiva/themes/aurora-toolbar-buttons.css?v=2',
  )
  const panelCornersReady = ensureStylesheet(
    doc,
    PANEL_CORNERS_LINK_ID,
    './waltiva/themes/aurora-panel-corners.css?v=1',
  )
  const lightOverrideReady = ensureStylesheet(
    doc,
    LIGHT_OVERRIDE_LINK_ID,
    './waltiva/themes/aurora-light.css?v=1',
  )
  const lightFinalReady = ensureStylesheet(
    doc,
    LIGHT_FINAL_LINK_ID,
    './waltiva/themes/aurora-light-final.css?v=1',
    true,
  )
  const spreadsheetReady = isSpreadsheetDocument(doc)
    ? ensureStylesheet(
        doc,
        SPREADSHEET_LINK_ID,
        './waltiva/themes/aurora-spreadsheet.css?v=2',
        true,
      )
    : true

  return (
    continuityReady &&
    canvasReady &&
    scrollbarReady &&
    toolbarButtonsReady &&
    panelCornersReady &&
    lightOverrideReady &&
    lightFinalReady &&
    spreadsheetReady
  )
}

function syncDocument(doc: Document): void {
  installStylesheets(doc)
  syncNativeThemeBase(doc)

  ensureStylesheet(
    doc,
    LIGHT_FINAL_LINK_ID,
    './waltiva/themes/aurora-light-final.css?v=1',
    true,
  )

  if (isSpreadsheetDocument(doc)) {
    ensureStylesheet(
      doc,
      SPREADSHEET_LINK_ID,
      './waltiva/themes/aurora-spreadsheet.css?v=2',
      true,
    )
  }
}

function scheduleDocumentSync(doc: Document): void {
  if (documentRafIds.has(doc)) return

  const rafId = window.requestAnimationFrame(() => {
    documentRafIds.delete(doc)
    syncDocument(doc)
  })
  documentRafIds.set(doc, rafId)
}

function observeDocument(doc: Document): void {
  if (!doc.documentElement || documentObservers.has(doc)) return

  const observer = new MutationObserver(() => scheduleDocumentSync(doc))
  observer.observe(doc.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [WALTIVA_THEME_ATTRIBUTE, 'class'],
  })
  documentObservers.set(doc, observer)
}

function prepareFrame(frame: HTMLIFrameElement): boolean {
  try {
    const doc = frame.contentDocument
    if (!doc?.head || !doc.documentElement) return false

    observeDocument(doc)
    const stylesReady = installStylesheets(doc)
    const baseReady = syncNativeThemeBase(doc)
    return stylesReady && baseReady
  } catch {
    return false
  }
}

function startRetry(frame: HTMLIFrameElement): void {
  const previous = retryTimers.get(frame)
  if (previous !== undefined) window.clearInterval(previous)

  if (prepareFrame(frame)) return

  let attempts = 0
  const timer = window.setInterval(() => {
    attempts += 1
    if (prepareFrame(frame) || attempts >= 240) {
      window.clearInterval(timer)
      retryTimers.delete(frame)
    }
  }, 250)

  retryTimers.set(frame, timer)
}

function registerFrame(frame: HTMLIFrameElement): void {
  if (observedFrames.has(frame)) return
  observedFrames.add(frame)

  frame.addEventListener('load', () => startRetry(frame))
  startRetry(frame)
}

function scan(): void {
  document.querySelectorAll<HTMLIFrameElement>(FRAME_SELECTOR).forEach(registerFrame)
}

/**
 * Loads Waltiva's Aurora visual layers inside ONLYOFFICE's same-origin iframe.
 * Spreadsheet gets a dedicated canvas palette and deliberately avoids the
 * native-base click path used by Writer/PDF.
 */
export function initAuroraContinuityLayer(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  scan()

  const observer = new MutationObserver(scan)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
}
