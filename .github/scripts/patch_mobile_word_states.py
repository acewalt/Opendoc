from pathlib import Path

path = Path('public/web-apps/apps/documenteditor/main/loading.js')
s = path.read_text(encoding='utf-8')

V4 = 'Waltiva Mobile UX v4:'
V41 = 'Waltiva Mobile UX v4.1:'

if V41 in s:
    print('Mobile UX v4.1 already applied')
    raise SystemExit(0)
if V4 not in s:
    raise SystemExit('Mobile UX v4 base was not found')


def rep(old: str, new: str, label: str, expected: int = 1):
    global s
    count = s.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} match(es), got {count}')
    s = s.replace(old, new, expected)


rep(
    ' * Waltiva Mobile UX v4: herramientas superiores estables, paneo táctil y acciones móviles directas.',
    ' * Waltiva Mobile UX v4.1: lienzo móvil estable, zoom legible y herramientas superiores fijas.',
    'version marker',
)

# Do not shrink the ONLYOFFICE drawing viewport by the software-keyboard height.
# Safari already clips the visual viewport; shrinking the canvas again made the
# caret/document jump toward the bottom of the screen while typing.
rep(
    "            'body.waltiva-mobile-ui #viewport{top:calc(var(--wlt-visual-top) + var(--wlt-mobile-top) + var(--wlt-mobile-tools) + env(safe-area-inset-top,0px))!important;bottom:calc(var(--wlt-keyboard-offset) + env(safe-area-inset-bottom,0px))!important;left:0!important;right:0!important;width:auto!important;background:#fff!important;touch-action:none!important;overscroll-behavior:none!important;}',",
    "            'body.waltiva-mobile-ui #viewport{top:calc(var(--wlt-visual-top) + var(--wlt-mobile-top) + var(--wlt-mobile-tools) + env(safe-area-inset-top,0px))!important;bottom:env(safe-area-inset-bottom,0px)!important;left:0!important;right:0!important;width:auto!important;background:#fff!important;touch-action:none!important;overscroll-behavior:none!important;}',",
    'decouple canvas from keyboard height',
)

rep(
    '    var visualTop = 0\n',
    '    var visualTop = 0\n    var MOBILE_READABLE_ZOOM = 80\n',
    'mobile readable zoom constant',
)

zoom_anchor = '''    function setDocumentZoom(value) {
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

    function bindDocumentTouchNavigation() {'''
zoom_replacement = '''    function setDocumentZoom(value) {
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

    function ensureMobileReadableZoom() {
        var api = getEditorApi()
        if (!api) return false
        var current = getCurrentZoomPercent(api)
        if (current >= MOBILE_READABLE_ZOOM) return true
        return setDocumentZoom(MOBILE_READABLE_ZOOM)
    }

    function bindDocumentTouchNavigation() {'''
rep(zoom_anchor, zoom_replacement, 'readable zoom helper')

rep(
    '''                api.WordControl.zoom_FitToWidth()
                setTimeout(resizeEditor, 80)
                return''',
    '''                api.WordControl.zoom_FitToWidth()
                setTimeout(function () {
                    ensureMobileReadableZoom()
                    resizeEditor()
                }, 100)
                return''',
    'fit width direct readable zoom',
)

rep(
    '''            setTimeout(function () {
                try { button.click() } catch (e2) {}
                resizeEditor()
            }, 180)
            return''',
    '''            setTimeout(function () {
                try { button.click() } catch (e2) {}
                resizeEditor()
            }, 180)
            setTimeout(function () {
                ensureMobileReadableZoom()
                resizeEditor()
            }, 320)
            return''',
    'fit width fallback readable zoom',
)

# VisualViewport changes caused by the iOS keyboard must update our fixed UI,
# but should not repeatedly resize ONLYOFFICE's canvas. That resize is what
# made the document/caret migrate vertically while typing.
rep(
    '''        if (document.body) document.body.classList.toggle('waltiva-mobile-keyboard-open', keyboardOffset > 0)
        setTimeout(resizeEditor, 20)
    }''',
    '''        if (document.body) document.body.classList.toggle('waltiva-mobile-keyboard-open', keyboardOffset > 0)
    }''',
    'stop keyboard-triggered editor resize',
)

rep(
    '''            var onVisualViewportChange = function () {
                updateVisualViewport(false)
                setTimeout(resizeEditor, 40)
            }''',
    '''            var onVisualViewportChange = function () {
                updateVisualViewport(false)
            }''',
    'visual viewport handler',
)

rep(
    '''                window.parent.addEventListener('resize', function () {
                    updateVisualViewport(false)
                    setTimeout(resizeEditor, 60)
                })''',
    '''                window.parent.addEventListener('resize', function () {
                    updateVisualViewport(false)
                    if (!keyboardOffset) setTimeout(resizeEditor, 60)
                })''',
    'parent resize guard',
)

rep(
    '''        window.addEventListener('resize', function () {
            updateVisualViewport(false)
            setTimeout(resizeEditor, 60)
        })''',
    '''        window.addEventListener('resize', function () {
            updateVisualViewport(false)
            if (!keyboardOffset) setTimeout(resizeEditor, 60)
        })''',
    'window resize guard',
)

path.write_text(s, encoding='utf-8')
print('Mobile UX v4.1 applied successfully')
