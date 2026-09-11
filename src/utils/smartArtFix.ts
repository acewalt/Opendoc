const FRAME_SELECTOR = [
  'iframe[name="frameEditor"]',
  '#iframe iframe',
  'iframe[src*="/web-apps/apps/documenteditor/"]',
].join(', ')

const registeredFrames = new WeakSet<HTMLIFrameElement>()
const probeTimers = new WeakMap<HTMLIFrameElement, number>()
const INSERT_MENU_CONFIGS = [
  { toolbarKey: 'btnInsertSmartArt', selector: '#tlbtn-insertsmartart' },
  { toolbarKey: 'btnInsertEquation', selector: '#tlbtn-insertequation' },
] as const
const patchedInsertMenus = new WeakSet<object>()
const patchedInsertSubmenus = new WeakSet<HTMLElement>()
const patchedInsertDocuments = new WeakMap<Document, Set<string>>()
const insertHoverTimers = new WeakMap<HTMLElement, number>()
const insertPointerPositions = new WeakMap<Document, { x: number; y: number }>()
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

function installVisualFixes(frame: HTMLIFrameElement): boolean {
  try {
    const doc = frame.contentDocument
    if (!doc?.head) return false
    if (doc.getElementById(VISUAL_FIX_STYLE_ID)) return true

    const style = doc.createElement('style')
    style.id = VISUAL_FIX_STYLE_ID
    style.textContent = VISUAL_FIX_CSS
    doc.head.appendChild(style)
    return true
  } catch {
    // A frame can be briefly inaccessible during navigation.
    return false
  }
}

function patchInsertMenuPointerTransition(
  frame: HTMLIFrameElement,
  config: (typeof INSERT_MENU_CONFIGS)[number],
): boolean {
  try {
    const win = frame.contentWindow as (Window & Record<string, any>) | null
    const doc = frame.contentDocument
    const getRootMenu = (): Record<string, any> | undefined =>
      win?.DE?.getController?.('Toolbar')?.toolbar?.[config.toolbarKey]?.menu
    const rootMenu = getRootMenu()

    // During toolbar startup ONLYOFFICE temporarily uses `true` as the menu
    // placeholder. Wait for the actual component before inspecting it.
    if (!doc || !rootMenu || (typeof rootMenu !== 'object' && typeof rootMenu !== 'function')) {
      return false
    }

    const getCurrentItem = (submenu: HTMLElement): Record<string, any> | undefined => {
      const row = submenu.parentElement
      if (!row) return undefined
      const currentMenu = getRootMenu()
      const items = Array.isArray(currentMenu?.items) ? currentMenu.items : []
      return items.find((candidate: Record<string, any>) => {
        const candidateRow = candidate?.el ?? candidate?.$el?.[0] ?? candidate?.cmpEl?.[0]
        return candidateRow === row
      })
    }

    const keepSubmenuOpen = (submenu: HTMLElement): void => {
      const item = getCurrentItem(submenu)
      if (!item) return

      // This is the flag checked by ONLYOFFICE's own delayed hide callback.
      if (item.menu && typeof item.menu === 'object') item.menu.isOver = true
      const timers = ['hideMenuTimer']
      // Do not cancel the expansion timer while the pointer is still on the
      // category row; it is what opens the gallery after ONLYOFFICE's delay.
      if (submenu.getBoundingClientRect().width > 0) timers.push('expandMenuTimer')
      for (const key of timers) {
        if (!item[key]) continue
        win.clearTimeout(item[key])
        item[key] = null
      }
    }

    const pointerIsInside = (submenu: HTMLElement): boolean => {
      const pointer = insertPointerPositions.get(doc)
      const row = submenu.parentElement
      if (!pointer) return submenu.matches(':hover') || !!row?.matches(':hover')

      // Fractional scaling can leave a sub-pixel seam between the row and its
      // fixed-position gallery. A small tolerance preserves the intended hover
      // path without keeping the menu alive elsewhere in the toolbar.
      const containsPointer = (element: Element | null, tolerance = 6): boolean => {
        if (!element) return false
        const rect = element.getBoundingClientRect()
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          pointer.x >= rect.left - tolerance &&
          pointer.x <= rect.right + tolerance &&
          pointer.y >= rect.top - tolerance &&
          pointer.y <= rect.bottom + tolerance
        )
      }

      return containsPointer(row) || containsPointer(submenu)
    }

    const stopHoverGuard = (submenu: HTMLElement): void => {
      const timer = insertHoverTimers.get(submenu)
      if (timer !== undefined) win.clearInterval(timer)
      insertHoverTimers.delete(submenu)
      const item = getCurrentItem(submenu)
      if (item?.menu && typeof item.menu === 'object') item.menu.isOver = false
    }

    const startHoverGuard = (submenu: HTMLElement): void => {
      keepSubmenuOpen(submenu)
      if (insertHoverTimers.has(submenu)) return

      const timer = win.setInterval(() => {
        if (!pointerIsInside(submenu)) {
          stopHoverGuard(submenu)
          return
        }
        keepSubmenuOpen(submenu)
      }, 25)
      insertHoverTimers.set(submenu, timer)
    }

    const patchItems = (): boolean => {
      const items = Array.isArray(rootMenu.items) ? rootMenu.items : []
      let patchedCount = 0

      items.forEach((item: Record<string, any>) => {
        const row = item?.el ?? item?.$el?.[0] ?? item?.cmpEl?.[0]
        const submenu = row?.querySelector?.(':scope > ul.dropdown-menu') as HTMLElement | null
        if (!submenu) return
        patchedCount += 1
        if (patchedInsertSubmenus.has(submenu)) return

        patchedInsertSubmenus.add(submenu)
        row.addEventListener('mouseenter', () => startHoverGuard(submenu))
        submenu.addEventListener('mouseenter', () => startHoverGuard(submenu))
        submenu.addEventListener('mouseleave', () => {
          win.setTimeout(() => {
            if (!pointerIsInside(submenu)) stopHoverGuard(submenu)
          }, 0)
        })
      })

      return patchedCount > 0
    }

    const documentRegistrations = patchedInsertDocuments.get(doc) ?? new Set<string>()
    if (!documentRegistrations.has(config.selector)) {
      documentRegistrations.add(config.selector)
      patchedInsertDocuments.set(doc, documentRegistrations)
      doc.addEventListener(
        'mousemove',
        (event) => {
          insertPointerPositions.set(doc, { x: event.clientX, y: event.clientY })
          const target = event.target as Element | null
          const row = target?.closest?.(`${config.selector} > .dropdown-menu > li`)
          const submenu = row?.querySelector?.(':scope > ul.dropdown-menu')
          if (submenu) startHoverGuard(submenu as HTMLElement)
        },
        true,
      )
    }

    if (!patchedInsertMenus.has(rootMenu)) {
      patchedInsertMenus.add(rootMenu)
      rootMenu.on?.('show:after', () => win.setTimeout(patchItems, 0))
    }

    return patchItems()
  } catch {
    return false
  }
}

function installCompatibilityFixes(frame: HTMLIFrameElement): boolean {
  const visualFixesReady = installVisualFixes(frame)
  // Invoke every patch even while another menu is still initializing.
  const insertMenusReady = INSERT_MENU_CONFIGS
    .map((config) => patchInsertMenuPointerTransition(frame, config))
    .every(Boolean)
  return visualFixesReady && insertMenusReady
}

function startFrameProbe(frame: HTMLIFrameElement): void {
  const previousTimer = probeTimers.get(frame)
  if (previousTimer !== undefined) window.clearInterval(previousTimer)
  probeTimers.delete(frame)
  if (installCompatibilityFixes(frame)) return

  let attempts = 0
  const timer = window.setInterval(() => {
    attempts += 1
    if (installCompatibilityFixes(frame) || attempts >= 480) {
      window.clearInterval(timer)
      probeTimers.delete(frame)
    }
  }, 250)
  probeTimers.set(frame, timer)
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
 * Retains the font-preview appearance fix for the local editor.
 * SmartArt uses ONLYOFFICE's native preview, selection and menu lifecycle;
 * its templates are bundled at sdkjs/common/SmartArts/SmartArts.bin. SmartArt
 * and equation galleries only cancel ONLYOFFICE's stale hide timer while the
 * pointer is physically inside them, so native selection and closing remain.
 */
export function initSmartArtCompatibilityFix(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  scanFrames()
  const observer = new MutationObserver(scanFrames)
  observer.observe(document.documentElement, { childList: true, subtree: true })
}
