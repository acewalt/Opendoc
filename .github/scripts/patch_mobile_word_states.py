from pathlib import Path
import re

# Idempotent v2 patch: once loading.js contains the marker, later workflow runs are no-ops.
path = Path('public/web-apps/apps/documenteditor/main/loading.js')
s = path.read_text(encoding='utf-8')
MARKER = 'Waltiva Mobile UX v2'

if MARKER in s:
    print('Mobile UX v2 already applied')
    raise SystemExit(0)


def rep(old: str, new: str, label: str):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    s = s.replace(old, new, 1)


def sub(pattern: str, replacement: str, label: str, flags=0):
    global s
    s2, count = re.subn(pattern, replacement, s, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    s = s2


def optional(old: str, new: str):
    global s
    if old in s:
        s = s.replace(old, new, 1)


rep(
    ' * comandos originales, pero evita comprimir el ribbon de escritorio en iOS.\n */',
    ' * comandos originales, pero evita comprimir el ribbon de escritorio en iOS.\n * Waltiva Mobile UX v2: chrome persistente, quick tools desplazables y pinch zoom.\n */',
    'marker',
)

rep(
    "    var currentSheet = ''\n    var keyboardOffset = 0\n    var maxVisualViewportHeight = 0\n",
    "    var currentSheet = ''\n    var quickMode = 'inicio'\n    var keyboardOffset = 0\n    var maxVisualViewportHeight = 0\n    var visualTop = 0\n",
    'mobile state variables',
)

rep(
    "        chevron: svg('<path d=\"M9 6l6 6-6 6\"/>')\n",
    "        chevron: svg('<path d=\"M9 6l6 6-6 6\"/>'),\n"
    "        link: svg('<path d=\"M10 13a4 4 0 0 0 5.7.1l2.4-2.4a4 4 0 0 0-5.7-5.7L11 6.4\"/><path d=\"M14 11a4 4 0 0 0-5.7-.1l-2.4 2.4a4 4 0 0 0 5.7 5.7l1.4-1.4\"/>'),\n"
    "        highlight: svg('<path d=\"M6 15l8-8 4 4-8 8H6z\"/><path d=\"M13 8l4 4M4 21h16\"/>'),\n"
    "        bullets: svg('<circle cx=\"5\" cy=\"7\" r=\"1\" class=\"fill\"/><circle cx=\"5\" cy=\"12\" r=\"1\" class=\"fill\"/><circle cx=\"5\" cy=\"17\" r=\"1\" class=\"fill\"/><path d=\"M9 7h10M9 12h10M9 17h10\"/>'),\n"
    "        numbering: svg('<path d=\"M4 6h2M5 5v4M4 12c2-2 3 0 0 2h2M4 17h2l-2 2h2M9 7h10M9 12h10M9 17h10\"/>'),\n"
    "        align: svg('<path d=\"M4 6h16M4 10h12M4 14h16M4 18h10\"/>')\n",
    'quick tool icons',
)

rep(
    "            ':root{--wlt-mobile-top:56px;--wlt-mobile-bottom:78px;--wlt-keyboard-offset:0px;}',",
    "            ':root{--wlt-mobile-top:56px;--wlt-mobile-bottom:84px;--wlt-keyboard-offset:0px;--wlt-visual-top:0px;}',",
    'root mobile variables',
)
rep(
    "            'body.waltiva-mobile-ui #viewport{top:calc(var(--wlt-mobile-top) + env(safe-area-inset-top,0px))!important;bottom:calc(var(--wlt-mobile-bottom) + var(--wlt-keyboard-offset) + env(safe-area-inset-bottom,0px))!important;left:0!important;right:0!important;width:auto!important;background:#fff!important;}',",
    "            'body.waltiva-mobile-ui #viewport{top:calc(var(--wlt-visual-top) + var(--wlt-mobile-top) + env(safe-area-inset-top,0px))!important;bottom:calc(var(--wlt-mobile-bottom) + var(--wlt-keyboard-offset) + env(safe-area-inset-bottom,0px))!important;left:0!important;right:0!important;width:auto!important;background:#fff!important;touch-action:pan-x pan-y!important;}',",
    'viewport mobile geometry',
)
rep(
    "            '.wlt-mobile-topbar{position:fixed;z-index:12000;top:0;left:0;right:0;height:calc(var(--wlt-mobile-top) + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) 10px 0;display:flex;align-items:center;background:#4b4b4b;color:#fff;border-bottom:1px solid rgba(255,255,255,.13);font:16px/1 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;-webkit-user-select:none;user-select:none;}',",
    "            '.wlt-mobile-topbar{position:fixed;z-index:12000;top:var(--wlt-visual-top);left:0;right:0;height:calc(var(--wlt-mobile-top) + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) 10px 0;display:flex;align-items:center;background:#4b4b4b;color:#fff;border-bottom:1px solid rgba(255,255,255,.13);font:16px/1 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;-webkit-user-select:none;user-select:none;will-change:top;}',",
    'persistent topbar',
)
rep(
    "            '.wlt-mobile-formatbar{position:fixed;z-index:12000;left:50%;bottom:calc(10px + var(--wlt-keyboard-offset) + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:calc(100% - 28px);max-width:560px;height:58px;padding:0 8px;display:none;align-items:center;justify-content:space-around;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:30px;box-shadow:0 10px 35px rgba(0,0,0,.28);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);will-change:bottom;}',",
    "            '.wlt-mobile-formatbar{position:fixed;z-index:12000;left:50%;bottom:calc(18px + var(--wlt-keyboard-offset) + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:calc(100% - 24px);max-width:560px;height:60px;padding:0 7px;display:none;align-items:center;justify-content:flex-start;overflow:hidden;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:31px;box-shadow:0 10px 35px rgba(0,0,0,.28);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);will-change:bottom;}',",
    'formatbar breathing room',
)
rep(
    "            '.wlt-mobile-viewbar{position:fixed;z-index:12000;left:50%;bottom:calc(10px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(320px,calc(100% - 62px));height:58px;padding:0 9px;display:none;align-items:center;justify-content:space-around;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:30px;box-shadow:0 10px 35px rgba(0,0,0,.28);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}',",
    "            '.wlt-mobile-viewbar{position:fixed;z-index:12000;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(326px,calc(100% - 54px));height:60px;padding:0 9px;display:none;align-items:center;justify-content:space-around;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:31px;box-shadow:0 10px 35px rgba(0,0,0,.28);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}',",
    'viewbar breathing room',
)
rep(
    "            '.wlt-mobile-formatbar .wlt-mobile-btn{height:46px;min-width:42px;padding:0 8px;border-radius:20px;font-size:21px;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;}',",
    "            '.wlt-mobile-tools-scroll{width:100%;height:100%;display:flex;align-items:center;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;overscroll-behavior-x:contain;}',\n"
    "            '.wlt-mobile-tools-scroll::-webkit-scrollbar{display:none;}',\n"
    "            '.wlt-quick-group{display:none;align-items:center;gap:2px;min-width:max-content;padding:0 2px;}',\n"
    "            '.wlt-mobile-formatbar[data-wlt-mode=\"inicio\"] .wlt-quick-home{display:flex;}',\n"
    "            '.wlt-mobile-formatbar[data-wlt-mode=\"insertar\"] .wlt-quick-insert{display:flex;}',\n"
    "            '.wlt-mobile-formatbar .wlt-mobile-btn{height:46px;min-width:44px;flex:0 0 44px;padding:0 7px;border-radius:20px;font-size:21px;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;}',",
    'horizontal quick toolbar css',
)
rep(
    "            '.wlt-mobile-sheet{position:fixed;z-index:13000;left:0;right:0;bottom:0;max-height:min(65vh,560px);display:none;flex-direction:column;color:#f3f3f3;background:#1f1f1f;border-radius:28px 28px 0 0;box-shadow:0 -14px 45px rgba(0,0,0,.36);font:16px/1.25 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;overflow:hidden;padding-bottom:env(safe-area-inset-bottom,0px);}',",
    "            '.wlt-mobile-sheet{position:fixed;z-index:13000;left:0;right:0;bottom:0;max-height:min(82vh,720px);max-height:min(82dvh,720px);display:none;flex-direction:column;color:#f3f3f3;background:#1f1f1f;border-radius:28px 28px 0 0;box-shadow:0 -14px 45px rgba(0,0,0,.36);font:16px/1.25 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;overflow:hidden;padding-bottom:calc(10px + env(safe-area-inset-bottom,0px));}',",
    'larger bottom sheet',
)

sub(
    r"    function sheetContent\(kind\) \{.*?\n    \}\n\n    function openSheet\(kind\)",
    '''    function sheetContent(kind) {
        if (kind === 'inicio') {
            return [
                sheetRow('fontname', icons.format, 'Fuente', 'Calibri', true),
                sheetRow('fontsize', icons.format, 'Tamaño de fuente', '11', true),
                sheetRow('bold', icons.format, 'Negrita'),
                sheetRow('italic', icons.format, 'Cursiva'),
                sheetRow('underline', icons.format, 'Subrayado'),
                sheetRow('strike', icons.format, 'Tachado'),
                sheetRow('highlight', icons.highlight, 'Color de resaltado', '', true),
                sheetRow('fontcolor', icons.color, 'Color de fuente', '', true),
                sheetRow('bullets', icons.bullets, 'Viñetas', '', true),
                sheetRow('numbering', icons.numbering, 'Numeración', '', true),
                sheetRow('align-left', icons.align, 'Alineación y párrafo', '', true),
                sheetRow('math', icons.math, 'Vista matemática'),
                sheetRow('search', icons.search, 'Buscar')
            ].join('')
        }
        if (kind === 'mas') {
            return [
                sheetRow('search', icons.search, 'Buscar'),
                sheetRow('share', icons.share, 'Compartir'),
                sheetRow('math', icons.math, 'Vista matemática'),
                sheetRow('undo', icons.undo, 'Deshacer'),
                sheetRow('redo', icons.redo, 'Rehacer'),
                sheetRow('download', icons.download, 'Descargar / guardar una copia'),
                sheetRow('native', icons.tools, nativeRibbon ? 'Ocultar herramientas completas' : 'Herramientas completas', 'Mostrar temporalmente la cinta clásica')
            ].join('')
        }
        return [
            sheetRow('shape', icons.shape, 'Formas', '', true),
            sheetRow('textbox', icons.text, 'Cuadro de texto', '', true),
            sheetRow('image', icons.image, 'Imágenes de archivo', '', true),
            sheetRow('image', icons.image, 'Imágenes en línea', '', true),
            sheetRow('link', icons.link, 'Vínculo', '', true),
            sheetRow('comment', icons.comment, 'Comentario', '', true),
            sheetRow('equation', icons.equation, 'Ecuación', '', true),
            sheetRow('page', icons.page, 'Página / salto de página', '', true),
            sheetRow('table', icons.table, 'Tabla', '', true),
            sheetRow('native', icons.tools, 'Más opciones de inserción', 'Abrir herramientas completas')
        ].join('')
    }

    function openSheet(kind)''',
    'sheet contents',
    re.S,
)

rep(
    "        currentSheet = kind || 'insertar'\n        var sheet = document.getElementById('wlt-mobile-sheet')",
    "        currentSheet = kind || 'insertar'\n        if (currentSheet === 'inicio' || currentSheet === 'insertar') hideKeyboard()\n        var sheet = document.getElementById('wlt-mobile-sheet')",
    'sheet hides keyboard',
)
rep(
    "        title.textContent = currentSheet === 'inicio' ? 'Inicio' : currentSheet === 'mas' ? 'Más' : 'Insertar'\n",
    "        title.textContent = currentSheet === 'inicio' ? 'Inicio' : currentSheet === 'mas' ? 'Más' : 'Insertar'\n        title.setAttribute('data-wlt-action', currentSheet === 'mas' ? '' : 'switch-sheet')\n",
    'sheet mode switch title',
)

sub(
    r"        var formatbar = document\.createElement\('div'\)\n        formatbar\.id = 'wlt-mobile-formatbar'.*?        document\.body\.appendChild\(formatbar\)",
    '''        var formatbar = document.createElement('div')
        formatbar.id = 'wlt-mobile-formatbar'
        formatbar.className = 'wlt-mobile-formatbar'
        formatbar.setAttribute('data-wlt-mode', quickMode)
        formatbar.innerHTML =
            '<div class="wlt-mobile-tools-scroll">' +
                '<div class="wlt-quick-group wlt-quick-home">' +
                    makeButton('', 'Insertar', icons.plus, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="quick-toggle"') +
                    '<button type="button" class="wlt-mobile-btn wlt-bold" data-wlt-action="bold" aria-label="Negrita">N</button>' +
                    '<button type="button" class="wlt-mobile-btn wlt-format-letter wlt-italic" data-wlt-action="italic" aria-label="Cursiva">K</button>' +
                    '<button type="button" class="wlt-mobile-btn wlt-format-letter wlt-underline" data-wlt-action="underline" aria-label="Subrayado">S</button>' +
                    '<button type="button" class="wlt-mobile-btn wlt-format-letter wlt-strike" data-wlt-action="strike" aria-label="Tachado">S</button>' +
                    makeButton('', 'Resaltado', icons.highlight, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="highlight"') +
                    makeButton('', 'Color de fuente', icons.color, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="fontcolor"') +
                    makeButton('', 'Viñetas', icons.bullets, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="bullets"') +
                    makeButton('', 'Numeración', icons.numbering, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="numbering"') +
                    makeButton('', 'Alineación', icons.align, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="align-left"') +
                    makeButton('', 'Más herramientas de Inicio', icons.more, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="quick-more"') +
                    makeButton('', 'Ocultar teclado', icons.keyboard, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="keyboard"') +
                '</div>' +
                '<div class="wlt-quick-group wlt-quick-insert">' +
                    makeButton('', 'Volver a Inicio', icons.plus, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn wlt-active" data-wlt-action="quick-toggle"') +
                    makeButton('', 'Tabla', icons.table, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="table"') +
                    makeButton('', 'Imagen', icons.image, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="image"') +
                    makeButton('', 'Formas', icons.shape, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="shape"') +
                    makeButton('', 'Cuadro de texto', icons.text, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="textbox"') +
                    makeButton('', 'Vínculo', icons.link, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="link"') +
                    makeButton('', 'Comentario', icons.comment, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="comment"') +
                    makeButton('', 'Ecuación', icons.equation, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="equation"') +
                    makeButton('', 'Más herramientas de Insertar', icons.more, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="quick-more"') +
                    makeButton('', 'Ocultar teclado', icons.keyboard, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="keyboard"') +
                '</div>' +
            '</div>'
        document.body.appendChild(formatbar)''',
    'formatbar DOM',
    re.S,
)

rep(
    "                '<button type=\"button\" id=\"wlt-mobile-sheet-title\" class=\"wlt-mobile-sheet-title\">Insertar</button>' +",
    "                '<button type=\"button\" id=\"wlt-mobile-sheet-title\" class=\"wlt-mobile-sheet-title\" data-wlt-action=\"switch-sheet\">Insertar</button>' +",
    'sheet title action',
)

insert_before = "    function performAction(action) {\n"
quick_helpers = '''    function setQuickMode(mode) {
        quickMode = mode === 'insertar' ? 'insertar' : 'inicio'
        var bar = document.getElementById('wlt-mobile-formatbar')
        if (!bar) return
        bar.setAttribute('data-wlt-mode', quickMode)
        var scroller = bar.querySelector('.wlt-mobile-tools-scroll')
        if (scroller) scroller.scrollLeft = 0
    }

    function zoomByStep(direction) {
        var selectors = direction > 0
            ? ['#btn-zoom-in', '.btn-zoom-in', '[title*="Acercar"]', '[title*="Zoom in"]']
            : ['#btn-zoom-out', '.btn-zoom-out', '[title*="Alejar"]', '[title*="Zoom out"]']
        return clickControl(selectors, direction > 0 ? 'No se pudo acercar el documento.' : 'No se pudo alejar el documento.')
    }

    function bindDocumentPinchZoom() {
        var pinchActive = false
        var startDistance = 0
        var gestureScale = 1
        function insideViewport(target) {
            return !!(target && (target.id === 'viewport' || (target.closest && target.closest('#viewport'))))
        }
        function distance(touches) {
            if (!touches || touches.length < 2) return 0
            var dx = touches[0].clientX - touches[1].clientX
            var dy = touches[0].clientY - touches[1].clientY
            return Math.sqrt(dx * dx + dy * dy)
        }
        document.addEventListener('touchstart', function (event) {
            if (event.touches && event.touches.length === 2 && insideViewport(event.target)) {
                pinchActive = true
                startDistance = distance(event.touches)
            }
        }, { passive: false, capture: true })
        document.addEventListener('touchmove', function (event) {
            if (!pinchActive || !event.touches || event.touches.length !== 2) return
            event.preventDefault()
            var next = distance(event.touches)
            if (!startDistance || !next) return
            var ratio = next / startDistance
            if (ratio > 1.12) {
                zoomByStep(1)
                startDistance = next
            } else if (ratio < 0.89) {
                zoomByStep(-1)
                startDistance = next
            }
        }, { passive: false, capture: true })
        document.addEventListener('touchend', function (event) {
            if (!event.touches || event.touches.length < 2) {
                pinchActive = false
                startDistance = 0
            }
        }, { passive: true, capture: true })
        document.addEventListener('gesturestart', function (event) {
            if (!insideViewport(event.target)) return
            gestureScale = 1
            event.preventDefault()
        }, { passive: false, capture: true })
        document.addEventListener('gesturechange', function (event) {
            if (!insideViewport(event.target)) return
            event.preventDefault()
            var scale = event.scale || 1
            if (scale / gestureScale > 1.14) {
                zoomByStep(1)
                gestureScale = scale
            } else if (scale / gestureScale < 0.87) {
                zoomByStep(-1)
                gestureScale = scale
            }
        }, { passive: false, capture: true })
    }

'''
rep(insert_before, quick_helpers + insert_before, 'quick mode and pinch helpers')

rep(
    "            case 'insert': openSheet('insertar'); return\n            case 'format': openSheet('inicio'); return\n",
    "            case 'insert': setQuickMode('insertar'); return\n            case 'quick-toggle': setQuickMode(quickMode === 'inicio' ? 'insertar' : 'inicio'); return\n            case 'quick-more': openSheet(quickMode); return\n            case 'switch-sheet': if (currentSheet === 'inicio' || currentSheet === 'insertar') openSheet(currentSheet === 'inicio' ? 'insertar' : 'inicio'); return\n            case 'format': openSheet('inicio'); return\n",
    'quick toolbar actions',
)
rep(
    "            case 'fontcolor': ok = clickControl(['.toolbar .btn-fontcolor', '.btn-fontcolor']); break\n",
    "            case 'fontcolor': ok = clickControl(['.toolbar .btn-fontcolor', '.btn-fontcolor']); break\n"
    "            case 'highlight': ok = clickControl(['.toolbar .btn-highlight', '.toolbar .btn-marker', '.btn-highlight', '.btn-marker']); break\n"
    "            case 'bullets': ok = clickControl(['.toolbar .btn-bullets', '.btn-bullets', '[title*=\"Viñetas\"]', '[title*=\"Bullets\"]']); break\n"
    "            case 'numbering': ok = clickControl(['.toolbar .btn-numbering', '.btn-numbering', '[title*=\"Numeración\"]', '[title*=\"Numbering\"]']); break\n"
    "            case 'align-left': ok = clickControl(['.toolbar .btn-align-left', '.btn-align-left', '[title*=\"Alinear a la izquierda\"]', '[title*=\"Align left\"]']); break\n"
    "            case 'fontname': ok = clickControl(['.toolbar .combo-fontname', '.combo-fontname', '#font-combo']); break\n"
    "            case 'fontsize': ok = clickControl(['.toolbar .combo-fontsize', '.combo-fontsize', '#fontsize-combo']); break\n"
    "            case 'link': closeSheet(); ok = clickControl(['.toolbar .btn-insertlink', '.btn-insertlink', '[title*=\"Vínculo\"]', '[title*=\"Link\"]']); break\n",
    'extra toolbar actions',
)

# Preserve a user-selected zoom. Fit-to-width is now initial/explicit only.
optional("        setTimeout(function () { fitWidthWhenReady(0) }, 120)\n", '')
optional("        setTimeout(function () { fitWidthWhenReady(0) }, 90)\n", '')
optional("                fitWidthWhenReady(0)\n", '')
optional("        setTimeout(function () { fitWidthWhenReady(0) }, 900)\n", '')
optional("        setTimeout(function () { fitWidthWhenReady(0) }, 1800)\n", '')

sub(
    r"    function updateVisualViewport\(resetBase\) \{.*?\n    \}\n\n    function bindEvents\(\)",
    '''    function updateVisualViewport(resetBase) {
        var vv = getVisualViewportSource()
        if (!vv || !document.documentElement) return

        var nextVisualTop = Math.max(0, Math.round(vv.offsetTop || 0))
        if (visualTop !== nextVisualTop) {
            visualTop = nextVisualTop
            document.documentElement.style.setProperty('--wlt-visual-top', visualTop + 'px')
        }

        var visibleHeight = Math.max(0, Math.round(vv.height || 0))
        if (resetBase || !maxVisualViewportHeight || visibleHeight > maxVisualViewportHeight) {
            maxVisualViewportHeight = visibleHeight
        }
        var nextOffset = Math.max(0, maxVisualViewportHeight - visibleHeight)
        // Cambios pequeños suelen ser la barra dinámica de Safari; el teclado reduce mucho más la altura.
        if (nextOffset < 110) nextOffset = 0
        if (nextOffset > 0 && !editing) {
            editing = true
            if (document.body) document.body.classList.remove('waltiva-mobile-view-mode')
        }
        if (keyboardOffset === nextOffset) return
        keyboardOffset = nextOffset
        document.documentElement.style.setProperty('--wlt-keyboard-offset', keyboardOffset + 'px')
        if (document.body) document.body.classList.toggle('waltiva-mobile-keyboard-open', keyboardOffset > 0)
        setTimeout(resizeEditor, 20)
    }

    function bindEvents()''',
    'visual viewport tracking',
    re.S,
)

rep(
    "        window.addEventListener('orientationchange', function () {\n            maxVisualViewportHeight = 0\n            setTimeout(function () {\n                updateVisualViewport(true)\n                resizeEditor()\n            }, 220)\n        })\n",
    "        window.addEventListener('orientationchange', function () {\n            maxVisualViewportHeight = 0\n            setTimeout(function () {\n                updateVisualViewport(true)\n                resizeEditor()\n            }, 220)\n        })\n        bindDocumentPinchZoom()\n",
    'bind pinch zoom',
)

path.write_text(s, encoding='utf-8')
print('Mobile Word UX v2 patched successfully')
