const FRAME_SELECTOR = [
  'iframe[name="frameEditor"]',
  '#iframe iframe',
  'iframe[src*="/web-apps/apps/documenteditor/"]',
].join(', ')

const CONTINUITY_LINK_ID = 'waltiva-aurora-continuity-styles'
const CANVAS_SURFACE_LINK_ID = 'waltiva-aurora-canvas-surface-styles'
const SCROLLBAR_LINK_ID = 'waltiva-aurora-scrollbar-styles'
const TOOLBAR_BUTTONS_LINK_ID = 'waltiva-aurora-toolbar-buttons-styles'
const PANEL_CORNERS_LINK_ID = 'waltiva-aurora-panel-corners-styles'
const observedFrames = new WeakSet<HTMLIFrameElement>()
const retryTimers = new WeakMap<HTMLIFrameElement, number>()

function getStylesheetUrl(path: string): string {
  return new URL(path, document.baseURI).href
}

function ensureStylesheet(doc: Document, id: string, path: string): boolean {
  if (!doc.head) return false

  const href = getStylesheetUrl(path)
  const existing = doc.getElementById(id) as HTMLLinkElement | null
  if (existing) {
    if (existing.href !== href) existing.href = href
    return true
  }

  const link = doc.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = href
  doc.head.appendChild(link)
  return true
}

function installStylesheets(frame: HTMLIFrameElement): boolean {
  try {
    const doc = frame.contentDocument
    if (!doc?.head) return false

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

    return (
      continuityReady &&
      canvasReady &&
      scrollbarReady &&
      toolbarButtonsReady &&
      panelCornersReady
    )
  } catch {
    return false
  }
}

function startRetry(frame: HTMLIFrameElement): void {
  const previous = retryTimers.get(frame)
  if (previous !== undefined) window.clearInterval(previous)

  if (installStylesheets(frame)) return

  let attempts = 0
  const timer = window.setInterval(() => {
    attempts += 1
    if (installStylesheets(frame) || attempts >= 240) {
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
 * Loads the Aurora Dark visual layers inside ONLYOFFICE's same-origin iframe.
 * The continuity stylesheet carries the general skin, the canvas layer fixes
 * concrete workspace colours, the scrollbar layer keeps scrolling surfaces
 * consistent, the toolbar-button layer flattens native command tiles into the
 * Aurora ribbon, and the panel-corner layer keeps Search/Replace consistent
 * with the rounded left-side panels. All layers are inert unless Aurora Dark
 * is active.
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
