(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const editable=$('editableSurface'), original=$('originalSurface'), editor=$('editorView'), notice=$('notice');
  if(!editable||!original||!editor) return;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function toast(msg){const t=$('toast');if(!t)return;t.textContent=msg;t.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.add('hidden'),2600);}
  function isPdf(file){return !!file && (file.type==='application/pdf'||/\.pdf$/i.test(file.name||''));}
  function rgbCss(r,g,b){return 'rgb('+Math.round(r)+','+Math.round(g)+','+Math.round(b)+')';}
  function dist(a,b){const dr=a[0]-b[0],dg=a[1]-b[1],db=a[2]-b[2];return Math.sqrt(dr*dr+dg*dg+db*db);}
  function pixel(data,w,h,x,y){
    x=clamp(Math.round(x),0,w-1);y=clamp(Math.round(y),0,h-1);
    const i=(y*w+x)*4;return [data[i],data[i+1],data[i+2]];
  }
  function samplePaint(ctx, scale, x,y,w,h){
    const cw=ctx.canvas.width,ch=ctx.canvas.height;
    const sx=clamp(Math.floor((x-2)*scale),0,cw-1), sy=clamp(Math.floor((y-2)*scale),0,ch-1);
    const sw=clamp(Math.ceil((w+4)*scale),1,cw-sx), sh=clamp(Math.ceil((h+4)*scale),1,ch-sy);
    let image;
    try{image=ctx.getImageData(sx,sy,sw,sh);}catch(_){return {bg:'rgb(255,255,255)',fg:'rgb(17,17,17)'};}
    const d=image.data;
    const bgSamples=[pixel(d,sw,sh,1,1),pixel(d,sw,sh,sw-2,1),pixel(d,sw,sh,1,sh-2),pixel(d,sw,sh,sw-2,sh-2)];
    const bg=[0,1,2].map(k=>Math.round(bgSamples.reduce((s,p)=>s+p[k],0)/bgSamples.length));
    let fg=[17,17,17],best=-1;
    const gx=Math.max(2,Math.min(7,Math.floor(sw/5))), gy=Math.max(2,Math.min(5,Math.floor(sh/4)));
    for(let yy=1;yy<sh-1;yy+=gy){for(let xx=1;xx<sw-1;xx+=gx){const p=pixel(d,sw,sh,xx,yy),score=dist(p,bg);if(score>best){best=score;fg=p;}}}
    if(best<42) fg=(bg[0]+bg[1]+bg[2]>500)?[20,20,20]:[245,245,245];
    return {bg:rgbCss(...bg),fg:rgbCss(...fg)};
  }

  function waitFor(predicate,timeout){
    const start=Date.now();
    return new Promise(resolve=>{
      (function tick(){
        try{if(predicate()) return resolve(true);}catch(_){}
        if(Date.now()-start>timeout) return resolve(false);
        setTimeout(tick,90);
      })();
    });
  }

  function makeTextSpan(item,style,viewport,ctx,renderScale){
    const tx=window.pdfjsLib.Util.transform(viewport.transform,item.transform);
    const fontHeight=Math.max(4,Math.hypot(tx[2],tx[3]));
    const angle=Math.atan2(tx[1],tx[0]);
    const x=tx[4];
    const y=tx[5]-fontHeight;
    const width=Math.max(2,(Number(item.width)||0)*viewport.scale);
    const boxH=Math.max(fontHeight*1.15,7);
    const paint=samplePaint(ctx,renderScale,x,y,width,boxH);
    const span=document.createElement('span');
    span.className='pdf-fidelity-text';
    span.contentEditable='true';
    span.spellcheck=true;
    span.textContent=item.str||'';
    span.dataset.x=String(x);span.dataset.y=String(y);span.dataset.w=String(width);span.dataset.h=String(boxH);
    span.dataset.fontSize=String(fontHeight);span.dataset.fontFamily=(style&&style.fontFamily)||'Arial';
    span.dataset.bg=paint.bg;span.dataset.fg=paint.fg;
    span.style.setProperty('--pdf-bg',paint.bg);span.style.setProperty('--pdf-fg',paint.fg);
    span.style.left='calc(var(--pdf-live-scale,1) * '+x+'px)';
    span.style.top='calc(var(--pdf-live-scale,1) * '+y+'px)';
    span.style.width='calc(var(--pdf-live-scale,1) * '+width+'px)';
    span.style.fontSize='calc(var(--pdf-live-scale,1) * '+fontHeight+'px)';
    span.style.fontFamily=(style&&style.fontFamily)||'Arial, sans-serif';
    if(/bold|black|heavy|semibold/i.test(item.fontName||'')) span.style.fontWeight='700';
    if(/italic|oblique/i.test(item.fontName||'')) span.style.fontStyle='italic';
    if(angle) span.style.transform='rotate('+angle+'rad)';
    return span;
  }

  async function buildHybridPage(pdfPage,pageNo){
    const natural=pdfPage.getViewport({scale:1});
    const baseScale=natural.width<700?1.25:1;
    const viewport=pdfPage.getViewport({scale:baseScale});
    const renderScale=2;
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(viewport.width*renderScale));
    canvas.height=Math.max(1,Math.round(viewport.height*renderScale));
    const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
    await pdfPage.render({canvasContext:ctx,viewport,transform:[renderScale,0,0,renderScale,0,0]}).promise;

    const page=document.createElement('article');
    page.className='editable-page pdf-fidelity-page';
    page.contentEditable='false';
    page.dataset.sourcePage=String(pageNo);
    page.dataset.pdfWidth=String(viewport.width);page.dataset.pdfHeight=String(viewport.height);
    page.style.setProperty('--pdf-base-w',viewport.width+'px');
    page.style.setProperty('--pdf-aspect',viewport.width+' / '+viewport.height);
    page.style.setProperty('--pdf-live-scale','1');

    const bg=document.createElement('img');
    bg.className='pdf-fidelity-bg';
    bg.alt='Página '+pageNo+' del PDF';
    bg.src=canvas.toDataURL('image/png');
    bg.dataset.pdfBackground='true';
    page.appendChild(bg);

    const layer=document.createElement('div');
    layer.className='pdf-fidelity-text-layer';
    layer.contentEditable='false';
    page.appendChild(layer);

    const tc=await pdfPage.getTextContent({normalizeWhitespace:false,disableCombineTextItems:false});
    let textItems=0;
    for(const item of tc.items||[]){
      if(!item||!item.str||!item.str.trim()) continue;
      const style=(tc.styles&&tc.styles[item.fontName])||null;
      layer.appendChild(makeTextSpan(item,style,viewport,ctx,renderScale));
      textItems++;
    }
    if(!textItems) page.dataset.scanned='true';

    const ro=new ResizeObserver(entries=>{
      for(const e of entries){
        const base=parseFloat(page.dataset.pdfWidth)||viewport.width;
        const actual=e.contentRect.width||base;
        page.style.setProperty('--pdf-live-scale',String(actual/base));
      }
    });
    ro.observe(page);
    page._waltivaResizeObserver=ro;
    return page;
  }

  async function enhancePdf(file){
    if(!isPdf(file)||!window.pdfjsLib||!window.pdfjsLib.getDocument) return;
    let pdf;
    try{
      const data=new Uint8Array(await file.arrayBuffer());
      pdf=await window.pdfjsLib.getDocument({data}).promise;
    }catch(err){console.warn('Waltiva fidelity PDF load failed',err);return;}

    await waitFor(()=>original.querySelectorAll('canvas').length>=pdf.numPages && (!$('busy')||$('busy').classList.contains('hidden')),15000);

    const fragment=document.createDocumentFragment();
    let scanned=0;
    for(let i=1;i<=pdf.numPages;i++){
      try{
        const p=await pdf.getPage(i);
        const hybrid=await buildHybridPage(p,i);
        if(hybrid.dataset.scanned==='true') scanned++;
        fragment.appendChild(hybrid);
      }catch(err){console.warn('Fidelity page '+i+' failed',err);}
    }
    if(!fragment.childNodes.length) return;

    editable.querySelectorAll('.pdf-fidelity-page').forEach(p=>{try{p._waltivaResizeObserver&&p._waltivaResizeObserver.disconnect();}catch(_){}});
    editable.innerHTML='';
    editable.appendChild(fragment);
    editor.classList.add('pdf-fidelity-document');
    editable.dispatchEvent(new Event('input',{bubbles:true}));

    if(notice){
      notice.classList.add('pdf-fidelity-notice');
      notice.textContent=scanned===pdf.numPages
        ?'PDF visual conservado página por página. Este archivo parece escaneado: para editar el texto interno hace falta OCR.'
        :'Edición de alta fidelidad: Waltiva conserva la página PDF como capa visual y superpone el texto editable respetando su posición y proporción originales.';
    }
    toast('PDF preparado en modo de alta fidelidad');
  }

  function hookInput(input){
    if(!input||input.dataset.fidelityHooked)return;
    input.dataset.fidelityHooked='1';
    input.addEventListener('change',e=>{
      const file=e.currentTarget.files&&e.currentTarget.files[0];
      if(isPdf(file)) enhancePdf(file);
    });
  }
  document.querySelectorAll('input[type="file"]').forEach(hookInput);
  new MutationObserver(records=>{for(const r of records){for(const n of r.addedNodes){if(n.nodeType!==1)continue;if(n.matches&&n.matches('input[type="file"]'))hookInput(n);n.querySelectorAll&&n.querySelectorAll('input[type="file"]').forEach(hookInput);}}}).observe(document.body,{childList:true,subtree:true});

  const editObs=new MutationObserver(()=>{
    if(!editable.querySelector('.pdf-fidelity-page')) editor.classList.remove('pdf-fidelity-document');
  });
  editObs.observe(editable,{childList:true});
})();
