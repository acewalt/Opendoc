(function(){
  'use strict';
  const editor=document.getElementById('editorView');
  if(!editor) return;

  function zoom(){
    const raw=getComputedStyle(editor).getPropertyValue('--waltiva-doc-zoom');
    const z=parseFloat(raw); return Number.isFinite(z)&&z>0?z:1;
  }

  function wrapPage(page){
    if(page.parentElement && page.parentElement.classList.contains('waltiva-docx-page-slot')) return page.parentElement;
    const cs=getComputedStyle(page);
    const w=parseFloat(page.dataset.waltivaPageWidth)||parseFloat(cs.width)||816;
    const h=parseFloat(page.dataset.waltivaPageHeight)||parseFloat(cs.height)||1056;
    const slot=document.createElement('div');
    slot.className='waltiva-docx-page-slot';
    slot.dataset.baseWidth=String(w);
    slot.dataset.baseHeight=String(h);
    page.parentNode.insertBefore(slot,page);
    slot.appendChild(page);
    page.style.margin='0';
    page.style.zoom='1';
    page.style.transformOrigin='top left';
    return slot;
  }

  function normalizeWrapper(wrapper){
    if(!wrapper) return;
    const pages=Array.from(wrapper.querySelectorAll(':scope > section.docx, :scope > .waltiva-docx-page-slot > section.docx'));
    pages.forEach(wrapPage);
    wrapper.classList.add('waltiva-physical-pages');
  }

  function apply(){
    document.querySelectorAll('#editableSurface .docx-wrapper,#originalSurface .docx-wrapper').forEach(normalizeWrapper);
    const z=zoom();
    document.querySelectorAll('.waltiva-docx-page-slot').forEach(slot=>{
      const page=slot.querySelector(':scope > section.docx'); if(!page) return;
      const w=parseFloat(slot.dataset.baseWidth)||816, h=parseFloat(slot.dataset.baseHeight)||1056;
      slot.style.width=(w*z)+'px'; slot.style.height=(h*z)+'px';
      page.style.transform='scale('+z+')';
      page.style.zoom='1';
    });
  }

  document.addEventListener('waltiva-docx-pages-ready',()=>setTimeout(apply,0));
  const mo=new MutationObserver(()=>setTimeout(apply,0));
  mo.observe(editor,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});
  document.addEventListener('input',e=>{if(e.target&&e.target.matches&&e.target.matches('.zoom-range'))requestAnimationFrame(apply);},true);
  document.addEventListener('click',e=>{if(e.target.closest('.waltiva-zoom-status'))setTimeout(apply,0);},true);
  window.addEventListener('resize',()=>setTimeout(apply,0));
  setTimeout(apply,500);
})();
