(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const welcomeView = $('welcomeView');
  const libraryView = $('libraryView');
  const editorView = $('editorView');
  const editableSurface = $('editableSurface');
  const originalSurface = $('originalSurface');
  const toolbar = $('toolbar');
  const notice = $('notice');
  const busy = $('busy');
  const busyText = $('busyText');
  const toast = $('toast');
  const documentTitle = $('documentTitle');
  const wordCount = $('wordCount');
  const pageCount = $('pageCount');
  const outlinePages = $('outlinePages');
  const editToggle = $('editToggle');
  const viewOriginal = $('viewOriginal');
  const exportMenu = $('exportMenu');
  const zoomLabel = $('zoomLabel');

  const OPENXML_WORD = new Set(['docx', 'docm', 'dotx', 'dotm']);
  const LEGACY_WORD = new Set(['doc', 'dot']);
  const TEXT_LIKE = new Set(['txt', 'html', 'htm', 'xml', 'mht', 'mhtml']);

  const state = {
    file: null,
    extension: '',
    kind: 'blank',
    editing: true,
    hasOriginal: false,
    objectUrls: [],
    zoom: 1,
    pageLabels: ['Pág. 1'],
  };

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }

  function extOf(name) {
    name = name || '';
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
  }

  function baseName(name) {
    return (name || 'Documento').replace(/\.[^.]+$/, '') || 'Documento';
  }

  function setBusy(on, text) {
    busyText.textContent = text || 'Procesando documento…';
    busy.classList.toggle('hidden', !on);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { toast.classList.add('hidden'); }, 2200);
  }

  function setNotice(message, type) {
    notice.textContent = message || '';
    notice.className = 'notice' + (type === 'error' ? ' error' : '');
    notice.classList.toggle('hidden', !message);
  }

  function showView(view) {
    welcomeView.classList.toggle('hidden', view !== 'welcome');
    libraryView.classList.toggle('hidden', view !== 'library');
    editorView.classList.toggle('hidden', view !== 'editor');
  }

  function revokeUrls() {
    state.objectUrls.forEach(function (url) { URL.revokeObjectURL(url); });
    state.objectUrls = [];
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('opendoc-theme', theme);
    const dark = theme === 'dark';
    $('themeToggleLibrary').innerHTML = dark ? '☀ <span>Modo claro</span>' : '☾ <span>Modo noche</span>';
    $('themeToggleEditor').textContent = dark ? '☀' : '☾';
    document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#161716' : '#f7f7f5');
  }

  function toggleTheme() {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  }

  function clearDocumentState() {
    revokeUrls();
    state.file = null;
    state.extension = '';
    state.kind = 'blank';
    state.editing = true;
    state.hasOriginal = false;
    state.zoom = 1;
    editableSurface.innerHTML = '';
    originalSurface.innerHTML = '';
    originalSurface.classList.add('hidden');
    editableSurface.classList.remove('hidden');
    viewOriginal.classList.add('hidden');
    viewOriginal.classList.remove('active');
    editToggle.classList.add('active');
    setNotice('');
    setZoom(1);
  }

  function createBlankDocument() {
    clearDocumentState();
    state.kind = 'blank';
    documentTitle.value = 'Documento sin título';
    const page = makeEditablePage();
    page.innerHTML = '<p><br></p>';
    editableSurface.appendChild(page);
    showView('editor');
    setEditing(true);
    updateDocumentStats();
    setTimeout(function () { page.focus(); }, 80);
  }

  function makeEditablePage() {
    const page = document.createElement('article');
    page.className = 'editable-page';
    page.setAttribute('contenteditable', 'true');
    page.setAttribute('spellcheck', 'true');
    page.addEventListener('input', updateDocumentStats);
    return page;
  }

  async function openFile(file) {
    if (!file) return;
    clearDocumentState();
    state.file = file;
    state.extension = extOf(file.name);
    documentTitle.value = baseName(file.name);
    showView('editor');
    setBusy(true, 'Abriendo ' + file.name + '…');

    try {
      const ext = state.extension;
      if (ext === 'pdf' || file.type === 'application/pdf') {
        state.kind = 'pdf';
        await openPdf(file);
      } else if (OPENXML_WORD.has(ext)) {
        state.kind = 'word-openxml';
        await openOpenXmlWord(file);
      } else if (LEGACY_WORD.has(ext)) {
        state.kind = 'word-legacy';
        await openLegacyWord(file);
      } else if (ext === 'rtf') {
        state.kind = 'rtf';
        await openRtf(file);
      } else if (ext === 'odt') {
        state.kind = 'odt';
        await openOdt(file);
      } else if (TEXT_LIKE.has(ext)) {
        state.kind = 'text';
        await openTextLike(file, ext);
      } else {
        throw new Error('El formato .' + (ext || '?') + ' todavía no tiene un lector configurado.');
      }

      state.hasOriginal = originalSurface.childElementCount > 0;
      viewOriginal.classList.toggle('hidden', !state.hasOriginal);
      if (state.hasOriginal) showOriginalMode();
      else setEditing(true);
      updateDocumentStats();
      showToast('Documento abierto');
    } catch (error) {
      console.error(error);
      setNotice((error && error.message) || 'No se pudo abrir el documento.', 'error');
      editableSurface.innerHTML = '<article class="editable-page"><h2>No se pudo abrir el documento</h2><p>Prueba de nuevo o utiliza otro archivo.</p></article>';
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  function getPdfLib() {
    if (!window.pdfjsLib || !window.pdfjsLib.getDocument) {
      throw new Error('No se pudo cargar PDF.js. Comprueba la conexión y vuelve a intentarlo.');
    }
    return window.pdfjsLib;
  }

  async function loadPdf(data) {
    const lib = getPdfLib();
    try {
      return await lib.getDocument({ data: data }).promise;
    } catch (firstError) {
      console.warn('PDF.js worker falló; reintentando sin worker.', firstError);
      return await lib.getDocument({ data: data, disableWorker: true }).promise;
    }
  }

  function median(values) {
    if (!values.length) return 12;
    const sorted = values.slice().sort(function (a, b) { return a - b; });
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function groupPdfLines(items, pageWidth) {
    const mapped = items.filter(function (item) { return item && item.str && item.str.trim(); }).map(function (item) {
      return {
        str: item.str,
        x: Number(item.transform && item.transform[4]) || 0,
        y: Number(item.transform && item.transform[5]) || 0,
        size: Math.max(6, Math.abs(Number(item.transform && item.transform[3]) || 12)),
        width: Number(item.width) || 0,
        fontName: item.fontName || '',
        hasEOL: !!item.hasEOL
      };
    });
    mapped.sort(function (a, b) {
      if (Math.abs(a.y - b.y) > 2.5) return b.y - a.y;
      return a.x - b.x;
    });

    const lines = [];
    mapped.forEach(function (item) {
      let line = null;
      for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
        const tolerance = Math.max(2.5, Math.min(6, item.size * 0.38));
        if (Math.abs(lines[i].y - item.y) <= tolerance) { line = lines[i]; break; }
      }
      if (!line) {
        line = { y: item.y, items: [] };
        lines.push(line);
      }
      line.items.push(item);
    });

    lines.sort(function (a, b) { return b.y - a.y; });
    lines.forEach(function (line) {
      line.items.sort(function (a, b) { return a.x - b.x; });
      line.minX = Math.min.apply(null, line.items.map(function (i) { return i.x; }));
      line.maxX = Math.max.apply(null, line.items.map(function (i) { return i.x + i.width; }));
      line.size = median(line.items.map(function (i) { return i.size; }));
      line.centered = (line.maxX - line.minX) < pageWidth * 0.72 && Math.abs(((line.minX + line.maxX) / 2) - pageWidth / 2) < pageWidth * 0.08;
    });
    return lines;
  }

  function createPdfEditablePage(textContent, page, canvas) {
    const pageEl = makeEditablePage();
    pageEl.dataset.sourcePage = String(page.pageNumber || '');
    const pageWidth = Math.abs((page.view && page.view[2] - page.view[0]) || 612);
    const lines = groupPdfLines(textContent.items || [], pageWidth);

    if (!lines.length) {
      const img = document.createElement('img');
      img.src = canvas.toDataURL('image/jpeg', 0.92);
      img.alt = 'Página escaneada del PDF';
      pageEl.appendChild(img);
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      pageEl.appendChild(p);
      return { pageEl: pageEl, textCount: 0 };
    }

    const bodyMedian = median(lines.map(function (line) { return line.size; }).filter(function (v) { return v > 0; }));
    let previousY = null;
    lines.forEach(function (line) {
      const text = line.items.map(function (i) { return i.str; }).join(' ').replace(/\s+/g, ' ').trim();
      if (!text) return;
      const isHeading = line.size >= bodyMedian * 1.38 && text.length < 120;
      const element = document.createElement(isHeading ? 'h2' : 'p');
      element.style.fontSize = Math.max(8, Math.min(32, line.size)) + 'pt';
      if (line.centered) element.style.textAlign = 'center';
      if (previousY !== null) {
        const gap = previousY - line.y;
        if (gap > bodyMedian * 2.2) element.style.marginTop = '1.2em';
      }
      previousY = line.y;

      line.items.forEach(function (item, index) {
        if (index) element.appendChild(document.createTextNode(' '));
        const span = document.createElement('span');
        span.textContent = item.str;
        const fontStyle = (textContent.styles && textContent.styles[item.fontName]) || null;
        if (fontStyle && fontStyle.fontFamily) span.style.fontFamily = fontStyle.fontFamily;
        if (/bold|black|heavy|semibold/i.test(item.fontName)) span.style.fontWeight = '700';
        if (/italic|oblique/i.test(item.fontName)) span.style.fontStyle = 'italic';
        element.appendChild(span);
      });
      pageEl.appendChild(element);
    });

    return { pageEl: pageEl, textCount: lines.length };
  }

  async function openPdf(file) {
    getPdfLib();
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await loadPdf(data);
    let scannedPages = 0;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      setBusy(true, 'Procesando PDF · página ' + pageNumber + ' de ' + pdf.numPages + '…');
      const page = await pdf.getPage(pageNumber);
      const natural = page.getViewport({ scale: 1 });
      const targetWidth = Math.min(900, Math.max(320, window.innerWidth - 70));
      const scale = Math.min(1.6, targetWidth / natural.width);
      const viewport = page.getViewport({ scale: scale });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);

      const preview = document.createElement('section');
      preview.className = 'pdf-preview-page';
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
      canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';
      const context = canvas.getContext('2d', { alpha: false });
      const renderContext = { canvasContext: context, viewport: viewport };
      if (outputScale !== 1) renderContext.transform = [outputScale, 0, 0, outputScale, 0, 0];
      await page.render(renderContext).promise;
      preview.appendChild(canvas);
      originalSurface.appendChild(preview);

      const textContent = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
      const rebuilt = createPdfEditablePage(textContent, page, canvas);
      if (!rebuilt.textCount) scannedPages++;
      editableSurface.appendChild(rebuilt.pageEl);
    }

    if (scannedPages === pdf.numPages) {
      setNotice('Este PDF parece escaneado. Opendoc conserva cada página como imagen, pero el texto interno necesita OCR para convertirse en texto real.');
    } else {
      setNotice('PDF reconstruido para edición: el texto pasa a un documento tipo Word y la pestaña “Vista original” conserva la referencia visual exacta del PDF. Diseños muy complejos pueden requerir ajustes manuales.');
    }
  }

  async function openOpenXmlWord(file) {
    if (!window.docx || !window.docx.renderAsync) throw new Error('No se pudo cargar el motor DOCX.');
    const buffer = await file.arrayBuffer();

    const original = document.createElement('div');
    original.className = 'word-edit-wrapper';
    originalSurface.appendChild(original);
    await window.docx.renderAsync(buffer.slice(0), original, null, {
      inWrapper: true, breakPages: true, renderHeaders: true, renderFooters: true,
      renderFootnotes: true, renderEndnotes: true, ignoreFonts: false, useBase64URL: true
    });

    const edit = document.createElement('div');
    edit.className = 'word-edit-wrapper';
    edit.setAttribute('contenteditable', 'true');
    editableSurface.appendChild(edit);
    await window.docx.renderAsync(buffer.slice(0), edit, null, {
      inWrapper: true, breakPages: true, renderHeaders: true, renderFooters: true,
      renderFootnotes: true, renderEndnotes: true, ignoreFonts: false, useBase64URL: true
    });
    edit.addEventListener('input', updateDocumentStats);

    if (state.extension !== 'docx') setNotice('.' + state.extension.toUpperCase() + ': se abre como Office Open XML. Las macros no se ejecutan.');
  }

  async function openLegacyWord(file) {
    if (!window.docToText) throw new Error('No se pudo cargar el lector de Word 97–2003.');
    const buffer = await file.arrayBuffer();
    const stories = window.docToText.html(buffer);
    if (!stories || !stories.body) throw new Error('Este .doc no es compatible, está cifrado o está dañado.');

    const original = document.createElement('article');
    original.className = 'legacy-document';
    original.innerHTML = stories.body;
    const editable = original.cloneNode(true);
    editable.setAttribute('contenteditable', 'true');
    editable.addEventListener('input', updateDocumentStats);

    const images = (window.docToText.images && window.docToText.images(buffer)) || [];
    images.forEach(function (image) {
      const blob = new Blob([image.bytes], { type: image.mime });
      const url = URL.createObjectURL(blob);
      state.objectUrls.push(url);
      const img1 = document.createElement('img'); img1.src = url; img1.alt = 'Imagen del documento';
      const img2 = img1.cloneNode(true);
      original.appendChild(img1); editable.appendChild(img2);
    });

    originalSurface.appendChild(original);
    editableSurface.appendChild(editable);
    setNotice('Word 97–2003: se recuperan texto, formato, tablas e imágenes rasterizadas disponibles. Algunos objetos OLE/WMF antiguos pueden variar.');
  }

  function rtfToHtml(rtf) {
    const escapeText = function (s) { return s.replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; }); };
    const tokens = rtf.match(/\\'[0-9a-fA-F]{2}|\\u-?\d+\??|\\[a-zA-Z]+-?\d* ?|\\[^a-zA-Z]|[{}]|[^\\{}]+/g) || [];
    const stack = [];
    let style = { b: false, i: false, u: false, fs: 24 };
    let out = '<p>';
    let open = false;
    function close() { if (open) { out += '</span>'; open = false; } }
    function ensure() { if (!open) { out += '<span style="font-weight:' + (style.b ? '700' : '400') + ';font-style:' + (style.i ? 'italic' : 'normal') + ';text-decoration:' + (style.u ? 'underline' : 'none') + ';font-size:' + Math.max(8, style.fs / 2) + 'pt">'; open = true; } }
    tokens.forEach(function (token) {
      if (token === '{') { stack.push(Object.assign({}, style)); return; }
      if (token === '}') { close(); style = stack.pop() || style; return; }
      if (token.indexOf("\\'") === 0) { ensure(); out += escapeText(String.fromCharCode(parseInt(token.slice(2), 16))); return; }
      if (/^\\u-?\d+/.test(token)) { const n = parseInt(token.match(/-?\d+/)[0], 10); ensure(); out += escapeText(String.fromCharCode(n < 0 ? n + 65536 : n)); return; }
      if (token.charAt(0) === '\\') {
        const m = token.match(/^\\([a-zA-Z]+)(-?\d+)?/); if (!m) return;
        const cmd = m[1], val = m[2] == null ? null : parseInt(m[2], 10);
        if (cmd === 'par') { close(); out += '</p><p>'; }
        else if (cmd === 'line') { ensure(); out += '<br>'; }
        else if (cmd === 'tab') { ensure(); out += '&emsp;'; }
        else if (cmd === 'b') { close(); style.b = val !== 0; }
        else if (cmd === 'i') { close(); style.i = val !== 0; }
        else if (cmd === 'ul') { close(); style.u = val !== 0; }
        else if (cmd === 'ulnone') { close(); style.u = false; }
        else if (cmd === 'fs' && val) { close(); style.fs = val; }
        return;
      }
      ensure(); out += escapeText(token.replace(/[\r\n]+/g, ' '));
    });
    close();
    return out + '</p>';
  }

  function appendLegacyPair(html, message) {
    const original = document.createElement('article');
    original.className = 'legacy-document';
    original.innerHTML = html;
    const editable = original.cloneNode(true);
    editable.setAttribute('contenteditable', 'true');
    editable.addEventListener('input', updateDocumentStats);
    originalSurface.appendChild(original);
    editableSurface.appendChild(editable);
    if (message) setNotice(message);
  }

  async function openRtf(file) {
    appendLegacyPair(rtfToHtml(await file.text()), 'RTF: se conservan estilos de texto y párrafo comunes; objetos complejos pueden variar.');
  }

  async function openOdt(file) {
    if (!window.JSZip) throw new Error('No se pudo cargar el lector ZIP para ODT.');
    const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
    const contentFile = zip.file('content.xml');
    if (!contentFile) throw new Error('El ODT no contiene content.xml.');
    const xml = new DOMParser().parseFromString(await contentFile.async('text'), 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('El ODT está dañado.');

    function textOf(node) { return (node.textContent || '').replace(/\s+/g, ' ').trim(); }
    const article = document.createElement('article');
    article.className = 'legacy-document';
    const body = xml.getElementsByTagNameNS('*', 'text')[0] || xml.documentElement;
    Array.prototype.forEach.call(body.childNodes, function (node) {
      if (node.nodeType !== 1) return;
      const local = node.localName;
      let el = document.createElement(local === 'h' ? 'h2' : local === 'list' ? 'ul' : 'p');
      if (local === 'list') {
        Array.prototype.forEach.call(node.getElementsByTagNameNS('*', 'list-item'), function (liNode) {
          const li = document.createElement('li'); li.textContent = textOf(liNode); el.appendChild(li);
        });
      } else el.textContent = textOf(node);
      if (el.textContent || el.children.length) article.appendChild(el);
    });
    const html = article.innerHTML || '<p><br></p>';
    appendLegacyPair(html, 'ODT: Opendoc reconstruye el contenido principal para edición. Algunos estilos específicos de LibreOffice pueden variar.');
  }

  function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    Array.prototype.forEach.call(doc.querySelectorAll('script,iframe,object,embed'), function (el) { el.remove(); });
    Array.prototype.forEach.call(doc.querySelectorAll('*'), function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (attr) {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
        if ((attr.name === 'href' || attr.name === 'src') && /^javascript:/i.test(attr.value.trim())) el.removeAttribute(attr.name);
      });
    });
    return doc.body.innerHTML;
  }

  async function openTextLike(file, ext) {
    const text = await file.text();
    let html;
    if (ext === 'html' || ext === 'htm' || ext === 'mht' || ext === 'mhtml') html = sanitizeHtml(text);
    else html = '<pre style="white-space:pre-wrap;font-family:inherit">' + text.replace(/[&<>]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]; }) + '</pre>';
    appendLegacyPair(html, ext === 'xml' ? 'XML se muestra como texto editable para no interpretar un dialecto incorrecto.' : '');
  }

  function setEditing(enabled) {
    state.editing = !!enabled;
    if (!state.editing && state.hasOriginal) return showOriginalMode();
    editableSurface.classList.remove('hidden');
    originalSurface.classList.add('hidden');
    editToggle.classList.add('active');
    viewOriginal.classList.remove('active');
    toolbar.classList.toggle('disabled', !state.editing);
    Array.prototype.forEach.call(editableSurface.querySelectorAll('.editable-page,.word-edit-wrapper,.legacy-document'), function (el) {
      el.setAttribute('contenteditable', state.editing ? 'true' : 'false');
    });
  }

  function showOriginalMode() {
    if (!state.hasOriginal) return;
    state.editing = false;
    originalSurface.classList.remove('hidden');
    editableSurface.classList.add('hidden');
    viewOriginal.classList.add('active');
    editToggle.classList.remove('active');
    toolbar.classList.add('disabled');
  }

  function ensureEditing() {
    if (!state.editing) setEditing(true);
  }

  function exec(cmd, value) {
    ensureEditing();
    editableSurface.focus();
    try { document.execCommand(cmd, false, value == null ? null : value); }
    catch (e) { console.warn('Comando no compatible:', cmd, e); }
    updateDocumentStats();
  }

  function updateDocumentStats() {
    const text = (editableSurface.innerText || '').trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    let pages = editableSurface.querySelectorAll('.editable-page').length;
    if (!pages) pages = editableSurface.querySelectorAll('.docx').length;
    if (!pages) pages = editableSurface.children.length || 1;
    wordCount.textContent = words.toLocaleString('es-CO') + (words === 1 ? ' palabra' : ' palabras');
    pageCount.textContent = pages + (pages === 1 ? ' página' : ' páginas');
    renderOutline(pages);
  }

  function renderOutline(pages) {
    outlinePages.innerHTML = '';
    for (let i = 1; i <= Math.max(1, pages); i++) {
      const b = document.createElement('button');
      b.className = 'page-item' + (i === 1 ? ' active' : '');
      b.innerHTML = '<span>Pág. ' + i + '</span><small>' + (state.kind === 'pdf' ? 'Página importada' : 'Documento') + '</small>';
      (function (pageIndex) {
        b.addEventListener('click', function () {
          ensureEditing();
          const targets = editableSurface.querySelectorAll('.editable-page,.docx');
          if (targets[pageIndex - 1]) targets[pageIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      })(i);
      outlinePages.appendChild(b);
    }
  }

  function setZoom(value) {
    state.zoom = Math.max(0.6, Math.min(1.6, value));
    editableSurface.style.transform = 'scale(' + state.zoom + ')';
    originalSurface.style.transform = 'scale(' + state.zoom + ')';
    editableSurface.style.marginBottom = ((state.zoom - 1) * 100) + 'px';
    originalSurface.style.marginBottom = ((state.zoom - 1) * 100) + 'px';
    zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; });
  }

  function cloneEditableForExport() {
    const clone = editableSurface.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll('[contenteditable]'), function (el) { el.removeAttribute('contenteditable'); });
    return clone.innerHTML;
  }

  function makeExportDocument(bodyHtml) {
    const title = escapeHtml(documentTitle.value || 'Documento');
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title><style>' +
      '@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#111;background:#fff}.editable-page,.legacy-document{width:170mm;min-height:245mm;margin:0 auto 12mm;padding:18mm;box-sizing:border-box;page-break-after:always}.editable-page:last-child{page-break-after:auto}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:5px}.docx-wrapper{background:white!important}' +
      '</style></head><body>' + bodyHtml + '</body></html>';
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  }

  function exportAsHtml() {
    const html = makeExportDocument(cloneEditableForExport());
    downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), (documentTitle.value || 'documento') + '-editable.html');
    exportMenu.classList.add('hidden');
  }

  function exportAsWord() {
    const html = makeExportDocument(cloneEditableForExport());
    downloadBlob(new Blob([html], { type: 'application/msword' }), (documentTitle.value || 'documento') + '-editable.doc');
    exportMenu.classList.add('hidden');
  }

  function insertImageFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () { exec('insertImage', reader.result); };
    reader.readAsDataURL(file);
  }

  function insertTable() {
    ensureEditing();
    const rowsInput = prompt('Número de filas:', '3');
    if (rowsInput == null) return;
    const rows = Math.max(1, Math.min(20, parseInt(rowsInput, 10) || 1));
    const colsInput = prompt('Número de columnas:', '3');
    if (colsInput == null) return;
    const cols = Math.max(1, Math.min(12, parseInt(colsInput, 10) || 1));
    let html = '<table><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) html += '<td><br></td>';
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    exec('insertHTML', html);
  }

  function setFontSize(points) {
    ensureEditing();
    document.execCommand('fontSize', false, '7');
    Array.prototype.forEach.call(editableSurface.querySelectorAll('font[size="7"]'), function (el) {
      el.removeAttribute('size');
      el.style.fontSize = points + 'pt';
    });
    updateDocumentStats();
  }

  $('enterWorkspace').addEventListener('click', function () { showView('library'); });
  $('backToLibrary').addEventListener('click', function () { showView('library'); });
  $('newDocument').addEventListener('click', createBlankDocument);
  $('newDocumentCard').addEventListener('click', createBlankDocument);
  ['fileInputLibrary', 'fileInputCard'].forEach(function (id) {
    $(id).addEventListener('change', function (e) { openFile(e.target.files && e.target.files[0]); e.target.value = ''; });
  });
  $('themeToggleLibrary').addEventListener('click', toggleTheme);
  $('themeToggleEditor').addEventListener('click', toggleTheme);
  $('privacyInfo').addEventListener('click', function () { showToast('Tus archivos no se suben a Opendoc.'); });

  editToggle.addEventListener('click', function () { setEditing(true); });
  viewOriginal.addEventListener('click', showOriginalMode);
  $('exportMenuButton').addEventListener('click', function () { exportMenu.classList.toggle('hidden'); });
  $('exportHtml').addEventListener('click', exportAsHtml);
  $('exportWord').addEventListener('click', exportAsWord);
  $('printDocument').addEventListener('click', function () { exportMenu.classList.add('hidden'); ensureEditing(); window.print(); });

  toolbar.addEventListener('click', function (e) {
    const button = e.target.closest('button[data-cmd]');
    if (button) exec(button.getAttribute('data-cmd'));
  });
  $('blockFormat').addEventListener('change', function () { exec('formatBlock', '<' + this.value + '>'); });
  $('fontFamily').addEventListener('change', function () { exec('fontName', this.value); });
  $('fontSize').addEventListener('change', function () { setFontSize(this.value); });
  $('textColor').addEventListener('input', function () { exec('foreColor', this.value); });
  $('highlightColor').addEventListener('input', function () { exec('hiliteColor', this.value); });
  $('insertLink').addEventListener('click', function () { const url = prompt('URL del enlace:', 'https://'); if (url) exec('createLink', url); });
  $('insertImage').addEventListener('click', function () { $('imageInput').click(); });
  $('imageInput').addEventListener('change', function (e) { insertImageFile(e.target.files && e.target.files[0]); e.target.value = ''; });
  $('insertTable').addEventListener('click', insertTable);
  $('insertHr').addEventListener('click', function () { exec('insertHorizontalRule'); });
  $('insertPageBreak').addEventListener('click', function () { exec('insertHTML', '<div class="page-break-marker" contenteditable="false"></div><p><br></p>'); });
  $('zoomOut').addEventListener('click', function () { setZoom(state.zoom - 0.1); });
  $('zoomIn').addEventListener('click', function () { setZoom(state.zoom + 0.1); });

  documentTitle.addEventListener('input', function () { document.title = (documentTitle.value || 'Opendoc') + ' · Opendoc'; });
  editableSurface.addEventListener('input', updateDocumentStats);
  window.addEventListener('beforeunload', revokeUrls);
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#exportMenu') && !e.target.closest('#exportMenuButton')) exportMenu.classList.add('hidden');
  });

  applyTheme(localStorage.getItem('opendoc-theme') || 'light');
  showView('welcome');
})();
