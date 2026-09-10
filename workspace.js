(function () {
  'use strict';

  const DB_NAME = 'waltiva-local-files';
  const DB_VERSION = 2;
  const RECENT_STORE = 'recent';
  const LAUNCH_STORE = 'launch';
  const MAX_RECENTS = 10;
  const MAX_STORED_BYTES = 20 * 1024 * 1024;
  const SUPPORTED = new Set(['docx','xlsx','pptx','doc','xls','ppt','odt','ods','odp','pdf','txt','rtf','csv']);

  const $ = (id) => document.getElementById(id);
  const modal = $('newDocumentModal');
  const filePicker = $('filePicker');

  function extOf(name) {
    const i = String(name || '').lastIndexOf('.');
    return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.add('hidden'), 3200);
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('waltiva-theme', theme);
    const button = $('themeToggleLibrary');
    button.innerHTML = theme === 'dark' ? '☀ <span>Modo claro</span>' : '☾ <span>Modo noche</span>';
  }

  function initTheme() {
    const saved = localStorage.getItem('waltiva-theme');
    setTheme(saved === 'light' ? 'light' : 'dark');
    $('themeToggleLibrary').addEventListener('click', () => {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  }

  function showModal() {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function hideModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function editorUrl(params) {
    const query = new URLSearchParams({ ...params, fromWaltiva: '1', v: 'launcher3' });
    return './onlyoffice-preview/?' + query.toString() + '#/';
  }

  function openNew(type) {
    hideModal();
    window.location.href = editorUrl({ type: type });
  }

  async function openFile(file) {
    if (!file || !SUPPORTED.has(extOf(file.name))) {
      toast('Ese formato todavía no está conectado al editor de Waltiva.');
      return;
    }

    try {
      await putRecent(file);
      const launchId = await putLaunch(file);
      window.location.href = editorUrl({ openId: launchId });
    } catch (error) {
      console.error('[Waltiva] No se pudo preparar el archivo:', error);
      toast('No se pudo preparar el archivo para el editor. Comprueba el almacenamiento del navegador e inténtalo de nuevo.');
    }
  }

  function chooseFile() {
    filePicker.value = '';
    filePicker.click();
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB no disponible'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(RECENT_STORE)) {
          const store = db.createObjectStore(RECENT_STORE, { keyPath: 'id' });
          store.createIndex('lastOpened', 'lastOpened');
        }
        if (!db.objectStoreNames.contains(LAUNCH_STORE)) {
          db.createObjectStore(LAUNCH_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('La base local está bloqueada por otra pestaña de Waltiva.'));
    });
  }

  async function putLaunch(file) {
    const db = await openDb();
    const id = 'launch-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const record = {
      id,
      name: file.name,
      type: file.type || '',
      size: file.size,
      lastModified: file.lastModified || Date.now(),
      createdAt: Date.now(),
      blob: file,
    };

    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(LAUNCH_STORE, 'readwrite');
        tx.objectStore(LAUNCH_STORE).put(record);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('No se pudo guardar el archivo temporal.'));
      });
      return id;
    } finally {
      db.close();
    }
  }

  async function putRecent(file) {
    try {
      const db = await openDb();
      const id = [file.name, file.size, file.lastModified || 0].join('::');
      const record = {
        id,
        name: file.name,
        type: file.type || '',
        size: file.size,
        lastModified: file.lastModified || Date.now(),
        lastOpened: Date.now(),
        blob: file.size <= MAX_STORED_BYTES ? file : null,
        reopenable: file.size <= MAX_STORED_BYTES,
      };
      await new Promise((resolve, reject) => {
        const tx = db.transaction(RECENT_STORE, 'readwrite');
        tx.objectStore(RECENT_STORE).put(record);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      await trimRecents();
    } catch (error) {
      console.warn('[Waltiva] No se pudo guardar el reciente:', error);
    }
  }

  async function getRecents() {
    try {
      const db = await openDb();
      const records = await new Promise((resolve, reject) => {
        const req = db.transaction(RECENT_STORE, 'readonly').objectStore(RECENT_STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return records.sort((a, b) => b.lastOpened - a.lastOpened);
    } catch (_) {
      return [];
    }
  }

  async function trimRecents() {
    const records = await getRecents();
    if (records.length <= MAX_RECENTS) return;
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(RECENT_STORE, 'readwrite');
      records.slice(MAX_RECENTS).forEach((record) => tx.objectStore(RECENT_STORE).delete(record.id));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async function clearRecents() {
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(RECENT_STORE, 'readwrite');
        tx.objectStore(RECENT_STORE).clear();
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (_) {}
    await renderRecents();
  }

  async function reopen(record) {
    if (!record.blob) {
      toast('Este archivo no se guardó como copia local. Selecciónalo otra vez desde Archivos.');
      return;
    }
    const file = new File([record.blob], record.name, {
      type: record.type || record.blob.type || '',
      lastModified: record.lastModified || Date.now(),
    });
    await openFile(file);
  }

  async function renderRecents() {
    const section = $('recentFilesSection');
    const grid = $('recentFilesGrid');
    const records = await getRecents();
    grid.innerHTML = '';
    section.classList.toggle('hidden', records.length === 0);

    records.forEach((record) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'recent-file-card';

      const icon = document.createElement('span');
      icon.className = 'recent-file-icon';
      icon.textContent = (extOf(record.name) || 'DOC').toUpperCase();

      const main = document.createElement('span');
      main.className = 'recent-file-main';
      const name = document.createElement('span');
      name.className = 'recent-file-name';
      name.textContent = record.name;
      const meta = document.createElement('span');
      meta.className = 'recent-file-meta';
      meta.textContent = formatBytes(record.size) + (record.reopenable ? ' · copia local' : ' · vuelve a seleccionar');
      main.append(name, meta);

      const open = document.createElement('span');
      open.className = 'recent-file-open';
      open.textContent = '›';

      card.append(icon, main, open);
      card.addEventListener('click', () => void reopen(record));
      grid.appendChild(card);
    });
  }

  function wireUi() {
    $('newDocumentCard').addEventListener('click', showModal);
    $('importDocumentCard').addEventListener('click', chooseFile);
    $('downloadsChoice').addEventListener('click', chooseFile);
    $('openLocalFromDialog').addEventListener('click', chooseFile);
    $('closeNewDocument').addEventListener('click', hideModal);
    document.querySelectorAll('[data-close-modal]').forEach((el) => el.addEventListener('click', hideModal));
    document.querySelectorAll('[data-new-type]').forEach((button) => {
      button.addEventListener('click', () => openNew(button.dataset.newType));
    });
    $('recentChoice').addEventListener('click', async () => {
      const records = await getRecents();
      if (!records.length) return chooseFile();
      $('recentFilesSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('clearRecentFiles').addEventListener('click', () => void clearRecents());
    $('privacyInfo').addEventListener('click', () => toast('Los documentos se procesan en el navegador; Waltiva no los envía a un servidor propio.'));
    filePicker.addEventListener('change', () => {
      const file = filePicker.files && filePicker.files[0];
      if (file) void openFile(file);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.classList.contains('hidden')) hideModal();
    });
  }

  initTheme();
  wireUi();
  void renderRecents();
})();
