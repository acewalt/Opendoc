(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const editor=$('editorView'), editable=$('editableSurface'), outline=$('outlinePages'), toolbar=$('toolbar');
  if(!editor||!editable||!toolbar) return;

  function toast(msg){const t=$('toast');if(!t)return;t.textContent=msg;t.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.add('hidden'),2600);}

  /* ---------- Native DOCX export ---------- */
  const exportMenu=$('exportMenu');
  if(exportMenu&&!$('exportDocx')){
    const b=document.createElement('button'); b.id='exportDocx'; b.type='button'; b.textContent='Word nativo (.docx)';
    const legacy=$('exportWord'); exportMenu.insertBefore(b,legacy||exportMenu.firstChild);
    b.addEventListener('click',()=>window.WaltivaDocx?window.WaltivaDocx.exportDocx():toast('El exportador DOCX no está disponible.'));
    if(legacy) legacy.textContent='Word compatible antiguo (.doc)';
  }

  /* ---------- Selection → UI state synchronization ---------- */
  function insideEditorSelection(){
    const s=window.getSelection(); if(!s||!s.rangeCount) return null;
    let n=s.focusNode; if(!n) return null; if(n.nodeType===3)n=n.parentElement;
    return n&&editable.contains(n)?n:null;
  }
  function selectOption(select,value,label){
    if(!select||value==null)return;
    const lower=String(value).toLowerCase(); let opt=Array.from(select.options).find(o=>String(o.value).toLowerCase()===lower||o.textContent.toLowerCase()===lower);
    if(!opt&&label){opt=document.createElement('option');opt.value=value;opt.textContent=label;select.appendChild(opt);}
    if(opt){select.value=opt.value;select.classList.add('selection-sync');setTimeout(()=>select.classList.remove('selection-sync'),180);}
  }
  function boolState(cmd){try{return document.queryCommandState(cmd);}catch(_){return false;}}
  function syncSelection(){
    const node=insideEditorSelection(); if(!node)return;
    const cs=getComputedStyle(node);
    const font=(cs.fontFamily||'Arial').split(',')[0].replace(/["']/g,'').trim();
    const pt=Math.max(1,Math.round((parseFloat(cs.fontSize)||16)*.75*10)/10);
    selectOption($('fontFamily'),font,font);
    selectOption($('formatFont'),font,font);
    selectOption($('fontSize'),String(pt),String(pt));
    selectOption($('formatSize'),String(pt),String(pt));
    const block=node.closest('p,h1,h2,h3,blockquote'); if(block) selectOption($('blockFormat'),block.tagName.toLowerCase());

    const commands=['bold','italic','underline','strikeThrough','subscript','superscript','justifyLeft','justifyCenter','justifyRight','justifyFull'];
    commands.forEach(cmd=>{
      const active=boolState(cmd);
      toolbar.querySelectorAll('[data-cmd="'+cmd+'"]').forEach(b=>b.classList.toggle('command-active',active));
      document.querySelectorAll('[data-formatcmd="'+cmd+'"]').forEach(b=>b.classList.toggle('command-active',active));
    });
    if($('textColor')) $('textColor').value=colorToHex(cs.color);
    if($('formatTextColor')) $('formatTextColor').value=colorToHex(cs.color);
  }
  function colorToHex(v){
    const m=(v||'').match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/i); if(!m)return '#111111';
    return '#'+[m[1],m[2],m[3]].map(x=>(+x).toString(16).padStart(2,'0')).join('');
  }
  let selectionRAF=0;
  document.addEventListener('selectionchange',()=>{cancelAnimationFrame(selectionRAF);selectionRAF=requestAnimationFrame(syncSelection);});
  editable.addEventListener('keyup',syncSelection); editable.addEventListener('pointerup',syncSelection); editable.addEventListener('input',()=>requestAnimationFrame(syncSelection));

  /* ---------- Real page break: create a new sheet ---------- */
  const pageBreak=$('insertPageBreak');
  if(pageBreak){
    pageBreak.addEventListener('click',function(e){
      e.preventDefault(); e.stopImmediatePropagation();
      const sel=window.getSelection(); let current=null;
      if(sel&&sel.rangeCount){let n=sel.focusNode;if(n&&n.nodeType===3)n=n.parentElement;current=n&&n.closest('.editable-page,.legacy-document');}
      if(!current) current=editable.querySelector('.editable-page:last-of-type,.legacy-document:last-of-type');
      const page=document.createElement('article'); page.className='editable-page'; page.contentEditable='true'; page.spellcheck=true; page.innerHTML='<p><br></p>';
      if(current&&current.parentNode===editable) current.insertAdjacentElement('afterend',page); else editable.appendChild(page);
      page.focus(); editable.dispatchEvent(new Event('input',{bubbles:true}));
      setTimeout(()=>{page.scrollIntoView({behavior:'smooth',block:'start'});const p=page.querySelector('p');if(p){const r=document.createRange();r.selectNodeContents(p);r.collapse(true);const s=window.getSelection();s.removeAllRanges();s.addRange(r);}},30);
      toast('Nueva página creada');
    },true);
  }

  /* Remove visual legacy page-break markers if any are introduced by pasted HTML. */
  function removeLegacyBreaks(root){root.querySelectorAll&&root.querySelectorAll('.page-break-marker').forEach(x=>x.remove());}

  /* ---------- Tables ---------- */
  let tableDrag=null, activeCell=null;
  const tableTools=document.createElement('div'); tableTools.className='table-context-tools hidden'; tableTools.id='tableContextTools';
  tableTools.innerHTML='<button data-table-action="row">＋ fila</button><button data-table-action="col">＋ columna</button><button data-table-action="delrow">− fila</button><button data-table-action="delcol">− columna</button><button class="danger" data-table-action="delete">Eliminar tabla</button>';
  document.body.appendChild(tableTools);

  function ensureColgroup(table){
    const cols=Math.max(1,...Array.from(table.rows).map(r=>r.cells.length));
    let cg=table.querySelector(':scope > colgroup');
    if(!cg){cg=document.createElement('colgroup');table.insertBefore(cg,table.firstChild);}
    while(cg.children.length<cols) cg.appendChild(document.createElement('col'));
    while(cg.children.length>cols) cg.lastElementChild.remove();
    const tableW=Math.max(200,table.getBoundingClientRect().width||600);
    const current=Array.from(cg.children).map(c=>parseFloat(c.style.width)||0);
    const has=current.some(Boolean);
    Array.from(cg.children).forEach((c,i)=>{if(!has)c.style.width=(tableW/cols)+'px'; else if(!current[i])c.style.width=(tableW/cols)+'px';});
    return cg;
  }
  function rebuildTable(table){
    if(!table||!table.rows.length)return;
    table.classList.add('waltiva-table'); table.style.tableLayout='fixed'; table.style.width='100%';
    ensureColgroup(table);
    table.querySelectorAll('.w-table-resizer').forEach(x=>x.remove());
    Array.from(table.rows).forEach(row=>Array.from(row.cells).forEach((cell,index)=>{
      const grip=document.createElement('span'); grip.className='w-table-resizer'; grip.contentEditable='false'; grip.setAttribute('aria-hidden','true'); grip.dataset.col=String(index); cell.appendChild(grip);
    }));
  }
  function enhanceTables(root){removeLegacyBreaks(root);root.querySelectorAll&&root.querySelectorAll('table').forEach(rebuildTable);}
  enhanceTables(editable);

  const tableObserver=new MutationObserver(records=>{
    let needs=false;
    for(const r of records){for(const n of r.addedNodes){if(n.nodeType===1&&(n.matches('table')||n.querySelector('table'))){needs=true;break;}}}
    if(needs)requestAnimationFrame(()=>enhanceTables(editable));
  });
  tableObserver.observe(editable,{childList:true,subtree:true});

  editable.addEventListener('pointerdown',e=>{
    const grip=e.target.closest('.w-table-resizer'); if(!grip)return;
    const cell=grip.closest('td,th'), table=cell.closest('table'), cg=ensureColgroup(table), index=Number(grip.dataset.col);
    const cols=Array.from(cg.children); if(index>=cols.length-1)return;
    const w1=parseFloat(cols[index].style.width)||cell.getBoundingClientRect().width;
    const nextCell=cell.parentElement.cells[index+1]; const w2=parseFloat(cols[index+1].style.width)||(nextCell?nextCell.getBoundingClientRect().width:w1);
    tableDrag={table,cols,index,startX:e.clientX,w1,w2}; table.classList.add('resizing');
    try{grip.setPointerCapture(e.pointerId);}catch(_){} e.preventDefault(); e.stopPropagation();
  });
  window.addEventListener('pointermove',e=>{
    if(!tableDrag)return; const dx=e.clientX-tableDrag.startX, min=42;
    let a=Math.max(min,tableDrag.w1+dx), b=Math.max(min,tableDrag.w2-dx);
    if(b===min)a=tableDrag.w1+tableDrag.w2-min; if(a===min)b=tableDrag.w1+tableDrag.w2-min;
    tableDrag.cols[tableDrag.index].style.width=a+'px'; tableDrag.cols[tableDrag.index+1].style.width=b+'px'; e.preventDefault();
  },{passive:false});
  window.addEventListener('pointerup',()=>{if(tableDrag){tableDrag.table.classList.remove('resizing');tableDrag=null;editable.dispatchEvent(new Event('input',{bubbles:true}));}});

  function positionTableTools(cell){
    activeCell=cell; if(!cell){tableTools.classList.add('hidden');return;}
    const r=cell.getBoundingClientRect(); tableTools.classList.remove('hidden');
    const tr=tableTools.getBoundingClientRect();
    tableTools.style.left=Math.max(8,Math.min(window.innerWidth-tr.width-8,r.left))+'px';
    tableTools.style.top=Math.max(8,r.top-tr.height-7)+'px';
  }
  editable.addEventListener('click',e=>{const cell=e.target.closest('td,th');if(cell&&editable.contains(cell))positionTableTools(cell);else if(!e.target.closest('.table-context-tools'))positionTableTools(null);});
  window.addEventListener('scroll',()=>{if(activeCell)positionTableTools(activeCell);},true);
  tableTools.addEventListener('click',e=>{
    const b=e.target.closest('[data-table-action]'); if(!b||!activeCell)return;
    const table=activeCell.closest('table'), row=activeCell.parentElement, ri=row.rowIndex, ci=activeCell.cellIndex, action=b.dataset.tableAction;
    if(action==='row'){
      const nr=table.insertRow(ri+1); const count=Math.max(...Array.from(table.rows).map(r=>r.cells.length)); for(let i=0;i<count;i++){const c=nr.insertCell();c.innerHTML='<br>';}
    }else if(action==='col'){
      Array.from(table.rows).forEach(r=>{const c=r.insertCell(Math.min(ci+1,r.cells.length));c.innerHTML='<br>';});
    }else if(action==='delrow'){
      if(table.rows.length>1)table.deleteRow(ri);else toast('La tabla debe conservar al menos una fila.');
    }else if(action==='delcol'){
      const max=Math.max(...Array.from(table.rows).map(r=>r.cells.length));
      if(max>1)Array.from(table.rows).forEach(r=>{if(r.cells[ci])r.deleteCell(ci);});else toast('La tabla debe conservar al menos una columna.');
    }else if(action==='delete'){
      const next=document.createElement('p');next.innerHTML='<br>';table.insertAdjacentElement('afterend',next);table.remove();activeCell=null;tableTools.classList.add('hidden');editable.dispatchEvent(new Event('input',{bubbles:true}));return;
    }
    rebuildTable(table); activeCell=table.rows[Math.min(ri,table.rows.length-1)].cells[Math.min(ci,table.rows[Math.min(ri,table.rows.length-1)].cells.length-1)]||null; positionTableTools(activeCell); editable.dispatchEvent(new Event('input',{bubbles:true}));
  });

  /* ---------- Reorder pages by dragging thumbnails ---------- */
  function pageNodes(){
    const direct=Array.from(editable.children).filter(x=>x.matches('.editable-page,.legacy-document'));
    if(direct.length)return direct;
    const docx=Array.from(editable.querySelectorAll('.word-edit-wrapper .docx-wrapper > section.docx')); if(docx.length)return docx;
    return Array.from(editable.children);
  }
  function originalNodes(){return $('originalSurface')?Array.from($('originalSurface').children):[];}
  let dragIndex=null;
  function wireOutline(){
    if(!outline)return;
    Array.from(outline.children).forEach((item,i)=>{
      item.draggable=true; item.dataset.pageIndex=String(i); item.title='Arrastra para cambiar el orden de esta página';
      item.ondragstart=e=>{dragIndex=Number(item.dataset.pageIndex);item.classList.add('page-dragging');e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',String(dragIndex));}catch(_){}};
      item.ondragend=()=>{dragIndex=null;outline.querySelectorAll('.page-item').forEach(x=>x.classList.remove('page-dragging','page-drop-target'));};
      item.ondragover=e=>{e.preventDefault();item.classList.add('page-drop-target');e.dataTransfer.dropEffect='move';};
      item.ondragleave=()=>item.classList.remove('page-drop-target');
      item.ondrop=e=>{
        e.preventDefault(); const to=Number(item.dataset.pageIndex), from=dragIndex==null?Number(e.dataTransfer.getData('text/plain')):dragIndex;
        item.classList.remove('page-drop-target'); if(!Number.isFinite(from)||from===to)return;
        const pages=pageNodes(); if(!pages[from]||!pages[to])return;
        const moving=pages[from], target=pages[to];
        if(from<to)target.insertAdjacentElement('afterend',moving);else target.insertAdjacentElement('beforebegin',moving);
        const originals=originalNodes(); if(originals.length===pages.length&&originals[from]&&originals[to]){const om=originals[from],ot=originals[to];if(from<to)ot.insertAdjacentElement('afterend',om);else ot.insertAdjacentElement('beforebegin',om);}
        editable.dispatchEvent(new Event('input',{bubbles:true})); toast('Página movida'); setTimeout(wireOutline,0);
      };
    });
  }
  const outlineObserver=outline?new MutationObserver(()=>requestAnimationFrame(wireOutline)):null;
  if(outlineObserver)outlineObserver.observe(outline,{childList:true}); wireOutline();

  /* Keep table widths stable after editor zoom/window changes. */
  window.addEventListener('resize',()=>requestAnimationFrame(()=>enhanceTables(editable)));
})();
