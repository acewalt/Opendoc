export const WALTIVA_THEME_ATTRIBUTE = 'data-waltiva-theme'
export const WALTIVA_THEME_STORAGE_KEY = 'waltiva.interface-theme'

export const WALTIVA_THEMES = [
  {
    id: 'aurora-dark',
    label: 'Aurora Dark',
    kind: 'custom',
  },
] as const

export type WaltivaThemeId = (typeof WALTIVA_THEMES)[number]['id']

const AURORA_DARK: WaltivaThemeId = 'aurora-dark'
const AURORA_DARK_LABEL = 'Aurora Dark'
const THEME_STYLESHEET_ID = 'waltiva-aurora-dark-styles'
const CUSTOM_OPTION_ATTRIBUTE = 'data-waltiva-theme-option'
const EDITOR_FRAME_SELECTOR = 'iframe[name="frameEditor"], #iframe iframe'

const BUILT_IN_THEME_LABELS = new Set([
  'igual que el sistema',
  'claro',
  'clásico claro',
  'clasico claro',
  'oscuro',
  'contraste oscuro',
  'same as system',
  'light',
  'classic light',
  'dark',
  'contrast dark',
])

const CONTRAST_DARK_LABELS = new Set(['contraste oscuro', 'contrast dark'])

let initialized = false

function normalizeLabel(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
}

function isWaltivaThemeId(value: string | null): value is WaltivaThemeId {
  return WALTIVA_THEMES.some((theme) => theme.id === value)
}

function readStoredTheme(): WaltivaThemeId | null {
  try {
    const value = window.localStorage.getItem(WALTIVA_THEME_STORAGE_KEY)
    return isWaltivaThemeId(value) ? value : null
  } catch {
    return null
  }
}

function saveStoredTheme(theme: WaltivaThemeId | null): void {
  try {
    if (theme) {
      window.localStorage.setItem(WALTIVA_THEME_STORAGE_KEY, theme)
    } else {
      window.localStorage.removeItem(WALTIVA_THEME_STORAGE_KEY)
    }
  } catch {
    // Storage can be unavailable in privacy-restricted contexts.
  }
}

function applyThemeAttribute(doc: Document, theme: WaltivaThemeId | null): void {
  if (!doc.documentElement) return

  if (theme) {
    doc.documentElement.setAttribute(WALTIVA_THEME_ATTRIBUTE, theme)
  } else {
    doc.documentElement.removeAttribute(WALTIVA_THEME_ATTRIBUTE)
  }
}

function ensureAuroraStylesheet(doc: Document): void {
  if (!doc.head || doc.getElementById(THEME_STYLESHEET_ID)) return

  const link = doc.createElement('link')
  link.id = THEME_STYLESHEET_ID
  link.rel = 'stylesheet'
  link.href = new URL('waltiva/themes/aurora-dark.css', document.baseURI).href
  doc.head.appendChild(link)
}

function getMenuItems(menu: Element): HTMLElement[] {
  return Array.from(menu.querySelectorAll<HTMLElement>('li')).filter(
    (item) => item.closest('.dropdown-menu') === menu,
  )
}

function getItemControl(item: HTMLElement): HTMLElement {
  return item.querySelector<HTMLElement>('a, button, [role="menuitem"]') ?? item
}

function looksLikeThemeMenu(menu: Element): boolean {
  const labels = getMenuItems(menu).map((item) => normalizeLabel(item.textContent))
  const knownCount = labels.filter((label) => BUILT_IN_THEME_LABELS.has(label)).length

  return knownCount >= 3 && labels.some((label) => CONTRAST_DARK_LABELS.has(label))
}

function replaceContrastLabel(root: HTMLElement): void {
  const doc = root.ownerDocument
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()

  while (node) {
    const raw = node.nodeValue ?? ''
    const trimmed = raw.trim()

    if (CONTRAST_DARK_LABELS.has(normalizeLabel(trimmed))) {
      node.nodeValue = raw.replace(trimmed, AURORA_DARK_LABEL)
      return
    }

    node = walker.nextNode()
  }

  getItemControl(root).textContent = AURORA_DARK_LABEL
}

function stripDuplicateIds(root: HTMLElement): void {
  root.removeAttribute('id')
  root.querySelectorAll<HTMLElement>('[id]').forEach((element) => element.removeAttribute('id'))
}

function updateThemeMenuState(menu: Element, activeTheme: WaltivaThemeId | null): void {
  const items = getMenuItems(menu)
  const customItem = items.find(
    (item) => item.getAttribute(CUSTOM_OPTION_ATTRIBUTE) === AURORA_DARK,
  )

  if (!customItem) return

  const customControl = getItemControl(customItem)
  customItem.classList.toggle('checked', activeTheme === AURORA_DARK)
  customControl.classList.toggle('checked', activeTheme === AURORA_DARK)
  customControl.setAttribute('aria-checked', activeTheme === AURORA_DARK ? 'true' : 'false')

  if (activeTheme !== AURORA_DARK) return

  items.forEach((item) => {
    if (item === customItem) return
    const control = getItemControl(item)
    item.classList.remove('checked')
    control.classList.remove('checked')
    control.setAttribute('aria-checked', 'false')
  })
}

function ensureAuroraMenuOption(menu: HTMLElement, activeTheme: WaltivaThemeId | null): void {
  if (!looksLikeThemeMenu(menu)) return

  const items = getMenuItems(menu)
  let customItem = items.find(
    (item) => item.getAttribute(CUSTOM_OPTION_ATTRIBUTE) === AURORA_DARK,
  )

  if (!customItem) {
    const contrastItem = items.find((item) =>
      CONTRAST_DARK_LABELS.has(normalizeLabel(item.textContent)),
    )

    if (!contrastItem) return

    customItem = contrastItem.cloneNode(true) as HTMLElement
    stripDuplicateIds(customItem)
    customItem.setAttribute(CUSTOM_OPTION_ATTRIBUTE, AURORA_DARK)
    customItem.classList.remove('checked', 'active', 'selected')

    const customControl = getItemControl(customItem)
    customControl.classList.remove('checked', 'active', 'selected')
    customControl.setAttribute('aria-checked', 'false')
    replaceContrastLabel(customItem)

    contrastItem.insertAdjacentElement('afterend', customItem)
  }

  updateThemeMenuState(menu, activeTheme)
}

function scanThemeMenus(doc: Document, activeTheme: WaltivaThemeId | null): void {
  doc.querySelectorAll<HTMLElement>('.dropdown-menu').forEach((menu) => {
    ensureAuroraMenuOption(menu, activeTheme)
  })
}

function closeDropdown(menu: Element): void {
  const openContainer = menu.closest('.open')
  openContainer?.classList.remove('open')

  const visibleContainer = menu.closest('.over')
  visibleContainer?.classList.remove('over')
}

export function initWaltivaThemeSystem(): () => void {
  if (initialized || typeof window === 'undefined' || typeof document === 'undefined') {
    return () => undefined
  }

  initialized = true
  let activeTheme = readStoredTheme()
  const attachedDocuments = new Set<Document>()
  const frameStates = new Map<
    HTMLIFrameElement,
    {
      connect: () => void
      cleanupDocument: (() => void) | null
      currentDocument: Document | null
      retryId: number | null
    }
  >()

  const syncThemeEverywhere = (theme: WaltivaThemeId | null): void => {
    activeTheme = theme
    saveStoredTheme(theme)
    applyThemeAttribute(document, theme)

    attachedDocuments.forEach((doc) => {
      applyThemeAttribute(doc, theme)
      scanThemeMenus(doc, theme)
    })
  }

  applyThemeAttribute(document, activeTheme)

  const attachDocument = (doc: Document): (() => void) => {
    if (!doc.documentElement) return () => undefined

    attachedDocuments.add(doc)
    ensureAuroraStylesheet(doc)
    applyThemeAttribute(doc, activeTheme)

    let scanPending = false
    const scheduleMenuScan = (): void => {
      if (scanPending) return
      scanPending = true

      window.requestAnimationFrame(() => {
        scanPending = false
        scanThemeMenus(doc, activeTheme)
      })
    }

    const observer = new MutationObserver(scheduleMenuScan)
    observer.observe(doc.documentElement, { childList: true, subtree: true })

    const onClick = (event: MouseEvent): void => {
      const target = event.target instanceof Element ? event.target : null
      if (!target) return

      const customItem = target.closest<HTMLElement>(
        `[${CUSTOM_OPTION_ATTRIBUTE}="${AURORA_DARK}"]`,
      )

      if (customItem) {
        const menu = customItem.closest<HTMLElement>('.dropdown-menu')
        if (!menu || !looksLikeThemeMenu(menu)) return

        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
        syncThemeEverywhere(AURORA_DARK)
        updateThemeMenuState(menu, AURORA_DARK)
        closeDropdown(menu)
        return
      }

      const item = target.closest<HTMLElement>('li')
      const menu = item?.closest<HTMLElement>('.dropdown-menu')
      if (!item || !menu || !looksLikeThemeMenu(menu)) return

      const label = normalizeLabel(item.textContent)
      if (BUILT_IN_THEME_LABELS.has(label)) {
        // OnlyOffice keeps ownership of all built-in themes. Waltiva only removes its overlay.
        syncThemeEverywhere(null)
      }
    }

    doc.addEventListener('click', onClick, true)
    scheduleMenuScan()

    return () => {
      observer.disconnect()
      doc.removeEventListener('click', onClick, true)
      attachedDocuments.delete(doc)
    }
  }

  const registerFrame = (frame: HTMLIFrameElement): void => {
    if (frameStates.has(frame)) return

    const state = {
      connect: () => undefined,
      cleanupDocument: null as (() => void) | null,
      currentDocument: null as Document | null,
      retryId: null as number | null,
    }

    state.connect = (): void => {
      try {
        const doc = frame.contentDocument
        if (!doc?.documentElement || state.currentDocument === doc) return

        state.cleanupDocument?.()
        state.currentDocument = doc
        state.cleanupDocument = attachDocument(doc)

        if (state.retryId !== null) {
          window.clearInterval(state.retryId)
          state.retryId = null
        }
      } catch {
        // The editor is expected to be same-origin. If it is still navigating, the load event retries.
      }
    }

    frame.addEventListener('load', state.connect)
    state.connect()

    if (!state.currentDocument) {
      let attempts = 0
      state.retryId = window.setInterval(() => {
        attempts += 1
        state.connect()

        if (attempts >= 40 && state.retryId !== null) {
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

  const onStorage = (event: StorageEvent): void => {
    if (event.key !== WALTIVA_THEME_STORAGE_KEY) return
    const nextTheme = isWaltivaThemeId(event.newValue) ? event.newValue : null
    activeTheme = nextTheme
    applyThemeAttribute(document, nextTheme)
    attachedDocuments.forEach((doc) => {
      applyThemeAttribute(doc, nextTheme)
      scanThemeMenus(doc, nextTheme)
    })
  }

  window.addEventListener('storage', onStorage)

  return () => {
    frameObserver.disconnect()
    window.removeEventListener('storage', onStorage)

    frameStates.forEach((state, frame) => {
      frame.removeEventListener('load', state.connect)
      state.cleanupDocument?.()
      if (state.retryId !== null) window.clearInterval(state.retryId)
    })

    frameStates.clear()
    attachedDocuments.clear()
    initialized = false
  }
}
