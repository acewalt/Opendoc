from pathlib import Path

path = Path('public/web-apps/apps/documenteditor/main/loading.js')
s = path.read_text(encoding='utf-8')


def rep(old: str, new: str, label: str):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    s = s.replace(old, new, 1)


rep('    var editing = true\n', '    var editing = false\n', 'initial editing state')

rep(
    "        share: svg('<path d=\"M12 15V3M8 7l4-4 4 4\"/><path d=\"M5 12v8h14v-8\"/>'),\n",
    "        share: svg('<path d=\"M12 15V3M8 7l4-4 4 4\"/><path d=\"M5 12v8h14v-8\"/>'),\n"
    "        viewer: svg('<rect x=\"7\" y=\"3\" width=\"10\" height=\"18\" rx=\"1.8\"/><path d=\"M10 18h4\"/>'),\n"
    "        read: svg('<path d=\"M6 18L11 5h2l5 13M8.5 12.5h7\"/><path d=\"M18.5 7.5c1 1 1.5 2.2 1.5 3.5s-.5 2.5-1.5 3.5\"/>'),\n"
    "        comment: svg('<path d=\"M4 5h16v11H9l-5 4z\"/>'),\n",
    'viewer icons',
)

rep(
    "            '.wlt-mobile-formatbar{position:fixed;z-index:12000;left:50%;bottom:calc(10px + var(--wlt-keyboard-offset) + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:calc(100% - 28px);max-width:560px;height:58px;padding:0 8px;display:flex;align-items:center;justify-content:space-around;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:30px;box-shadow:0 10px 35px rgba(0,0,0,.28);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);will-change:bottom;}',\n"
    "            'body.waltiva-mobile-view-mode .wlt-mobile-formatbar{display:none;}',\n",
    "            '.wlt-mobile-formatbar{position:fixed;z-index:12000;left:50%;bottom:calc(10px + var(--wlt-keyboard-offset) + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:calc(100% - 28px);max-width:560px;height:58px;padding:0 8px;display:none;align-items:center;justify-content:space-around;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:30px;box-shadow:0 10px 35px rgba(0,0,0,.28);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);will-change:bottom;}',\n"
    "            'body.waltiva-mobile-ui.waltiva-mobile-keyboard-open:not(.waltiva-mobile-view-mode) .wlt-mobile-formatbar{display:flex;}',\n"
    "            '.wlt-mobile-viewbar{position:fixed;z-index:12000;left:50%;bottom:calc(10px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(320px,calc(100% - 62px));height:58px;padding:0 9px;display:none;align-items:center;justify-content:space-around;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:30px;box-shadow:0 10px 35px rgba(0,0,0,.28);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}',\n"
    "            'body.waltiva-mobile-view-mode .wlt-mobile-viewbar{display:flex;}',\n"
    "            'body.waltiva-mobile-keyboard-open .wlt-mobile-viewbar{display:none;}',\n"
    "            '.wlt-mobile-viewbar .wlt-mobile-btn{height:46px;min-width:52px;padding:0 11px;border-radius:20px;}',\n"
    "            '.wlt-mobile-viewbar .wlt-mobile-btn svg{width:27px;height:27px;}',\n",
    'toolbar visibility and viewer bar styles',
)

rep(
    "    function setEditing(value) {\n        editing = !!value\n        document.body.classList.toggle('waltiva-mobile-view-mode', !editing)\n        closeSheet()\n        if (!editing) hideKeyboard()\n        setTimeout(resizeEditor, 50)\n    }\n",
    "    function setEditing(value) {\n        editing = !!value\n        document.body.classList.toggle('waltiva-mobile-view-mode', !editing)\n        closeSheet()\n        if (!editing) {\n            hideKeyboard()\n            keyboardOffset = 0\n            document.documentElement.style.setProperty('--wlt-keyboard-offset', '0px')\n            document.body.classList.remove('waltiva-mobile-keyboard-open')\n        }\n        setTimeout(resizeEditor, 50)\n        setTimeout(function () { fitWidthWhenReady(0) }, 120)\n    }\n",
    'editing state',
)

rep(
    "            case 'done': setEditing(false); return\n            case 'edit': setEditing(true); return\n",
    "            case 'done': setEditing(false); return\n            case 'edit': setEditing(true); return\n            case 'fit-width': fitWidthWhenReady(0); toast('Documento ajustado al ancho.'); return\n",
    'fit width action',
)

rep(
    "            case 'share': closeSheet(); ok = clickControl(['.btn-share', '.btn-header-share', '[title*=\"Compartir\"]', '[title*=\"Share\"]'], 'Compartir no está habilitado en este documento.'); break\n",
    "            case 'share': closeSheet(); ok = clickControl(['.btn-share', '.btn-header-share', '[title*=\"Compartir\"]', '[title*=\"Share\"]'], 'Compartir no está habilitado en este documento.'); break\n"
    "            case 'comment': closeSheet(); ok = clickControl(['.btn-comments', '.btn-menu-comments', '[title*=\"Comentario\"]', '[title*=\"Comment\"]'], 'Los comentarios no están disponibles.'); break\n",
    'comment action',
)

old_vv = """    function updateVisualViewport(resetBase) {
        var vv = window.visualViewport
        if (!vv || !document.documentElement) return
        var visibleBottom = Math.max(0, Math.round(vv.height + vv.offsetTop))
        if (resetBase || !maxVisualViewportHeight || visibleBottom > maxVisualViewportHeight) {
            maxVisualViewportHeight = visibleBottom
        }
        var nextOffset = Math.max(0, maxVisualViewportHeight - visibleBottom)
        // Cambios pequeños suelen ser solo la barra de Safari; el teclado ocupa bastante más.
        if (nextOffset < 80) nextOffset = 0
        if (keyboardOffset === nextOffset) return
        keyboardOffset = nextOffset
        document.documentElement.style.setProperty('--wlt-keyboard-offset', keyboardOffset + 'px')
        if (document.body) document.body.classList.toggle('waltiva-mobile-keyboard-open', keyboardOffset > 0)
        setTimeout(resizeEditor, 20)
        setTimeout(function () { fitWidthWhenReady(0) }, 90)
    }
"""
new_vv = """    function getVisualViewportSource() {
        try {
            if (window.parent && window.parent !== window && window.parent.visualViewport) return window.parent.visualViewport
        } catch (e) {}
        return window.visualViewport || null
    }

    function updateVisualViewport(resetBase) {
        var vv = getVisualViewportSource()
        if (!vv || !document.documentElement) return
        var visibleBottom = Math.max(0, Math.round(vv.height + (vv.offsetTop || 0)))
        if (resetBase || !maxVisualViewportHeight || visibleBottom > maxVisualViewportHeight) {
            maxVisualViewportHeight = visibleBottom
        }
        var nextOffset = Math.max(0, maxVisualViewportHeight - visibleBottom)
        // Safari puede mover sus barras unos pocos píxeles; el teclado produce una reducción mucho mayor.
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
        setTimeout(function () { fitWidthWhenReady(0) }, 90)
    }
"""
rep(old_vv, new_vv, 'visual viewport source')

old_bind = """        if (window.visualViewport) {
            var onVisualViewportChange = function () {
                updateVisualViewport(false)
                setTimeout(resizeEditor, 40)
            }
            window.visualViewport.addEventListener('resize', onVisualViewportChange)
            window.visualViewport.addEventListener('scroll', onVisualViewportChange)
        }
        window.addEventListener('resize', function () {
            updateVisualViewport(false)
            setTimeout(resizeEditor, 60)
        })
"""
new_bind = """        var visualViewportSource = getVisualViewportSource()
        if (visualViewportSource) {
            var onVisualViewportChange = function () {
                updateVisualViewport(false)
                setTimeout(resizeEditor, 40)
            }
            visualViewportSource.addEventListener('resize', onVisualViewportChange)
            visualViewportSource.addEventListener('scroll', onVisualViewportChange)
        }
        try {
            if (window.parent && window.parent !== window) {
                window.parent.addEventListener('resize', function () {
                    updateVisualViewport(false)
                    setTimeout(resizeEditor, 60)
                })
            }
        } catch (e) {}
        window.addEventListener('resize', function () {
            updateVisualViewport(false)
            setTimeout(resizeEditor, 60)
        })
        document.addEventListener('focusin', function () { setTimeout(function () { updateVisualViewport(false) }, 80) }, true)
        document.addEventListener('focusout', function () { setTimeout(function () { updateVisualViewport(false) }, 180) }, true)
"""
rep(old_bind, new_bind, 'parent visual viewport listeners')

rep(
    "    function syncFormatting() {\n        var map = {\n",
    "    function syncFormatting() {\n        updateVisualViewport(false)\n        var map = {\n",
    'viewport polling in format sync',
)

rep(
    "        document.documentElement.classList.add('waltiva-mobile-root')\n        document.body.classList.add('waltiva-mobile-ui')\n        updateVisualViewport(true)\n",
    "        document.documentElement.classList.add('waltiva-mobile-root')\n        document.body.classList.add('waltiva-mobile-ui')\n        document.body.classList.add('waltiva-mobile-view-mode')\n        updateVisualViewport(true)\n",
    'initial view mode class',
)

needle = """        document.body.appendChild(formatbar)

        var mask = document.createElement('div')
"""
viewer = """        document.body.appendChild(formatbar)

        var viewbar = document.createElement('div')
        viewbar.id = 'wlt-mobile-viewbar'
        viewbar.className = 'wlt-mobile-viewbar'
        viewbar.innerHTML =
            makeButton('', 'Ajustar documento', icons.viewer, '').replace('class=\"wlt-mobile-btn \"', 'class=\"wlt-mobile-btn\" data-wlt-action=\"fit-width\"') +
            makeButton('', 'Formato', icons.read, '').replace('class=\"wlt-mobile-btn \"', 'class=\"wlt-mobile-btn\" data-wlt-action=\"format\"') +
            makeButton('', 'Comentarios', icons.comment, '').replace('class=\"wlt-mobile-btn \"', 'class=\"wlt-mobile-btn\" data-wlt-action=\"comment\"') +
            makeButton('', 'Compartir', icons.share, '').replace('class=\"wlt-mobile-btn \"', 'class=\"wlt-mobile-btn\" data-wlt-action=\"share\"')
        document.body.appendChild(viewbar)

        var mask = document.createElement('div')
"""
rep(needle, viewer, 'viewer toolbar DOM')

path.write_text(s, encoding='utf-8')
print('Mobile Word states patched successfully')
