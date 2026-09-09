(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const editable=$('editableSurface');
  const original=$('originalSurface');
  const editor=$('editorView');
  const notice=$('notice');
  const toolbar=$('toolbar');
  if(!editable||!original||!editor||!window.pdfjsLib) return;

  window.__WALTIVA_FIDELITY_V6__=true;
  const runtime={file:null,pdfPromise:null,token:0,building:false,lastSignature:'',timer:null};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function toast(msg){
    const t=$('toast'); if(!t)return;
    t.textContent=msg; t.classList.remove('hidden');
    clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.add('hidden'),2400);
  }
  function isPdf(file){return !!file&&(file.type==='application/pdf'||/\.pdf$/i.test(file.name||''));}
  function canvasDisplaySize(canvas){
    const sw=parseFloat(canvas.style.width), sh=parseFloat(canvas.style.height);
    const rect=canvas.getBoundingClientRect();
    const w=sw||rect.width||(canvas.width/(window.devicePixelRatio||1))||612;
    const h=sh||rect.height||(canvas.height/(window.devicePixelRatio||1))||792;
    return {w,h};
  }
  function capturePdf(file){
    if(!isPdf(file)) return;
    runtime.file=file; runtime.token++; runtime.lastSignature='';
    const token=runtime.token;
    runtime.pdfPromise=file.arrayBuffer().then(buf=>{
      if(token!==runtime.token) throw new Error('stale PDF');
      return window.pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;
    }).catch(err=>{console.warn('Waltiva V6 PDF preload failed',err);return null;});
    schedule(80);
  }

  document.addEventListener('change',e=>{
    const input=e.target&&e.target.matches&&e.target.matches('input[type="file"]')?e.target:null;
    if(input&&input.files&&input.files[0]) capturePdf(input.files[0]);
  },true);
  window.addEventListener('drop',e=>{
    const files=e.dataTransfer&&e.dataTransfer.files;
    if(files&&files[0]) capturePdf(files[0]);
  },true);

  function rgb(r,g,b){return 'rgb('+Math.round(r)+','+Math.round(g)+','+Math.round(b)+')';}
  function pdist(a,b){const x=a[0]-b[0],y=a[1]-b[1],z=a[2]-b[2];return Math.sqrt(x*x+y*y+z*z);}
  function pixel(data,w,h,x,y){
    x=clamp(Math.round(x),0,w-1); y=clamp(Math.round(y),0,h-1);
    const i=(y*w+x)*4; return [data[i],data[i+1],data[i+2]];
  }
  function sampleCanvasPaint(ctx,scale,x,y,w,h){
    const cw=ctx.canvas.width,ch=ctx.canvas.height;
    const sx=clamp(Math.floor((x-2)*scale),0,cw-1), sy=clamp(Math.floor((y-2)*scale),0,ch-1);
    const sw=clamp(Math.ceil((w+4)*scale),1,cw-sx), sh=clamp(Math.ceil((h+4)*scale),1,ch-sy);
    let im; try{im=ctx.getImageData(sx,sy,sw,sh);}catch(_){return {bg:'#fff',fg:'#111'};}
    const d=im.data;
    const corners=[pixel(d,sw,sh,1,1),pixel(d,sw,sh,sw-2,1),pixel(d,sw,sh,1,sh-2),pixel(d,sw,sh,sw-2,sh-2)];
    const bg=[0,1,2].map(k=>Math.round(corners.reduce((s,p)=>s+p[k],0)/corners.length));
    let fg=[17,17,17],best=0;
    const dx=Math.max(2,Math.floor(sw/6)),dy=Math.max(2,Math.floor(sh/4));
    for(let yy=1;yy<sh-1;yy+=dy){for(let xx=1;xx<sw-1;xx+=dx){const p=pixel(d,sw,sh,xx,yy),score=pdist(p,bg);if(score>best){best=score;fg=p;}}}
    if(best<36) fg=(bg[0]+bg[1]+bg[2]>520)?[18,18,18]:[245,245,245];
    return {bg:rgb(...bg),fg:rgb(...fg)};
  }

  function makeTextSpan(item,style,viewport,ctx,canvasScale){
    const tx=window.pdfjsLib.Util.transform(viewport.transform,item.transform);
    const fontHeight=Math.max(4,Math.hypot(tx[2],tx[3]));
    const angle=Math.atan2(tx[1],tx[0]);
    const x=tx[4], y=tx[5]-fontHeight;
    const width=Math.max(2,(Number(item.width)||0)*viewport.scale);
    const boxH=Math.max(7,fontHeight*1.16);
    const paint=sampleCanvasPaint(ctx,canvasScale,x,y,width,boxH);
    const span=document.createElement('span');
    span.className='pdf-fidelity-text'; span.contentEditable='true'; span.spellcheck=true;
    span.textContent=item.str||'';
    span.dataset.x=String(x); span.dataset.y=String(y); span.dataset.w=String(width); span.dataset.h=String(boxH);
    span.dataset.fontSize=String(fontHeight); span.dataset.fontFamily=(style&&style.fontFamily)||'Arial';
    span.dataset.bg=paint.bg; span.dataset.fg=paint.fg;
    span.style.setProperty('--pdf-bg',paint.bg); span.style.setProperty('--pdf-fg',paint.fg);
    span.style.left='calc(var(--pdf-live-scale,1) * '+x+'px)';
    span.style.top='calc(var(--pdf-live-scale,1) * '+y+'px)';
    span.style.width='calc(var(--pdf-live-scale,1) * '+Math.max(width,4)+'px)';
    span.style.fontSize='calc(var(--pdf-live-scale,1) * '+fontHeight+'px)';
    span.style.fontFamily=((style&&style.fontFamily)||'Arial')+', sans-serif';
    if(/bold|black|heavy|semibold/i.test(item.fontName||'')) span.style.fontWeight='700';
    if(/italic|oblique/i.test(item.fontName||'')) span.style.fontStyle='italic';
    if(angle) span.style.transform='rotate('+angle+'rad)';
    return span;
  }

  async function buildPage(canvas,pdfPage,index){
    const size=canvasDisplaySize(canvas);
    const page=document.createElement('article');
    page.className='editable-page pdf-fidelity-page pdf-fidelity-v6';
    page.contentEditable='false'; page.dataset.sourcePage=String(index+1);
    page.dataset.pdfWidth=String(size.w); page.dataset.pdfHeight=String(size.h);
    page.style.setProperty('--pdf-base-w',size.w+'px');
    page.style.setProperty('--pdf-aspect',size.w+' / '+size.h);
    page.style.setProperty('--pdf-live-scale','1');

    const bg=document.createElement('img'); bg.className='pdf-fidelity-bg'; bg.alt='Página '+(index+1)+' del PDF';
    bg.src=canvas.toDataURL('image/png'); bg.dataset.pdfBackground='true'; page.appendChild(bg);

    const layer=document.createElement('div'); layer.className='pdf-fidelity-text-layer'; layer.contentEditable='false'; page.appendChild(layer);
    if(pdfPage){
      const natural=pdfPage.getViewport({scale:1});
      const scale=size.w/natural.width;
      const viewport=pdfPage.getViewport({scale});
      const tc=await pdfPage.getTextContent({normalizeWhitespace:false,disableCombineTextItems:false});
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const canvasScale=canvas.width/size.w;
      let count=0;
      for(const item of tc.items||[]){
        if(!item||!item.str||!item.str.trim()) continue;
        layer.appendChild(makeTextSpan(item,(tc.styles&&tc.styles[item.fontName])||null,viewport,ctx,canvasScale)); count++;
      }
      if(!count) page.dataset.scanned='true';
    }else{
      page.dataset.scanned='true';
    }

    if(window.ResizeObserver){
      const ro=new ResizeObserver(entries=>{
        for(const e of entries){const base=parseFloat(page.dataset.pdfWidth)||size.w;page.style.setProperty('--pdf-live-scale',String((e.contentRect.width||base)/base));}
      });
      ro.observe(page); page._waltivaResizeObserver=ro;
    }
    return page;
  }

  function normalizeEditability(){
    const editing=!(toolbar&&toolbar.classList.contains('disabled'))&&!editable.classList.contains('hidden');
    editable.querySelectorAll('.pdf-fidelity-page').forEach(p=>p.contentEditable='false');
    editable.querySelectorAll('.pdf-fidelity-text-layer').forEach(l=>l.contentEditable='false');
    editable.querySelectorAll('.pdf-fidelity-text').forEach(s=>s.contentEditable=editing?'true':'false');
  }

  async function upgrade(){
    if(runtime.building) return;
    const canvases=Array.from(original.querySelectorAll('.pdf-preview-page canvas'));
    if(!canvases.length) return;
    let pdf=null;
    if(runtime.pdfPromise) pdf=await runtime.pdfPromise;
    if(pdf&&canvases.length<pdf.numPages) return;
    const signature=canvases.map(c=>c.width+'x'+c.height).join('|')+'#'+(runtime.file&&runtime.file.name||'');
    if(runtime.lastSignature===signature&&editable.querySelectorAll('.pdf-fidelity-v6').length===canvases.length) return;

    runtime.building=true;
    try{
      const frag=document.createDocumentFragment();
      for(let i=0;i<canvases.length;i++){
        const pdfPage=pdf&&i<pdf.numPages?await pdf.getPage(i+1):null;
        frag.appendChild(await buildPage(canvases[i],pdfPage,i));
      }
      editable.querySelectorAll('.pdf-fidelity-page').forEach(p=>{try{p._waltivaResizeObserver&&p._waltivaResizeObserver.disconnect();}catch(_){}});
      editable.innerHTML=''; editable.appendChild(frag);
      editor.classList.add('pdf-fidelity-document'); runtime.lastSignature=signature;
      normalizeEditability(); editable.dispatchEvent(new Event('input',{bubbles:true}));
      if(notice){
        notice.classList.add('pdf-fidelity-notice');
        notice.textContent=pdf
          ?'Edición PDF de alta fidelidad: la página original completa permanece como fondo y el texto editable se coloca encima conservando posición y proporción.'
          :'Vista visual preservada. Para editar el texto de esta apertura Waltiva necesita volver a cargar el PDF desde el selector de archivos.';
      }
      toast('Imágenes y gráficos del PDF conservados en Editar');
    }catch(err){console.error('Waltiva V6 fidelity upgrade failed',err);}
    finally{runtime.building=false;}
  }

  function schedule(delay){
    clearTimeout(runtime.timer); runtime.timer=setTimeout(upgrade,delay==null?220:delay);
  }

  const originalObserver=new MutationObserver(()=>schedule(180));
  originalObserver.observe(original,{childList:true,subtree:true});
  const editableObserver=new MutationObserver(()=>setTimeout(normalizeEditability,0));
  editableObserver.observe(editable,{childList:true,subtree:true,attributes:true,attributeFilter:['contenteditable','class']});
  if(toolbar)new MutationObserver(normalizeEditability).observe(toolbar,{attributes:true,attributeFilter:['class']});

  const editButton=$('editToggle'); if(editButton) editButton.addEventListener('click',()=>{schedule(0);setTimeout(normalizeEditability,50);},true);
  const originalButton=$('viewOriginal'); if(originalButton) originalButton.addEventListener('click',()=>setTimeout(normalizeEditability,50),true);

  schedule(0);
})();