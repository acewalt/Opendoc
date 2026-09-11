type AnyObject = Record<string, any>

const FRAME_SELECTOR = [
  'iframe[name="frameEditor"]',
  '#iframe iframe',
  'iframe[src*="/web-apps/apps/documenteditor/"]',
].join(', ')

const registeredFrames = new WeakSet<HTMLIFrameElement>()
const probeTimers = new WeakMap<HTMLIFrameElement, number>()

const PATCHED_MENU = '__waltivaSmartArtMenuPatched'
const PATCHED_ITEM = '__waltivaSmartArtItemPatched'
const PREVIEW_FALLBACK = '__waltivaSmartArtPreviewFallback'
const VISUAL_FIX_STYLE_ID = 'waltiva-editor-compatibility-style'

const VISUAL_FIX_CSS = `
/* Aurora Dark: the font preview sprite is dark and needs a light surface. */
html[data-waltiva-theme='aurora-dark'] #slot-field-fontname .dropdown-menu,
body.theme-aurora-dark #slot-field-fontname .dropdown-menu,
html[data-waltiva-theme='aurora-dark'] #slot-field-fontname .scrollable-menu,
body.theme-aurora-dark #slot-field-fontname .scrollable-menu {
  color: #24212b !important;
  background: #fbfbfd !important;
  background-image: none !important;
  border-color: rgba(35, 31, 45, .18) !important;
  box-shadow: 0 16px 38px rgba(7, 7, 12, .34) !important;
}

html[data-waltiva-theme='aurora-dark'] #slot-field-fontname .dropdown-menu > li,
body.theme-aurora-dark #slot-field-fontname .dropdown-menu > li,
html[data-waltiva-theme='aurora-dark'] #slot-field-fontname .dropdown-menu > li > a,
body.theme-aurora-dark #slot-field-fontname .dropdown-menu > li > a {
  color: #24212b !important;
  background-color: #fbfbfd !important;
}

html[data-waltiva-theme='aurora-dark'] #slot-field-fontname .dropdown-menu > li > a:hover,
html[data-waltiva-theme='aurora-dark'] #slot-field-fontname .dropdown-menu > li.active > a,
html[data-waltiva-theme='aurora-dark'] #slot-field-fontname .dropdown-menu > li.selected > a,
body.theme-aurora-dark #slot-field-fontname .dropdown-menu > li > a:hover,
body.theme-aurora-dark #slot-field-fontname .dropdown-menu > li.active > a,
body.theme-aurora-dark #slot-field-fontname .dropdown-menu > li.selected > a {
  color: #1f1b29 !important;
  background: #eeeafd !important;
}

html[data-waltiva-theme='aurora-dark'] #slot-field-fontname .dropdown-menu .divider,
body.theme-aurora-dark #slot-field-fontname .dropdown-menu .divider {
  border-color: rgba(42, 37, 52, .12) !important;
}
`

function getFrameWindow(frame: HTMLIFrameElement): AnyObject | null {
  try {
    return frame.contentWindow as AnyObject | null
  } catch {
    return null
  }
}

function isDomElement(value: unknown): value is HTMLElement {
  const candidate = value as AnyObject | null
  return !!candidate && candidate.nodeType === 1 && typeof candidate.querySelector === 'function'
}

function isDomNode(value: unknown): value is Node {
  const candidate = value as AnyObject | null
  return !!candidate && typeof candidate.nodeType === 'number'
}

function installVisualFixes(win: AnyObject): void {
  try {
    const doc = win.document as Document | undefined
    if (!doc?.head || doc.getElementById(VISUAL_FIX_STYLE_ID)) return

    const style = doc.createElement('style')
    style.id = VISUAL_FIX_STYLE_ID
    style.textContent = VISUAL_FIX_CSS
    doc.head.appendChild(style)
  } catch {
    // The local editor is same-origin, but it can be briefly unavailable while navigating.
  }
}

function getToolbarController(win: AnyObject): AnyObject | null {
  try {
    return win.DE?.getController?.('Toolbar') ?? null
  } catch {
    return null
  }
}

function getToolbarView(controller: AnyObject): AnyObject | null {
  try {
    return controller?.toolbar ?? controller?.getView?.() ?? controller?.getView?.('Toolbar') ?? null
  } catch {
    return null
  }
}

function getItemElement(item: AnyObject): HTMLElement | null {
  const element = item?.$el?.[0] ?? item?.cmpEl?.[0] ?? item?.el
  return isDomElement(element) ? element : null
}

function getItemJQuery(item: AnyObject): AnyObject | null {
  const jq = item?.$el ?? item?.cmpEl
  return jq?.length ? jq : null
}

function closeSiblingCategories(rootMenu: AnyObject, activeItem: AnyObject): void {
  const items = Array.isArray(rootMenu?.items) ? rootMenu.items : []

  items.forEach((item: AnyObject) => {
    if (item === activeItem) return

    const $item = getItemJQuery(item)
    if (!$item) return

    if (item.hideMenuTimer) {
      try {
        clearTimeout(item.hideMenuTimer)
      } catch {
        // ONLYOFFICE owns this timer; failure here must not block SmartArt.
      }
    }

    try {
      item.menu?.hide?.()
    } catch {
      // A sibling menu can already be detached while the root menu is closing.
    }

    $item.removeClass('over open')
  })
}

function schedulePreviewFallback(
  win: AnyObject,
  controller: AnyObject,
  item: AnyObject,
): void {
  const picker = item?.menuPicker
  if (!picker?.store || picker.store.length > 0 || item[PREVIEW_FALLBACK]) return

  item[PREVIEW_FALLBACK] = true

  win.setTimeout?.(() => {
    item[PREVIEW_FALLBACK] = false
    if (picker.store?.length > 0) return

    const api = controller?.api
    if (typeof api?.asc_generateSmartArtPreviews !== 'function') return

    try {
      api.asc_generateSmartArtPreviews(item.value)
    } catch (error) {
      console.error('[Waltiva] No se pudieron generar las previsualizaciones de SmartArt.', error)
    }
  }, 650)
}

function openSmartArtCategory(
  win: AnyObject,
  controller: AnyObject,
  rootMenu: AnyObject,
  item: AnyObject,
): void {
  if (!item?.menu || item.disabled || item.isDisabled?.()) return

  const $item = getItemJQuery(item)
  if (!$item) return

  if (item.hideMenuTimer) {
    try {
      win.clearTimeout?.(item.hideMenuTimer)
    } catch {
      // Keep opening even if a stale ONLYOFFICE timer cannot be cleared.
    }
  }

  if (item.expandMenuTimer) {
    try {
      win.clearTimeout?.(item.expandMenuTimer)
    } catch {
      // Keep opening even if a stale ONLYOFFICE timer cannot be cleared.
    }
  }

  closeSiblingCategories(rootMenu, item)

  try {
    // SmartArt in this build creates the child menu correctly, but opening it is
    // coupled to a one-shot mouseenter used to request SDK previews. Open the
    // native child menu independently so a delayed preview cannot hide it.
    $item.addClass('over open')
    $item.trigger('show.bs.dropdown')
    item.menu.show?.()
    item.menu.alignPosition?.()
    $item.trigger('shown.bs.dropdown')
    item.menu.alignPosition?.()
  } catch (error) {
    console.error('[Waltiva] No se pudo abrir el submenú de SmartArt.', error)
  }

  schedulePreviewFallback(win, controller, item)
}

function patchCategoryItem(
  win: AnyObject,
  controller: AnyObject,
  rootMenu: AnyObject,
  item: AnyObject,
): void {
  if (!item?.menu || item[PATCHED_ITEM]) return

  const element = getItemElement(item)
  if (!element || !getItemJQuery(item)) return

  item[PATCHED_ITEM] = true

  // Capture phase runs before the legacy jQuery mouseenter callback.
  element.addEventListener(
    'mouseover',
    (event: MouseEvent) => {
      const related = event.relatedTarget
      if (isDomNode(related) && element.contains(related)) return
      openSmartArtCategory(win, controller, rootMenu, item)
    },
    true,
  )

  const directAnchor = element.querySelector(':scope > a') as HTMLAnchorElement | null
  if (directAnchor) {
    directAnchor.addEventListener(
      'click',
      (event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        openSmartArtCategory(win, controller, rootMenu, item)
      },
      true,
    )

    directAnchor.addEventListener('focus', () => {
      openSmartArtCategory(win, controller, rootMenu, item)
    })

    directAnchor.addEventListener(
      'keydown',
      (event: KeyboardEvent) => {
        if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowRight') return
        event.preventDefault()
        event.stopPropagation()
        openSmartArtCategory(win, controller, rootMenu, item)
      },
      true,
    )
  }
}

function patchSmartArtMenu(win: AnyObject, controller: AnyObject, rootMenu: AnyObject): void {
  const items = Array.isArray(rootMenu?.items) ? rootMenu.items : []
  items.forEach((item: AnyObject) => patchCategoryItem(win, controller, rootMenu, item))
}

function tryPatchFrame(frame: HTMLIFrameElement): boolean {
  const win = getFrameWindow(frame)
  if (!win) return false

  installVisualFixes(win)

  const controller = getToolbarController(win)
  const toolbar = controller ? getToolbarView(controller) : null
  const rootMenu = toolbar?.btnInsertSmartArt?.menu

  if (!controller || !toolbar || !rootMenu) return false

  if (!rootMenu[PATCHED_MENU]) {
    rootMenu[PATCHED_MENU] = true

    // The legacy bundle creates each category DataView in show:before.
    // Patch immediately after that first render and on subsequent openings.
    rootMenu.on?.('show:after', () => {
      win.setTimeout?.(() => patchSmartArtMenu(win, controller, rootMenu), 0)
    })
  }

  patchSmartArtMenu(win, controller, rootMenu)
  return true
}

function startFrameProbe(frame: HTMLIFrameElement): void {
  const previousTimer = probeTimers.get(frame)
  if (previousTimer !== undefined) window.clearInterval(previousTimer)

  let attempts = 0
  const timer = window.setInterval(() => {
    attempts += 1

    if (tryPatchFrame(frame) || attempts >= 480) {
      window.clearInterval(timer)
      probeTimers.delete(frame)
    }
  }, 250)

  probeTimers.set(frame, timer)
  tryPatchFrame(frame)
}

function registerFrame(frame: HTMLIFrameElement): void {
  if (registeredFrames.has(frame)) return
  registeredFrames.add(frame)

  frame.addEventListener('load', () => startFrameProbe(frame))
  startFrameProbe(frame)
}

function scanFrames(): void {
  document.querySelectorAll<HTMLIFrameElement>(FRAME_SELECTOR).forEach(registerFrame)
}

/**
 * Compatibility fixes for Waltiva's local ONLYOFFICE document editor:
 * - restores SmartArt child-menu opening independently from preview generation;
 * - keeps the Aurora Dark font-preview dropdown legible on a light surface.
 */
export function initSmartArtCompatibilityFix(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  scanFrames()

  const observer = new MutationObserver(scanFrames)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
}
