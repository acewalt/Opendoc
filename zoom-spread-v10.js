(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const editor=$('editorView'), editable=$('editableSurface'), original=$('originalSurface');
  const writing=editor&&editor.querySelector('.writing-area');
  if(!editor||!editable||!original||!writing) return;

  editor.classList.add('waltiva-zoom-v10');
  const state={zoom:100,forced:null};
  const MIN=50,MAX=160,STEP=5;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function pageCount(){
    if(!original.classList.contains('hidden')){
      const n=original.querySelectorAll('.pdf-preview-page,.docx').length;
      if(n)return n;
    }
    let n=editable.querySelectorAll(':scope > .editable-page,:scope > .legacy-document,:scope > .pdf-fidelity-page').length;
    if(!n)n=editable.querySelectorAll('.docx-wrapper > section.docx').length;
    return Math.max(1,n||editable.children.length||1);
  }

  function canSpread(){return window.innerWidth>760&&pageCount()>1;}
  function autoSpread(){return state.zoom<100&&canSpread();}
  function spreadEnabled(){
    if(!canSpread())return false;
    if(state.forced==='single')return false;
    if(state.forced==='two')return true;
    return autoSpread();
  }

  const status=document.createElement('div');
  status.className='waltiva-zoom-status';
  status.setAttribute('role','group');
  status.setAttribute('aria-label','Zoom y vista de páginas');
  status.innerHTML=`
    <button type="button" class="view-mode-button one-page" title="Una página" aria-label="Una página">
      <svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="5" y="2.5" width="8" height="13" rx="1.2" stroke="currentColor" stroke-width="1.4"/></svg>
    </button>
    <button type="button" class="view-mode-button two-page" title="Dos páginas" aria-label="Dos páginas">
      <svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="1.5" y="3" width="6.3" height="12" rx="1" stroke="currentColor" stroke-width="1.25"/><rect x="10.2" y="3" width="6.3" height="12" rx="1" stroke="currentColor" stroke-width="1.25"/></svg>
    </button>
    <span class="zoom-divider"></span>
    <button type="button" class="zoom-minus" title="Alejar">−</button>
    <input class="zoom-range" type="range" min="${MIN}" max="${MAX}" step="${STEP}" value="100" aria-label="Zoom del documento">
    <button type="button" class="zoom-plus" title="Acercar">＋</button>
    <button type="button" class="zoom-percent" title="Restablecer a 100%">100%</button>`;
  editor.appendChild(status);

  const range=status.querySelector('.zoom-range');
  const label=status.querySelector('.zoom-percent');
  const one=status.querySelector('.one-page');
  const two=status.querySelector('.two-page');
  const minus=status.querySelector('.zoom-minus');
  const plus=status.querySelector('.zoom-plus');

  function neutralizeLegacyZoom(){
    [editable,original].forEach(s=>{
      s.style.setProperty('transform','none','important');
      s.style.setProperty('margin-bottom','0px','important');
    });
  }

  function updateMode(){
    const spread=spreadEnabled();
    editor.classList.toggle('waltiva-two-page',spread);
    editor.dataset.pageView=spread?'two':'single';
    one.classList.toggle('active',!spread);
    two.classList.toggle('active',spread);
    two.disabled=!canSpread();
    two.title=canSpread()?'Dos páginas':'Se necesitan al menos dos páginas';
  }

  function applyZoom(value,{clearForced=true,announce=false}={}){
    value=clamp(Math.round(Number(value)/STEP)*STEP,MIN,MAX);
    state.zoom=value;
    if(clearForced)state.forced=null;
    editor.style.setProperty('--waltiva-doc-zoom',String(value/100));
    range.value=String(value);
    label.textContent=value+'%';
    const old=$('zoomLabel');if(old)old.textContent=value+'%';
    neutralizeLegacyZoom();
    updateMode();
    try{localStorage.setItem('waltiva-doc-zoom',String(value));}catch(_){}
    if(announce){
      const t=$('toast');if(t){t.textContent=(spreadEnabled()?'Vista de dos páginas · ':'')+value+'%';t.classList.remove('hidden');clearTimeout(applyZoom._t);applyZoom._t=setTimeout(()=>t.classList.add('hidden'),1200);}
    }
  }

  function step(delta){applyZoom(state.zoom+delta,{clearForced:true,announce:false});}
  range.addEventListener('input',()=>applyZoom(range.value,{clearForced:true}));
  range.addEventListener('change',()=>applyZoom(range.value,{clearForced:true,announce:true}));
  minus.addEventListener('click',()=>step(-STEP));
  plus.addEventListener('click',()=>step(STEP));
  label.addEventListener('click',()=>applyZoom(100,{clearForced:true,announce:true}));
  one.addEventListener('click',()=>{state.forced='single';updateMode();});
  two.addEventListener('click',()=>{if(!canSpread())return;state.forced='two';updateMode();});

  /* Take control of the old toolbar +/- without invoking app.js's transform zoom. */
  ['zoomOut','zoomIn'].forEach(id=>{
    const b=$(id);if(!b)return;
    b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();step(id==='zoomOut'?-STEP:STEP);},true);
  });

  /* Word-like keyboard zoom shortcuts. */
  document.addEventListener('keydown',e=>{
    if(editor.classList.contains('hidden')||!(e.ctrlKey||e.metaKey))return;
    if(e.key==='0'){e.preventDefault();applyZoom(100,{clearForced:true,announce:true});return;}
    if(e.key==='+'||e.key==='='){e.preventDefault();step(STEP);return;}
    if(e.key==='-'){e.preventDefault();step(-STEP);}
  },true);

  /* Ctrl/Cmd + wheel adjusts document zoom while pointer is on the canvas. */
  writing.addEventListener('wheel',e=>{
    if(!(e.ctrlKey||e.metaKey))return;
    e.preventDefault();step(e.deltaY>0?-STEP:STEP);
  },{passive:false,capture:true});

  const mo=new MutationObserver(()=>{neutralizeLegacyZoom();updateMode();});
  mo.observe(editable,{childList:true,subtree:false});
  mo.observe(original,{childList:true,subtree:false,attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',updateMode);
  const viewOriginal=$('viewOriginal'),editToggle=$('editToggle');
  if(viewOriginal)viewOriginal.addEventListener('click',()=>setTimeout(updateMode,0));
  if(editToggle)editToggle.addEventListener('click',()=>setTimeout(updateMode,0));

  let initial=100;try{initial=Number(localStorage.getItem('waltiva-doc-zoom'))||100;}catch(_){}
  applyZoom(initial,{clearForced:true});
  window.WaltivaZoomV10={set:(z)=>applyZoom(z,{clearForced:true}),get:()=>state.zoom,setView:(m)=>{state.forced=m==='two'?'two':m==='single'?'single':null;updateMode();}};
})();
