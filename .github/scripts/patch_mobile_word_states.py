from pathlib import Path
import re

# Mobile UX v3: patch the already-installed v2 layer without touching ONLYOFFICE core files.
path = Path('public/web-apps/apps/documenteditor/main/loading.js')
s = path.read_text(encoding='utf-8')
V2 = 'Waltiva Mobile UX v2'
V3 = 'Waltiva Mobile UX v3'

if V3 in s:
    print('Mobile UX v3 already applied')
    raise SystemExit(0)
if V2 not in s:
    raise SystemExit('Mobile UX v2 base was not found')


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


rep(
    ' * Waltiva Mobile UX v2: chrome persistente, quick tools desplazables y pinch zoom.',
    ' * Waltiva Mobile UX v3: acciones nativas, teclado persistente y pinch zoom continuo.',
    'version marker',
)

# The edit tools are part of edit mode, not of the software-keyboard state. Keeping
# their visibility tied to VisualViewport made them disappear as soon as a native
# control briefly moved focus away from the editor.
rep(
    "            'body.waltiva-mobile-ui.waltiva-mobile-keyboard-open:not(.waltiva-mobile-view-mode) .wlt-mobile-formatbar{display:flex;}',",
    "            'body.waltiva-mobile-ui:not(.waltiva-mobile-view-mode) .wlt-mobile-formatbar{display:flex;}',",
    'edit toolbar visibility',
)

# Opening Inicio / Insertar must not intentionally blur the editable surface.
rep(
    "        if (currentSheet === 'inicio' || currentSheet === 'insertar') hideKeyboard()\n",
    '',
    'sheet keyboard preservation',
)

helpers = r'''    function getEditorApi() {
        try {
            if (window.DE && typeof DE.getController === 'function') {
                var status = DE.getController('Statusbar')
                if (status && status.api) return status.api
                var toolbarController = DE.getController('Toolbar')
                if (toolbarController && toolbarController.api) return toolbarController.api
                var main = DE.getController('Main')
                if (main && main.api) return main.api
            }
        } catch (e) {}
        try {
            if (window.Asc && window.Asc.editor) return window.Asc.editor
        } catch (e2) {}
        return null
    }

    function getToolbarController() {
        try {
            if (window.DE && typeof DE.getController === 'function') return DE.getController('Toolbar') || null
        } catch (e) {}
        return null
    }

    function restoreEditingFocus(wasKeyboardOpen) {
        if (!wasKeyboardOpen) return
        var api = getEditorApi()
        try {
            if (api && typeof api.asc_enableKeyEvents === 'function') api.asc_enableKeyEvents(true)
        } catch (e) {}
        // ONLYOFFICE's own FocusEditor implementation focuses this hidden input.
        // Doing it synchronously keeps the iOS virtual keyboard alive after a toolbar tap.
        try {
            if (window.AscCommon && AscCommon.g_inputContext && AscCommon.g_inputContext.HtmlArea) {
                AscCommon.g_inputContext.HtmlArea.focus()
            }
        } catch (e2) {}
        setTimeout(function () { updateVisualViewport(false) }, 40)
    }

    function runNativeEditorAction(action) {
        var controller = getToolbarController()
        var toolbar = controller && controller.toolbar
        var api = (controller && controller.api) || getEditorApi()
        try {
            switch (action) {
                case 'undo':
                    if (controller && typeof controller.onUndo === 'function') controller.onUndo()
                    else if (api && typeof api.Undo === 'function') api.Undo()
                    else return false
                    return true
                case 'redo':
                    if (controller && typeof controller.onRedo === 'function') controller.onRedo()
                    else if (api && typeof api.Redo === 'function') api.Redo()
                    else return false
                    return true
                case 'bold':
                case 'italic':
                case 'underline':
                case 'strike': {
                    if (!controller || !toolbar) return false
                    var map = {
                        bold: ['btnBold', 'onBold'],
                        italic: ['btnItalic', 'onItalic'],
                        underline: ['btnUnderline', 'onUnderline'],
                        strike: ['btnStrikeout', 'onStrikeout']
                    }
                    var item = map[action]
                    var btn = toolbar[item[0]]
                    var handler = controller[item[1]]
                    if (!btn || typeof handler !== 'function') return false
                    var pressed = !btn.pressed
                    if (typeof btn.toggle === 'function') btn.toggle(pressed, true)
                    handler.call(controller, { pressed: pressed })
                    return true
                }
                case 'bullets': {
                    if (!controller || !toolbar || !toolbar.btnMarkers || typeof controller.onMarkers !== 'function') return false
                    var bulletPressed = !toolbar.btnMarkers.pressed
                    if (typeof toolbar.btnMarkers.toggle === 'function') toolbar.btnMarkers.toggle(bulletPressed, true)
                    controller.onMarkers({ pressed: bulletPressed })
                    return true
                }
                case 'numbering': {
                    if (!controller || !toolbar || !toolbar.btnNumbers || typeof controller.onNumbers !== 'function') return false
                    var numberPressed = !toolbar.btnNumbers.pressed
                    if (typeof toolbar.btnNumbers.toggle === 'function') toolbar.btnNumbers.toggle(numberPressed, true)
                    controller.onNumbers({ pressed: numberPressed })
                    return true
                }
                case 'align-left':
                    if (controller && typeof controller.onHorizontalAlign === 'function') {
                        controller.onHorizontalAlign(1, { pressed: true })
                        return true
                    }
                    if (api && typeof api.put_PrAlign === 'function') {
                        api.put_PrAlign(1)
                        return true
                    }
                    return false
                default:
                    return false
            }
        } catch (error) {
            console.debug('Waltiva Mobile: falló la acción nativa ' + action + '.', error)
            return false
        }
    }

    function getCurrentZoomPercent(api) {
        try {
            var value = api && api.WordControl && api.WordControl.m_nZoomValue
            if (typeof value === 'number' && isFinite(value) && value > 0) return value
        } catch (e) {}
        var label = document.querySelector('.statusbar #label-zoom')
        var match = label && String(label.textContent || '').match(/(\d+)\s*%/)
        return match ? parseInt(match[1], 10) : 100
    }

    function setDocumentZoom(value) {
        var api = getEditorApi()
        if (!api || typeof api.zoom !== 'function') return false
        var next = Math.max(50, Math.min(500, Math.round(value)))
        try {
            api.zoom(next)
            return true
        } catch (error) {
            console.debug('Waltiva Mobile: no se pudo aplicar el zoom.', error)
            return false
        }
    }

    function bindDocumentPinchZoom() {
        var pinchActive = false
        var startDistance = 0
        var startZoom = 100
        var pendingZoom = 100
        var zoomFrame = 0

        function insideViewport(target) {
            return !!(target && (target.id === 'viewport' || (target.closest && target.closest('#viewport'))))
        }
        function distance(touches) {
            if (!touches || touches.length < 2) return 0
            var dx = touches[0].clientX - touches[1].clientX
            var dy = touches[0].clientY - touches[1].clientY
            return Math.sqrt(dx * dx + dy * dy)
        }
        function scheduleZoom(value) {
            pendingZoom = value
            if (zoomFrame) return
            var raf = window.requestAnimationFrame || function (callback) { return setTimeout(callback, 16) }
            zoomFrame = raf(function () {
                zoomFrame = 0
                setDocumentZoom(pendingZoom)
            })
        }
        function endPinch() {
            pinchActive = false
            startDistance = 0
        }

        document.addEventListener('touchstart', function (event) {
            if (!event.touches || event.touches.length !== 2 || !insideViewport(event.target)) return
            var api = getEditorApi()
            if (!api || typeof api.zoom !== 'function') return
            startDistance = distance(event.touches)
            if (!startDistance) return
            startZoom = getCurrentZoomPercent(api)
            pendingZoom = startZoom
            pinchActive = true
            event.preventDefault()
            event.stopPropagation()
        }, { passive: false, capture: true })

        document.addEventListener('touchmove', function (event) {
            if (!pinchActive || !event.touches || event.touches.length !== 2) return
            var currentDistance = distance(event.touches)
            if (!currentDistance || !startDistance) return
            event.preventDefault()
            event.stopPropagation()
            scheduleZoom(startZoom * (currentDistance / startDistance))
        }, { passive: false, capture: true })

        document.addEventListener('touchend', function (event) {
            if (!event.touches || event.touches.length < 2) endPinch()
        }, { passive: true, capture: true })
        document.addEventListener('touchcancel', endPinch, { passive: true, capture: true })

        // Prevent Safari's page-level gesture zoom; document zoom is handled above.
        document.addEventListener('gesturestart', function (event) {
            if (insideViewport(event.target)) event.preventDefault()
        }, { passive: false, capture: true })
        document.addEventListener('gesturechange', function (event) {
            if (insideViewport(event.target)) event.preventDefault()
        }, { passive: false, capture: true })
    }'''

sub(
    r"    function zoomByStep\(direction\) \{.*?\n    \}\n\n    function bindDocumentPinchZoom\(\) \{.*?\n    \}\n\n    function performAction",
    helpers + '\n\n    function performAction',
    'native actions and continuous pinch zoom',
    re.S,
)

rep(
    "    function performAction(action) {\n        var ok = true\n",
    "    function performAction(action) {\n        var ok = true\n        var keyboardWasOpen = keyboardOffset > 0 || !!(document.body && document.body.classList.contains('waltiva-mobile-keyboard-open'))\n",
    'remember keyboard state',
)

# Simple editing actions go through the same controller/API handlers used by
# ONLYOFFICE itself. DOM clicks remain as a fallback for delayed initialization.
replacements = {
    "            case 'undo': ok = clickControl(['.toolbar .btn-undo', '.btn-undo'], 'No hay cambios para deshacer.'); break\n":
        "            case 'undo': ok = runNativeEditorAction('undo') || clickControl(['#id-toolbar-btn-undo', '.toolbar .btn-undo', '.btn-undo'], 'No hay cambios para deshacer.'); restoreEditingFocus(keyboardWasOpen); break\n",
    "            case 'redo': ok = clickControl(['.toolbar .btn-redo', '.btn-redo'], 'No hay cambios para rehacer.'); break\n":
        "            case 'redo': ok = runNativeEditorAction('redo') || clickControl(['#id-toolbar-btn-redo', '.toolbar .btn-redo', '.btn-redo'], 'No hay cambios para rehacer.'); restoreEditingFocus(keyboardWasOpen); break\n",
    "            case 'bold': ok = clickControl(['.toolbar .btn-bold', '.btn-bold']); break\n":
        "            case 'bold': ok = runNativeEditorAction('bold') || clickControl(['#id-toolbar-btn-bold', '.toolbar .btn-bold', '.btn-bold']); restoreEditingFocus(keyboardWasOpen); break\n",
    "            case 'italic': ok = clickControl(['.toolbar .btn-italic', '.btn-italic']); break\n":
        "            case 'italic': ok = runNativeEditorAction('italic') || clickControl(['#id-toolbar-btn-italic', '.toolbar .btn-italic', '.btn-italic']); restoreEditingFocus(keyboardWasOpen); break\n",
    "            case 'underline': ok = clickControl(['.toolbar .btn-underline', '.btn-underline']); break\n":
        "            case 'underline': ok = runNativeEditorAction('underline') || clickControl(['#id-toolbar-btn-underline', '.toolbar .btn-underline', '.btn-underline']); restoreEditingFocus(keyboardWasOpen); break\n",
    "            case 'strike': ok = clickControl(['.toolbar .btn-strikeout', '.btn-strikeout']); break\n":
        "            case 'strike': ok = runNativeEditorAction('strike') || clickControl(['#id-toolbar-btn-strikeout', '.toolbar .btn-strikeout', '.btn-strikeout']); restoreEditingFocus(keyboardWasOpen); break\n",
    "            case 'fontcolor': ok = clickControl(['.toolbar .btn-fontcolor', '.btn-fontcolor']); break\n":
        "            case 'fontcolor': ok = clickControl(['#id-toolbar-btn-fontcolor', '.toolbar .btn-fontcolor', '.btn-fontcolor']); break\n",
    "            case 'highlight': ok = clickControl(['.toolbar .btn-highlight', '.toolbar .btn-marker', '.btn-highlight', '.btn-marker']); break\n":
        "            case 'highlight': ok = clickControl(['#id-toolbar-btn-highlight', '.toolbar .btn-highlight', '.btn-highlight']); break\n",
    "            case 'bullets': ok = clickControl(['.toolbar .btn-bullets', '.btn-bullets', '[title*=\"Viñetas\"]', '[title*=\"Bullets\"]']); break\n":
        "            case 'bullets': ok = runNativeEditorAction('bullets') || clickControl(['#id-toolbar-btn-markers', '.toolbar .btn-setmarkers', '.btn-setmarkers', '[title*=\"Viñetas\"]', '[title*=\"Bullets\"]']); restoreEditingFocus(keyboardWasOpen); break\n",
    "            case 'numbering': ok = clickControl(['.toolbar .btn-numbering', '.btn-numbering', '[title*=\"Numeración\"]', '[title*=\"Numbering\"]']); break\n":
        "            case 'numbering': ok = runNativeEditorAction('numbering') || clickControl(['#id-toolbar-btn-numbering', '.toolbar .btn-numbering', '.btn-numbering', '[title*=\"Numeración\"]', '[title*=\"Numbering\"]']); restoreEditingFocus(keyboardWasOpen); break\n",
    "            case 'align-left': ok = clickControl(['.toolbar .btn-align-left', '.btn-align-left', '[title*=\"Alinear a la izquierda\"]', '[title*=\"Align left\"]']); break\n":
        "            case 'align-left': ok = runNativeEditorAction('align-left') || clickControl(['#id-toolbar-btn-align-left', '.toolbar .btn-align-left', '.btn-align-left', '[title*=\"Alinear a la izquierda\"]', '[title*=\"Align left\"]']); restoreEditingFocus(keyboardWasOpen); break\n",
    "            case 'page': closeSheet(); ok = clickControl(['.toolbar .btn-blankpage', '.toolbar .btn-pagebreak', '.btn-blankpage', '.btn-pagebreak']); break\n":
        "            case 'page': closeSheet(); ok = clickControl(['#id-toolbar-btn-blankpage', '.toolbar .btn-blankpage', '.toolbar .btn-pagebreak', '.btn-blankpage', '.btn-pagebreak']); break\n",
    "            case 'table': closeSheet(); ok = clickControl(['.toolbar .btn-inserttable', '.btn-inserttable']); break\n":
        "            case 'table': closeSheet(); ok = clickControl(['#tlbtn-inserttable', '.toolbar .btn-inserttable', '.btn-inserttable']); break\n",
    "            case 'image':\n            case 'camera': closeSheet(); ok = clickControl(['.toolbar .btn-insertimage', '.btn-insertimage'], 'El selector de imágenes no está disponible.'); break\n":
        "            case 'image':\n            case 'camera': closeSheet(); ok = clickControl(['[id^=\"tlbtn-insertimage-\"]', '.toolbar .btn-insertimage', '.btn-insertimage'], 'El selector de imágenes no está disponible.'); break\n",
    "            case 'shape': closeSheet(); ok = clickControl(['.toolbar .btn-insertshape', '.btn-insertshape']); break\n":
        "            case 'shape': closeSheet(); ok = clickControl(['#tlbtn-insertshape', '.toolbar .btn-insertshape', '.btn-insertshape']); break\n",
    "            case 'textbox': closeSheet(); ok = clickControl(['.toolbar .btn-big-text', '.toolbar .btn-text', '.btn-big-text', '.btn-text']); break\n":
        "            case 'textbox': closeSheet(); ok = clickControl(['#tlbtn-inserttext', '.toolbar .btn-big-text', '.toolbar .btn-text', '.btn-big-text', '.btn-text']); break\n",
}

for old, new in replacements.items():
    rep(old, new, old.strip().split(':', 1)[0])

# Exact zoom button IDs are kept as a fallback for the explicit fit/status controls.
# Pinch itself no longer relies on these hidden DOM controls.

path.write_text(s, encoding='utf-8')
print('Mobile UX v3 applied successfully')
