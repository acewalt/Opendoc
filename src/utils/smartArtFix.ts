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
const PATCHED_CHILD_MENU = '__waltivaSmartArtChildMenuPatched'
const ORIGINAL_ROOT_HIDE = '__waltivaSmartArtOriginalRootHide'
const ORIGINAL_CHILD_HIDE = '__waltivaSmartArtOriginalChildHide'
const ACTIVE_ITEM = '__waltivaSmartArtActiveItem'
const HOLD_OPEN = '__waltivaSmartArtHoldOpen'
const ALLOW_CLOSE = '__waltivaSmartArtAllowClose'
const RELEASE_TIMER = '__waltivaSmartArtReleaseTimer'
const IN_PARENT = '__waltivaSmartArtInParent'
const IN_CHILD = '__waltivaSmartArtInChild'
const IN_ROOT = '__waltivaSmartArtInRoot'
const DOCUMENT_GUARD = '__waltivaSmartArtDocumentGuard'
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

function getMenuElement(menu: AnyObject): HTMLElement | null {
  const element = menu?.$el?.[0] ?? menu?.cmpEl?.[0] ?? menu?.el
  return isDomElement(element) ? element : null
}

function getItemJQuery(item: AnyObject): AnyObject | null {
  const jq = item?.$el ?? item?.cmpEl
  return jq?.length ? jq : null
}

function clearReleaseTimer(win: AnyObject, item: AnyObject): void {
  if (!item?.[RELEASE_TIMER]) return
  try {
    win.clearTimeout?.(item[RELEASE_TIMER])
  } catch {
    // Ignore stale timers owned by an old render of the menu.
  }
  item[RELEASE_TIMER] = null
}

function clearNativeTimers(win: AnyObject, item: AnyObject): void {
  for (const key of ['hideMenuTimer', 'expandMenuTimer']) {
    if (!item?.[key]) continue
    try {
      win.clearTimeout?.(item[key])
    } catch {
      // ONLYOFFICE owns these timers; failure here must not block SmartArt.
    }
    item[key] = null
  }
}

function allowNativeClose(win: AnyObject, rootMenu: AnyObject, item: AnyObject): void {
  if (!item) return
  clearReleaseTimer(win, item)
  clearNativeTimers(win, item)
  item[HOLD_OPEN] = false
  item[ALLOW_CLOSE] = true
  item[IN_PARENT] = false
  item[IN_CHILD] = false
  if (rootMenu?.[ACTIVE_ITEM] === item) rootMenu[ACTIVE_ITEM] = null
}

function patchHideGuards(rootMenu: AnyObject, item: AnyObject): void {
  if (typeof rootMenu?.hide === 'function' && !rootMenu[ORIGINAL_ROOT_HIDE]) {
    const originalRootHide = rootMenu.hide
    rootMenu[ORIGINAL_ROOT_HIDE] = originalRootHide
    rootMenu.hide = function (...args: any[]) {
      const active = rootMenu[ACTIVE_ITEM]
      if (active?.[HOLD_OPEN] && !active?.[ALLOW_CLOSE]) return this
      return originalRootHide.apply(this, args)
    }
  }

  if (typeof item?.menu?.hide === 'function' && !item.menu[ORIGINAL_CHILD_HIDE]) {
    const originalChildHide = item.menu.hide
    item.menu[ORIGINAL_CHILD_HIDE] = originalChildHide
    item.menu.hide = function (...args: any[]) {
      if (item[HOLD_OPEN] && !item[ALLOW_CLOSE]) return this
      return originalChildHide.apply(this, args)
    }
  }
}

function holdCategoryOpen(win: AnyObject, rootMenu: AnyObject, item: AnyObject): void {
  const previous = rootMenu?.[ACTIVE_ITEM]
  if (previous && previous !== item) allowNativeClose(win, rootMenu, previous)

  clearReleaseTimer(win, item)
  clearNativeTimers(win, item)
  patchHideGuards(rootMenu, item)

  rootMenu[ACTIVE_ITEM] = item
  item[HOLD_OPEN] = true
  item[ALLOW_CLOSE] = false
}

function releaseCategory(
  win: AnyObject,
  rootMenu: AnyObject,
  item: AnyObject,
  closeRoot: boolean,
): void {
  if (!item) return

  clearReleaseTimer(win, item)
  item[HOLD_OPEN] = false
  item[ALLOW_CLOSE] = true

  try {
    item.menu?.hide?.()
  } catch {
    // The menu may already have been removed by ONLYOFFICE after a selection.
  }

  getItemJQuery(item)?.removeClass('over open')
  if (rootMenu?.[ACTIVE_ITEM] === item) rootMenu[ACTIVE_ITEM] = null

  if (closeRoot) {
    try {
      rootMenu?.hide?.()
    } catch {
      // Let ONLYOFFICE finish its own close lifecycle if the menu is already closing.
    }
  }
}

function scheduleRelease(win: AnyObject, rootMenu: AnyObject, item: AnyObject): void {
  clearReleaseTimer(win, item)
  item[RELEASE_TIMER] = win.setTimeout?.(() => {
    item[RELEASE_TIMER] = null
    if (rootMenu?.[ACTIVE_ITEM] !== item) return
    if (item[IN_PARENT] || item[IN_CHILD]) return

    releaseCategory(win, rootMenu, item, !rootMenu?.[IN_ROOT])
  }, 280)
}

function closeSiblingCategories(win: AnyObject, rootMenu: AnyObject, activeItem: AnyObject): void {
  const items = Array.isArray(rootMenu?.items) ? rootMenu.items : []

  items.forEach((item: AnyObject) => {
    if (item === activeItem || !item?.menu) return

    item[HOLD_OPEN] = false
    item[ALLOW_CLOSE] = true
    clearReleaseTimer(win, item)
    clearNativeTimers(win, item)

    try {
      item.menu.hide?.()
    } catch {
      // A sibling can already be detached while another category opens.
    }

    getItemJQuery(item)?.removeClass('over open')
  })
}

function patchChildMenu(
  win: AnyObject,
  rootMenu: AnyObject,
  item: AnyObject,
  parentElement: HTMLElement,
): void {
  const childElement = getMenuElement(item.menu)
  if (!childElement || item.menu[PATCHED_CHILD_MENU] === childElement) return
  item.menu[PATCHED_CHILD_MENU] = childElement

  childElement.addEventListener('mouseenter', () => {
    item[IN_CHILD] = true
    holdCategoryOpen(win, rootMenu, item)
  })

  childElement.addEventListener('mouseleave', (event: MouseEvent) => {
    item[IN_CHILD] = false
    const related = event.relatedTarget
    if (isDomNode(related) && parentElement.contains(related)) {
      item[IN_PARENT] = true
      holdCategoryOpen(win, rootMenu, item)
      return
    }
    scheduleRelease(win, rootMenu, item)
  })

  const permitSelectionClose = (event: Event): void => {
    const target = event.target
    if (!isDomElement(target)) return
    const selectable = target.closest('li, .item, .dataview-item, [role="option"], [role="menuitem"]')
    if (!selectable || !childElement.contains(selectable)) return

    // Do not cancel the event: the native DataView click must insert the chosen SmartArt.
    allowNativeClose(win, rootMenu, item)
  }

  childElement.addEventListener('pointerdown', permitSelectionClose, true)
  childElement.addEventListener('mousedown', permitSelectionClose, true)
  childElement.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        allowNativeClose(win, rootMenu, item)
        return
      }
      if (event.key === 'Enter' || event.key === ' ') permitSelectionClose(event)
    },
    true,
  )
}

function openSmartArtCategory(
  win: AnyObject,
  rootMenu: AnyObject,
  item: AnyObject,
): void {
  if (!item?.menu || item.disabled || item.isDisabled?.()) return

  const $item = getItemJQuery(item)
  const element = getItemElement(item)
  if (!$item || !element) return

  holdCategoryOpen(win, rootMenu, item)
  closeSiblingCategories(win, rootMenu, item)

  try {
    // Keep the native menu implementation. We only decouple visibility from the
    // fragile leave/hide timers; native mouseenter can still populate previews.
    $item.addClass('over open')
    item.menu.show?.()
    item.menu.alignPosition?.()
    patchChildMenu(win, rootMenu, item, element)

    win.requestAnimationFrame?.(() => {
      try {
        item.menu.alignPosition?.()
        patchChildMenu(win, rootMenu, item, element)
      } catch {
        // Menu could have been replaced after the preview DataView rendered.
      }
    })

    win.setTimeout?.(() => patchChildMenu(win, rootMenu, item, element), 40)
  } catch (error) {
    console.error('[Waltiva] No se pudo abrir el submenú de SmartArt.', error)
  }
}

function patchCategoryItem(
  win: AnyObject,
  rootMenu: AnyObject,
  item: AnyObject,
): void {
  if (!item?.menu) return

  const element = getItemElement(item)
  if (!element || !getItemJQuery(item)) return
  if (item[PATCHED_ITEM] === element) {
    patchChildMenu(win, rootMenu, item, element)
    return
  }

  item[PATCHED_ITEM] = element
  patchHideGuards(rootMenu, item)

  element.addEventListener('mouseenter', () => {
    item[IN_PARENT] = true
    openSmartArtCategory(win, rootMenu, item)
  })

  element.addEventListener('mouseleave', (event: MouseEvent) => {
    item[IN_PARENT] = false
    const childElement = getMenuElement(item.menu)
    const related = event.relatedTarget
    if (childElement && isDomNode(related) && childElement.contains(related)) {
      item[IN_CHILD] = true
      holdCategoryOpen(win, rootMenu, item)
      return
    }
    scheduleRelease(win, rootMenu, item)
  })

  const directAnchor = element.querySelector(':scope > a') as HTMLAnchorElement | null
  if (directAnchor) {
    directAnchor.addEventListener(
      'click',
      (event: MouseEvent) => {
        // Category rows are containers, not SmartArt choices. Prevent ONLYOFFICE
        // from treating this click as an outside selection that closes the root.
        event.preventDefault()
        event.stopPropagation()
        openSmartArtCategory(win, rootMenu, item)
      },
      true,
    )

    directAnchor.addEventListener('focus', () => {
      item[IN_PARENT] = true
      openSmartArtCategory(win, rootMenu, item)
    })

    directAnchor.addEventListener(
      'keydown',
      (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          allowNativeClose(win, rootMenu, item)
          return
        }
        if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowRight') return
        event.preventDefault()
        event.stopPropagation()
        openSmartArtCategory(win, rootMenu, item)
      },
      true,
    )
  }

  patchChildMenu(win, rootMenu, item, element)
}

function patchRootMenuElement(win: AnyObject, rootMenu: AnyObject): void {
  const rootElement = getMenuElement(rootMenu)
  if (!rootElement || rootMenu.__waltivaSmartArtRootElement === rootElement) return
  rootMenu.__waltivaSmartArtRootElement = rootElement

  rootElement.addEventListener('mouseenter', () => {
    rootMenu[IN_ROOT] = true
    const active = rootMenu[ACTIVE_ITEM]
    if (active) clearReleaseTimer(win, active)
  })

  rootElement.addEventListener('mouseleave', () => {
    rootMenu[IN_ROOT] = false
    const active = rootMenu[ACTIVE_ITEM]
    if (active) scheduleRelease(win, rootMenu, active)
  })
}

function patchDocumentGuard(win: AnyObject, rootMenu: AnyObject): void {
  const doc = win.document as Document | undefined
  if (!doc || rootMenu[DOCUMENT_GUARD]) return
  rootMenu[DOCUMENT_GUARD] = true

  const permitOutsideClose = (event: Event): void => {
    const active = rootMenu[ACTIVE_ITEM]
    if (!active) return

    const target = event.target
    if (!isDomNode(target)) return

    const rootElement = getMenuElement(rootMenu)
    const childElement = getMenuElement(active.menu)
    const parentElement = getItemElement(active)

    if (rootElement?.contains(target) || childElement?.contains(target) || parentElement?.contains(target)) return
    allowNativeClose(win, rootMenu, active)
  }

  doc.addEventListener('pointerdown', permitOutsideClose, true)
  doc.addEventListener('mousedown', permitOutsideClose, true)
  doc.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const active = rootMenu[ACTIVE_ITEM]
      if (active) allowNativeClose(win, rootMenu, active)
    },
    true,
  )
}

function patchSmartArtMenu(win: AnyObject, rootMenu: AnyObject): void {
  patchRootMenuElement(win, rootMenu)
  patchDocumentGuard(win, rootMenu)

  const items = Array.isArray(rootMenu?.items) ? rootMenu.items : []
  items.forEach((item: AnyObject) => patchCategoryItem(win, rootMenu, item))
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

    // Categories and their DataViews can be recreated each time SmartArt opens.
    rootMenu.on?.('show:after', () => {
      win.setTimeout?.(() => patchSmartArtMenu(win, rootMenu), 0)
    })

    rootMenu.on?.('hide:after', () => {
      const active = rootMenu[ACTIVE_ITEM]
      if (active) allowNativeClose(win, rootMenu, active)
      rootMenu[IN_ROOT] = false
    })
  }

  patchSmartArtMenu(win, rootMenu)
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
 * - keeps SmartArt parent/child menus open while the pointer crosses between them;
 * - leaves SmartArt template clicks untouched so the native insert action runs;
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
