from pathlib import Path
import re

path = Path('public/web-apps/apps/documenteditor/main/loading.js')
s = path.read_text(encoding='utf-8')

V41 = 'Waltiva Mobile UX v4.1:'
V42 = 'Waltiva Mobile UX v4.2:'

if V42 in s:
    print('Mobile UX v4.2 already applied')
    raise SystemExit(0)
if V41 not in s:
    raise SystemExit('Mobile UX v4.1 base was not found')


def rep(old: str, new: str, label: str, expected: int = 1):
    global s
    count = s.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} match(es), got {count}')
    s = s.replace(old, new, expected)


def sub(pattern: str, replacement: str, label: str):
    global s
    s2, count = re.subn(pattern, lambda _m: replacement, s, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    s = s2


rep(
    ' * Waltiva Mobile UX v4.1: lienzo móvil estable, zoom legible y herramientas superiores fijas.',
    ' * Waltiva Mobile UX v4.2: navegación táctil nativa, selección móvil y lienzo sin franja.',
    'version marker',
)

# Remove ONLYOFFICE's native document-name/header strip on mobile. Waltiva already
# renders its own top bar, so this band only consumes vertical space.
status_rule = "            'body.waltiva-mobile-ui .statusbar{height:0!important;min-height:0!important;max-height:0!important;overflow:hidden!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}',"
header_rule = "            'body.waltiva-mobile-ui #header,body.waltiva-mobile-ui #box-document-title,body.waltiva-mobile-ui #box-doc-name{display:none!important;height:0!important;min-height:0!important;max-height:0!important;overflow:hidden!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;border:0!important;}',"
rep(status_rule, status_rule + '\n' + header_rule, 'hide native mobile filename strip')

# The old fixed 80% minimum made wide pages feel cropped. Start from fit-to-width
# and apply only a mild mobile readability boost; pinch remains fully user-controlled.
rep(
    '    var MOBILE_READABLE_ZOOM = 80\n',
    '    var MOBILE_CONTENT_ZOOM_MIN = 56\n    var MOBILE_CONTENT_ZOOM_MAX = 72\n    var MOBILE_CONTENT_ZOOM_FACTOR = 1.10\n',
    'adaptive mobile zoom constants',
)

helpers = '''    function getNativeMobileTouchManager() {
        try {
            var api = getEditorApi()
            return api && api.WordControl && api.WordControl.MobileTouchManager || null
        } catch (e) {
            return null
        }
    }

    function refreshNativeTouchScroller() {
        try {
            var manager = getNativeMobileTouchManager()
            if (manager && manager.iScroll && typeof manager.iScroll.refresh === 'function') {
                manager.iScroll.refresh()
            }
        } catch (e) {}
    }

    function resetMobileDocumentOrigin() {
        try {
            var api = getEditorApi()
            var wordControl = api && api.WordControl
            var hor = wordControl && wordControl.m_oScrollHorApi
            var ver = wordControl && wordControl.m_oScrollVerApi
            if (hor && typeof hor.scrollToX === 'function') hor.scrollToX(0, false)
            if (ver && typeof ver.scrollToY === 'function') ver.scrollToY(0, false)
        } catch (e) {}
    }

'''
rep('    function getCurrentZoomPercent(api) {', helpers + '    function getCurrentZoomPercent(api) {', 'native mobile touch helpers')

rep(
    '''            api.zoom(next)
            return true''',
    '''            api.zoom(next)
            setTimeout(refreshNativeTouchScroller, 30)
            return true''',
    'refresh touch scroller after zoom',
)

sub(
    r"    function ensureMobileReadableZoom\(\) \{.*?\n    \}\n\n    function bindDocumentTouchNavigation\(\) \{",
    '''    function ensureMobileReadableZoom() {
        var api = getEditorApi()
        if (!api) return false
        var current = getCurrentZoomPercent(api)
        var target = Math.round(current * MOBILE_CONTENT_ZOOM_FACTOR)
        target = Math.max(MOBILE_CONTENT_ZOOM_MIN, Math.min(MOBILE_CONTENT_ZOOM_MAX, target))
        var ok = current >= target ? true : setDocumentZoom(target)
        setTimeout(function () {
            resetMobileDocumentOrigin()
            refreshNativeTouchScroller()
        }, 90)
        return ok
    }

    function bindDocumentTouchNavigation() {''',
    'adaptive fit zoom',
)

# ONLYOFFICE already ships a dedicated Word mobile touch manager with iScroll,
# long-tap selection handles and native zoom modes. Our previous capture-phase
# one-finger pan swallowed those events, which broke scrolling and selection.
# Use ONLYOFFICE's manager whenever it is ready; retain custom pinch only as a fallback.
native_touch = '''    function bindDocumentTouchNavigation() {
        var pinchActive = false
        var startDistance = 0
        var startZoom = 100
        var pendingZoom = 100
        var zoomFrame = 0

        function nativeTouchReady() {
            var manager = getNativeMobileTouchManager()
            return !!(manager && manager.iScroll)
        }

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

        document.addEventListener('touchstart', function (event) {
            if (!insideViewport(event.target) || !event.touches) return

            // Native ONLYOFFICE mobile input must receive one-finger movement,
            // long press and selection-handle drags without Waltiva intercepting it.
            if (nativeTouchReady()) {
                pinchActive = false
                return
            }

            if (event.touches.length !== 2) return
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
            if (!insideViewport(event.target) || !event.touches) return
            if (nativeTouchReady()) {
                pinchActive = false
                return
            }
            if (!pinchActive || event.touches.length !== 2) return
            var currentDistance = distance(event.touches)
            if (!currentDistance || !startDistance) return
            event.preventDefault()
            event.stopPropagation()
            scheduleZoom(startZoom * (currentDistance / startDistance))
        }, { passive: false, capture: true })

        document.addEventListener('touchend', function (event) {
            if (!event.touches || event.touches.length < 2) {
                pinchActive = false
                startDistance = 0
                setTimeout(refreshNativeTouchScroller, 20)
            }
        }, { passive: true, capture: true })

        document.addEventListener('touchcancel', function () {
            pinchActive = false
            startDistance = 0
            setTimeout(refreshNativeTouchScroller, 20)
        }, { passive: true, capture: true })
    }

    function performAction(action) {'''
sub(
    r"    function bindDocumentTouchNavigation\(\) \{.*?\n    \}\n\n    function performAction\(action\) \{",
    native_touch,
    'native-first touch navigation',
)

rep(
    '''    function resizeEditor() {
        try { window.dispatchEvent(new Event('resize')) } catch (e) {
            var ev = document.createEvent('Event'); ev.initEvent('resize', true, true); window.dispatchEvent(ev)
        }
    }''',
    '''    function resizeEditor() {
        try { window.dispatchEvent(new Event('resize')) } catch (e) {
            var ev = document.createEvent('Event'); ev.initEvent('resize', true, true); window.dispatchEvent(ev)
        }
        setTimeout(refreshNativeTouchScroller, 30)
    }''',
    'refresh native scroller after resize',
)

path.write_text(s, encoding='utf-8')
print('Mobile UX v4.2 applied successfully')
