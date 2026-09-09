import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.worker.min.mjs';

const $ = (id) => document.getElementById(id);
const fileInput = $('fileInput');
const dropZone = $('dropZone');
const documentCanvas = $('documentCanvas');
const emptyState = $('emptyState');
const editToggle = $('editToggle');
const clearButton = $('clearButton');
const exportHtml = $('exportHtml');
const exportWord = $('exportWord');
const fileCard = $('fileCard');
const fileName = $('fileName');
const fileInfo = $('fileInfo');
const fileBadge = $('fileBadge');
const modeDot = $('modeDot');
const modeTitle = $('modeTitle');
const modeText = $('modeText');
const editorToolbar = $('editorToolbar');
const notice = $('notice');
const busy = $('busy');
const busyText = $('busyText');

const OPENXML_WORD = new Set(['docx', 'docm', 'dotx', 'dotm']);
const LEGACY_WORD = new Set(['doc', 'dot']);
const TEXT_LIKE = new Set(['txt', 'html', 'htm', 'xml', 'mht', 'mhtml']);

const state = {
  file: null,
  extension: '',
  kind: '',
  editing: false,
  objectUrls: [],
};

function extOf(name = '') {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[i]}`;
}

function setBusy(on, text = 'Procesando documento…') {
  busyText.textContent = text;
  busy.classList.toggle('hidden', !on);
}

function setNotice(message = '', type = 'warning') {
  notice.textContent = message;
  notice.className = `notice${type === 'error' ? ' error' : ''}`;
  notice.classList.toggle('hidden', !message);
}

function updateMode(title, text, mode = 'view') {
  modeTitle.textContent = title;
  modeText.textContent = text;
  modeDot.className = `status-dot ${mode === 'edit' ? 'edit' : mode === 'view' ? 'live' : ''}`;
}

function revokeUrls() {
  state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
  state.objectUrls = [];
}

function resetWorkspace() {
  revokeUrls();
  state.file = null;
  state.extension = '';
  state.kind = '';
  state.editing = false;
  documentCanvas.innerHTML = '';
  documentCanvas.classList.add('hidden');
  emptyState.classList.remove('hidden');
  fileCard.classList.add('hidden');
  editToggle.disabled = true;
  editToggle.textContent = 'Editar';
  clearButton.disabled = true;
  exportHtml.disabled = true;
  exportWord.disabled = true;
  editorToolbar.classList.remove('active');
  setNotice('');
  updateMode('Sin documento', 'Abre un archivo para comenzar.', 'idle');
}

function showDocumentShell(file, ext) {
  emptyState.classList.add('hidden');
  documentCanvas.classList.remove('hidden');
  fileCard.classList.remove('hidden');
  fileName.textContent = file.name;
  fileInfo.textContent = `${formatBytes(file.size)} · ${ext ? `.${ext}` : (file.type || 'archivo')}`;
  fileBadge.textContent = (ext || 'DOC').toUpperCase().slice(0, 5);
  clearButton.disabled = false;
}

async function openFile(file) {
  if (!file) return;
  resetWorkspace();
  state.file = file;
  state.extension = extOf(file.name);
  showDocumentShell(file, state.extension);
  setBusy(true, `Abriendo ${file.name}…`);

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
      throw new Error(`El formato .${ext || '?'} todavía no tiene un lector local configurado.`);
    }

    editToggle.disabled = false;
    exportHtml.disabled = false;
    exportWord.disabled = false;
    updateMode('Vista previa', 'Documento abierto. Activa Editar para modificar el contenido.', 'view');
  } catch (error) {
    console.error(error);
    setNotice(error?.message || 'No se pudo abrir el documento.', 'error');
    updateMode('No se pudo abrir', 'El archivo no pudo ser interpretado por el lector actual.', 'idle');
  } finally {
    setBusy(false);
  }
}

async function openPdf(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const wrapper = document.createElement('div');
  wrapper.className = 'pdf-document';
  wrapper.dataset.pages = String(pdf.numPages);
  documentCanvas.appendChild(wrapper);

  const maxWidth = Math.min(980, Math.max(620, documentCanvas.clientWidth - 70));

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const initial = page.getViewport({ scale: 1 });
    const scale = Math.min(1.7, maxWidth / initial.width);
    const viewport = page.getViewport({ scale });

    const pageEl = document.createElement('section');
    pageEl.className = 'pdf-page';
    pageEl.style.width = `${viewport.width}px`;
    pageEl.style.height = `${viewport.height}px`;
    pageEl.dataset.page = String(pageNumber);

    const canvas = document.createElement('canvas');
    const outputScale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const ctx = canvas.getContext('2d', { alpha: false });
    await page.render({
      canvasContext: ctx,
      viewport,
      transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
    }).promise;

    const textLayer = document.createElement('div');
    textLayer.className = 'pdf-text-layer';
    textLayer.style.width = `${viewport.width}px`;
    textLayer.style.height = `${viewport.height}px`;

    const textContent = await page.getTextContent();
    for (const item of textContent.items) {
      if (!item.str) continue;
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const fontHeight = Math.max(6, Math.hypot(tx[2], tx[3]));
      const angle = Math.atan2(tx[1], tx[0]);
      const span = document.createElement('span');
      span.textContent = item.str;
      span.dataset.original = item.str;
      span.style.left = `${tx[4]}px`;
      span.style.top = `${tx[5] - fontHeight}px`;
      span.style.fontSize = `${fontHeight}px`;
      span.style.fontFamily = 'Arial, sans-serif';
      if (Math.abs(angle) > 0.001) span.style.transform = `rotate(${angle}rad)`;
      span.setAttribute('contenteditable', 'false');
      textLayer.appendChild(span);
    }

    pageEl.append(canvas, textLayer);
    wrapper.appendChild(pageEl);
  }

  setNotice('PDF: la vista previa es fiel al archivo original. El modo editable superpone bloques de texto sobre cada página; en PDFs con fondos complejos, columnas o tipografías incrustadas la reconstrucción puede no ser idéntica a Word.');
}

async function openOpenXmlWord(file) {
  if (!window.docx?.renderAsync) throw new Error('No se pudo cargar el motor DOCX. Revisa la conexión a internet y vuelve a abrir el archivo.');
  const surface = document.createElement('div');
  surface.className = 'word-surface';
  surface.setAttribute('contenteditable', 'false');
  documentCanvas.appendChild(surface);

  await window.docx.renderAsync(await file.arrayBuffer(), surface, null, {
    inWrapper: true,
    breakPages: true,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    renderEndnotes: true,
    ignoreFonts: false,
    useBase64URL: true,
  });

  if (state.extension !== 'docx') {
    setNotice(`.${state.extension.toUpperCase()}: se abre como documento Office Open XML. Las macros VBA no se ejecutan y no se conservan al exportar desde esta primera versión.`);
  }
}

async function openLegacyWord(file) {
  if (!window.docToText) throw new Error('No se pudo cargar el lector de Word 97–2003 (.doc).');
  const buffer = await file.arrayBuffer();
  const htmlStories = window.docToText.html(buffer);
  if (!htmlStories?.body) throw new Error('Este .doc no es compatible, está cifrado, es Word 6/95 o está dañado.');

  const editor = document.createElement('article');
  editor.className = 'legacy-editor';
  editor.setAttribute('contenteditable', 'false');
  editor.innerHTML = htmlStories.body;

  const images = window.docToText.images?.(buffer) || [];
  if (images.length) {
    const imageBlock = document.createElement('div');
    imageBlock.className = 'legacy-images';
    for (const image of images) {
      const blob = new Blob([image.bytes], { type: image.mime });
      const url = URL.createObjectURL(blob);
      state.objectUrls.push(url);
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Imagen extraída del documento';
      imageBlock.appendChild(img);
    }
    editor.appendChild(imageBlock);
  }

  documentCanvas.appendChild(editor);
  setNotice('Word 97–2003 (.doc/.dot): se recuperan texto, formato, tablas y las imágenes rasterizadas disponibles. La posición exacta de imágenes antiguas WMF/EMF y algunos objetos OLE puede variar.');
}

function rtfToHtml(rtf) {
  const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const tokens = rtf.match(/\\'[0-9a-fA-F]{2}|\\u-?\d+\??|\\[a-zA-Z]+-?\d* ?|\\[^a-zA-Z]|[{}]|[^\\{}]+/g) || [];
  const stack = [];
  let style = { b: false, i: false, u: false, fs: 24 };
  let skip = 0;
  let out = '<p>';
  let openSpan = false;

  const spanStyle = () => `font-weight:${style.b?'700':'400'};font-style:${style.i?'italic':'normal'};text-decoration:${style.u?'underline':'none'};font-size:${Math.max(8, style.fs/2)}pt`;
  const closeSpan = () => { if (openSpan) { out += '</span>'; openSpan = false; } };
  const ensureSpan = () => { if (!openSpan) { out += `<span style="${spanStyle()}">`; openSpan = true; } };

  for (const token of tokens) {
    if (token === '{') { stack.push({ ...style, skip }); continue; }
    if (token === '}') { closeSpan(); const prev = stack.pop(); if (prev) { style = { b: prev.b, i: prev.i, u: prev.u, fs: prev.fs }; skip = prev.skip; } continue; }
    if (/^\\(fonttbl|colortbl|stylesheet|info|pict|object|header|footer)/.test(token)) { skip++; continue; }
    if (skip > 0) continue;
    if (token.startsWith("\\'")) { ensureSpan(); out += escapeHtml(String.fromCharCode(parseInt(token.slice(2), 16))); continue; }
    if (/^\\u-?\d+/.test(token)) {
      const n = parseInt(token.match(/-?\d+/)[0], 10);
      ensureSpan(); out += escapeHtml(String.fromCharCode(n < 0 ? n + 65536 : n)); continue;
    }
    if (token[0] === '\\') {
      const m = token.match(/^\\([a-zA-Z]+)(-?\d+)?/);
      if (!m) continue;
      const cmd = m[1]; const val = m[2] == null ? null : parseInt(m[2], 10);
      if (cmd === 'par') { closeSpan(); out += '</p><p>'; }
      else if (cmd === 'line') { ensureSpan(); out += '<br>'; }
      else if (cmd === 'tab') { ensureSpan(); out += '&emsp;'; }
      else if (cmd === 'b') { closeSpan(); style.b = val !== 0; }
      else if (cmd === 'i') { closeSpan(); style.i = val !== 0; }
      else if (cmd === 'ul') { closeSpan(); style.u = val !== 0; }
      else if (cmd === 'ulnone') { closeSpan(); style.u = false; }
      else if (cmd === 'fs' && val) { closeSpan(); style.fs = val; }
      continue;
    }
    ensureSpan(); out += escapeHtml(token.replace(/[\r\n]+/g, ' '));
  }
  closeSpan();
  return out + '</p>';
}

async function openRtf(file) {
  const text = await file.text();
  const editor = document.createElement('article');
  editor.className = 'legacy-editor';
  editor.setAttribute('contenteditable', 'false');
  editor.innerHTML = rtfToHtml(text);
  documentCanvas.appendChild(editor);
  setNotice('RTF: se conservan los estilos básicos de texto y párrafo. Imágenes incrustadas, campos y objetos complejos todavía no se reconstruyen en esta versión.');
}

function cssFromOdtNode(styleNode) {
  if (!styleNode) return '';
  const rules = [];
  const props = styleNode.querySelectorAll('*');
  for (const prop of props) {
    for (const attr of prop.attributes || []) {
      const name = attr.localName;
      const value = attr.value;
      if (['font-weight','font-style','font-size','color','background-color','text-align','margin-left','margin-right','margin-top','margin-bottom','line-height'].includes(name)) rules.push(`${name}:${value}`);
      if (name === 'text-underline-style' && value !== 'none') rules.push('text-decoration:underline');
      if (name === 'text-line-through-style' && value !== 'none') rules.push('text-decoration:line-through');
      if (name === 'font-name') rules.push(`font-family:${JSON.stringify(value)}`);
    }
  }
  return rules.join(';');
}

async function openOdt(file) {
  if (!window.JSZip) throw new Error('No se pudo cargar el lector ZIP necesario para ODT.');
  const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
  const contentFile = zip.file('content.xml');
  if (!contentFile) throw new Error('El ODT no contiene content.xml.');
  const xml = new DOMParser().parseFromString(await contentFile.async('text'), 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('El XML interno del ODT está dañado.');

  const styleMap = new Map();
  for (const styleNode of xml.querySelectorAll('style\\:style, style')) {
    const name = styleNode.getAttribute('style:name') || [...styleNode.attributes].find(a => a.localName === 'name')?.value;
    if (name) styleMap.set(name, cssFromOdtNode(styleNode));
  }

  const convert = async (node) => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
    const local = node.localName;
    let el;
    if (local === 'p') el = document.createElement('p');
    else if (local === 'h') el = document.createElement(`h${Math.min(6, parseInt(node.getAttribute('text:outline-level') || '2', 10) || 2)}`);
    else if (local === 'span') el = document.createElement('span');
    else if (local === 'table') el = document.createElement('table');
    else if (local === 'table-row') el = document.createElement('tr');
    else if (local === 'table-cell') el = document.createElement('td');
    else if (local === 'list') el = document.createElement('ul');
    else if (local === 'list-item') el = document.createElement('li');
    else if (local === 'line-break') return document.createElement('br');
    else if (local === 'tab') return document.createTextNode('\t');
    else if (local === 'image') {
      const href = node.getAttribute('xlink:href') || [...node.attributes].find(a => a.localName === 'href')?.value;
      if (href && zip.file(href)) {
        const bytes = await zip.file(href).async('uint8array');
        const mime = href.toLowerCase().endsWith('.png') ? 'image/png' : href.toLowerCase().match(/\.jpe?g$/) ? 'image/jpeg' : 'application/octet-stream';
        const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
        state.objectUrls.push(url);
        const img = document.createElement('img'); img.src = url; img.alt = '';
        return img;
      }
      return document.createDocumentFragment();
    } else el = document.createDocumentFragment();

    if (el.nodeType === Node.ELEMENT_NODE) {
      const styleName = node.getAttribute('text:style-name') || node.getAttribute('table:style-name') || [...node.attributes].find(a => a.localName === 'style-name')?.value;
      if (styleName && styleMap.has(styleName)) el.setAttribute('style', styleMap.get(styleName));
    }
    for (const child of node.childNodes) el.appendChild(await convert(child));
    return el;
  };

  const editor = document.createElement('article');
  editor.className = 'legacy-editor';
  editor.setAttribute('contenteditable', 'false');
  const body = xml.getElementsByTagNameNS('*', 'text')[0] || xml.documentElement;
  for (const child of body.childNodes) editor.appendChild(await convert(child));
  documentCanvas.appendChild(editor);
  setNotice('ODT: Opendoc reconstruye texto, estilos comunes, tablas e imágenes en el navegador. Elementos específicos de LibreOffice pueden variar.');
}

function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,iframe,object,embed,link[rel="import"]').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      if ((attr.name === 'href' || attr.name === 'src') && /^javascript:/i.test(attr.value.trim())) el.removeAttribute(attr.name);
    }
  });
  return doc.body.innerHTML;
}

async function openTextLike(file, ext) {
  const editor = document.createElement('article');
  editor.className = 'legacy-editor';
  editor.setAttribute('contenteditable', 'false');
  const text = await file.text();
  if (ext === 'html' || ext === 'htm' || ext === 'mht' || ext === 'mhtml') editor.innerHTML = sanitizeHtml(text);
  else {
    const pre = document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.fontFamily = 'inherit';
    pre.textContent = text;
    editor.appendChild(pre);
  }
  documentCanvas.appendChild(editor);
  if (ext === 'xml') setNotice('XML: se muestra como texto para evitar interpretar dialectos de WordprocessingML incorrectamente.');
}

function setEditing(enabled) {
  if (!state.file) return;
  state.editing = enabled;
  editToggle.textContent = enabled ? 'Terminar edición' : 'Editar';
  editorToolbar.classList.toggle('active', enabled);

  if (state.kind === 'pdf') {
    documentCanvas.querySelectorAll('.pdf-text-layer').forEach((layer) => layer.classList.toggle('editable', enabled));
    documentCanvas.querySelectorAll('.pdf-text-layer span').forEach((span) => span.setAttribute('contenteditable', String(enabled)));
  } else {
    documentCanvas.querySelectorAll('.word-surface, .legacy-editor').forEach((el) => el.setAttribute('contenteditable', String(enabled)));
  }

  updateMode(enabled ? 'Edición activa' : 'Vista previa', enabled ? 'Puedes modificar texto y formato básico directamente en el documento.' : 'Documento abierto. Activa Editar para modificar el contenido.', enabled ? 'edit' : 'view');
}

async function cloneForExport() {
  const clone = documentCanvas.cloneNode(true);
  const sourceCanvases = [...documentCanvas.querySelectorAll('canvas')];
  const cloneCanvases = [...clone.querySelectorAll('canvas')];
  sourceCanvases.forEach((canvas, i) => {
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.width = Math.round(canvas.getBoundingClientRect().width);
    img.height = Math.round(canvas.getBoundingClientRect().height);
    img.style.width = canvas.style.width || `${img.width}px`;
    img.style.height = canvas.style.height || `${img.height}px`;
    cloneCanvases[i]?.replaceWith(img);
  });
  clone.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
  clone.querySelectorAll('.pdf-text-layer').forEach((el) => el.classList.add('editable'));
  return clone.innerHTML;
}

function makeExportDocument(bodyHtml) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeAttribute(state.file?.name || 'Opendoc')}</title><style>
    body{margin:0;background:#e9edf2;font-family:Arial,sans-serif}.document-canvas{padding:24px}.pdf-page{position:relative;margin:0 auto 22px;background:white;overflow:hidden;page-break-after:always}.pdf-page>img{display:block;width:100%;height:auto}.pdf-text-layer{position:absolute;inset:0}.pdf-text-layer span{position:absolute;white-space:pre;line-height:1;background:rgba(255,255,255,.93);color:#111}.legacy-editor{width:760px;max-width:100%;margin:0 auto 22px;padding:70px;background:white}.legacy-editor img{max-width:100%}.docx-wrapper{background:#e9edf2!important}
  </style></head><body><div class="document-canvas">${bodyHtml}</div></body></html>`;
}

function escapeAttribute(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportAsHtml() {
  if (!state.file) return;
  setBusy(true, 'Preparando HTML editable…');
  try {
    const html = makeExportDocument(await cloneForExport());
    const base = state.file.name.replace(/\.[^.]+$/, '') || 'documento';
    downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${base}-editable.html`);
  } finally { setBusy(false); }
}

async function exportAsWord() {
  if (!state.file) return;
  setBusy(true, 'Preparando documento para Word…');
  try {
    const html = makeExportDocument(await cloneForExport());
    const base = state.file.name.replace(/\.[^.]+$/, '') || 'documento';
    downloadBlob(new Blob([html], { type: 'application/msword' }), `${base}-editable.doc`);
  } finally { setBusy(false); }
}

fileInput.addEventListener('change', () => openFile(fileInput.files?.[0]));
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
for (const type of ['dragenter', 'dragover']) dropZone.addEventListener(type, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
for (const type of ['dragleave', 'drop']) dropZone.addEventListener(type, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', (e) => openFile(e.dataTransfer?.files?.[0]));
editToggle.addEventListener('click', () => setEditing(!state.editing));
clearButton.addEventListener('click', resetWorkspace);
exportHtml.addEventListener('click', exportAsHtml);
exportWord.addEventListener('click', exportAsWord);
editorToolbar.addEventListener('click', (e) => {
  const button = e.target.closest('button[data-cmd]');
  if (!button || !state.editing) return;
  document.execCommand(button.dataset.cmd, false);
});

window.addEventListener('beforeunload', revokeUrls);
resetWorkspace();
