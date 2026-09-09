(function(){
  'use strict';
  const editor=document.getElementById('editorView');
  const editable=document.getElementById('editableSurface');
  const original=document.getElementById('originalSurface');
  if(!editor||!editable||!original) return;

  function px(v){const n=parseFloat(v);return Number.isFinite(n)&&n>0?n:0;}

  function baseWidth(page){
    if(page.classList.contains('pdf-fidelity-page')){
      return px(page.dataset.pdfWidth)||px(getComputedStyle(page).getPropertyValue('--pdf-base-w'))||760;
    }
    if(page.classList.contains('pdf-preview-page')){
      const canvas=page.querySelector('canvas');
      return (canvas&&(px(canvas.style.width)||px(canvas.getAttribute('width'))/(window.devicePixelRatio||1)))||900;
    }
    if(page.classList.contains('editable-page')||page.classList.contains('legacy-document')){
      const explicit=px(page.dataset.waltivaPageWidth)||px(page.style.width);
      if(explicit)return explicit;
      /* Waltiva's native paper is 816 CSS px (US Letter at 96 dpi). */
      return 816;
    }
    return 816;
  }

  function tagPage(page){
    const w=baseWidth(page);
    page.style.setProperty('--waltiva-page-base-w',w+'px');
    page.dataset.waltivaSpreadBaseWidth=String(w);
  }

  function tagAll(){
    editable.querySelectorAll(':scope > .editable-page,:scope > .legacy-document,:scope > .pdf-fidelity-page').forEach(tagPage);
    original.querySelectorAll(':scope > .pdf-preview-page').forEach(tagPage);
  }

  /* Tag new pages immediately. This must run after V10 but independently of its grid. */
  const mo=new MutationObserver(()=>requestAnimationFrame(tagAll));
  mo.observe(editable,{childList:true});
  mo.observe(original,{childList:true});

  /* Re-tag on mode changes/import completion; PDF pages expose their true canvas width then. */
  ['viewOriginal','editToggle'].forEach(id=>{
    const b=document.getElementById(id);if(b)b.addEventListener('click',()=>requestAnimationFrame(tagAll));
  });
  document.addEventListener('waltiva-docx-pages-ready',tagAll);
  window.addEventListener('resize',()=>requestAnimationFrame(tagAll));

  tagAll();
  window.WaltivaSpreadFixV12={refresh:tagAll};
})();
