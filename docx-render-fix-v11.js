(function(){
  'use strict';
  if(!window.docx || !window.docx.renderAsync || window.__WALTIVA_DOCX_RENDER_V11__) return;
  window.__WALTIVA_DOCX_RENDER_V11__=true;

  const nativeRender=window.docx.renderAsync.bind(window.docx);

  function normalizePages(root){
    if(!root) return;
    const pages=Array.from(root.querySelectorAll('.docx-wrapper > section.docx'));
    pages.forEach((page,index)=>{
      const cs=getComputedStyle(page);
      const w=parseFloat(cs.width)||parseFloat(page.style.width)||816;
      const h=parseFloat(cs.height)||parseFloat(page.style.height)||1056;
      page.dataset.waltivaDocxPage=String(index+1);
      page.dataset.waltivaPageWidth=String(w);
      page.dataset.waltivaPageHeight=String(h);
      page.style.boxSizing='border-box';
      page.style.width=w+'px';
      page.style.minWidth=w+'px';
      page.style.maxWidth=w+'px';
      page.style.height=h+'px';
      page.style.minHeight=h+'px';
      page.style.maxHeight=h+'px';
      page.style.overflow='hidden';
      page.style.flex='0 0 auto';
    });
    root.dispatchEvent(new CustomEvent('waltiva-docx-pages-ready',{bubbles:true,detail:{count:pages.length}}));
  }

  window.docx.renderAsync=async function(data,bodyContainer,styleContainer,userOptions){
    const options=Object.assign({},userOptions||{}, {
      breakPages:true,
      ignoreLastRenderedPageBreak:false,
      ignoreWidth:false,
      ignoreHeight:false,
      renderHeaders:true,
      renderFooters:true,
      ignoreFonts:false
    });
    const result=await nativeRender(data,bodyContainer,styleContainer,options);
    bodyContainer && bodyContainer.classList.add('waltiva-docx-v11');
    requestAnimationFrame(()=>requestAnimationFrame(()=>normalizePages(bodyContainer)));
    return result;
  };
})();
