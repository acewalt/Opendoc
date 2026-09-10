if(!window.requestIdleCallback){window.requestIdleCallback=function(callback,options){var start=Date.now();return window.setTimeout(function(){callback({didTimeout:!1,timeRemaining:function(){return Math.max(0,50-(Date.now()-start))}})},options&&options.timeout?Math.min(options.timeout,16):1)}}if(!window.cancelIdleCallback){window.cancelIdleCallback=function(id){window.clearTimeout(id)}}function getUrlParams(){function e(e){return decodeURIComponent(e.replace(t," "))}for(var o,t=/\+/g,l=/([^&=]+)=?([^&]*)/g,r=window.location.search.substring(1),c={};o=l.exec(r);)c[e(o[1])]=e(o[2]);return c}var params=getUrlParams(),notoolbar="false"==params.toolbar,compact="true"==params.compact,view="view"==params.mode,visible=!0,elem=((compact||view||notoolbar)&&document.querySelector(".brendpanel > :nth-child(2)").remove(),compact||view?notoolbar?(document.querySelector(".brendpanel > :nth-child(1)").remove(),visible=!1):document.querySelector(".brendpanel > :nth-child(1)").style.height="32px":notoolbar&&(document.querySelector(".brendpanel > :nth-child(1)").style.height="28px"),compact&&(document.querySelectorAll(".not-compact").forEach(function(e){e.remove()}),document.querySelectorAll(".compact").forEach(function(e){e.style.display="inline-block"}),document.querySelector(".fat").style.left="655px"),visible&&(document.querySelector(".brendpanel").style.display="block"),view&&"true"!==params.toolbar||notoolbar||(document.querySelector(".sktoolbar").style.display="block"),view&&(document.querySelector(".placeholder").style.marginTop="19px"),document.querySelector(".placeholder").style.display="block",document.querySelector(".loading-logo img"));elem&&((logo||logoDark)&&elem.setAttribute("src",/theme-(?:[a-z]+-)?dark(?:-[a-z]*)?/.test(document.body.className)?logoDark||logo:logo||logoDark),elem.style.opacity=1);

/* Waltiva Mobile UI -------------------------------------------------------
 * Capa de interfaz responsive sobre ONLYOFFICE. Mantiene el motor y los
 * comandos originales, pero evita comprimir el ribbon de escritorio en iOS.
 * Waltiva Mobile UX v4.2: navegación táctil nativa, selección móvil y lienzo sin franja.
 */
(function () {
    'use strict'

    var MOBILE_MAX = 760
    var installed = false
    var editing = false
    var nativeRibbon = false
    var syncTimer = null
    var waitTimer = null
    var currentSheet = ''
    var quickMode = 'inicio'
    var keyboardOffset = 0
    var maxVisualViewportHeight = 0
    var visualTop = 0
    var MOBILE_CONTENT_ZOOM_MIN = 56
    var MOBILE_CONTENT_ZOOM_MAX = 72
    var MOBILE_CONTENT_ZOOM_FACTOR = 1.10

    function isMobileLayout() {
        if (window.matchMedia && window.matchMedia('(max-width: ' + MOBILE_MAX + 'px)').matches) return true
        return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '')
    }

    function svg(paths, viewBox) {
        return '<svg viewBox="' + (viewBox || '0 0 24 24') + '" aria-hidden="true" focusable="false">' + paths + '</svg>'
    }

    var icons = {
        close: svg('<path d="M5 5l14 14M19 5L5 19"/>'),
        edit: svg('<path d="M4 20l4.2-1 10-10a2.2 2.2 0 0 0-3.1-3.1l-10 10L4 20z"/><path d="M13.8 7.2l3 3"/>'),
        search: svg('<circle cx="10.8" cy="10.8" r="6.8"/><path d="M16 16l5 5"/>'),
        more: svg('<circle cx="5" cy="12" r="1.4" class="fill"/><circle cx="12" cy="12" r="1.4" class="fill"/><circle cx="19" cy="12" r="1.4" class="fill"/>'),
        undo: svg('<path d="M9 7H4v-5"/><path d="M4.5 7.2A8 8 0 1 1 5 17"/>'),
        redo: svg('<path d="M15 7h5v-5"/><path d="M19.5 7.2A8 8 0 1 0 19 17"/>'),
        share: svg('<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 12v8h14v-8"/>'),
        viewer: svg('<rect x="7" y="3" width="10" height="18" rx="1.8"/><path d="M10 18h4"/>'),
        read: svg('<path d="M6 18L11 5h2l5 13M8.5 12.5h7"/><path d="M18.5 7.5c1 1 1.5 2.2 1.5 3.5s-.5 2.5-1.5 3.5"/>'),
        comment: svg('<path d="M4 5h16v11H9l-5 4z"/>'),
        plus: svg('<path d="M12 4v16M4 12h16"/>'),
        keyboard: svg('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M6 8h1M9 8h1M12 8h1M15 8h1M18 8h.1M6 11h1M9 11h1M12 11h1M15 11h1M18 11h.1M7 14h10M10 20l2 2 2-2"/>'),
        page: svg('<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M8 7h8M8 11h8M8 15h6"/>'),
        table: svg('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16"/>'),
        image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="M5 18l5-5 3 3 2-2 4 4"/>'),
        camera: svg('<path d="M4 8h4l1.5-2h5L16 8h4v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>'),
        shape: svg('<circle cx="9" cy="10" r="5"/><rect x="11" y="11" width="9" height="9" rx="1"/>'),
        text: svg('<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M8 8h8M12 8v8M9.5 16h5"/>'),
        equation: svg('<path d="M5 7h14M5 17h14M8 12h8"/>'),
        math: svg('<path d="M3 13l3 3 4-10h10"/><path d="M15 10l5 6M20 10l-5 6"/>'),
        format: svg('<path d="M5 19L11 5h2l6 14M8 13h8"/><path d="M18 4l2 2-5 5-2 .5.5-2z"/>'),
        color: svg('<path d="M7 17L12 5l5 12M9 13h6"/><path d="M5 20h14"/>'),
        tools: svg('<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="9" cy="6" r="1.8" class="fill-bg"/><circle cx="15" cy="12" r="1.8" class="fill-bg"/><circle cx="11" cy="18" r="1.8" class="fill-bg"/>'),
        download: svg('<path d="M12 3v12M8 11l4 4 4-4"/><path d="M5 19h14"/>'),
        chevron: svg('<path d="M9 6l6 6-6 6"/>'),
        link: svg('<path d="M10 13a4 4 0 0 0 5.7.1l2.4-2.4a4 4 0 0 0-5.7-5.7L11 6.4"/><path d="M14 11a4 4 0 0 0-5.7-.1l-2.4 2.4a4 4 0 0 0 5.7 5.7l1.4-1.4"/>'),
        highlight: svg('<path d="M6 15l8-8 4 4-8 8H6z"/><path d="M13 8l4 4M4 21h16"/>'),
        bullets: svg('<circle cx="5" cy="7" r="1" class="fill"/><circle cx="5" cy="12" r="1" class="fill"/><circle cx="5" cy="17" r="1" class="fill"/><path d="M9 7h10M9 12h10M9 17h10"/>'),
        numbering: svg('<path d="M4 6h2M5 5v4M4 12c2-2 3 0 0 2h2M4 17h2l-2 2h2M9 7h10M9 12h10M9 17h10"/>'),
        align: svg('<path d="M4 6h16M4 10h12M4 14h16M4 18h10"/>')
    }

    function makeButton(className, label, icon, text) {
        return '<button type="button" class="wlt-mobile-btn ' + className + '" aria-label="' + label + '" title="' + label + '">' +
            (icon || '') + (text ? '<span>' + text + '</span>' : '') + '</button>'
    }

    function styleText() {
        return [
            ':root{--wlt-mobile-top:56px;--wlt-mobile-tools:64px;--wlt-mobile-bottom:0px;--wlt-keyboard-offset:0px;--wlt-visual-top:0px;}',
            'body.waltiva-mobile-ui{overflow:hidden!important;background:#fff!important;--canvas-background:#fff!important;--canvas-content-background:#fff!important;--canvas-page-border:#fff!important;}',
            'body.waltiva-mobile-ui #viewport{top:calc(var(--wlt-visual-top) + var(--wlt-mobile-top) + var(--wlt-mobile-tools) + env(safe-area-inset-top,0px))!important;bottom:env(safe-area-inset-bottom,0px)!important;left:0!important;right:0!important;width:auto!important;background:#fff!important;touch-action:none!important;overscroll-behavior:none!important;}',
            'body.waltiva-mobile-ui.waltiva-mobile-view-mode #viewport{bottom:0!important;}',
            'body.waltiva-mobile-ui #editor-container,body.waltiva-mobile-ui #editor_sdk{left:0!important;right:0!important;width:100%!important;max-width:none!important;background:#fff!important;}',
            'body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_hor_ruler,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vert_ruler,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vertical_scroll,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_horizontal_scroll,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vscrollbar,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_hscrollbar,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_buttonTabs{visibility:hidden!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important;}',
            'body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_hor_ruler,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_horizontal_scroll,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_hscrollbar{height:0!important;min-height:0!important;max-height:0!important;}',
            'body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vert_ruler,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vertical_scroll,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vscrollbar,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_buttonTabs{width:0!important;min-width:0!important;max-width:0!important;}',
            'body.waltiva-mobile-ui .toolbar{height:0!important;min-height:0!important;max-height:0!important;overflow:hidden!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;border:0!important;box-shadow:none!important;}',
            'body.waltiva-mobile-ui .statusbar{height:0!important;min-height:0!important;max-height:0!important;overflow:hidden!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}',
            'body.waltiva-mobile-ui #header,body.waltiva-mobile-ui #box-document-title,body.waltiva-mobile-ui #box-doc-name{display:none!important;height:0!important;min-height:0!important;max-height:0!important;overflow:hidden!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;border:0!important;}',
            'body.waltiva-mobile-ui.waltiva-mobile-native-ribbon .toolbar{height:99px!important;min-height:99px!important;max-height:none!important;overflow:visible!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;}',
            'body.waltiva-mobile-ui.waltiva-mobile-native-ribbon .statusbar{height:25px!important;min-height:25px!important;max-height:25px!important;overflow:visible!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;}',
            '.wlt-mobile-topbar{position:fixed;z-index:12000;top:var(--wlt-visual-top);left:0;right:0;height:calc(var(--wlt-mobile-top) + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) 10px 0;display:flex;align-items:center;background:#4b4b4b;color:#fff;border-bottom:1px solid rgba(255,255,255,.13);font:16px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-user-select:none;user-select:none;will-change:top;}',
            '.wlt-mobile-topbar .wlt-mobile-row{width:100%;height:56px;display:flex;align-items:center;gap:2px;}',
            '.wlt-mobile-topbar .wlt-view-row{display:none;}',
            'body.waltiva-mobile-view-mode .wlt-mobile-topbar .wlt-edit-row{display:none;}',
            'body.waltiva-mobile-view-mode .wlt-mobile-topbar .wlt-view-row{display:flex;}',
            '.wlt-mobile-title{flex:1;min-width:0;padding:0 8px;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.wlt-mobile-btn{appearance:none;-webkit-appearance:none;border:0;outline:0;background:transparent;color:#f7f7f7;height:44px;min-width:42px;padding:0 9px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;gap:5px;font:15px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:manipulation;}',
            '.wlt-mobile-btn:active{background:rgba(255,255,255,.14);}',
            '.wlt-mobile-btn svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;pointer-events:none;}',
            '.wlt-mobile-btn svg .fill{fill:currentColor;stroke:none;}',
            '.wlt-mobile-btn svg .fill-bg{fill:#4b4b4b;stroke:currentColor;}',
            '.wlt-mobile-btn.wlt-done{padding:0 8px 0 2px;font-size:17px;font-weight:500;}',
            '.wlt-mobile-btn.wlt-close{min-width:40px;padding-left:2px;}',
            '.wlt-mobile-btn.wlt-disabled{opacity:.35;pointer-events:none;}',
            '.wlt-mobile-formatbar{position:fixed;z-index:12000;left:50%;top:calc(var(--wlt-visual-top) + var(--wlt-mobile-top) + env(safe-area-inset-top,0px) + 5px);bottom:auto;transform:translateX(-50%);width:calc(100% - 16px);max-width:560px;height:54px;padding:0 7px;display:none;align-items:center;justify-content:flex-start;overflow:hidden;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:22px;box-shadow:0 8px 26px rgba(0,0,0,.24);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);will-change:top;}',
            'body.waltiva-mobile-ui:not(.waltiva-mobile-view-mode) .wlt-mobile-formatbar{display:flex;}',
            '.wlt-mobile-viewbar{position:fixed;z-index:12000;left:50%;top:calc(var(--wlt-visual-top) + var(--wlt-mobile-top) + env(safe-area-inset-top,0px) + 5px);bottom:auto;transform:translateX(-50%);width:min(326px,calc(100% - 20px));height:54px;padding:0 9px;display:none;align-items:center;justify-content:space-around;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:22px;box-shadow:0 8px 26px rgba(0,0,0,.24);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}',
            'body.waltiva-mobile-view-mode .wlt-mobile-viewbar{display:flex;}',
            'body.waltiva-mobile-keyboard-open .wlt-mobile-viewbar{display:none;}',
            '.wlt-mobile-viewbar .wlt-mobile-btn{height:46px;min-width:52px;padding:0 11px;border-radius:20px;}',
            '.wlt-mobile-viewbar .wlt-mobile-btn svg{width:27px;height:27px;}',
            '.wlt-mobile-tools-scroll{width:100%;height:100%;display:flex;align-items:center;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;overscroll-behavior-x:contain;}',
            '.wlt-mobile-tools-scroll::-webkit-scrollbar{display:none;}',
            '.wlt-quick-group{display:none;align-items:center;gap:2px;min-width:max-content;padding:0 2px;}',
            '.wlt-mobile-formatbar[data-wlt-mode="inicio"] .wlt-quick-home{display:flex;}',
            '.wlt-mobile-formatbar[data-wlt-mode="insertar"] .wlt-quick-insert{display:flex;}',
            '.wlt-mobile-formatbar .wlt-mobile-btn{height:44px;min-width:44px;flex:0 0 44px;padding:0 7px;border-radius:18px;font-size:21px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
            '.wlt-mobile-formatbar .wlt-mobile-btn svg{width:25px;height:25px;}',
            '.wlt-mobile-formatbar .wlt-mobile-btn.wlt-active{background:#fff;color:#202020;}',
            '.wlt-mobile-formatbar .wlt-format-letter{font-family:Georgia,"Times New Roman",serif;font-size:25px;}',
            '.wlt-mobile-formatbar .wlt-bold{font-weight:800;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
            '.wlt-mobile-formatbar .wlt-italic{font-style:italic;}',
            '.wlt-mobile-formatbar .wlt-underline{text-decoration:underline;text-underline-offset:4px;}',
            '.wlt-mobile-formatbar .wlt-strike{text-decoration:line-through;}',
            '.wlt-mobile-sheet-mask{position:fixed;z-index:12990;inset:0;background:rgba(0,0,0,.18);display:none;}',
            '.wlt-mobile-sheet-mask.open{display:block;}',
            '.wlt-mobile-sheet{position:fixed;z-index:13000;left:0;right:0;bottom:0;max-height:min(82vh,720px);max-height:min(82dvh,720px);display:none;flex-direction:column;color:#f3f3f3;background:#1f1f1f;border-radius:28px 28px 0 0;box-shadow:0 -14px 45px rgba(0,0,0,.36);font:16px/1.25 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden;padding-bottom:calc(10px + env(safe-area-inset-bottom,0px));}',
            '.wlt-mobile-sheet.open{display:flex;}',
            '.wlt-mobile-sheet-handle{width:42px;height:5px;border-radius:4px;background:#8a8a8a;margin:10px auto 6px;}',
            '.wlt-mobile-sheet-head{display:flex;align-items:center;padding:4px 18px 11px;gap:8px;}',
            '.wlt-mobile-sheet-title{height:38px;padding:0 15px;border:0;border-radius:19px;background:#5792f7;color:#0c0c0c;font-size:16px;font-weight:500;}',
            '.wlt-mobile-sheet-spacer{flex:1;}',
            '.wlt-mobile-sheet-head .wlt-mobile-btn{background:#282828;border:1px solid #393939;border-radius:20px;}',
            '.wlt-mobile-sheet-list{overflow:auto;-webkit-overflow-scrolling:touch;padding:0 0 14px;}',
            '.wlt-mobile-sheet-item{width:100%;min-height:58px;padding:0 22px;border:0;border-top:1px solid #343434;background:transparent;color:#f1f1f1;display:flex;align-items:center;gap:17px;text-align:left;font:17px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
            '.wlt-mobile-sheet-item:first-child{border-top:0;}',
            '.wlt-mobile-sheet-item:active{background:#2b2b2b;}',
            '.wlt-mobile-sheet-item svg{width:26px;height:26px;flex:0 0 26px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}',
            '.wlt-mobile-sheet-item .wlt-item-label{flex:1;}',
            '.wlt-mobile-sheet-item .wlt-item-note{font-size:12px;color:#909090;}',
            '.wlt-mobile-sheet-item .wlt-chevron{width:18px;height:18px;color:#707070;}',
            '.wlt-mobile-toast{position:fixed;z-index:15000;left:50%;bottom:calc(96px + var(--wlt-keyboard-offset));transform:translate(-50%,12px);max-width:calc(100% - 42px);padding:9px 13px;border-radius:12px;background:rgba(20,20,20,.94);color:#fff;font:13px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;opacity:0;pointer-events:none;transition:.18s ease;text-align:center;}',
            '.wlt-mobile-toast.show{opacity:1;transform:translate(-50%,0);}',
            '@media (max-width:390px){.wlt-mobile-btn{min-width:38px;padding:0 6px}.wlt-mobile-formatbar{width:calc(100% - 18px)}.wlt-mobile-formatbar .wlt-mobile-btn{min-width:38px;padding:0 6px}}'
        ].join('')
    }

    function getButtonFromElement(el) {
        if (!el) return null
        if (/^(BUTTON|A|INPUT)$/.test(el.tagName) || el.getAttribute('role') === 'button') return el
        return el.closest('button,a,[role="button"]') || el.querySelector('button,a,[role="button"]')
    }

    function findControl(selectors) {
        for (var i = 0; i < selectors.length; i++) {
            var el = document.querySelector(selectors[i])
            var button = getButtonFromElement(el)
            if (button) return button
        }
        return null
    }

    function clickControl(selectors, unavailableText) {
        var button = findControl(selectors)
        if (!button || button.disabled || button.classList.contains('disabled')) {
            toast(unavailableText || 'Esta herramienta no está disponible en este documento.')
            return false
        }
        try {
            button.click()
            return true
        } catch (error) {
            console.debug('Waltiva Mobile: no se pudo ejecutar el control.', error)
            toast(unavailableText || 'No se pudo abrir esta herramienta.')
            return false
        }
    }

    function isControlActive(selectors) {
        var button = findControl(selectors)
        return !!(button && (button.classList.contains('active') || button.getAttribute('aria-pressed') === 'true'))
    }

    function toast(message) {
        var node = document.getElementById('wlt-mobile-toast')
        if (!node) return
        node.textContent = message
        node.classList.add('show')
        clearTimeout(node._wltTimer)
        node._wltTimer = setTimeout(function () { node.classList.remove('show') }, 1900)
    }

    function closeSheet() {
        currentSheet = ''
        var sheet = document.getElementById('wlt-mobile-sheet')
        var mask = document.getElementById('wlt-mobile-sheet-mask')
        if (sheet) sheet.classList.remove('open')
        if (mask) mask.classList.remove('open')
    }

    function sheetRow(action, icon, label, note, chevron) {
        return '<button type="button" class="wlt-mobile-sheet-item" data-wlt-action="' + action + '">' +
            icon + '<span class="wlt-item-label">' + label + (note ? '<small class="wlt-item-note">' + note + '</small>' : '') + '</span>' +
            (chevron ? '<span class="wlt-chevron">' + icons.chevron + '</span>' : '') + '</button>'
    }

    function sheetContent(kind) {
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

    function toggleMath() {
        var control = document.getElementById('waltiva-math-view-toggle')
        if (control) {
            control.click()
            return
        }
        var tabs = document.querySelectorAll('li.ribtab')
        for (var i = 0; i < tabs.length; i++) {
            var label = (tabs[i].textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
            if (label === 'diseño' || label === 'design') {
                var anchor = tabs[i].querySelector('a')
                if (anchor) anchor.click()
                break
            }
        }
        var attempts = 0
        var timer = setInterval(function () {
            attempts++
            var math = document.getElementById('waltiva-math-view-toggle')
            if (math) {
                clearInterval(timer)
                math.click()
            } else if (attempts > 25) {
                clearInterval(timer)
                toast('Vista matemática todavía no está disponible.')
            }
        }, 120)
    }

    function hideKeyboard() {
        try {
            if (document.activeElement && document.activeElement.blur) document.activeElement.blur()
            var frames = document.querySelectorAll('input,textarea')
            for (var i = 0; i < frames.length; i++) if (frames[i] === document.activeElement && frames[i].blur) frames[i].blur()
        } catch (e) {}
    }

    function setEditing(value) {
        editing = !!value
        document.body.classList.toggle('waltiva-mobile-view-mode', !editing)
        closeSheet()
        if (!editing) {
            hideKeyboard()
            keyboardOffset = 0
            document.documentElement.style.setProperty('--wlt-keyboard-offset', '0px')
            document.body.classList.remove('waltiva-mobile-keyboard-open')
        }
        setTimeout(resizeEditor, 50)
    }

    function toggleNativeRibbon() {
        nativeRibbon = !nativeRibbon
        document.body.classList.toggle('waltiva-mobile-native-ribbon', nativeRibbon)
        closeSheet()
        toast(nativeRibbon ? 'Cinta completa visible.' : 'Vista compacta activada.')
        setTimeout(resizeEditor, 80)
    }

    function closeDocument() {
        try {
            if (window.parent && window.parent !== window && window.parent.history) {
                window.parent.history.back()
                return
            }
        } catch (e) {}
        try { window.history.back() } catch (e2) {}
    }

    function setQuickMode(mode) {
        quickMode = mode === 'insertar' ? 'insertar' : 'inicio'
        var bar = document.getElementById('wlt-mobile-formatbar')
        if (!bar) return
        bar.setAttribute('data-wlt-mode', quickMode)
        var scroller = bar.querySelector('.wlt-mobile-tools-scroll')
        if (scroller) scroller.scrollLeft = 0
    }

    function getEditorApi() {
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

    function directEditorApiAction(label, callback) {
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

    function getNativeMobileTouchManager() {
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
            setTimeout(refreshNativeTouchScroller, 30)
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
        var target = Math.round(current * MOBILE_CONTENT_ZOOM_FACTOR)
        target = Math.max(MOBILE_CONTENT_ZOOM_MIN, Math.min(MOBILE_CONTENT_ZOOM_MAX, target))
        var ok = current >= target ? true : setDocumentZoom(target)
        setTimeout(function () {
            resetMobileDocumentOrigin()
            refreshNativeTouchScroller()
        }, 90)
        return ok
    }

    function bindDocumentTouchNavigation() {
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

    function performAction(action) {
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

    function resizeEditor() {
        try { window.dispatchEvent(new Event('resize')) } catch (e) {
            var ev = document.createEvent('Event'); ev.initEvent('resize', true, true); window.dispatchEvent(ev)
        }
        setTimeout(refreshNativeTouchScroller, 30)
    }

    function syncTitle() {
        var title = 'Documento'
        var source = document.getElementById('rib-doc-name') || document.getElementById('title-doc-name')
        if (source) title = (source.value || source.textContent || title).trim() || title
        var node = document.getElementById('wlt-mobile-title')
        if (node && node.textContent !== title) node.textContent = title
    }

    function syncFormatting() {
        updateVisualViewport(false)
        var map = {
            bold: ['.toolbar .btn-bold', '.btn-bold'],
            italic: ['.toolbar .btn-italic', '.btn-italic'],
            underline: ['.toolbar .btn-underline', '.btn-underline'],
            strike: ['.toolbar .btn-strikeout', '.btn-strikeout']
        }
        Object.keys(map).forEach(function (name) {
            var node = document.querySelector('[data-wlt-action="' + name + '"]')
            if (node && node.closest('.wlt-mobile-formatbar')) node.classList.toggle('wlt-active', isControlActive(map[name]))
        })
        var mathButton = document.querySelector('.wlt-mobile-topbar [data-wlt-action="math"]')
        var mathNative = document.getElementById('waltiva-math-view-toggle')
        if (mathButton) mathButton.classList.toggle('wlt-active', !!(mathNative && mathNative.getAttribute('aria-checked') === 'true'))
        syncTitle()
    }

    function fitWidthWhenReady(attempt) {
        attempt = attempt || 0
        var api = getEditorApi()
        try {
            if (api && api.WordControl && typeof api.WordControl.zoom_FitToWidth === 'function') {
                resizeEditor()
                api.WordControl.zoom_FitToWidth()
                setTimeout(function () {
                    ensureMobileReadableZoom()
                    resizeEditor()
                }, 100)
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
            setTimeout(function () {
                ensureMobileReadableZoom()
                resizeEditor()
            }, 320)
            return
        }
        if (attempt < 50) setTimeout(function () { fitWidthWhenReady(attempt + 1) }, 300)
    }

    function getVisualViewportSource() {
        try {
            if (window.parent && window.parent !== window && window.parent.visualViewport) return window.parent.visualViewport
        } catch (e) {}
        return window.visualViewport || null
    }

    function updateVisualViewport(resetBase) {
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
    }

    function bindEvents() {
        document.addEventListener('click', function (event) {
            var target = event.target.closest ? event.target.closest('[data-wlt-action]') : null
            if (!target) return
            event.preventDefault()
            event.stopPropagation()
            performAction(target.getAttribute('data-wlt-action'))
        }, true)

        var mask = document.getElementById('wlt-mobile-sheet-mask')
        if (mask) mask.addEventListener('click', closeSheet)

        var visualViewportSource = getVisualViewportSource()
        if (visualViewportSource) {
            var onVisualViewportChange = function () {
                updateVisualViewport(false)
            }
            visualViewportSource.addEventListener('resize', onVisualViewportChange)
            visualViewportSource.addEventListener('scroll', onVisualViewportChange)
        }
        try {
            if (window.parent && window.parent !== window) {
                window.parent.addEventListener('resize', function () {
                    updateVisualViewport(false)
                    if (!keyboardOffset) setTimeout(resizeEditor, 60)
                })
            }
        } catch (e) {}
        window.addEventListener('resize', function () {
            updateVisualViewport(false)
            if (!keyboardOffset) setTimeout(resizeEditor, 60)
        })
        document.addEventListener('focusin', function () { setTimeout(function () { updateVisualViewport(false) }, 80) }, true)
        document.addEventListener('focusout', function () { setTimeout(function () { updateVisualViewport(false) }, 180) }, true)
        window.addEventListener('orientationchange', function () {
            maxVisualViewportHeight = 0
            setTimeout(function () {
                updateVisualViewport(true)
                resizeEditor()
            }, 220)
        })
        bindDocumentTouchNavigation()
    }

    function install() {
        if (installed || !isMobileLayout() || !document.body) return
        installed = true

        var style = document.createElement('style')
        style.id = 'wlt-mobile-style'
        style.textContent = styleText()
        document.head.appendChild(style)

        document.documentElement.classList.add('waltiva-mobile-root')
        document.body.classList.add('waltiva-mobile-ui')
        document.body.classList.add('waltiva-mobile-view-mode')
        updateVisualViewport(true)

        var topbar = document.createElement('div')
        topbar.id = 'wlt-mobile-topbar'
        topbar.className = 'wlt-mobile-topbar'
        topbar.innerHTML =
            '<div class="wlt-mobile-row wlt-edit-row">' +
                makeButton('wlt-done', 'Listo', '', 'Listo').replace('class="wlt-mobile-btn wlt-done"', 'class="wlt-mobile-btn wlt-done" data-wlt-action="done"') +
                makeButton('', 'Deshacer', icons.undo, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="undo"') +
                makeButton('', 'Formato', icons.format, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="format"') +
                makeButton('', 'Vista matemática', icons.math, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="math"') +
                makeButton('', 'Buscar', icons.search, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="search"') +
                makeButton('', 'Compartir', icons.share, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="share"') +
                makeButton('', 'Más', icons.more, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="more"') +
            '</div>' +
            '<div class="wlt-mobile-row wlt-view-row">' +
                makeButton('wlt-close', 'Cerrar documento', icons.close, '').replace('class="wlt-mobile-btn wlt-close"', 'class="wlt-mobile-btn wlt-close" data-wlt-action="close-document"') +
                '<div id="wlt-mobile-title" class="wlt-mobile-title">Documento</div>' +
                makeButton('', 'Editar', icons.edit, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="edit"') +
                makeButton('', 'Buscar', icons.search, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="search"') +
                makeButton('', 'Más', icons.more, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="more"') +
            '</div>'
        document.body.appendChild(topbar)

        var formatbar = document.createElement('div')
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
                    makeButton('', 'Alineación', icons.align, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="align"') +
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
                    makeButton('', 'Comentario', icons.comment, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="add-comment"') +
                    makeButton('', 'Ecuación', icons.equation, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="equation"') +
                    makeButton('', 'Más herramientas de Insertar', icons.more, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="quick-more"') +
                    makeButton('', 'Ocultar teclado', icons.keyboard, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="keyboard"') +
                '</div>' +
            '</div>'
        document.body.appendChild(formatbar)

        var viewbar = document.createElement('div')
        viewbar.id = 'wlt-mobile-viewbar'
        viewbar.className = 'wlt-mobile-viewbar'
        viewbar.innerHTML =
            makeButton('', 'Ajustar documento', icons.viewer, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="fit-width"') +
            makeButton('', 'Formato', icons.read, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="format"') +
            makeButton('', 'Comentarios', icons.comment, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="comment"') +
            makeButton('', 'Compartir', icons.share, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="share"')
        document.body.appendChild(viewbar)

        var mask = document.createElement('div')
        mask.id = 'wlt-mobile-sheet-mask'
        mask.className = 'wlt-mobile-sheet-mask'
        document.body.appendChild(mask)

        var sheet = document.createElement('section')
        sheet.id = 'wlt-mobile-sheet'
        sheet.className = 'wlt-mobile-sheet'
        sheet.setAttribute('aria-modal', 'true')
        sheet.innerHTML =
            '<div class="wlt-mobile-sheet-handle"></div>' +
            '<div class="wlt-mobile-sheet-head">' +
                '<button type="button" id="wlt-mobile-sheet-title" class="wlt-mobile-sheet-title" data-wlt-action="switch-sheet">Insertar</button>' +
                '<span class="wlt-mobile-sheet-spacer"></span>' +
                makeButton('', 'Deshacer', icons.undo, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="undo"') +
                makeButton('', 'Rehacer', icons.redo, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="redo"') +
                makeButton('', 'Cerrar', icons.close, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="close-sheet"') +
            '</div>' +
            '<div id="wlt-mobile-sheet-list" class="wlt-mobile-sheet-list"></div>'
        document.body.appendChild(sheet)

        var toastNode = document.createElement('div')
        toastNode.id = 'wlt-mobile-toast'
        toastNode.className = 'wlt-mobile-toast'
        document.body.appendChild(toastNode)

        bindEvents()
        syncTimer = setInterval(syncFormatting, 450)
        waitForViewport(0)
        fitWidthWhenReady(0)
        syncFormatting()
    }

    function waitForViewport(attempt) {
        var viewport = document.getElementById('viewport')
        if (viewport) {
            resizeEditor()
            setTimeout(resizeEditor, 400)
            return
        }
        if (attempt < 120) {
            clearTimeout(waitTimer)
            waitTimer = setTimeout(function () { waitForViewport(attempt + 1) }, 250)
        }
    }

    function boot() {
        if (!isMobileLayout()) return
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true })
        else install()
    }

    boot()
})()
