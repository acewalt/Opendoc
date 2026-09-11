const FRAME_SELECTOR = [
  'iframe[name="frameEditor"]',
  '#iframe iframe',
  'iframe[src*="/web-apps/apps/documenteditor/"]',
].join(', ')

const LINK_ID = 'waltiva-aurora-continuity-styles'
const observedFrames = new WeakSet<HTMLIFrameElement>()
const retryTimers = new WeakMap<HTMLIFrameElement, number>()

function getStylesheetUrl(): string {
  return new URL('./waltiva/themes/aurora-continuity.css?v=1', document.baseURI).href
}

function installStylesheet(frame: HTMLIFrameElement): boolean {
  try {
    const doc = frame.contentDocument
    if (!doc?.head) return false

    const existing = doc.getElementById(LINK_ID) as HTMLLinkElement | null
    if (existing) {
      const href = getStylesheetUrl()
      if (existing.href !== href) existing.href = href
      return true
    }

    const link = doc.createElement('link')
    link.id = LINK_ID
    link.rel = 'stylesheet'
    link.href = getStylesheetUrl()
    doc.head.appendChild(link)
    return true
  } catch {
    return false
  }
}

function startRetry(frame: HTMLIFrameElement): void {
  const previous = retryTimers.get(frame)
  if (previous !== undefined) window.clearInterval(previous)

  if (installStylesheet(frame)) return

  let attempts = 0
  const timer = window.setInterval(() => {
    attempts += 1
    if (installStylesheet(frame) || attempts >= 240) {
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
 * Loads the second Aurora Dark stylesheet inside ONLYOFFICE's same-origin iframe.
 * The file contains only visual overrides and is inert unless Aurora Dark is active.
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
