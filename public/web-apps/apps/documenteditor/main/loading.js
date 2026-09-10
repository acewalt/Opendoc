if(!window.requestIdleCallback){window.requestIdleCallback=function(callback,options){var start=Date.now();return window.setTimeout(function(){callback({didTimeout:!1,timeRemaining:function(){return Math.max(0,50-(Date.now()-start))}})},options&&options.timeout?Math.min(options.timeout,16):1)}}if(!window.cancelIdleCallback){window.cancelIdleCallback=function(id){window.clearTimeout(id)}}function getUrlParams(){function e(e){return decodeURIComponent(e.replace(t," "))}for(var o,t=/\+/g,l=/([^&=]+)=?([^&]*)/g,r=window.location.search.substring(1),c={};o=l.exec(r);)c[e(o[1])]=e(o[2]);return c}var params=getUrlParams(),notoolbar="false"==params.toolbar,compact="true"==params.compact,view="view"==params.mode,visible=!0,elem=((compact||view||notoolbar)&&document.querySelector(".brendpanel > :nth-child(2)").remove(),compact||view?notoolbar?(document.querySelector(".brendpanel > :nth-child(1)").remove(),visible=!1):document.querySelector(".brendpanel > :nth-child(1)").style.height="32px":notoolbar&&(document.querySelector(".brendpanel > :nth-child(1)").style.height="28px"),compact&&(document.querySelectorAll(".not-compact").forEach(function(e){e.remove()}),document.querySelectorAll(".compact").forEach(function(e){e.style.display="inline-block"}),document.querySelector(".fat").style.left="655px"),visible&&(document.querySelector(".brendpanel").style.display="block"),view&&"true"!==params.toolbar||notoolbar||(document.querySelector(".sktoolbar").style.display="block"),view&&(document.querySelector(".placeholder").style.marginTop="19px"),document.querySelector(".placeholder").style.display="block",document.querySelector(".loading-logo img"));elem&&((logo||logoDark)&&elem.setAttribute("src",/theme-(?:[a-z]+-)?dark(?:-[a-z]*)?/.test(document.body.className)?logoDark||logo:logo||logoDark),elem.style.opacity=1);

/* Waltiva Mobile UI -------------------------------------------------------
 * Capa de interfaz responsive sobre ONLYOFFICE. Mantiene el motor y los
 * comandos originales, pero evita comprimir el ribbon de escritorio en iOS.
 */
(function () {
    'use strict'

    var MOBILE_MAX = 760
    var installed = false
    var editing = true
    var nativeRibbon = false
    var syncTimer = null
    var waitTimer = null
    var currentSheet = ''
    var keyboardOffset = 0
    var maxVisualViewportHeight = 0

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
        chevron: svg('<path d="M9 6l6 6-6 6"/>')
    }

    function makeButton(className, label, icon, text) {
        return '<button type="button" class="wlt-mobile-btn ' + className + '" aria-label="' + label + '" title="' + label + '">' +
            (icon || '') + (text ? '<span>' + text + '</span>' : '') + '</button>'
    }

    function styleText() {
        return [
            ':root{--wlt-mobile-top:56px;--wlt-mobile-bottom:78px;--wlt-keyboard-offset:0px;}',
            'body.waltiva-mobile-ui{overflow:hidden!important;background:#fff!important;--canvas-background:#fff!important;--canvas-content-background:#fff!important;--canvas-page-border:#fff!important;}',
            'body.waltiva-mobile-ui #viewport{top:calc(var(--wlt-mobile-top) + env(safe-area-inset-top,0px))!important;bottom:calc(var(--wlt-mobile-bottom) + var(--wlt-keyboard-offset) + env(safe-area-inset-bottom,0px))!important;left:0!important;right:0!important;width:auto!important;background:#fff!important;}',
            'body.waltiva-mobile-ui.waltiva-mobile-view-mode #viewport{bottom:0!important;}',
            'body.waltiva-mobile-ui #editor-container,body.waltiva-mobile-ui #editor_sdk{left:0!important;right:0!important;width:100%!important;max-width:none!important;background:#fff!important;}',
            'body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_hor_ruler,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vert_ruler,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vertical_scroll,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_horizontal_scroll,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vscrollbar,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_hscrollbar,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_buttonTabs{visibility:hidden!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important;}',
            'body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_hor_ruler,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_horizontal_scroll,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_hscrollbar{height:0!important;min-height:0!important;max-height:0!important;}',
            'body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vert_ruler,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vertical_scroll,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_vscrollbar,body.waltiva-mobile-ui:not(.waltiva-mobile-native-ribbon) #id_buttonTabs{width:0!important;min-width:0!important;max-width:0!important;}',
            'body.waltiva-mobile-ui .toolbar{height:0!important;min-height:0!important;max-height:0!important;overflow:hidden!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;border:0!important;box-shadow:none!important;}',
            'body.waltiva-mobile-ui .statusbar{height:0!important;min-height:0!important;max-height:0!important;overflow:hidden!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}',
            'body.waltiva-mobile-ui.waltiva-mobile-native-ribbon .toolbar{height:99px!important;min-height:99px!important;max-height:none!important;overflow:visible!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;}',
            'body.waltiva-mobile-ui.waltiva-mobile-native-ribbon .statusbar{height:25px!important;min-height:25px!important;max-height:25px!important;overflow:visible!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;}',
            '.wlt-mobile-topbar{position:fixed;z-index:12000;top:0;left:0;right:0;height:calc(var(--wlt-mobile-top) + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) 10px 0;display:flex;align-items:center;background:#4b4b4b;color:#fff;border-bottom:1px solid rgba(255,255,255,.13);font:16px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-user-select:none;user-select:none;}',
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
            '.wlt-mobile-formatbar{position:fixed;z-index:12000;left:50%;bottom:calc(10px + var(--wlt-keyboard-offset) + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:calc(100% - 28px);max-width:560px;height:58px;padding:0 8px;display:flex;align-items:center;justify-content:space-around;background:rgba(29,29,29,.97);color:#fff;border:1px solid rgba(255,255,255,.13);border-radius:30px;box-shadow:0 10px 35px rgba(0,0,0,.28);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);will-change:bottom;}',
            'body.waltiva-mobile-view-mode .wlt-mobile-formatbar{display:none;}',
            '.wlt-mobile-formatbar .wlt-mobile-btn{height:46px;min-width:42px;padding:0 8px;border-radius:20px;font-size:21px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
            '.wlt-mobile-formatbar .wlt-mobile-btn svg{width:25px;height:25px;}',
            '.wlt-mobile-formatbar .wlt-mobile-btn.wlt-active{background:#fff;color:#202020;}',
            '.wlt-mobile-formatbar .wlt-format-letter{font-family:Georgia,"Times New Roman",serif;font-size:25px;}',
            '.wlt-mobile-formatbar .wlt-bold{font-weight:800;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
            '.wlt-mobile-formatbar .wlt-italic{font-style:italic;}',
            '.wlt-mobile-formatbar .wlt-underline{text-decoration:underline;text-underline-offset:4px;}',
            '.wlt-mobile-formatbar .wlt-strike{text-decoration:line-through;}',
            '.wlt-mobile-sheet-mask{position:fixed;z-index:12990;inset:0;background:rgba(0,0,0,.18);display:none;}',
            '.wlt-mobile-sheet-mask.open{display:block;}',
            '.wlt-mobile-sheet{position:fixed;z-index:13000;left:0;right:0;bottom:0;max-height:min(65vh,560px);display:none;flex-direction:column;color:#f3f3f3;background:#1f1f1f;border-radius:28px 28px 0 0;box-shadow:0 -14px 45px rgba(0,0,0,.36);font:16px/1.25 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden;padding-bottom:env(safe-area-inset-bottom,0px);}',
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
        if (/^(BUTTON|A)$/.test(el.tagName) || el.getAttribute('role') === 'button') return el
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
                sheetRow('bold', icons.format, 'Negrita'),
                sheetRow('italic', icons.format, 'Cursiva'),
                sheetRow('underline', icons.format, 'Subrayado'),
                sheetRow('strike', icons.format, 'Tachado'),
                sheetRow('fontcolor', icons.color, 'Color del texto'),
                sheetRow('math', icons.math, 'Vista matemática')
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
            sheetRow('page', icons.page, 'Página', '', true),
            sheetRow('table', icons.table, 'Tabla', '', true),
            sheetRow('image', icons.image, 'Imágenes', '', true),
            sheetRow('camera', icons.camera, 'Cámara / fotos', 'Usa el selector de imágenes del dispositivo', true),
            sheetRow('shape', icons.shape, 'Formas', '', true),
            sheetRow('textbox', icons.text, 'Cuadro de texto', '', true),
            sheetRow('equation', icons.equation, 'Ecuación', '', true)
        ].join('')
    }

    function openSheet(kind) {
        currentSheet = kind || 'insertar'
        var sheet = document.getElementById('wlt-mobile-sheet')
        var mask = document.getElementById('wlt-mobile-sheet-mask')
        var list = document.getElementById('wlt-mobile-sheet-list')
        var title = document.getElementById('wlt-mobile-sheet-title')
        if (!sheet || !mask || !list || !title) return
        title.textContent = currentSheet === 'inicio' ? 'Inicio' : currentSheet === 'mas' ? 'Más' : 'Insertar'
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
        if (!editing) hideKeyboard()
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

    function performAction(action) {
        var ok = true
        switch (action) {
            case 'done': setEditing(false); return
            case 'edit': setEditing(true); return
            case 'close-document': closeDocument(); return
            case 'insert': openSheet('insertar'); return
            case 'format': openSheet('inicio'); return
            case 'more': openSheet('mas'); return
            case 'close-sheet': closeSheet(); return
            case 'keyboard': hideKeyboard(); return
            case 'math': closeSheet(); toggleMath(); return
            case 'native': toggleNativeRibbon(); return
            case 'undo': ok = clickControl(['.toolbar .btn-undo', '.btn-undo'], 'No hay cambios para deshacer.'); break
            case 'redo': ok = clickControl(['.toolbar .btn-redo', '.btn-redo'], 'No hay cambios para rehacer.'); break
            case 'bold': ok = clickControl(['.toolbar .btn-bold', '.btn-bold']); break
            case 'italic': ok = clickControl(['.toolbar .btn-italic', '.btn-italic']); break
            case 'underline': ok = clickControl(['.toolbar .btn-underline', '.btn-underline']); break
            case 'strike': ok = clickControl(['.toolbar .btn-strikeout', '.btn-strikeout']); break
            case 'fontcolor': ok = clickControl(['.toolbar .btn-fontcolor', '.btn-fontcolor']); break
            case 'search': closeSheet(); ok = clickControl(['.btn-menu-search', '[title*="Buscar"]', '[title*="Search"]']); break
            case 'share': closeSheet(); ok = clickControl(['.btn-share', '.btn-header-share', '[title*="Compartir"]', '[title*="Share"]'], 'Compartir no está habilitado en este documento.'); break
            case 'page': closeSheet(); ok = clickControl(['.toolbar .btn-blankpage', '.toolbar .btn-pagebreak', '.btn-blankpage', '.btn-pagebreak']); break
            case 'table': closeSheet(); ok = clickControl(['.toolbar .btn-inserttable', '.btn-inserttable']); break
            case 'image':
            case 'camera': closeSheet(); ok = clickControl(['.toolbar .btn-insertimage', '.btn-insertimage'], 'El selector de imágenes no está disponible.'); break
            case 'shape': closeSheet(); ok = clickControl(['.toolbar .btn-insertshape', '.btn-insertshape']); break
            case 'textbox': closeSheet(); ok = clickControl(['.toolbar .btn-big-text', '.toolbar .btn-text', '.btn-big-text', '.btn-text']); break
            case 'equation': closeSheet(); ok = clickControl(['.toolbar .btn-insertequation', '.toolbar .btn-equation', '.btn-insertequation', '.btn-equation']); break
            case 'download': closeSheet(); ok = clickControl(['.btn-download', '.btn-save', '[title*="Descargar"]', '[title*="Download"]']); break
            default: return
        }
        if (ok) setTimeout(syncFormatting, 80)
    }

    function resizeEditor() {
        try { window.dispatchEvent(new Event('resize')) } catch (e) {
            var ev = document.createEvent('Event'); ev.initEvent('resize', true, true); window.dispatchEvent(ev)
        }
    }

    function syncTitle() {
        var title = 'Documento'
        var source = document.getElementById('rib-doc-name') || document.getElementById('title-doc-name')
        if (source) title = (source.value || source.textContent || title).trim() || title
        var node = document.getElementById('wlt-mobile-title')
        if (node && node.textContent !== title) node.textContent = title
    }

    function syncFormatting() {
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

        if (window.visualViewport) {
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
        formatbar.innerHTML =
            makeButton('', 'Insertar', icons.plus, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="insert"') +
            '<button type="button" class="wlt-mobile-btn wlt-bold" data-wlt-action="bold" aria-label="Negrita">N</button>' +
            '<button type="button" class="wlt-mobile-btn wlt-format-letter wlt-italic" data-wlt-action="italic" aria-label="Cursiva">K</button>' +
            '<button type="button" class="wlt-mobile-btn wlt-format-letter wlt-underline" data-wlt-action="underline" aria-label="Subrayado">S</button>' +
            '<button type="button" class="wlt-mobile-btn wlt-format-letter wlt-strike" data-wlt-action="strike" aria-label="Tachado">S</button>' +
            makeButton('', 'Color del texto', icons.color, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="fontcolor"') +
            makeButton('', 'Ocultar teclado', icons.keyboard, '').replace('class="wlt-mobile-btn "', 'class="wlt-mobile-btn" data-wlt-action="keyboard"')
        document.body.appendChild(formatbar)

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
                '<button type="button" id="wlt-mobile-sheet-title" class="wlt-mobile-sheet-title">Insertar</button>' +
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
        setTimeout(function () { fitWidthWhenReady(0) }, 900)
        setTimeout(function () { fitWidthWhenReady(0) }, 1800)
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
