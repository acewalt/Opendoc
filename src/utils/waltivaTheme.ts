export const WALTIVA_THEME_ATTRIBUTE = 'data-waltiva-theme'
export const WALTIVA_THEME_STORAGE_KEY = 'waltiva.interface-theme'

export const WALTIVA_THEMES = [
  {
    id: 'aurora-dark',
    nativeId: 'theme-aurora-dark',
    label: 'Aurora Dark',
    kind: 'custom',
  },
] as const

export type WaltivaThemeId = (typeof WALTIVA_THEMES)[number]['id']

const AURORA_DARK: WaltivaThemeId = 'aurora-dark'
const AURORA_NATIVE_ID = 'theme-aurora-dark'
const THEME_STYLESHEET_ID = 'waltiva-aurora-dark-styles'
const EDITOR_FRAME_SELECTOR = 'iframe[name="frameEditor"], #iframe iframe'

let initialized = false

function ensureAuroraStylesheet(doc: Document): void {
  if (!doc.head || doc.getElementById(THEME_STYLESHEET_ID)) return

  const link = doc.createElement('link')
  link.id = THEME_STYLESHEET_ID
  link.rel = 'stylesheet'
  link.href = new URL('./waltiva/themes/aurora-dark.css', document.baseURI).href
  doc.head.appendChild(link)
}

function isAuroraActive(doc: Document): boolean {
  if (doc.body?.classList.contains(AURORA_NATIVE_ID)) return true

  try {
    const editorWindow = doc.defaultView as (Window & { uitheme?: { id?: string } }) | null
    return editorWindow?.uitheme?.id === AURORA_NATIVE_ID
  } catch {
    return false
  }
}

function setDocumentMirror(doc: Document, active: boolean): void {
  if (!doc.documentElement) return

  if (active) {
    doc.documentElement.setAttribute(WALTIVA_THEME_ATTRIBUTE, AURORA_DARK)
  } else {
    doc.documentElement.removeAttribute(WALTIVA_THEME_ATTRIBUTE)
  }
}

function saveHostMirror(active: boolean): void {
  if (active) {
    document.documentElement.setAttribute(WALTIVA_THEME_ATTRIBUTE, AURORA_DARK)
  } else {
    document.documentElement.removeAttribute(WALTIVA_THEME_ATTRIBUTE)
  }

  try {
    if (active) {
      window.localStorage.setItem(WALTIVA_THEME_STORAGE_KEY, AURORA_DARK)
    } else {
      window.localStorage.removeItem(WALTIVA_THEME_STORAGE_KEY)
    }
  } catch {
    // localStorage may be unavailable in privacy-restricted contexts.
  }
}

/**
 * ONLYOFFICE owns theme registration, selection and its native checkmark.
 * Waltiva only mirrors the native `theme-aurora-dark` state and layers the
 * optional gradient/glass CSS on top. No menu item is cloned or intercepted.
 */
export function initWaltivaThemeSystem(): () => void {
  if (initialized || typeof window === 'undefined' || typeof document === 'undefined') {
    return () => undefined
  }

  initialized = true

  const documentStates = new Map<
    Document,
    {
      active: boolean
      observer: MutationObserver
      pollId: number
    }
  >()

  const frameStates = new Map<
    HTMLIFrameElement,
    {
      connect: () => void
      currentDocument: Document | null
      retryId: number | null
    }
  >()

  const refreshHostState = (): void => {
    const active = Array.from(documentStates.values()).some((state) => state.active)
    saveHostMirror(active)
  }

  const attachDocument = (doc: Document): void => {
    if (!doc.documentElement || documentStates.has(doc)) return

    ensureAuroraStylesheet(doc)

    const sync = (): void => {
      const active = isAuroraActive(doc)
      const state = documentStates.get(doc)
      if (!state) return

      setDocumentMirror(doc, active)
      if (state.active !== active) {
        state.active = active
        refreshHostState()
      }
    }

    const observer = new MutationObserver(sync)
    observer.observe(doc.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true,
    })

    const pollId = window.setInterval(sync, 400)
    documentStates.set(doc, { active: false, observer, pollId })
    sync()
  }

  const detachDocument = (doc: Document): void => {
    const state = documentStates.get(doc)
    if (!state) return

    state.observer.disconnect()
    window.clearInterval(state.pollId)
    documentStates.delete(doc)
    refreshHostState()
  }

  const registerFrame = (frame: HTMLIFrameElement): void => {
    if (frameStates.has(frame)) return

    const state = {
      connect: () => undefined,
      currentDocument: null as Document | null,
      retryId: null as number | null,
    }

    state.connect = (): void => {
      try {
        const doc = frame.contentDocument
        if (!doc?.documentElement || state.currentDocument === doc) return

        if (state.currentDocument) detachDocument(state.currentDocument)
        state.currentDocument = doc
        attachDocument(doc)

        if (state.retryId !== null) {
          window.clearInterval(state.retryId)
          state.retryId = null
        }
      } catch {
        // The local editor is same-origin; retry while its iframe is navigating.
      }
    }

    frame.addEventListener('load', state.connect)
    state.connect()

    if (!state.currentDocument) {
      let attempts = 0
      state.retryId = window.setInterval(() => {
        attempts += 1
        state.connect()
        if (attempts >= 60 && state.retryId !== null) {
          window.clearInterval(state.retryId)
          state.retryId = null
        }
      }, 250)
    }

    frameStates.set(frame, state)
  }

  const scanFrames = (): void => {
    document.querySelectorAll<HTMLIFrameElement>(EDITOR_FRAME_SELECTOR).forEach(registerFrame)
  }

  const frameObserver = new MutationObserver(scanFrames)
  frameObserver.observe(document.documentElement, { childList: true, subtree: true })
  scanFrames()

  return () => {
    frameObserver.disconnect()

    frameStates.forEach((state, frame) => {
      frame.removeEventListener('load', state.connect)
      if (state.retryId !== null) window.clearInterval(state.retryId)
      if (state.currentDocument) detachDocument(state.currentDocument)
    })

    documentStates.forEach((state) => {
      state.observer.disconnect()
      window.clearInterval(state.pollId)
    })

    frameStates.clear()
    documentStates.clear()
    saveHostMirror(false)
    initialized = false
  }
}
