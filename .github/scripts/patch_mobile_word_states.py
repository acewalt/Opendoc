from pathlib import Path
import re

path = Path('public/web-apps/apps/documenteditor/main/loading.js')
s = path.read_text(encoding='utf-8')

V31 = 'Waltiva Mobile UX v3.1:'
V4 = 'Waltiva Mobile UX v4:'

if V4 in s:
    print('Mobile UX v4 already applied')
    raise SystemExit(0)
if V31 not in s:
    raise SystemExit('Mobile UX v3.1 base was not found')


def rep(old: str, new: str, label: str, expected: int = 1):
    global s
    count = s.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} match(es), got {count}')
    s = s.replace(old, new, expected)


def sub(pattern: str, new: str, label: str, flags=re.S):
    global s
    s2, count = re.subn(pattern, lambda m: new, s, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    s = s2


rep(
    ' * Waltiva Mobile UX v3.1: acciones nativas verificadas, teclado persistente y pinch zoom continuo.',
    ' * Waltiva Mobile UX v4: herramientas superiores estables, paneo táctil y acciones móviles directas.',
    'version marker',
)

rep(
    "            ':root{--wlt-mobile-top:56px;--wlt-mobile-bottom:84px;--wlt-keyboard-offset:0px;--wlt-visual-top:0px;}',",
    "            ':root{--wlt-mobile-top:56px;--wlt-mobile-tools:64px;--wlt-mobile-bottom:0px;--wlt-keyboard-offset:0px;--wlt-visual-top:0px;}',",
    'root toolbar geometry',
)
rep(
    "            'body.waltiva-mobile-ui #viewport{top:calc(var(--wlt-visual-top) + var(--wlt-mobile-top) + env(safe-area-inset-top,0px))!important;bottom:calc(var(--wlt-mobile-bottom) + var(--wlt-keyboard-offset) + env(safe-area-inset-bottom,0px))!important;left:0!important;right:0!important;width:auto!important;background:#fff!important;touch-action:pan-x pan-y!important;}',",
    "            'body.waltiva-mobile-ui #viewport{top:calc(var(--wlt-visual-top) + var(--wlt-mobile-top) + var(--wlt-mobile-tools) + env(safe-area-inset-top,0px))!important;bottom:calc(var(--wlt-keyboard-offset) + env(safe-area-inset-bottom,0px))!important;left:0!important;right:0!important;width:auto!important;background:#fff!important;touch-action:none!important;overscroll-behavior:none!important;}',",
    'viewport top toolbar and touch',
)
rep(
    "            '.wlt-mobile-formatbar{position:fixed;z-index:12000;left:50%;bottom:calc(18px + var(--wlt-keyboard-offset) + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:calc(100% - 24px);max-width:560px;height:60px;padding:0 7px;display:none;align-items:center;justify-content:flex-start;overflow:hidden;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:31px;box-shadow:0 10px 35px rgba(0,0,0,.28);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);will-change:bottom;}',",
    "            '.wlt-mobile-formatbar{position:fixed;z-index:12000;left:50%;top:calc(var(--wlt-visual-top) + var(--wlt-mobile-top) + env(safe-area-inset-top,0px) + 5px);bottom:auto;transform:translateX(-50%);width:calc(100% - 16px);max-width:560px;height:54px;padding:0 7px;display:none;align-items:center;justify-content:flex-start;overflow:hidden;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:22px;box-shadow:0 8px 26px rgba(0,0,0,.24);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);will-change:top;}',",
    'edit toolbar fixed top',
)
rep(
    "            '.wlt-mobile-viewbar{position:fixed;z-index:12000;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(326px,calc(100% - 54px));height:60px;padding:0 9px;display:none;align-items:center;justify-content:space-around;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:31px;box-shadow:0 10px 35px rgba(0,0,0,.28);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}',",
    "            '.wlt-mobile-viewbar{position:fixed;z-index:12000;left:50%;top:calc(var(--wlt-visual-top) + var(--wlt-mobile-top) + env(safe-area-inset-top,0px) + 5px);bottom:auto;transform:translateX(-50%);width:min(326px,calc(100% - 20px));height:54px;padding:0 9px;display:none;align-items:center;justify-content:space-around;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:22px;box-shadow:0 8px 26px rgba(0,0,0,.24);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}',",
    'viewer toolbar fixed top',
)
rep(
    "            '.wlt-mobile-formatbar .wlt-mobile-btn{height:46px;min-width:44px;flex:0 0 44px;padding:0 7px;border-radius:20px;font-size:21px;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;}',",
    "            '.wlt-mobile-formatbar .wlt-mobile-btn{height:44px;min-width:44px;flex:0 0 44px;padding:0 7px;border-radius:18px;font-size:21px;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;}',",
    'top quick button dimensions',
)

sheet_block = r'''    function sheetContent(kind) {
        if (kind === 'inicio') {
            return [
                sheetRow('fontname', icons.format, 'Fuente', 'Elegir fuente', true),
                sheetRow('fontsize', icons.format, 'Tamaño de fuente', 'Elegir tamaño', true),
                sheetRow('bold', icons.format, 'Negrita'),
                sheetRow('italic', icons.format, 'Cursiva'),
                sheetRow('underline', icons.format, 'Subrayado'),
                sheetRow('strike', icons.format, 'Tachado'),
                sheetRow('highlight', icons.highlight, 'Color de resaltado', '', true),
                sheetRow('fontcolor', icons.color, 'Color de fuente', '', true),
                sheetRow('bullets', icons.bullets, 'Viñetas'),
                sheetRow('numbering', icons.numbering, 'Numeración'),
                sheetRow('align', icons.align, 'Alineación y párrafo', '', true),
                sheetRow('math', icons.math, 'Vista matemática'),
                sheetRow('search', icons.search, 'Buscar')
            ].join('')
        }

        if (kind === 'shape-picker') {
            var shapeOptions = [
                ['rect', 'Rectángulo'], ['roundRect', 'Rectángulo redondeado'],
                ['ellipse', 'Elipse'], ['triangle', 'Triángulo'],
                ['rtTriangle', 'Triángulo rectángulo'], ['diamond', 'Rombo'],
                ['parallelogram', 'Paralelogramo'], ['trapezoid', 'Trapecio'],
                ['hexagon', 'Hexágono'], ['octagon', 'Octágono'],
                ['line', 'Línea'], ['lineWithArrow', 'Línea con flecha'],
                ['lineWithTwoArrows', 'Línea con dos flechas'], ['rightArrow', 'Flecha derecha'],
                ['leftArrow', 'Flecha izquierda'], ['leftRightArrow', 'Flecha izquierda-derecha'],
                ['bentArrow', 'Flecha doblada'], ['curvedRightArrow', 'Flecha curva derecha'],
                ['curvedLeftArrow', 'Flecha curva izquierda'], ['circularArrow', 'Flecha circular'],
                ['heart', 'Corazón'], ['mathPlus', 'Símbolo más'],
                ['mathMinus', 'Símbolo menos'], ['cloudCallout', 'Llamada nube'],
                ['wedgeRectCallout', 'Llamada rectangular'], ['wedgeEllipseCallout', 'Llamada elíptica'],
                ['flowChartOffpageConnector', 'Conector de diagrama'], ['textRect', 'Cuadro de texto']
            ]
            return shapeOptions.map(function (item) {
                return sheetRow('shape-type:' + item[0], icons.shape, item[1])
            }).join('')
        }

        if (kind === 'table-picker') {
            return [
                sheetRow('table-size:2x2', icons.table, '2 × 2'),
                sheetRow('table-size:3x3', icons.table, '3 × 3'),
                sheetRow('table-size:4x4', icons.table, '4 × 4'),
                sheetRow('table-size:5x5', icons.table, '5 × 5'),
                sheetRow('table-size:6x6', icons.table, '6 × 6'),
                sheetRow('table-custom', icons.table, 'Tamaño personalizado', '1 a 10 columnas y filas', true)
            ].join('')
        }

        if (kind === 'font-picker') {
            return ['Arial', 'Calibri', 'Cambria', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Courier New']
                .map(function (name) { return sheetRow('font:' + name, icons.format, name) }).join('')
        }

        if (kind === 'fontsize-picker') {
            return [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72]
                .map(function (size) { return sheetRow('fontsize:' + size, icons.format, size + ' pt') }).join('')
        }

        if (kind === 'fontcolor-picker') {
            var colors = [
                ['000000', 'Negro'], ['FFFFFF', 'Blanco'], ['C00000', 'Rojo oscuro'],
                ['FF0000', 'Rojo'], ['ED7D31', 'Naranja'], ['FFC000', 'Amarillo'],
                ['70AD47', 'Verde'], ['00B0F0', 'Azul claro'], ['4472C4', 'Azul'],
                ['7030A0', 'Morado'], ['7F7F7F', 'Gris']
            ]
            return colors.map(function (item) {
                return sheetRow('fontcolor:' + item[0], icons.color, item[1])
            }).join('')
        }

        if (kind === 'highlight-picker') {
            var highlights = [
                ['none', 'Sin resaltado'], ['FFFF00', 'Amarillo'], ['00FF00', 'Verde'],
                ['00FFFF', 'Cian'], ['FF00FF', 'Magenta'], ['FF0000', 'Rojo'],
                ['0000FF', 'Azul'], ['808080', 'Gris']
            ]
            return highlights.map(function (item) {
                return sheetRow('highlight:' + item[0], icons.highlight, item[1])
            }).join('')
        }

        if (kind === 'align-picker') {
            return [
                sheetRow('align:left', icons.align, 'Alinear a la izquierda'),
                sheetRow('align:center', icons.align, 'Centrar'),
                sheetRow('align:right', icons.align, 'Alinear a la derecha'),
                sheetRow('align:justify', icons.align, 'Justificar')
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
            sheetRow('shape', icons.shape, 'Formas', 'Selector móvil', true),
            sheetRow('textbox', icons.text, 'Cuadro de texto'),
            sheetRow('image', icons.image, 'Imagen desde archivo'),
            sheetRow('image-url', icons.image, 'Imagen desde URL'),
            sheetRow('link', icons.link, 'Vínculo'),
            sheetRow('add-comment', icons.comment, 'Comentario'),
            sheetRow('equation', icons.equation, 'Ecuación'),
            sheetRow('page', icons.page, 'Salto de página'),
            sheetRow('table', icons.table, 'Tabla', 'Elegir tamaño', true),
            sheetRow('native', icons.tools, 'Más opciones de inserción', 'Abrir herramientas completas')
        ].join('')
    }

    function sheetTitle(kind) {
        var titles = {
            inicio: 'Inicio',
            insertar: 'Insertar',
            mas: 'Más',
            'shape-picker': 'Formas',
            'table-picker': 'Tabla',
            'font-picker': 'Fuente',
            'fontsize-picker': 'Tamaño',
            'fontcolor-picker': 'Color de fuente',
            'highlight-picker': 'Resaltado',
            'align-picker': 'Alineación'
        }
        return titles[kind] || 'Herramientas'
    }

    function openSheet(kind) {
        currentSheet = kind || 'insertar'
        var sheet = document.getElementById('wlt-mobile-sheet')
        var mask = document.getElementById('wlt-mobile-sheet-mask')
        var list = document.getElementById('wlt-mobile-sheet-list')
        var title = document.getElementById('wlt-mobile-sheet-title')
        if (!sheet || !mask || !list || !title) return
        title.textContent = sheetTitle(currentSheet)
        if (currentSheet === 'inicio' || currentSheet === 'insertar') {
            title.setAttribute('data-wlt-action', 'switch-sheet')
        } else {
            title.removeAttribute('data-wlt-action')
        }
        list.innerHTML = sheetContent(currentSheet)
        sheet.classList.add('open')
        mask.classList.add('open')
    }

    function toggleMath() {'''
sub(
    r"    function sheetContent\(kind\) \{.*?\n    \}\n\n    function openSheet\(kind\) \{.*?\n    \}\n\n    function toggleMath\(\) \{",
    sheet_block,
    'mobile sheet pickers',
)

helpers = r'''    function directEditorApiAction(label, callback) {
        var api = getEditorApi()
        if (!api) {
            toast(label + ' no está disponible todavía.')
            return false
        }
        try {
            callback(api)
            return true
        } catch (error) {
            console.debug('Waltiva Mobile: falló ' + label + '.', error)
            toast('No se pudo ejecutar ' + label.toLowerCase() + '.')
            return false
        }
    }

    function insertShapeType(type) {
        closeSheet()
        return directEditorApiAction('Formas', function (api) {
            if (typeof api.AddShapeOnCurrentPage !== 'function') throw new Error('AddShapeOnCurrentPage unavailable')
            api.AddShapeOnCurrentPage(type)
        })
    }

    function insertTableSize(columns, rows) {
        closeSheet()
        return directEditorApiAction('Tabla', function (api) {
            if (typeof api.put_Table !== 'function') throw new Error('put_Table unavailable')
            api.put_Table(columns, rows)
        })
    }

    function insertCustomTable() {
        var columns = parseInt(window.prompt('Número de columnas (1-10):', '3') || '', 10)
        if (!columns) return false
        var rows = parseInt(window.prompt('Número de filas (1-10):', '3') || '', 10)
        if (!rows) return false
        columns = Math.max(1, Math.min(10, columns))
        rows = Math.max(1, Math.min(10, rows))
        return insertTableSize(columns, rows)
    }

    function insertImageFile() {
        closeSheet()
        return directEditorApiAction('Imagen', function (api) {
            if (typeof api.asc_addImage !== 'function') throw new Error('asc_addImage unavailable')
            api.asc_addImage()
        })
    }

    function insertImageUrl() {
        var value = window.prompt('URL de la imagen:', 'https://')
        if (!value) return false
        value = value.trim()
        if (!/^https?:\/\//i.test(value)) {
            toast('La URL debe comenzar por http:// o https://')
            return false
        }
        closeSheet()
        return directEditorApiAction('Imagen desde URL', function (api) {
            if (typeof api.AddImageUrl !== 'function') throw new Error('AddImageUrl unavailable')
            api.AddImageUrl([value])
        })
    }

    function insertHyperlinkPrompt() {
        var api = getEditorApi()
        if (!api || typeof api.add_Hyperlink !== 'function' || !window.Asc || typeof Asc.CHyperlinkProperty !== 'function') {
            toast('Vínculo no está disponible.')
            return false
        }
        var display = ''
        try {
            if (typeof api.can_AddHyperlink === 'function') {
                var possibleDisplay = api.can_AddHyperlink()
                if (possibleDisplay === false) {
                    toast('No se puede insertar un vínculo aquí.')
                    return false
                }
                if (typeof possibleDisplay === 'string') display = possibleDisplay
            }
        } catch (e) {}
        var value = window.prompt('Dirección del vínculo:', 'https://')
        if (!value) return false
        value = value.trim()
        if (!/^(https?:\/\/|ftp:\/\/|mailto:)/i.test(value)) value = 'https://' + value
        try {
            var props = new Asc.CHyperlinkProperty()
            props.put_Value(value)
            props.put_Text(display || value)
            props.put_ToolTip('')
            api.add_Hyperlink(props)
            closeSheet()
            return true
        } catch (error) {
            console.debug('Waltiva Mobile: no se pudo insertar el vínculo.', error)
            toast('No se pudo insertar el vínculo.')
            return false
        }
    }

    function addCommentDirect() {
        closeSheet()
        try {
            if (window.DE && typeof DE.getController === 'function') {
                var comments = DE.getController('Common.Controllers.Comments')
                if (comments && typeof comments.addDummyComment === 'function') {
                    comments.addDummyComment()
                    return true
                }
            }
        } catch (error) {
            console.debug('Waltiva Mobile: no se pudo crear el comentario.', error)
        }
        return clickControl(['[id^="tlbtn-addcomment-"]', '.slot-comment button', '.btn-big-add-comment'], 'No se puede añadir un comentario aquí.')
    }

    function addEquationDirect() {
        closeSheet()
        return directEditorApiAction('Ecuación', function (api) {
            if (typeof api.asc_AddMath !== 'function') throw new Error('asc_AddMath unavailable')
            api.asc_AddMath()
        })
    }

    function addPageBreakDirect() {
        closeSheet()
        return directEditorApiAction('Salto de página', function (api) {
            if (typeof api.put_AddPageBreak !== 'function') throw new Error('put_AddPageBreak unavailable')
            api.put_AddPageBreak()
        })
    }

    function applyFontName(name) {
        closeSheet()
        return directEditorApiAction('Fuente', function (api) {
            if (typeof api.put_TextPrFontName !== 'function') throw new Error('put_TextPrFontName unavailable')
            api.put_TextPrFontName(name)
        })
    }

    function applyFontSize(size) {
        closeSheet()
        return directEditorApiAction('Tamaño de fuente', function (api) {
            if (typeof api.put_TextPrFontSize !== 'function') throw new Error('put_TextPrFontSize unavailable')
            api.put_TextPrFontSize(size)
        })
    }

    function applyFontColor(hex) {
        closeSheet()
        return directEditorApiAction('Color de fuente', function (api) {
            if (!window.Common || !Common.Utils || !Common.Utils.ThemeColor || typeof api.put_TextColor !== 'function') {
                throw new Error('text color API unavailable')
            }
            api.put_TextColor(Common.Utils.ThemeColor.getRgbColor(hex))
        })
    }

    function applyHighlight(hex) {
        closeSheet()
        return directEditorApiAction('Resaltado', function (api) {
            if (typeof api.SetMarkerFormat !== 'function') throw new Error('SetMarkerFormat unavailable')
            if (hex === 'none') {
                api.SetMarkerFormat(true, false)
                return
            }
            var r = parseInt(hex.slice(0, 2), 16)
            var g = parseInt(hex.slice(2, 4), 16)
            var b = parseInt(hex.slice(4, 6), 16)
            api.SetMarkerFormat(true, true, r, g, b)
        })
    }

    function applyParagraphAlign(type) {
        var values = { left: 1, center: 2, right: 0, justify: 3 }
        if (values[type] === undefined) return false
        closeSheet()
        return directEditorApiAction('Alineación', function (api) {
            if (typeof api.put_PrAlign !== 'function') throw new Error('put_PrAlign unavailable')
            api.put_PrAlign(values[type])
        })
    }

'''
rep(
    "    function getCurrentZoomPercent(api) {",
    helpers + "    function getCurrentZoomPercent(api) {",
    'direct mobile editor helpers',
)

touch_nav = r'''    function bindDocumentTouchNavigation() {
        var pinchActive = false
        var startDistance = 0
        var startZoom = 100
        var pendingZoom = 100
        var zoomFrame = 0

        var panTracking = false
        var panActive = false
        var panStartX = 0
        var panStartY = 0
        var panStartScrollX = 0
        var panStartScrollY = 0
        var PAN_THRESHOLD = 7

        function insideViewport(target) {
            return !!(target && (target.id === 'viewport' || (target.closest && target.closest('#viewport'))))
        }

        function distance(touches) {
            if (!touches || touches.length < 2) return 0
            var dx = touches[0].clientX - touches[1].clientX
            var dy = touches[0].clientY - touches[1].clientY
            return Math.sqrt(dx * dx + dy * dy)
        }

        function getScrollState() {
            var api = getEditorApi()
            var wordControl = api && api.WordControl
            var hor = wordControl && wordControl.m_oScrollHorApi
            var ver = wordControl && wordControl.m_oScrollVerApi
            if (!hor || !ver) return null
            if (typeof hor.getCurScrolledX !== 'function' || typeof ver.getCurScrolledY !== 'function') return null
            return {
                hor: hor,
                ver: ver,
                x: hor.getCurScrolledX(),
                y: ver.getCurScrolledY()
            }
        }

        function maxX(scroll) {
            try {
                if (typeof scroll.getMaxScrolledX === 'function') return scroll.getMaxScrolledX()
            } catch (e) {}
            return Number.MAX_SAFE_INTEGER || 9007199254740991
        }

        function maxY(scroll) {
            try {
                if (typeof scroll.getMaxScrolledY === 'function') return scroll.getMaxScrolledY()
            } catch (e) {}
            return Number.MAX_SAFE_INTEGER || 9007199254740991
        }

        function applyPan(dx, dy) {
            var state = getScrollState()
            if (!state) return false
            var nextX = Math.max(0, Math.min(maxX(state.hor), panStartScrollX - dx))
            var nextY = Math.max(0, Math.min(maxY(state.ver), panStartScrollY - dy))
            if (typeof state.hor.scrollToX === 'function') state.hor.scrollToX(nextX)
            if (typeof state.ver.scrollToY === 'function') state.ver.scrollToY(nextY)
            return true
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

        function resetTouchState() {
            pinchActive = false
            startDistance = 0
            panTracking = false
            panActive = false
        }

        document.addEventListener('touchstart', function (event) {
            if (!insideViewport(event.target) || !event.touches) return

            if (event.touches.length === 2) {
                panTracking = false
                panActive = false
                var api = getEditorApi()
                if (!api || typeof api.zoom !== 'function') return
                startDistance = distance(event.touches)
                if (!startDistance) return
                startZoom = getCurrentZoomPercent(api)
                pendingZoom = startZoom
                pinchActive = true
                event.preventDefault()
                event.stopPropagation()
                return
            }

            if (event.touches.length === 1) {
                var state = getScrollState()
                if (!state) return
                pinchActive = false
                panTracking = true
                panActive = false
                panStartX = event.touches[0].clientX
                panStartY = event.touches[0].clientY
                panStartScrollX = state.x
                panStartScrollY = state.y
            }
        }, { passive: false, capture: true })

        document.addEventListener('touchmove', function (event) {
            if (!insideViewport(event.target) || !event.touches) return

            if (pinchActive && event.touches.length === 2) {
                var currentDistance = distance(event.touches)
                if (!currentDistance || !startDistance) return
                event.preventDefault()
                event.stopPropagation()
                scheduleZoom(startZoom * (currentDistance / startDistance))
                return
            }

            if (panTracking && event.touches.length === 1) {
                var dx = event.touches[0].clientX - panStartX
                var dy = event.touches[0].clientY - panStartY
                if (!panActive && Math.sqrt(dx * dx + dy * dy) >= PAN_THRESHOLD) panActive = true
                if (!panActive) return
                event.preventDefault()
                event.stopPropagation()
                applyPan(dx, dy)
            }
        }, { passive: false, capture: true })

        document.addEventListener('touchend', function (event) {
            if (pinchActive && (!event.touches || event.touches.length < 2)) {
                pinchActive = false
                startDistance = 0
            }
            if (panTracking && (!event.touches || event.touches.length === 0)) {
                if (panActive) {
                    event.preventDefault()
                    event.stopPropagation()
                }
                panTracking = false
                panActive = false
            }
        }, { passive: false, capture: true })

        document.addEventListener('touchcancel', resetTouchState, { passive: true, capture: true })

        document.addEventListener('gesturestart', function (event) {
            if (insideViewport(event.target)) event.preventDefault()
        }, { passive: false, capture: true })
        document.addEventListener('gesturechange', function (event) {
            if (insideViewport(event.target)) event.preventDefault()
        }, { passive: false, capture: true })
    }

    function performAction(action) {'''
sub(
    r"    function bindDocumentPinchZoom\(\) \{.*?\n    \}\n\n    function performAction\(action\) \{",
    touch_nav,
    'touch navigation',
)

perform = r'''    function performAction(action) {
        var ok = true
        var keyboardWasOpen = keyboardOffset > 0 || !!(document.body && document.body.classList.contains('waltiva-mobile-keyboard-open'))

        if (action.indexOf('shape-type:') === 0) {
            ok = insertShapeType(action.slice('shape-type:'.length))
            if (ok) setTimeout(syncFormatting, 80)
            return
        }
        if (action.indexOf('table-size:') === 0) {
            var parts = action.slice('table-size:'.length).split('x')
            ok = insertTableSize(parseInt(parts[0], 10), parseInt(parts[1], 10))
            if (ok) setTimeout(syncFormatting, 80)
            return
        }
        if (action.indexOf('font:') === 0) {
            ok = applyFontName(action.slice('font:'.length))
            restoreEditingFocus(keyboardWasOpen)
            if (ok) setTimeout(syncFormatting, 80)
            return
        }
        if (action.indexOf('fontsize:') === 0) {
            ok = applyFontSize(parseInt(action.slice('fontsize:'.length), 10))
            restoreEditingFocus(keyboardWasOpen)
            if (ok) setTimeout(syncFormatting, 80)
            return
        }
        if (action.indexOf('fontcolor:') === 0) {
            ok = applyFontColor(action.slice('fontcolor:'.length))
            restoreEditingFocus(keyboardWasOpen)
            if (ok) setTimeout(syncFormatting, 80)
            return
        }
        if (action.indexOf('highlight:') === 0) {
            ok = applyHighlight(action.slice('highlight:'.length))
            restoreEditingFocus(keyboardWasOpen)
            if (ok) setTimeout(syncFormatting, 80)
            return
        }
        if (action.indexOf('align:') === 0) {
            ok = applyParagraphAlign(action.slice('align:'.length))
            restoreEditingFocus(keyboardWasOpen)
            if (ok) setTimeout(syncFormatting, 80)
            return
        }

        switch (action) {
            case 'done': setEditing(false); return
            case 'edit': setEditing(true); return
            case 'fit-width': fitWidthWhenReady(0); toast('Documento ajustado al ancho.'); return
            case 'close-document': closeDocument(); return
            case 'insert': setQuickMode('insertar'); return
            case 'quick-toggle': setQuickMode(quickMode === 'inicio' ? 'insertar' : 'inicio'); return
            case 'quick-more': openSheet(quickMode); return
            case 'switch-sheet': if (currentSheet === 'inicio' || currentSheet === 'insertar') openSheet(currentSheet === 'inicio' ? 'insertar' : 'inicio'); return
            case 'format': openSheet('inicio'); return
            case 'more': openSheet('mas'); return
            case 'close-sheet': closeSheet(); return
            case 'keyboard': hideKeyboard(); return
            case 'math': closeSheet(); toggleMath(); return
            case 'native': toggleNativeRibbon(); return

            case 'undo':
                ok = runNativeEditorAction('undo') || clickControl(['#id-toolbar-btn-undo', '.toolbar .btn-undo', '.btn-undo'], 'No hay cambios para deshacer.')
                restoreEditingFocus(keyboardWasOpen)
                break
            case 'redo':
                ok = runNativeEditorAction('redo') || clickControl(['#id-toolbar-btn-redo', '.toolbar .btn-redo', '.btn-redo'], 'No hay cambios para rehacer.')
                restoreEditingFocus(keyboardWasOpen)
                break
            case 'bold':
                ok = runNativeEditorAction('bold') || clickControl(['#id-toolbar-btn-bold', '.toolbar .btn-bold', '.btn-bold'])
                restoreEditingFocus(keyboardWasOpen)
                break
            case 'italic':
                ok = runNativeEditorAction('italic') || clickControl(['#id-toolbar-btn-italic', '.toolbar .btn-italic', '.btn-italic'])
                restoreEditingFocus(keyboardWasOpen)
                break
            case 'underline':
                ok = runNativeEditorAction('underline') || clickControl(['#id-toolbar-btn-underline', '.toolbar .btn-underline', '.btn-underline'])
                restoreEditingFocus(keyboardWasOpen)
                break
            case 'strike':
                ok = runNativeEditorAction('strike') || clickControl(['#id-toolbar-btn-strikeout', '.toolbar .btn-strikeout', '.btn-strikeout'])
                restoreEditingFocus(keyboardWasOpen)
                break
            case 'bullets':
                ok = runNativeEditorAction('bullets') || clickControl(['#id-toolbar-btn-markers', '.toolbar .btn-setmarkers', '.btn-setmarkers'], 'No se pudieron aplicar viñetas.')
                restoreEditingFocus(keyboardWasOpen)
                break
            case 'numbering':
                ok = runNativeEditorAction('numbering') || clickControl(['#id-toolbar-btn-numbering', '.toolbar .btn-numbering', '.btn-numbering'], 'No se pudo aplicar la numeración.')
                restoreEditingFocus(keyboardWasOpen)
                break

            case 'fontname': openSheet('font-picker'); return
            case 'fontsize': openSheet('fontsize-picker'); return
            case 'fontcolor': openSheet('fontcolor-picker'); return
            case 'highlight': openSheet('highlight-picker'); return
            case 'align':
            case 'align-left': openSheet('align-picker'); return

            case 'shape': openSheet('shape-picker'); return
            case 'table': openSheet('table-picker'); return
            case 'table-custom': insertCustomTable(); return
            case 'image': ok = insertImageFile(); break
            case 'image-url': ok = insertImageUrl(); break
            case 'textbox': ok = insertShapeType('textRect'); break
            case 'link': ok = insertHyperlinkPrompt(); break
            case 'add-comment': ok = addCommentDirect(); break
            case 'equation': ok = addEquationDirect(); break
            case 'page': ok = addPageBreakDirect(); break

            case 'search':
                closeSheet()
                ok = clickControl(['#left-btn-searchbar', '.btn-menu-search', '[title*="Buscar"]', '[title*="Search"]'], 'Buscar no está disponible.')
                break
            case 'share':
                closeSheet()
                ok = clickControl(['.btn-share', '.btn-header-share', '[title*="Compartir"]', '[title*="Share"]'], 'Compartir no está habilitado por el host.')
                break
            case 'comment':
                closeSheet()
                ok = clickControl(['#left-btn-comments', '.btn-menu-comments', '.btn-comments'], 'Los comentarios no están disponibles.')
                break
            case 'download':
                closeSheet()
                ok = clickControl(['.btn-download', '.btn-save', '[title*="Descargar"]', '[title*="Download"]'], 'La descarga no está disponible.')
                break
            default:
                return
        }

        if (ok) setTimeout(syncFormatting, 80)
    }

    function resizeEditor() {'''
sub(
    r"    function performAction\(action\) \{.*?\n    \}\n\n    function resizeEditor\(\) \{",
    perform,
    'verified mobile actions',
)

fit_width = r'''    function fitWidthWhenReady(attempt) {
        attempt = attempt || 0
        var api = getEditorApi()
        try {
            if (api && api.WordControl && typeof api.WordControl.zoom_FitToWidth === 'function') {
                resizeEditor()
                api.WordControl.zoom_FitToWidth()
                setTimeout(resizeEditor, 80)
                return
            }
        } catch (error) {
            console.debug('Waltiva Mobile: zoom_FitToWidth directo falló.', error)
        }

        var button = findControl(['#btn-zoom-towidth', '#btn-zoom-towidth button', '[title*="Ajustar al ancho"]', '[title*="Ajustar a ancho"]', '[title*="Fit to width"]'])
        var canvas = document.querySelector('#editor_sdk canvas, #editor-container canvas, canvas')
        if (button && canvas) {
            resizeEditor()
            try { button.click() } catch (e) {}
            setTimeout(function () {
                try { button.click() } catch (e2) {}
                resizeEditor()
            }, 180)
            return
        }
        if (attempt < 50) setTimeout(function () { fitWidthWhenReady(attempt + 1) }, 300)
    }

    function getVisualViewportSource() {'''
sub(
    r"    function fitWidthWhenReady\(attempt\) \{.*?\n    \}\n\n    function getVisualViewportSource\(\) \{",
    fit_width,
    'direct fit width',
)

rep(
    "        bindDocumentPinchZoom()\n",
    "        bindDocumentTouchNavigation()\n",
    'bind combined touch navigation',
)

rep(
    "                    makeButton('', 'Alineación', icons.align, '').replace('class=\"wlt-mobile-btn \"', 'class=\"wlt-mobile-btn\" data-wlt-action=\"align-left\"') +",
    "                    makeButton('', 'Alineación', icons.align, '').replace('class=\"wlt-mobile-btn \"', 'class=\"wlt-mobile-btn\" data-wlt-action=\"align\"') +",
    'quick alignment picker',
)

path.write_text(s, encoding='utf-8')
print('Mobile UX v4 applied successfully')
