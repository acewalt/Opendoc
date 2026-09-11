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
const AURORA_LABELS = new Set(['aurora dark'])

const AURORA_TOKENS: Record<string, string> = {
  'toolbar-header-document': '#242035',
  'toolbar-header-spreadsheet': '#242035',
  'toolbar-header-presentation': '#242035',
  'toolbar-header-pdf': '#242035',
  'toolbar-header-visio': '#242035',
  'background-normal': '#211e2f',
  'background-toolbar': '#272338',
  'background-toolbar-additional': '#302a44',
  'background-primary-dialog-button': '#8f82ef',
  'background-accent-button': '#8f82ef',
  'background-tab-underline': '#a89dff',
  'background-notification-popover': '#312c46',
  'background-notification-badge': '#8e80ec',
  'background-scrim': 'rgba(13, 10, 23, 0.8)',
  'background-loader': '#181522',
  'background-contrast-popover': '#211d31',
  'highlight-button-hover': '#39334f',
  'highlight-button-pressed': '#4a4168',
  'highlight-button-pressed-hover': '#554a78',
  'highlight-primary-dialog-button-hover': '#a093f8',
  'highlight-accent-button-hover': '#a093f8',
  'highlight-accent-button-pressed': '#7063d4',
  'highlight-header-button-hover': '#39334f',
  'highlight-header-button-pressed': '#4a4168',
  'highlight-header-tab-underline': '#b5aaff',
  'highlight-toolbar-tab-underline-document': '#a89dff',
  'highlight-toolbar-tab-underline-spreadsheet': '#a89dff',
  'highlight-toolbar-tab-underline-presentation': '#a89dff',
  'highlight-toolbar-tab-underline-pdf': '#a89dff',
  'highlight-toolbar-tab-underline-visio': '#a89dff',
  'highlight-text-select': '#4f4678',
  'border-toolbar': '#3c3650',
  'border-toolbar-active-panel-top': '#4b4465',
  'border-divider': '#39334c',
  'border-regular-control': '#4a435f',
  'border-toolbar-button-hover': '#5b5274',
  'border-preview-hover': '#70649d',
  'border-preview-select': '#9588f1',
  'border-control-focus': '#9f92f7',
  'border-color-shading': '#4d4662',
  'border-error': '#e47d97',
  'border-contrast-popover': '#4d4666',
  'text-normal': '#efecfa',
  'text-normal-pressed': '#ffffff',
  'text-secondary': '#bbb5cb',
  'text-tertiary': '#868095',
  'text-link': '#b9b1ff',
  'text-link-hover': '#d0caff',
  'text-link-active': '#9b8ff3',
  'text-inverse': '#ffffff',
  'text-toolbar-header': '#f5f2ff',
  'icon-normal': '#d7d1e7',
  'icon-normal-pressed': '#ffffff',
  'icon-inverse': '#ffffff',
  'icon-toolbar-header': '#f2effc',
  'icon-success': '#83cfb5',
  'canvas-background': '#15131f',
  'canvas-content-background': '#ffffff',
  'canvas-page-border': '#373149',
  'canvas-ruler-background': '#252138',
  'canvas-ruler-margins-background': '#1c1928',
  'canvas-ruler-mark': '#aaa4bd',
  'canvas-scroll-thumb': '#3b3550',
  'canvas-scroll-thumb-hover': '#544b70',
  'canvas-scroll-thumb-pressed': '#665b89',
  'canvas-scroll-thumb-border': '#29243a',
  'canvas-scroll-arrow': '#918aa5',
}

let initialized = false

function normalizeLabel(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
}

function readStoredTheme(): WaltivaThemeId | null {
  try {
    return window.localStorage.getItem(WALTIVA_THEME_STORAGE_KEY) === AURORA_DARK
      ? AURORA_DARK
      : null
  } catch {
    return null
  }
}

function saveStoredTheme(theme: WaltivaThemeId | null): void {
  try {
    if (theme === AURORA_DARK) {
      window.localStorage.setItem(WALTIVA_THEME_STORAGE_KEY, AURORA_DARK)
    } else {
      window.localStorage.removeItem(WALTIVA_THEME_STORAGE_KEY)
    }
  } catch {
    // localStorage can be unavailable in privacy-restricted contexts.
  }
}

function ensureAuroraStylesheet(doc: Document): void {
  if (!doc.head || doc.getElementById(THEME_STYLESHEET_ID)) return

  const link = doc.createElement('link')
  link.id = THEME_STYLESHEET_ID
  link.rel = 'stylesheet'
  link.href = new URL('./waltiva/themes/aurora-dark.css?v=4', document.baseURI).href
  doc.head.appendChild(link)
}

function setAuroraTokens(doc: Document, active: boolean): void {
  const targets = [doc.documentElement, doc.body].filter(Boolean) as HTMLElement[]

  targets.forEach((target) => {
    Object.entries(AURORA_TOKENS).forEach(([token, value]) => {
      const property = `--${token}`
      if (active) target.style.setProperty(property, value)
      else target.style.removeProperty(property)
    })
  })
}

function applyAurora(doc: Document, active: boolean): void {
  if (!doc.documentElement) return

  ensureAuroraStylesheet(doc)

  if (active) {
    doc.documentElement.setAttribute(WALTIVA_THEME_ATTRIBUTE, AURORA_DARK)
    doc.body?.classList.add('theme-aurora-dark', 'theme-type-dark')
  } else {
    doc.documentElement.removeAttribute(WALTIVA_THEME_ATTRIBUTE)
    doc.body?.classList.remove('theme-aurora-dark')
  }

  setAuroraTokens(doc, active)
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
  const builtInCount = labels.filter((label) => BUILT_IN_THEME_LABELS.has(label)).length
  return builtInCount >= 3 && labels.some((label) => CONTRAST_DARK_LABELS.has(label))
}

function replaceItemLabel(root: HTMLElement, nextLabel: string): void {
  const doc = root.ownerDocument
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()

  while (node) {
    const raw = node.nodeValue ?? ''
    const trimmed = raw.trim()
    const normalized = normalizeLabel(trimmed)

    if (CONTRAST_DARK_LABELS.has(normalized) || AURORA_LABELS.has(normalized)) {
      node.nodeValue = raw.replace(trimmed, nextLabel)
      return
    }

    node = walker.nextNode()
  }

  getItemControl(root).textContent = nextLabel
}

function stripDuplicateIds(root: HTMLElement): void {
  root.removeAttribute('id')
  root.querySelectorAll<HTMLElement>('[id]').forEach((element) => element.removeAttribute('id'))
}

function findAuroraItem(menu: Element): HTMLElement | null {
  return (
    getMenuItems(menu).find(
      (item) => item.getAttribute(CUSTOM_OPTION_ATTRIBUTE) === AURORA_DARK,
    ) ??
    getMenuItems(menu).find((item) => AURORA_LABELS.has(normalizeLabel(item.textContent))) ??
    null
  )
}

function updateThemeMenuState(menu: Element, active: boolean): void {
  const items = getMenuItems(menu)
  const auroraItem = findAuroraItem(menu)
  if (!auroraItem) return

  const auroraControl = getItemControl(auroraItem)
  auroraItem.classList.toggle('checked', active)
  auroraControl.classList.toggle('checked', active)
  auroraControl.setAttribute('aria-checked', active ? 'true' : 'false')

  if (!active) return

  items.forEach((item) => {
    if (item === auroraItem) return
    const control = getItemControl(item)
    item.classList.remove('checked', 'active', 'selected')
    control.classList.remove('checked', 'active', 'selected')
    control.setAttribute('aria-checked', 'false')
  })
}

function ensureAuroraMenuOption(menu: HTMLElement, active: boolean): void {
  if (!looksLikeThemeMenu(menu)) return

  let auroraItem = findAuroraItem(menu)
  if (auroraItem) {
    auroraItem.setAttribute(CUSTOM_OPTION_ATTRIBUTE, AURORA_DARK)
    replaceItemLabel(auroraItem, AURORA_DARK_LABEL)
    updateThemeMenuState(menu, active)
    return
  }

  const items = getMenuItems(menu)
  const contrastItem = items.find((item) =>
    CONTRAST_DARK_LABELS.has(normalizeLabel(item.textContent)),
  )
  if (!contrastItem) return

  auroraItem = contrastItem.cloneNode(true) as HTMLElement
  stripDuplicateIds(auroraItem)
  auroraItem.setAttribute(CUSTOM_OPTION_ATTRIBUTE, AURORA_DARK)
  auroraItem.classList.remove('checked', 'active', 'selected')

  const control = getItemControl(auroraItem)
  control.classList.remove('checked', 'active', 'selected')
  control.setAttribute('aria-checked', 'false')
  replaceItemLabel(auroraItem, AURORA_DARK_LABEL)

  contrastItem.insertAdjacentElement('afterend', auroraItem)
  updateThemeMenuState(menu, active)
}

function scanThemeMenus(doc: Document, active: boolean): void {
  doc.querySelectorAll<HTMLElement>('.dropdown-menu').forEach((menu) => {
    ensureAuroraMenuOption(menu, active)
  })
}

function stopOnlyOfficeHandling(event: Event): void {
  if (event.cancelable) event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

function closeDropdown(menu: Element): void {
  menu.closest('.open')?.classList.remove('open')
  menu.closest('.over')?.classList.remove('over')
}

function getEventTargetElement(event: Event): HTMLElement | null {
  const target = event.target as EventTarget | null
  if (!target || typeof (target as HTMLElement).closest !== 'function') return null
  return target as HTMLElement
}

export function initWaltivaThemeSystem(): () => void {
  if (initialized || typeof window === 'undefined' || typeof document === 'undefined') {
    return () => undefined
  }

  initialized = true
  let activeTheme = readStoredTheme()

  const attachedDocuments = new Set<Document>()
  const documentCleanups = new Map<Document, () => void>()
  const frameStates = new Map<
    HTMLIFrameElement,
    {
      connect: () => void
      currentDocument: Document | null
      retryId: number | null
    }
  >()

  const syncHost = (): void => {
    applyAurora(document, activeTheme === AURORA_DARK)
    saveStoredTheme(activeTheme)
  }

  const syncEverywhere = (): void => {
    syncHost()
    attachedDocuments.forEach((doc) => {
      applyAurora(doc, activeTheme === AURORA_DARK)
      scanThemeMenus(doc, activeTheme === AURORA_DARK)
    })
  }

  const setActiveTheme = (theme: WaltivaThemeId | null): void => {
    activeTheme = theme
    syncEverywhere()
  }

  syncHost()

  const attachDocument = (doc: Document): void => {
    if (!doc.documentElement || attachedDocuments.has(doc)) return

    attachedDocuments.add(doc)
    applyAurora(doc, activeTheme === AURORA_DARK)

    let rafPending = false
    const scheduleSync = (): void => {
      if (rafPending) return
      rafPending = true
      window.requestAnimationFrame(() => {
        rafPending = false
        applyAurora(doc, activeTheme === AURORA_DARK)
        scanThemeMenus(doc, activeTheme === AURORA_DARK)
      })
    }

    const observer = new MutationObserver(scheduleSync)
    observer.observe(doc.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    })

    const getAuroraContext = (event: Event): { item: HTMLElement; menu: HTMLElement } | null => {
      const target = getEventTargetElement(event)
      if (!target) return null

      const item = target.closest<HTMLElement>(`[${CUSTOM_OPTION_ATTRIBUTE}="${AURORA_DARK}"]`)
      if (!item) return null

      const menu = item.closest<HTMLElement>('.dropdown-menu')
      if (!menu || !looksLikeThemeMenu(menu)) return null
      return { item, menu }
    }

    const activateAurora = (event: Event, closeMenuAfter: boolean): boolean => {
      const context = getAuroraContext(event)
      if (!context) return false

      stopOnlyOfficeHandling(event)
      setActiveTheme(AURORA_DARK)
      updateThemeMenuState(context.menu, true)
      if (closeMenuAfter) closeDropdown(context.menu)
      return true
    }

    const onPointerDown = (event: PointerEvent): void => {
      activateAurora(event, false)
    }

    const onMouseDown = (event: MouseEvent): void => {
      activateAurora(event, false)
    }

    const onClick = (event: MouseEvent): void => {
      if (activateAurora(event, true)) return

      const target = getEventTargetElement(event)
      if (!target) return

      const item = target.closest<HTMLElement>('li')
      const menu = item?.closest<HTMLElement>('.dropdown-menu')
      if (!item || !menu || !looksLikeThemeMenu(menu)) return

      const label = normalizeLabel(item.textContent)
      if (BUILT_IN_THEME_LABELS.has(label)) {
        // Remove only the Waltiva overlay. The original ONLYOFFICE click continues normally.
        setActiveTheme(null)
      }
    }

    doc.addEventListener('pointerdown', onPointerDown, true)
    doc.addEventListener('mousedown', onMouseDown, true)
    doc.addEventListener('click', onClick, true)
    scheduleSync()

    const cleanup = (): void => {
      observer.disconnect()
      doc.removeEventListener('pointerdown', onPointerDown, true)
      doc.removeEventListener('mousedown', onMouseDown, true)
      doc.removeEventListener('click', onClick, true)
      attachedDocuments.delete(doc)
      documentCleanups.delete(doc)
    }

    documentCleanups.set(doc, cleanup)
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

        if (state.currentDocument) documentCleanups.get(state.currentDocument)?.()
        state.currentDocument = doc
        attachDocument(doc)

        if (state.retryId !== null) {
          window.clearInterval(state.retryId)
          state.retryId = null
        }
      } catch {
        // Same-origin local editor; retry while the iframe finishes navigating.
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

  const onStorage = (event: StorageEvent): void => {
    if (event.key !== WALTIVA_THEME_STORAGE_KEY) return
    activeTheme = event.newValue === AURORA_DARK ? AURORA_DARK : null
    syncEverywhere()
  }

  window.addEventListener('storage', onStorage)

  return () => {
    frameObserver.disconnect()
    window.removeEventListener('storage', onStorage)

    frameStates.forEach((state, frame) => {
      frame.removeEventListener('load', state.connect)
      if (state.retryId !== null) window.clearInterval(state.retryId)
      if (state.currentDocument) documentCleanups.get(state.currentDocument)?.()
    })

    Array.from(documentCleanups.values()).forEach((cleanup) => cleanup())
    frameStates.clear()
    attachedDocuments.clear()
    documentCleanups.clear()
    applyAurora(document, false)
    initialized = false
  }
}
