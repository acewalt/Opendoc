(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const editor = $('editorView');
  const toolbar = $('toolbar');
  const editable = $('editableSurface');
  const outline = $('outlinePages');
  if (!editor || !toolbar || !editable) return;

  editor.classList.add('editor-v3');
  editor.dataset.ribbonTab = 'home';

  function toast(msg){
    const el=$('toast'); if(!el) return;
    el.textContent=msg; el.classList.remove('hidden');
    clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.add('hidden'),2400);
  }
  function clickId(id){ const el=$(id); if(el) el.click(); }
  function clickCmd(cmd){ const el=toolbar.querySelector('[data-cmd="'+cmd+'"]'); if(el) el.click(); }
  function ensureEdit(){ if(editable.classList.contains('hidden')) clickId('editToggle'); }
  function dispatchChange(el){ if(el) el.dispatchEvent(new Event('change',{bubbles:true})); }

  /* Font Inter, matching the visual reference. */
  const originalFont=$('fontFamily');
  if(originalFont && !Array.from(originalFont.options).some(o=>o.value==='Inter')){
    const o=document.createElement('option'); o.value='Inter'; o.textContent='Inter'; originalFont.insertBefore(o,originalFont.firstChild);
  }

  /* Classify existing tool groups so tabs can reuse the current editor engine. */
  Array.from(toolbar.querySelectorAll('.toolbar-group')).forEach(group=>{
    if(group.querySelector('#insertLink')) group.classList.add('insert-tools-group');
  });
  const insertGroup=toolbar.querySelector('.insert-tools-group');
  if(insertGroup){
    const image=$('insertImage'), table=$('insertTable');
    if(image) image.innerHTML='▧ <span>Imagen</span>';
    if(table) table.innerHTML='▦ <span>Tabla</span>';
    if(!$('toolbarComment')){
      const b=document.createElement('button'); b.id='toolbarComment'; b.type='button'; b.innerHTML='▢ <span>Comentario</span>'; b.title='Agregar comentario';
      insertGroup.appendChild(b);
    }
  }

  /* Top navigation */
  const topbar=editor.querySelector('.editor-topbar');
  const left=editor.querySelector('.editor-left');
  const actions=editor.querySelector('.editor-actions');
  if(left && !editor.querySelector('.editor-doc-icon')){
    const icon=document.createElement('span'); icon.className='editor-doc-icon'; icon.textContent='▤';
    const back=$('backToLibrary'); back && back.insertAdjacentElement('afterend',icon);
  }

  const nav=document.createElement('nav');
  nav.className='editor-nav-tabs';
  nav.innerHTML='<button data-tab="file">Archivo</button><button data-tab="home" class="active">Inicio</button><button data-tab="insert">Insertar</button><button data-tab="review">Revisar</button>';
  topbar.insertBefore(nav, topbar.querySelector('.editor-stats'));

  const search=document.createElement('label');
  search.className='editor-search-shell';
  search.innerHTML='<span>⌕</span><input id="editorSearchInput" type="search" placeholder="Buscar en el documento…" autocomplete="off"><kbd>⌘ K</kbd>';
  topbar.insertBefore(search, actions);

  const quick=document.createElement('div');
  quick.className='editor-quick-actions';
  quick.innerHTML='<button type="button" class="quick-undo" title="Deshacer">↶</button><button type="button" class="quick-redo" title="Rehacer">↷</button><button type="button" class="comment-quick" title="Comentario">▢</button><button type="button" class="format-toggle" title="Formato">◫</button>';
  topbar.insertBefore(quick, actions);
  quick.querySelector('.quick-undo').onclick=()=>clickCmd('undo');
  quick.querySelector('.quick-redo').onclick=()=>clickCmd('redo');

  if(actions && !$('shareDocument')){
    const share=document.createElement('button'); share.id='shareDocument'; share.type='button'; share.className='editor-share-button'; share.textContent='♙ Compartir';
    actions.appendChild(share);
  }

  /* Context ribbons for Archivo and Revisar. */
  const context=document.createElement('div'); context.className='editor-context-ribbon';
  toolbar.insertAdjacentElement('afterend',context);
  function showContext(tab){
    context.classList.remove('active'); context.innerHTML='';
    if(tab==='file'){
      context.classList.add('active');
      context.innerHTML='<button data-act="new">＋ Nuevo</button><button data-act="open">⇧ Abrir</button><button data-act="html">HTML editable</button><button data-act="word">Word (.doc)</button><button data-act="print">Imprimir / PDF</button><button data-act="theme">◐ Apariencia</button>';
    }else if(tab==='review'){
      context.classList.add('active');
      context.innerHTML='<button data-act="find">⌕ Buscar</button><button data-act="comment">▢ Nuevo comentario</button><button data-act="spell">✓ Ortografía</button><button data-act="original">◫ Vista original</button><button data-act="edit">✎ Editar</button>';
    }
  }
  nav.addEventListener('click',e=>{
    const b=e.target.closest('button[data-tab]'); if(!b) return;
    nav.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
    editor.dataset.ribbonTab=b.dataset.tab; showContext(b.dataset.tab);
  });
  context.addEventListener('click',e=>{
    const b=e.target.closest('button[data-act]'); if(!b) return;
    const a=b.dataset.act;
    if(a==='new') clickId('newDocument');
    if(a==='open') clickId('fileInputLibrary');
    if(a==='html') clickId('exportHtml');
    if(a==='word') clickId('exportWord');
    if(a==='print') clickId('printDocument');
    if(a==='theme') clickId('themeToggleEditor');
    if(a==='find') $('editorSearchInput').focus();
    if(a==='comment') addComment();
    if(a==='spell') toggleSpellcheck();
    if(a==='original') clickId('viewOriginal');
    if(a==='edit') clickId('editToggle');
  });

  /* Search without changing document markup. */
  let searchCursor=0, lastQuery='';
  function textNodes(root){
    const out=[], w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});
    let n; while((n=w.nextNode())) out.push(n); return out;
  }
  function findNext(q){
    q=(q||'').trim(); if(!q) return;
    ensureEdit();
    const nodes=textNodes(editable); if(!nodes.length) return toast('No hay texto para buscar.');
    if(q.toLowerCase()!==lastQuery.toLowerCase()){searchCursor=0;lastQuery=q;}
    for(let step=0;step<nodes.length;step++){
      const idx=(searchCursor+step)%nodes.length, node=nodes[idx], pos=node.nodeValue.toLowerCase().indexOf(q.toLowerCase());
      if(pos>=0){
        const r=document.createRange(); r.setStart(node,pos); r.setEnd(node,pos+q.length);
        const s=window.getSelection(); s.removeAllRanges(); s.addRange(r);
        node.parentElement && node.parentElement.scrollIntoView({behavior:'smooth',block:'center'});
        searchCursor=(idx+1)%nodes.length; return;
      }
    }
    toast('No se encontró “'+q+'”.');
  }
  $('editorSearchInput').addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault();findNext(e.currentTarget.value);} });
  document.addEventListener('keydown',e=>{ if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('editorSearchInput').focus();} });

  /* Format panel */
  const panel=document.createElement('aside'); panel.className='editor-format-panel'; panel.id='editorFormatPanel';
  panel.innerHTML=`
    <div class="editor-format-head"><strong>Formato</strong><button id="closeFormatPanel" type="button">×</button></div>
    <section class="format-section"><strong>Texto</strong>
      <div class="format-inline"><select id="formatFont" class="grow"><option>Inter</option><option>Arial</option><option>Calibri</option><option>Georgia</option><option>Times New Roman</option><option>Verdana</option><option>Courier New</option></select><select id="formatSize"><option>10</option><option selected>11</option><option>12</option><option>14</option><option>16</option><option>18</option><option>24</option><option>32</option><option>48</option></select></div>
      <div class="format-inline" style="margin-top:8px"><button data-formatcmd="bold"><b>B</b></button><button data-formatcmd="italic"><i>I</i></button><button data-formatcmd="underline"><u>U</u></button><label class="format-inline format-color"><button type="button">A</button><input id="formatTextColor" type="color" value="#111111"></label></div>
    </section>
    <section class="format-section"><strong>Alineación</strong><div class="format-inline"><button data-formatcmd="justifyLeft">≡</button><button data-formatcmd="justifyCenter">≣</button><button data-formatcmd="justifyRight">≡</button><button data-formatcmd="justifyFull">☷</button></div></section>
    <section class="format-section"><strong>Espaciado</strong>
      <div class="format-row"><label>Interlineado</label><select id="lineSpacing"><option value="1">1,0</option><option value="1.15" selected>1,15</option><option value="1.5">1,5</option><option value="2">2,0</option></select></div>
      <div class="format-row"><label>Antes</label><select id="spaceBefore"><option value="0">0 pt</option><option value="6">6 pt</option><option value="12">12 pt</option><option value="18">18 pt</option></select></div>
      <div class="format-row"><label>Después</label><select id="spaceAfter"><option value="0">0 pt</option><option value="6" selected>6 pt</option><option value="12">12 pt</option><option value="18">18 pt</option></select></div>
    </section>
    <section class="format-section"><strong>Página</strong>
      <div class="format-row"><label>Tamaño</label><select id="pageSizeControl"><option value="auto">Automático</option><option value="a4">A4 (21 × 29,7 cm)</option><option value="letter">Carta</option><option value="legal">Legal</option></select></div>
      <div class="format-row"><label>Orientación</label><div class="format-inline"><button id="portraitBtn" class="active" type="button">▯</button><button id="landscapeBtn" type="button">▭</button></div></div>
      <div class="format-row"><label>Márgenes</label><select id="marginPreset"><option value="normal">Normales</option><option value="narrow">Estrechos</option><option value="moderate">Moderados</option><option value="wide">Amplios</option><option value="custom">Personalizados</option></select></div>
    </section>
    <section class="format-section"><strong>Comentarios</strong><div id="commentList" class="comment-list"><span style="font-size:10px;color:var(--ed-muted)">Aún no hay comentarios.</span></div></section>`;
  editor.querySelector('.editor-body').appendChild(panel);

  function setFormatOpen(on){ editor.classList.toggle('format-open',!!on); }
  quick.querySelector('.format-toggle').onclick=()=>setFormatOpen(!editor.classList.contains('format-open'));
  $('closeFormatPanel').onclick=()=>setFormatOpen(false);
  if(window.matchMedia('(min-width:1180px)').matches) setFormatOpen(true);

  panel.addEventListener('click',e=>{ const b=e.target.closest('button[data-formatcmd]'); if(b) clickCmd(b.dataset.formatcmd); });
  $('formatFont').onchange=function(){ originalFont.value=this.value; dispatchChange(originalFont); };
  $('formatSize').onchange=function(){ const s=$('fontSize'); s.value=this.value; dispatchChange(s); };
  $('formatTextColor').oninput=function(){ const c=$('textColor'); c.value=this.value; c.dispatchEvent(new Event('input',{bubbles:true})); };

  function currentBlock(){
    const sel=window.getSelection(); if(!sel.rangeCount) return null;
    let n=sel.focusNode; if(!n) return null; if(n.nodeType===3) n=n.parentElement;
    if(!editable.contains(n)) return null;
    return n.closest('p,div,li,h1,h2,h3,blockquote,td,th') || n.closest('.editable-page,.legacy-document,.word-edit-wrapper');
  }
  function applySpacing(){
    ensureEdit(); const b=currentBlock(); if(!b) return toast('Coloca el cursor en un párrafo.');
    b.style.lineHeight=$('lineSpacing').value; b.style.marginTop=$('spaceBefore').value+'pt'; b.style.marginBottom=$('spaceAfter').value+'pt';
  }
  ['lineSpacing','spaceBefore','spaceAfter'].forEach(id=>$(id).addEventListener('change',applySpacing));

  /* Page size, orientation and margin presets. */
  const sizes={a4:[794,1123],letter:[816,1056],legal:[816,1344]}; let orientation='portrait';
  function applyPageSize(){
    const value=$('pageSizeControl').value; if(value==='auto'){ editor.style.removeProperty('--ed-page-w');editor.style.removeProperty('--ed-page-h');return; }
    let [w,h]=sizes[value]; if(orientation==='landscape') [w,h]=[h,w];
    editor.style.setProperty('--ed-page-w',w+'px'); editor.style.setProperty('--ed-page-h',h+'px');
  }
  $('pageSizeControl').onchange=applyPageSize;
  $('portraitBtn').onclick=function(){orientation='portrait';this.classList.add('active');$('landscapeBtn').classList.remove('active');applyPageSize();};
  $('landscapeBtn').onclick=function(){orientation='landscape';this.classList.add('active');$('portraitBtn').classList.remove('active');applyPageSize();};
  function mmPx(mm){return mm*96/25.4;}
  function setMargins(px){
    document.documentElement.style.setProperty('--waltiva-margin-left',px+'px'); document.documentElement.style.setProperty('--waltiva-margin-right',px+'px');
    document.documentElement.style.setProperty('--ruler-left-px',px+'px'); document.documentElement.style.setProperty('--ruler-right-px',px+'px');
    editor.classList.add('ruler-margins-active'); localStorage.setItem('waltiva-margin-left',String(Math.round(px))); localStorage.setItem('waltiva-margin-right',String(Math.round(px)));
  }
  $('marginPreset').onchange=function(){ const v=this.value;if(v==='custom') return toast('Arrastra los marcadores de la regla para márgenes personalizados.'); const mm={normal:25.4,narrow:12.7,moderate:19.05,wide:38.1}[v];setMargins(mmPx(mm));};

  /* Comments */
  function renderComments(){
    const list=$('commentList'); const comments=editable.querySelectorAll('.comment-anchor[data-comment]'); list.innerHTML='';
    if(!comments.length){list.innerHTML='<span style="font-size:10px;color:var(--ed-muted)">Aún no hay comentarios.</span>';return;}
    comments.forEach((el,i)=>{const card=document.createElement('button');card.type='button';card.className='comment-card';card.innerHTML='<strong>Comentario '+(i+1)+'</strong>'+escapeHtml(el.dataset.comment);card.onclick=()=>el.scrollIntoView({behavior:'smooth',block:'center'});list.appendChild(card);});
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function addComment(){
    ensureEdit(); const text=prompt('Escribe el comentario:',''); if(!text) return;
    const sel=window.getSelection(); if(!sel.rangeCount) return;
    const range=sel.getRangeAt(0); const container=range.commonAncestorContainer.nodeType===3?range.commonAncestorContainer.parentElement:range.commonAncestorContainer;
    if(!editable.contains(container)) return toast('Selecciona texto del documento.');
    const span=document.createElement('span');span.className='comment-anchor';span.dataset.comment=text;span.title=text;
    try{if(range.collapsed){span.textContent='💬';range.insertNode(span);}else{const frag=range.extractContents();span.appendChild(frag);range.insertNode(span);}}catch(_){return toast('No pude insertar el comentario en esa selección.');}
    sel.removeAllRanges(); renderComments(); setFormatOpen(true); toast('Comentario agregado.');
  }
  quick.querySelector('.comment-quick').onclick=addComment;
  $('toolbarComment') && ($('toolbarComment').onclick=addComment);
  editable.addEventListener('click',e=>{const c=e.target.closest('.comment-anchor');if(c){setFormatOpen(true);toast(c.dataset.comment||'Comentario');}});

  /* Spellcheck */
  let spell=true; function toggleSpellcheck(){spell=!spell;editable.querySelectorAll('[contenteditable]').forEach(el=>el.setAttribute('spellcheck',spell?'true':'false'));toast('Ortografía '+(spell?'activada':'desactivada')+'.');}

  /* Share document through the native share sheet when possible. */
  $('shareDocument').onclick=async function(){
    const title=($('documentTitle').value||'Documento').trim();
    const html='<!doctype html><html><head><meta charset="utf-8"><title>'+escapeHtml(title)+'</title></head><body>'+editable.innerHTML+'</body></html>';
    const file=new File([html],title+'.html',{type:'text/html'});
    try{
      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){await navigator.share({title:title,files:[file]});return;}
      if(navigator.share){await navigator.share({title:title,url:location.href});return;}
    }catch(e){if(e && e.name==='AbortError') return;}
    clickId('exportHtml'); toast('Tu navegador no permite compartir archivos directamente; exporté HTML.');
  };

  /* Page count polish. */
  function updatePageTotal(){
    const c=editor.querySelector('.outline-content'); if(!c||!outline) return; const n=outline.children.length||1;c.dataset.pageTotal=n+(n===1?' página':' páginas');
  }
  if(outline){new MutationObserver(updatePageTotal).observe(outline,{childList:true});updatePageTotal();}

  renderComments();
})();
