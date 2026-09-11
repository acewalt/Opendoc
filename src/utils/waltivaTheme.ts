export const WALTIVA_THEME_ATTRIBUTE = 'data-waltiva-theme'
export const WALTIVA_THEME_STORAGE_KEY = 'waltiva.interface-theme'

export const WALTIVA_THEMES = [
  {
    id: 'aurora-dark',
    label: 'Aurora Dark',
    kind: 'custom',
  },
  {
    id: 'aurora-light',
    label: 'Aurora Light',
    kind: 'custom',
  },
] as const

export type WaltivaThemeId = (typeof WALTIVA_THEMES)[number]['id']

const AURORA_DARK: WaltivaThemeId = 'aurora-dark'
const AURORA_LIGHT: WaltivaThemeId = 'aurora-light'
const CUSTOM_OPTION_ATTRIBUTE = 'data-waltiva-theme-option'
const EDITOR_FRAME_SELECTOR = 'iframe[name="frameEditor"], #iframe iframe'

const THEME_STYLESHEETS = [
  {
    id: 'waltiva-aurora-dark-styles',
    path: './waltiva/themes/aurora-dark.css?v=4',
  },
  {
    id: 'waltiva-aurora-light-base-styles',
    path: './waltiva/themes/aurora-light.css?v=1',
  },
] as const

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

const AURORA_DARK_TOKENS: Record<string, string> = {
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

const AURORA_LIGHT_TOKENS: Record<string, string> = {
  'toolbar-header-document': '#f7f7f7',
  'toolbar-header-spreadsheet': '#f7f7f7',
  'toolbar-header-presentation': '#f7f7f7',
  'toolbar-header-pdf': '#f7f7f7',
  'toolbar-header-visio': '#f7f7f7',
  'background-normal': '#f7f7f7',
  'background-toolbar': '#f7f7f7',
  'background-toolbar-additional': '#efefef',
  'background-primary-dialog-button': '#e2e2e2',
  'background-accent-button': '#e2e2e2',
  'background-tab-underline': '#7b6a9d',
  'background-notification-popover': '#ffffff',
  'background-notification-badge': '#7b6a9d',
  'background-scrim': 'rgba(55, 55, 55, 0.22)',
  'background-loader': '#f3f3f3',
  'background-contrast-popover': '#ffffff',
  'highlight-button-hover': '#e9e9e9',
  'highlight-button-pressed': '#dedede',
  'highlight-button-pressed-hover': '#d7d7d7',
  'highlight-primary-dialog-button-hover': '#d9d9d9',
  'highlight-accent-button-hover': '#d9d9d9',
  'highlight-accent-button-pressed': '#cecece',
  'highlight-header-button-hover': '#ededed',
  'highlight-header-button-pressed': '#e1e1e1',
  'highlight-header-tab-underline': '#75638f',
  'highlight-toolbar-tab-underline-document': '#75638f',
  'highlight-toolbar-tab-underline-spreadsheet': '#75638f',
  'highlight-toolbar-tab-underline-presentation': '#75638f',
  'highlight-toolbar-tab-underline-pdf': '#75638f',
  'highlight-toolbar-tab-underline-visio': '#75638f',
  'highlight-text-select': 'rgba(120, 102, 153, 0.22)',
  'border-toolbar': '#dfdfdf',
  'border-toolbar-active-panel-top': '#d8d8d8',
  'border-divider': '#e0e0e0',
  'border-regular-control': '#d4d4d4',
  'border-toolbar-button-hover': '#d2d2d2',
  'border-preview-hover': '#b9b0c7',
  'border-preview-select': '#85739e',
  'border-control-focus': '#8b78a6',
  'border-color-shading': '#dadada',
  'border-error': '#d85a62',
  'border-contrast-popover': '#d9d9d9',
  'text-normal': '#2f2f2f',
  'text-normal-pressed': '#202020',
  'text-secondary': '#6d6d6d',
  'text-tertiary': '#9a9a9a',
  'text-link': '#66557f',
  'text-link-hover': '#4e3d69',
  'text-link-active': '#7a6991',
  'text-inverse': '#ffffff',
  'text-toolbar-header': '#2e2e2e',
  'icon-normal': '#606060',
  'icon-normal-pressed': '#343434',
  'icon-inverse': '#ffffff',
  'icon-toolbar-header': '#555555',
  'icon-success': '#5b876f',
  'canvas-background': '#efefef',
  'canvas-content-background': '#ffffff',
  'canvas-page-border': '#d4d4d4',
  'canvas-ruler-background': '#f7f7f7',
  'canvas-ruler-margins-background': '#efefef',
  'canvas-ruler-mark': '#777777',
  'canvas-scroll-thumb': '#c8c8c8',
  'canvas-scroll-thumb-hover': '#b8b8b8',
  'canvas-scroll-thumb-pressed': '#a9a9a9',
  'canvas-scroll-thumb-border': '#ededed',
  'canvas-scroll-arrow': '#777777',
}

const THEME_TOKENS: Record<WaltivaThemeId, Record<string, string>> = {
  [AURORA_DARK]: AURORA_DARK_TOKENS,
  [AURORA_LIGHT]: AURORA_LIGHT_TOKENS,
}

const ALL_CUSTOM_TOKEN_NAMES = Array.from(
  new Set(Object.values(THEME_TOKENS).flatMap((tokens) => Object.keys(tokens))),
)

let initialized = false

function normalizeLabel(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
}

const CUSTOM_LABEL_TO_ID = new Map<string, WaltivaThemeId>(
  WALTIVA_THEMES.map((theme) => [normalizeLabel(theme.label), theme.id]),
)

function parseTheme(value: string | null | undefined): WaltivaThemeId | null {
  return WALTIVA_THEMES.some((theme) => theme.id === value)
    ? (value as WaltivaThemeId)
    : null
}

function readStoredTheme(): WaltivaThemeId | null {
  try {
    return parseTheme(window.localStorage.getItem(WALTIVA_THEME_STORAGE_KEY))
  } catch {
    return null
  }
}

function saveStoredTheme(theme: WaltivaThemeId | null): void {
  try {
    if (theme) window.localStorage.setItem(WALTIVA_THEME_STORAGE_KEY, theme)
    else window.localStorage.removeItem(WALTIVA_THEME_STORAGE_KEY)
  } catch {
    // localStorage can be unavailable in privacy-restricted contexts.
  }
}

function ensureThemeStylesheets(doc: Document): void {
  if (!doc.head) return

  THEME_STYLESHEETS.forEach(({ id, path }) => {
    const href = new URL(path, document.baseURI).href
    const existing = doc.getElementById(id) as HTMLLinkElement | null
    if (existing) {
      if (existing.href !== href) existing.href = href
      return
    }

    const link = doc.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = href
    doc.head.appendChild(link)
  })
}

function setThemeTokens(doc: Document, theme: WaltivaThemeId | null): void {
  const targets = [doc.documentElement, doc.body].filter(Boolean) as HTMLElement[]

  targets.forEach((target) => {
    ALL_CUSTOM_TOKEN_NAMES.forEach((token) => target.style.removeProperty(`--${token}`))

    if (!theme) return
    Object.entries(THEME_TOKENS[theme]).forEach(([token, value]) => {
      // The native editor declares several theme tokens with !important.
      target.style.setProperty(`--${token}`, value, 'important')
    })
  })
}

function applyAurora(doc: Document, theme: WaltivaThemeId | null): void {
  if (!doc.documentElement) return

  ensureThemeStylesheets(doc)

  doc.body?.classList.remove('theme-aurora-dark', 'theme-aurora-light')

  if (theme === AURORA_DARK) {
    doc.documentElement.setAttribute(WALTIVA_THEME_ATTRIBUTE, AURORA_DARK)
    doc.body?.classList.add('theme-aurora-dark', 'theme-type-dark')
  } else if (theme === AURORA_LIGHT) {
    doc.documentElement.setAttribute(WALTIVA_THEME_ATTRIBUTE, AURORA_LIGHT)
    // Reuse every Aurora geometry rule, then let the light marker recolour it.
    doc.body?.classList.add('theme-aurora-dark', 'theme-aurora-light')
    doc.body?.classList.remove('theme-type-dark')
  } else {
    doc.documentElement.removeAttribute(WALTIVA_THEME_ATTRIBUTE)
    // If the custom dark variant added this marker, the native theme handler
    // can restore it immediately when a built-in dark option is selected.
    doc.body?.classList.remove('theme-type-dark')
  }

  setThemeTokens(doc, theme)
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

    if (CONTRAST_DARK_LABELS.has(normalized) || CUSTOM_LABEL_TO_ID.has(normalized)) {
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

function findCustomItem(menu: Element, theme: WaltivaThemeId): HTMLElement | null {
  const definition = WALTIVA_THEMES.find((candidate) => candidate.id === theme)
  const normalizedLabel = normalizeLabel(definition?.label)

  return (
    getMenuItems(menu).find(
      (item) => item.getAttribute(CUSTOM_OPTION_ATTRIBUTE) === theme,
    ) ??
    getMenuItems(menu).find((item) => normalizeLabel(item.textContent) === normalizedLabel) ??
    null
  )
}

function updateThemeMenuState(menu: Element, activeTheme: WaltivaThemeId | null): void {
  const items = getMenuItems(menu)

  WALTIVA_THEMES.forEach((theme) => {
    const item = findCustomItem(menu, theme.id)
    if (!item) return

    const active = activeTheme === theme.id
    const control = getItemControl(item)
    item.classList.toggle('checked', active)
    control.classList.toggle('checked', active)
    control.setAttribute('aria-checked', active ? 'true' : 'false')
  })

  if (!activeTheme) return

  items.forEach((item) => {
    if (item.getAttribute(CUSTOM_OPTION_ATTRIBUTE) === activeTheme) return
    const control = getItemControl(item)
    item.classList.remove('checked', 'active', 'selected')
    control.classList.remove('checked', 'active', 'selected')
    control.setAttribute('aria-checked', 'false')
  })
}

function ensureCustomThemeOptions(menu: HTMLElement, activeTheme: WaltivaThemeId | null): void {
  if (!looksLikeThemeMenu(menu)) return

  const items = getMenuItems(menu)
  const contrastItem = items.find((item) =>
    CONTRAST_DARK_LABELS.has(normalizeLabel(item.textContent)),
  )
  if (!contrastItem) return

  let insertionAnchor: HTMLElement = contrastItem

  WALTIVA_THEMES.forEach((theme) => {
    let item = findCustomItem(menu, theme.id)

    if (!item) {
      item = contrastItem.cloneNode(true) as HTMLElement
      stripDuplicateIds(item)
      item.classList.remove('checked', 'active', 'selected')

      const control = getItemControl(item)
      control.classList.remove('checked', 'active', 'selected')
      control.setAttribute('aria-checked', 'false')
      replaceItemLabel(item, theme.label)

      insertionAnchor.insertAdjacentElement('afterend', item)
    } else {
      replaceItemLabel(item, theme.label)
    }

    item.setAttribute(CUSTOM_OPTION_ATTRIBUTE, theme.id)
    insertionAnchor = item
  })

  updateThemeMenuState(menu, activeTheme)
}

function scanThemeMenus(doc: Document, activeTheme: WaltivaThemeId | null): void {
  doc.querySelectorAll<HTMLElement>('.dropdown-menu').forEach((menu) => {
    ensureCustomThemeOptions(menu, activeTheme)
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
    applyAurora(document, activeTheme)
    saveStoredTheme(activeTheme)
  }

  const syncEverywhere = (): void => {
    syncHost()
    attachedDocuments.forEach((doc) => {
      applyAurora(doc, activeTheme)
      scanThemeMenus(doc, activeTheme)
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
    applyAurora(doc, activeTheme)

    let rafPending = false
    const scheduleSync = (): void => {
      if (rafPending) return
      rafPending = true
      window.requestAnimationFrame(() => {
        rafPending = false
        applyAurora(doc, activeTheme)
        scanThemeMenus(doc, activeTheme)
      })
    }

    const observer = new MutationObserver(scheduleSync)
    observer.observe(doc.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    })

    const getCustomThemeContext = (
      event: Event,
    ): { item: HTMLElement; menu: HTMLElement; theme: WaltivaThemeId } | null => {
      const target = getEventTargetElement(event)
      if (!target) return null

      const item = target.closest<HTMLElement>(`[${CUSTOM_OPTION_ATTRIBUTE}]`)
      if (!item) return null

      const theme = parseTheme(item.getAttribute(CUSTOM_OPTION_ATTRIBUTE))
      if (!theme) return null

      const menu = item.closest<HTMLElement>('.dropdown-menu')
      if (!menu || !looksLikeThemeMenu(menu)) return null
      return { item, menu, theme }
    }

    const activateCustomTheme = (event: Event, closeMenuAfter: boolean): boolean => {
      const context = getCustomThemeContext(event)
      if (!context) return false

      stopOnlyOfficeHandling(event)
      setActiveTheme(context.theme)
      updateThemeMenuState(context.menu, context.theme)
      if (closeMenuAfter) closeDropdown(context.menu)
      return true
    }

    const onPointerDown = (event: PointerEvent): void => {
      activateCustomTheme(event, false)
    }

    const onMouseDown = (event: MouseEvent): void => {
      activateCustomTheme(event, false)
    }

    const onClick = (event: MouseEvent): void => {
      if (activateCustomTheme(event, true)) return

      const target = getEventTargetElement(event)
      if (!target) return

      const item = target.closest<HTMLElement>('li')
      const menu = item?.closest<HTMLElement>('.dropdown-menu')
      if (!item || !menu || !looksLikeThemeMenu(menu)) return

      const label = normalizeLabel(item.textContent)
      if (BUILT_IN_THEME_LABELS.has(label)) {
        // Remove only Waltiva's overlay; ONLYOFFICE still handles its own click.
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
    activeTheme = parseTheme(event.newValue)
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
    applyAurora(document, null)
    initialized = false
  }
}
