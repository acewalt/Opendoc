(function(){
  'use strict';

  const SUPPORTED_EXTENSIONS = new Set(['pdf','doc','dot','docx','docm','dotx','dotm','rtf','odt','txt','html','htm','xml','mht','mhtml']);
  const DB_NAME = 'waltiva-local-files';
  const DB_VERSION = 1;
  const STORE = 'recent';
  const MAX_RECENTS = 10;
  const MAX_STORED_BYTES = 20 * 1024 * 1024;

  function $(id){ return document.getElementById(id); }
  function extOf(name){
    const i = (name || '').lastIndexOf('.');
    return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
  }
  function formatBytes(bytes){
    if (!Number.isFinite(bytes)) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  function toast(message){
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function(){ el.classList.add('hidden'); }, 2800);
  }

  /* ---------------- Word-style ruler ---------------- */
  function initRuler(){
    const toolbar = $('toolbar');
    const editorBody = document.querySelector('.editor-body');
    const editorView = $('editorView');
    if (!toolbar || !editorBody || !editorView || $('pageRuler')) return;

    const shell = document.createElement('div');
    shell.id = 'pageRuler';
    shell.className = 'page-ruler-shell';
    shell.setAttribute('aria-label','Regla de página y márgenes');

    const track = document.createElement('div');
    track.className = 'page-ruler-track';

    const ticks = document.createElement('div');
    ticks.className = 'page-ruler-ticks';
    track.appendChild(ticks);

    const leftShade = document.createElement('div');
    leftShade.className = 'ruler-margin-shade left';
    const rightShade = document.createElement('div');
    rightShade.className = 'ruler-margin-shade right';
    track.appendChild(leftShade);
    track.appendChild(rightShade);

    function handle(side){
      const h = document.createElement('div');
      h.className = 'ruler-handle ' + side;
      h.dataset.side = side;
      h.setAttribute('role','slider');
      h.setAttribute('tabindex','0');
      h.setAttribute('aria-label', side === 'left' ? 'Margen izquierdo' : 'Margen derecho');
      const value = document.createElement('span');
      value.className = 'ruler-value';
      h.appendChild(value);
      return h;
    }

    const leftHandle = handle('left');
    const rightHandle = handle('right');
    track.appendChild(leftHandle);
    track.appendChild(rightHandle);

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'ruler-reset';
    reset.title = 'Restablecer márgenes';
    reset.textContent = '↺';

    shell.appendChild(track);
    shell.appendChild(reset);
    editorBody.parentNode.insertBefore(shell, editorBody);

    const isMobile = function(){ return window.matchMedia('(max-width:850px)').matches; };
    let left = Number(localStorage.getItem('waltiva-margin-left'));
    let right = Number(localStorage.getItem('waltiva-margin-right'));
    let hasSaved = Number.isFinite(left) && Number.isFinite(right) && left > 0 && right > 0;
    if (!hasSaved){
      left = isMobile() ? 30 : 78;
      right = isMobile() ? 30 : 78;
    } else {
      editorView.classList.add('ruler-margins-active');
    }

    function cm(px){ return (px / 96 * 2.54).toFixed(1) + ' cm'; }
    function clampMargins(){
      const width = track.clientWidth || 816;
      const min = 20;
      const minText = Math.min(140, width * .35);
      left = Math.max(min, Math.min(left, width - right - minText));
      right = Math.max(min, Math.min(right, width - left - minText));
    }
    function apply(save){
      clampMargins();
      track.style.setProperty('--ruler-left-px', left + 'px');
      track.style.setProperty('--ruler-right-px', right + 'px');
      document.documentElement.style.setProperty('--waltiva-margin-left', left + 'px');
      document.documentElement.style.setProperty('--waltiva-margin-right', right + 'px');
      leftHandle.querySelector('.ruler-value').textContent = cm(left);
      rightHandle.querySelector('.ruler-value').textContent = cm(right);
      leftHandle.setAttribute('aria-valuetext', cm(left));
      rightHandle.setAttribute('aria-valuetext', cm(right));
      if (save){
        editorView.classList.add('ruler-margins-active');
        localStorage.setItem('waltiva-margin-left', String(Math.round(left)));
        localStorage.setItem('waltiva-margin-right', String(Math.round(right)));
      }
    }
    apply(false);

    let dragging = null;
    let pointerId = null;
    function beginDrag(e){
      dragging = e.currentTarget.dataset.side;
      pointerId = e.pointerId;
      e.currentTarget.classList.add('dragging');
      try { e.currentTarget.setPointerCapture(pointerId); } catch (_) {}
      e.preventDefault();
    }
    function moveDrag(e){
      if (!dragging) return;
      const rect = track.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      if (dragging === 'left') left = x;
      else right = rect.width - x;
      apply(false);
      e.preventDefault();
    }
    function endDrag(e){
      if (!dragging) return;
      leftHandle.classList.remove('dragging');
      rightHandle.classList.remove('dragging');
      dragging = null;
      pointerId = null;
      apply(true);
      toast('Márgenes: ' + cm(left) + ' · ' + cm(right));
      e.preventDefault();
    }

    [leftHandle,rightHandle].forEach(function(h){
      h.addEventListener('pointerdown', beginDrag);
      h.addEventListener('keydown', function(e){
        const step = e.shiftKey ? 10 : 2;
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        const direction = e.key === 'ArrowRight' ? 1 : -1;
        if (h.dataset.side === 'left') left += direction * step;
        else right -= direction * step;
        apply(true);
        e.preventDefault();
      });
    });
    window.addEventListener('pointermove', moveDrag, {passive:false});
    window.addEventListener('pointerup', endDrag, {passive:false});
    window.addEventListener('pointercancel', endDrag, {passive:false});
    window.addEventListener('resize', function(){
      if (!localStorage.getItem('waltiva-margin-left')){
        left = isMobile() ? 30 : 78;
        right = isMobile() ? 30 : 78;
      }
      apply(false);
    });

    reset.addEventListener('click', function(){
      left = isMobile() ? 30 : 78;
      right = isMobile() ? 30 : 78;
      editorView.classList.remove('ruler-margins-active');
      localStorage.removeItem('waltiva-margin-left');
      localStorage.removeItem('waltiva-margin-right');
      apply(false);
      toast('Márgenes restablecidos');
    });
  }

  /* ---------------- Local recent files ---------------- */
  function openDb(){
    return new Promise(function(resolve,reject){
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB no disponible'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function(){
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)){
          const store = db.createObjectStore(STORE,{keyPath:'id'});
          store.createIndex('lastOpened','lastOpened');
        }
      };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
  }
  async function putRecent(file){
    if (!file || !SUPPORTED_EXTENSIONS.has(extOf(file.name))) return;
    const db = await openDb();
    const id = [file.name,file.size,file.lastModified || 0].join('::');
    const canStoreBlob = file.size <= MAX_STORED_BYTES;
    const record = {
      id:id,
      name:file.name,
      type:file.type || '',
      size:file.size,
      lastModified:file.lastModified || Date.now(),
      lastOpened:Date.now(),
      blob:canStoreBlob ? file : null,
      reopenable:canStoreBlob
    };
    await new Promise(function(resolve,reject){
      const tx = db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete = resolve;
      tx.onerror = function(){ reject(tx.error); };
    });
    db.close();
    await trimRecents();
  }
  async function getRecents(){
    try{
      const db = await openDb();
      const records = await new Promise(function(resolve,reject){
        const req = db.transaction(STORE,'readonly').objectStore(STORE).getAll();
        req.onsuccess = function(){ resolve(req.result || []); };
        req.onerror = function(){ reject(req.error); };
      });
      db.close();
      return records.sort(function(a,b){ return b.lastOpened - a.lastOpened; });
    }catch(_){ return []; }
  }
  async function trimRecents(){
    const records = await getRecents();
    if (records.length <= MAX_RECENTS) return;
    const db = await openDb();
    await new Promise(function(resolve,reject){
      const tx = db.transaction(STORE,'readwrite');
      records.slice(MAX_RECENTS).forEach(function(r){ tx.objectStore(STORE).delete(r.id); });
      tx.oncomplete = resolve;
      tx.onerror = function(){ reject(tx.error); };
    });
    db.close();
  }
  async function clearRecents(){
    try{
      const db = await openDb();
      await new Promise(function(resolve,reject){
        const tx = db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = resolve;
        tx.onerror = function(){ reject(tx.error); };
      });
      db.close();
    }catch(_){}
    renderRecents();
  }
  async function reopenRecord(record){
    if (!record || !record.blob){
      toast('Este archivo era demasiado grande para guardarlo localmente. Selecciónalo otra vez desde Archivos.');
      return;
    }
    try{
      const file = new File([record.blob], record.name, {type:record.type || record.blob.type || '', lastModified:record.lastModified || Date.now()});
      const input = $('fileInputLibrary') || $('fileInputCard');
      if (!input) throw new Error('No hay selector');
      if (typeof DataTransfer !== 'undefined'){
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change',{bubbles:true}));
        return;
      }
      throw new Error('Reapertura no compatible');
    }catch(_){
      toast('Safari no permite reabrir esa copia directamente. Usa “Descargas / Archivos”.');
    }
  }
  async function renderRecents(){
    const grid = $('recentFilesGrid');
    const section = $('recentFilesSection');
    if (!grid || !section) return;
    const records = await getRecents();
    grid.innerHTML = '';
    section.classList.toggle('hidden', records.length === 0);
    records.forEach(function(record){
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'recent-file-card';
      card.title = record.reopenable ? 'Abrir copia local' : 'Archivo grande: vuelve a seleccionarlo desde Archivos';

      const icon = document.createElement('span');
      icon.className = 'recent-file-icon';
      icon.textContent = extOf(record.name) || 'DOC';

      const main = document.createElement('span');
      main.className = 'recent-file-main';
      const name = document.createElement('span');
      name.className = 'recent-file-name';
      name.textContent = record.name;
      const meta = document.createElement('span');
      meta.className = 'recent-file-meta';
      meta.textContent = formatBytes(record.size) + (record.reopenable ? ' · copia local' : ' · vuelve a seleccionar');
      main.appendChild(name);
      main.appendChild(meta);

      const open = document.createElement('span');
      open.className = 'recent-file-open';
      open.textContent = '›';
      card.appendChild(icon);
      card.appendChild(main);
      card.appendChild(open);
      card.addEventListener('click', function(){ reopenRecord(record); });
      grid.appendChild(card);
    });
  }

  function initLibraryFiles(){
    const main = document.querySelector('.library-main');
    const documentGrid = $('documentGrid');
    const supported = document.querySelector('.supported-card');
    if (!main || !documentGrid || !supported) return;

    ['fileInputLibrary','fileInputCard'].forEach(function(id){
      const input = $(id);
      if (input) input.multiple = true;
    });

    const actions = document.querySelector('.library-actions');
    if (actions && !$('downloadsFilesButton')){
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'downloadsFilesButton';
      button.className = 'button downloads-button';
      button.textContent = '▣ Descargas / Archivos';
      button.title = 'En iPhone abre Archivos; entra a Descargas y selecciona uno o varios documentos';
      actions.appendChild(button);
      button.addEventListener('click', async function(){
        /* Desktop Chromium can enumerate a folder after explicit permission. */
        if (typeof window.showDirectoryPicker === 'function' && !/iPhone|iPad|iPod/i.test(navigator.userAgent)){
          try{
            const dir = await window.showDirectoryPicker({mode:'read'});
            let found = 0;
            for await (const entry of dir.values()){
              if (entry.kind !== 'file' || !SUPPORTED_EXTENSIONS.has(extOf(entry.name))) continue;
              const file = await entry.getFile();
              await putRecent(file);
              found++;
            }
            await renderRecents();
            toast(found ? ('Se encontraron ' + found + ' documentos en la carpeta autorizada.') : 'No encontré PDF/Word compatibles en esa carpeta.');
            return;
          }catch(e){
            if (e && e.name === 'AbortError') return;
          }
        }
        const input = $('fileInputLibrary');
        if (input) input.click();
      });
    }

    if (!$('recentFilesSection')){
      const section = document.createElement('section');
      section.id = 'recentFilesSection';
      section.className = 'recent-files-section hidden';
      section.innerHTML = '<div class="recent-files-heading"><div><h3>Importados recientemente</h3><p>Copias locales de los archivos que abriste en Waltiva.</p></div><button type="button" id="clearRecentFiles" class="recent-files-clear">Borrar lista</button></div><div id="recentFilesGrid" class="recent-files-grid"></div><p class="local-files-note">Waltiva no puede inspeccionar automáticamente la carpeta Descargas del iPhone. Usa “Descargas / Archivos” para abrir el selector de iOS. Puedes seleccionar varios archivos; Waltiva guardará copias locales de hasta 20 MB por archivo.</p>';
      main.insertBefore(section, supported);
      $('clearRecentFiles').addEventListener('click', clearRecents);
    }

    /* Capture phase runs before app.js clears the native input value. */
    document.addEventListener('change', function(e){
      const input = e.target;
      if (!input || (input.id !== 'fileInputLibrary' && input.id !== 'fileInputCard')) return;
      const files = Array.from(input.files || []);
      if (!files.length) return;
      Promise.all(files.map(function(file){ return putRecent(file).catch(function(){}); })).then(renderRecents);
    }, true);

    renderRecents();
  }

  function init(){
    initRuler();
    initLibraryFiles();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
