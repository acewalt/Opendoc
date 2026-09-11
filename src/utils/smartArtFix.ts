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

function getFrameWindow(frame: HTMLIFrameElement): AnyObject | null {
  try {
    return frame.contentWindow as AnyObject | null
  } catch {
    return null
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
  return element instanceof HTMLElement ? element : null
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

    $item.removeClass('over')
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
    if (picker.store?.length > 0) return

    const api = controller?.api
    if (typeof api?.asc_generateSmartArtPreviews !== 'function') return

    try {
      api.asc_generateSmartArtPreviews(item.value)
    } catch (error) {
      console.error('[Waltiva] No se pudieron generar las previsualizaciones de SmartArt.', error)
    }
  }, 1500)
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
    // In this ONLYOFFICE build submenu positioning is deferred to the same
    // mouseenter that requests SmartArt previews. If preview generation stalls
    // or throws, the submenu can remain at its off-screen initial position.
    // Position and expose the already-created native submenu first.
    $item.trigger('show.bs.dropdown')
    item.menu.alignPosition?.()
    $item.addClass('over')
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
  const $item = getItemJQuery(item)
  if (!element || !$item) return

  item[PATCHED_ITEM] = true

  // Native capture runs before the legacy jQuery `mouseenter` handler that
  // synchronously asks the SDK for SmartArt previews. This makes opening the
  // child panel independent from preview generation.
  element.addEventListener(
    'mouseover',
    (event: MouseEvent) => {
      const related = event.relatedTarget
      if (related instanceof Node && element.contains(related)) return
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

  const controller = getToolbarController(win)
  const toolbar = controller ? getToolbarView(controller) : null
  const rootMenu = toolbar?.btnInsertSmartArt?.menu

  if (!controller || !toolbar || !rootMenu) return false

  if (!rootMenu[PATCHED_MENU]) {
    rootMenu[PATCHED_MENU] = true

    // The legacy bundle creates each category's DataView in `show:before`.
    // Patch after that hook has run, then re-run on later openings in case a
    // category was re-rendered by ONLYOFFICE.
    rootMenu.on?.('show:after', () => {
      win.setTimeout?.(() => patchSmartArtMenu(win, controller, rootMenu), 0)
    })
  }

  // If SmartArt has already been opened before this helper became ready,
  // patch the existing menu items immediately as well.
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
 * Compatibility fix for the SmartArt category submenus shipped with Waltiva's
 * local ONLYOFFICE build. It does not replace SmartArt or alter document data;
 * it only restores opening/positioning of the native child menus and retries
 * preview generation if the legacy hover request never populates them.
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
