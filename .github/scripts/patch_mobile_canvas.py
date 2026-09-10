from pathlib import Path

path = Path('public/web-apps/apps/documenteditor/main/loading.js')
s = path.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: se esperaba 1 coincidencia y se encontraron {count}')
    s = s.replace(old, new, 1)


replace_once(
    "    var currentSheet = ''\n",
    "    var currentSheet = ''\n    var keyboardOffset = 0\n    var maxVisualViewportHeight = 0\n",
    'variables de viewport',
)

replace_once(
    "            ':root{--wlt-mobile-top:56px;--wlt-mobile-bottom:78px;}',",
    "            ':root{--wlt-mobile-top:56px;--wlt-mobile-bottom:78px;--wlt-keyboard-offset:0px;}',",
    'variables CSS móviles',
)

replace_once(
    "            'body.waltiva-mobile-ui #viewport{top:calc(var(--wlt-mobile-top) + env(safe-area-inset-top,0px))!important;bottom:calc(var(--wlt-mobile-bottom) + env(safe-area-inset-bottom,0px))!important;background:#fff!important;}',",
    "            'body.waltiva-mobile-ui #viewport{top:calc(var(--wlt-mobile-top) + env(safe-area-inset-top,0px))!important;bottom:calc(var(--wlt-mobile-bottom) + var(--wlt-keyboard-offset) + env(safe-area-inset-bottom,0px))!important;left:0!important;right:0!important;width:auto!important;background:#fff!important;}',",
    'viewport móvil',
)

replace_once(
    "            'body.waltiva-mobile-ui #editor-container{background:#fff!important;}',",
    "            'body.waltiva-mobile-ui #editor-container,body.waltiva-mobile-ui #editor_sdk{left:0!important;right:0!important;width:100%!important;max-width:none!important;background:#fff!important;}',\n"
    "            'body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_hor_ruler,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vert_ruler,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vertical_scroll,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_horizontal_scroll,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vscrollbar,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_hscrollbar,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_buttonTabs{visibility:hidden!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important;}',\n"
    "            'body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_hor_ruler,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_horizontal_scroll,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_hscrollbar{height:0!important;min-height:0!important;max-height:0!important;}',\n"
    "            'body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vert_ruler,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vertical_scroll,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vscrollbar,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_buttonTabs{width:0!important;min-width:0!important;max-width:0!important;}',",
    'chrome interno del editor',
)

replace_once(
    "            '.wlt-mobile-formatbar{position:fixed;z-index:12000;left:50%;bottom:calc(10px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:calc(100% - 28px);max-width:560px;height:58px;padding:0 8px;display:flex;align-items:center;justify-content:space-around;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:30px;box-shadow:0 10px 35px rgba(0,0,0,.28);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}',",
    "            '.wlt-mobile-formatbar{position:fixed;z-index:12000;left:50%;bottom:calc(10px + var(--wlt-keyboard-offset) + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:calc(100% - 28px);max-width:560px;height:58px;padding:0 8px;display:flex;align-items:center;justify-content:space-around;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:30px;box-shadow:0 10px 35px rgba(0,0,0,.28);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);will-change:bottom;}',",
    'barra móvil sobre teclado',
)

replace_once(
    "            '.wlt-mobile-toast{position:fixed;z-index:15000;left:50%;bottom:96px;transform:translate(-50%,12px);max-width:calc(100% - 42px);padding:9px 13px;border-radius:12px;background:rgba(20,20,20,.94);color:#fff;font:13px/1.3 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;opacity:0;pointer-events:none;transition:.18s ease;text-align:center;}',",
    "            '.wlt-mobile-toast{position:fixed;z-index:15000;left:50%;bottom:calc(96px + var(--wlt-keyboard-offset));transform:translate(-50%,12px);max-width:calc(100% - 42px);padding:9px 13px;border-radius:12px;background:rgba(20,20,20,.94);color:#fff;font:13px/1.3 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;opacity:0;pointer-events:none;transition:.18s ease;text-align:center;}',",
    'toast móvil',
)

old_fit = '''    function fitWidthWhenReady(attempt) {
        attempt = attempt || 0
        var button = findControl(['#btn-zoom-towidth', '#btn-zoom-towidth button', '[title*="Ajustar al ancho"]', '[title*="Fit to width"]'])
        var canvas = document.querySelector('#editor_sdk canvas, #editor-container canvas, canvas')
        if (button && canvas) {
            try { button.click() } catch (e) {}
            resizeEditor()
            return
        }
        if (attempt < 50) setTimeout(function () { fitWidthWhenReady(attempt + 1) }, 300)
    }

'''
new_fit = '''    function fitWidthWhenReady(attempt) {
        attempt = attempt || 0
        var button = findControl(['#btn-zoom-towidth', '#btn-zoom-towidth button', '[title*="Ajustar al ancho"]', '[title*="Ajustar a ancho"]', '[title*="Fit to width"]'])
        var canvas = document.querySelector('#editor_sdk canvas, #editor-container canvas, canvas')
        if (button && canvas) {
            resizeEditor()
            try { button.click() } catch (e) {}
            setTimeout(function () {
                try { button.click() } catch (e2) {}
                resizeEditor()
            }, 180)
            setTimeout(function () {
                try { button.click() } catch (e3) {}
                resizeEditor()
            }, 650)
            return
        }
        if (attempt < 50) setTimeout(function () { fitWidthWhenReady(attempt + 1) }, 300)
    }

    function updateVisualViewport(resetBase) {
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

'''
replace_once(old_fit, new_fit, 'ajuste al ancho y teclado')

old_bind = '''        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', function () { setTimeout(resizeEditor, 40) })
        }
        window.addEventListener('orientationchange', function () { setTimeout(resizeEditor, 180) })
'''
new_bind = '''        if (window.visualViewport) {
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
        window.addEventListener('orientationchange', function () {
            maxVisualViewportHeight = 0
            setTimeout(function () {
                updateVisualViewport(true)
                resizeEditor()
                fitWidthWhenReady(0)
            }, 220)
        })
'''
replace_once(old_bind, new_bind, 'eventos de visualViewport')

replace_once(
    "        document.body.classList.add('waltiva-mobile-ui')\n",
    "        document.body.classList.add('waltiva-mobile-ui')\n        updateVisualViewport(true)\n",
    'inicialización del viewport visual',
)

replace_once(
    "        waitForViewport(0)\n        fitWidthWhenReady(0)\n        syncFormatting()\n",
    "        waitForViewport(0)\n        fitWidthWhenReady(0)\n        setTimeout(function () { fitWidthWhenReady(0) }, 900)\n        setTimeout(function () { fitWidthWhenReady(0) }, 1800)\n        syncFormatting()\n",
    'refuerzo de ajuste inicial',
)

path.write_text(s, encoding='utf-8')
print('loading.js actualizado correctamente')
