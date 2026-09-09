(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const editable=$('editableSurface'), toolbar=$('toolbar'), original=$('originalSurface');
  if(!editable||!toolbar||!window.pdfjsLib) return;

  const runtime={file:null,pdfPromise:null,token:0,timer:null,processing:new WeakSet()};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const isPdf=f=>!!f&&(f.type==='application/pdf'||/\.pdf$/i.test(f.name||''));
  const isImage=f=>!!f&&(/^image\//i.test(f.type||'')||/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name||''));
  function toast(msg){const t=$('toast');if(!t)return;t.textContent=msg;t.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.add('hidden'),2600);}
  function editingEnabled(){return !toolbar.classList.contains('disabled')&&!editable.classList.contains('hidden');}
  function fireInput(){editable.dispatchEvent(new Event('input',{bubbles:true}));}
  function px(v){return (Math.round(v*100)/100)+'px';}

  /* ---------- Drop / paste images inline at the document caret ---------- */
  function pointRange(x,y){
    let r=null;
    if(document.caretRangeFromPoint) r=document.caretRangeFromPoint(x,y);
    else if(document.caretPositionFromPoint){const p=document.caretPositionFromPoint(x,y);if(p){r=document.createRange();r.setStart(p.offsetNode,p.offset);r.collapse(true);}}
    if(!r)return null;
    let n=r.startContainer;if(n&&n.nodeType===3)n=n.parentElement;
    return n&&editable.contains(n)?r:null;
  }
  function selectionRange(){const s=window.getSelection();if(!s||!s.rangeCount)return null;const r=s.getRangeAt(0).cloneRange();let n=r.startContainer;if(n&&n.nodeType===3)n=n.parentElement;return n&&editable.contains(n)?r:null;}
  function fallbackRange(){
    let page=editable.querySelector('.editable-page:last-child,.legacy-document:last-child,.word-edit-wrapper:last-child,.pdf-fidelity-page:last-child')||editable;
    const r=document.createRange();r.selectNodeContents(page);r.collapse(false);return r;
  }
  function dataUrl(file){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=()=>reject(fr.error||new Error('No se pudo leer la imagen'));fr.readAsDataURL(file);});}
  async function insertInlineFiles(files,range){
    files=Array.from(files||[]).filter(isImage);if(!files.length)return false;
    let r=range||selectionRange()||fallbackRange();
    for(const file of files){
      const src=await dataUrl(file);const img=document.createElement('img');img.src=src;img.alt=file.name||'Imagen';img.className='waltiva-inline-image';img.draggable=false;img.dataset.importedImage='1';
      const wrap=document.createElement('span');wrap.className='waltiva-inline-media';wrap.contentEditable='false';wrap.appendChild(img);
      r.deleteContents();r.insertNode(wrap);r.setStartAfter(wrap);r.collapse(true);
      const spacer=document.createTextNode('\u00a0');r.insertNode(spacer);r.setStartAfter(spacer);r.collapse(true);
    }
    const s=window.getSelection();s.removeAllRanges();s.addRange(r);fireInput();toast(files.length===1?'Imagen insertada en la línea del documento':files.length+' imágenes insertadas');return true;
  }

  editable.addEventListener('dragover',e=>{
    const files=e.dataTransfer&&e.dataTransfer.files;if(files&&Array.from(files).some(isImage)){e.preventDefault();e.dataTransfer.dropEffect='copy';editable.classList.add('waltiva-image-drop-active');}
  },true);
  editable.addEventListener('dragleave',e=>{if(!editable.contains(e.relatedTarget))editable.classList.remove('waltiva-image-drop-active');},true);
  editable.addEventListener('drop',e=>{
    const files=e.dataTransfer&&e.dataTransfer.files;if(!files||!Array.from(files).some(isImage))return;
    e.preventDefault();e.stopImmediatePropagation();editable.classList.remove('waltiva-image-drop-active');
    insertInlineFiles(files,pointRange(e.clientX,e.clientY)).catch(err=>{console.error(err);toast('No se pudo insertar la imagen');});
  },true);
  editable.addEventListener('paste',e=>{
    const files=Array.from((e.clipboardData&&e.clipboardData.files)||[]).filter(isImage);if(!files.length)return;
    e.preventDefault();insertInlineFiles(files,selectionRange()).catch(console.error);
  },true);

  /* ---------- Capture the PDF so its native raster image XObjects can be separated ---------- */
  function capturePdf(file){
    if(!isPdf(file))return;runtime.file=file;runtime.token++;const token=runtime.token;
    runtime.pdfPromise=file.arrayBuffer().then(buf=>{if(token!==runtime.token)throw new Error('stale PDF');return pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;}).catch(err=>{console.warn('Waltiva V8 PDF preload failed',err);return null;});
    schedule(250);
  }
  document.addEventListener('change',e=>{const i=e.target&&e.target.matches&&e.target.matches('input[type="file"]')?e.target:null;if(i&&i.files&&i.files[0]&&isPdf(i.files[0]))capturePdf(i.files[0]);},true);
  window.addEventListener('drop',e=>{const fs=e.dataTransfer&&e.dataTransfer.files;if(fs&&fs[0]&&isPdf(fs[0]))capturePdf(fs[0]);},true);

  function mul(a,b){return pdfjsLib.Util.transform(a,b);}
  function bboxFromMatrix(m){
    const p=[[m[4],m[5]],[m[0]+m[4],m[1]+m[5]],[m[2]+m[4],m[3]+m[5]],[m[0]+m[2]+m[4],m[1]+m[3]+m[5]]];
    const xs=p.map(x=>x[0]),ys=p.map(x=>x[1]);const left=Math.min(...xs),top=Math.min(...ys),right=Math.max(...xs),bottom=Math.max(...ys);
    return {left,top,width:right-left,height:bottom-top,angle:Math.atan2(m[1],m[0])*180/Math.PI};
  }
  function getPageObj(page,id){
    return new Promise(resolve=>{
      try{const v=page.objs.get(id);if(v){resolve(v);return;}}catch(_){}
      try{page.objs.get(id,v=>resolve(v||null));}catch(_){resolve(null);}
      setTimeout(()=>resolve(null),1600);
    });
  }
  function imageCanvas(obj){
    if(!obj)return null;
    const source=obj.bitmap||obj;
    const w=obj.width||source.width||source.naturalWidth,h=obj.height||source.height||source.naturalHeight;
    if(!w||!h)return null;
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');
    try{
      if(typeof ImageBitmap!=='undefined'&&source instanceof ImageBitmap)ctx.drawImage(source,0,0,w,h);
      else if((typeof HTMLImageElement!=='undefined'&&source instanceof HTMLImageElement)||(typeof HTMLCanvasElement!=='undefined'&&source instanceof HTMLCanvasElement))ctx.drawImage(source,0,0,w,h);
      else if(obj.data){
        const d=obj.data;
        if(d.length===w*h*4){ctx.putImageData(new ImageData(new Uint8ClampedArray(d),w,h),0,0);}
        else if(d.length===w*h*3){const out=new Uint8ClampedArray(w*h*4);for(let i=0,j=0;i<d.length;i+=3,j+=4){out[j]=d[i];out[j+1]=d[i+1];out[j+2]=d[i+2];out[j+3]=255;}ctx.putImageData(new ImageData(out,w,h),0,0);}
        else return null;
      }else return null;
    }catch(err){console.warn('Waltiva could not decode PDF image object',err);return null;}
    return c;
  }
  function makeTransformObject(src,page,box,index){
    const wrap=document.createElement('div');wrap.className='waltiva-transform-object absolute-object pdf-native-image-object';wrap.contentEditable='false';wrap.dataset.tx='0';wrap.dataset.ty='0';wrap.dataset.rotation=String(box.angle||0);wrap.dataset.flipX='1';wrap.dataset.flipY='1';wrap.dataset.lockAspect='1';wrap.dataset.z=String(60+index);wrap.dataset.pdfNativeImage='1';
    wrap.style.left=px(box.left);wrap.style.top=px(box.top);wrap.style.width=px(Math.max(8,box.width));wrap.style.height=px(Math.max(8,box.height));
    wrap.style.setProperty('--obj-tx','0px');wrap.style.setProperty('--obj-ty','0px');wrap.style.setProperty('--obj-rotate',(box.angle||0)+'deg');wrap.style.setProperty('--obj-flip-x','1');wrap.style.setProperty('--obj-flip-y','1');
    const img=document.createElement('img');img.src=src;img.alt='Imagen del PDF';img.draggable=false;img.style.width='100%';img.style.height='100%';img.style.objectFit='fill';wrap.appendChild(img);page.appendChild(wrap);return wrap;
  }

  async function pageBackgroundCanvas(pageEl){
    const bg=pageEl.querySelector('.pdf-fidelity-bg');if(!bg)return null;try{if(bg.decode)await bg.decode();}catch(_){}
    const c=document.createElement('canvas');const w=Math.max(1,Math.round(parseFloat(pageEl.dataset.pdfWidth)||pageEl.offsetWidth)),h=Math.max(1,Math.round(parseFloat(pageEl.dataset.pdfHeight)||pageEl.offsetHeight));c.width=w;c.height=h;const ctx=c.getContext('2d');try{ctx.drawImage(bg,0,0,w,h);}catch(_){return null;}return {c,ctx,bg,w,h};
  }
  function borderFill(ctx,box,W,H){
    const x=clamp(Math.floor(box.left),0,W-1),y=clamp(Math.floor(box.top),0,H-1),w=clamp(Math.ceil(box.width),1,W-x),h=clamp(Math.ceil(box.height),1,H-y);if(w<2||h<2)return;
    const pts=[];const step=Math.max(1,Math.floor(Math.min(w,h)/10));
    function p(xx,yy){const d=ctx.getImageData(clamp(xx,0,W-1),clamp(yy,0,H-1),1,1).data;pts.push([d[0],d[1],d[2]]);}
    for(let xx=x;xx<x+w;xx+=step){p(xx,y);p(xx,y+h-1);}for(let yy=y;yy<y+h;yy+=step){p(x,yy);p(x+w-1,yy);}
    const avg=[0,1,2].map(k=>pts.reduce((s,q)=>s+q[k],0)/Math.max(1,pts.length));let variance=0;for(const q of pts)variance+=(q[0]-avg[0])**2+(q[1]-avg[1])**2+(q[2]-avg[2])**2;variance/=Math.max(1,pts.length);
    if(variance<1800){ctx.fillStyle='rgb('+avg.map(Math.round).join(',')+')';ctx.fillRect(x,y,w,h);return true;}return false;
  }

  async function extractImagesForPage(pdfPage,pageEl,index){
    if(!pdfPage||!pageEl||pageEl.dataset.nativeImagesV8==='1'||runtime.processing.has(pageEl))return;
    runtime.processing.add(pageEl);
    try{
      const op=await pdfPage.getOperatorList();const OPS=pdfjsLib.OPS||{};let ctm=[1,0,0,1,0,0],stack=[],found=[];
      for(let i=0;i<op.fnArray.length;i++){
        const fn=op.fnArray[i],args=op.argsArray[i]||[];
        if(fn===OPS.save){stack.push(ctm.slice());continue;}if(fn===OPS.restore){ctm=stack.pop()||[1,0,0,1,0,0];continue;}if(fn===OPS.transform){ctm=mul(ctm,args);continue;}
        let obj=null;
        if(fn===OPS.paintInlineImageXObject){obj=args[0]||null;}
        else if(fn===OPS.paintImageXObject||fn===OPS.paintJpegXObject){obj=await getPageObj(pdfPage,args[0]);}
        else continue;
        const natural=pdfPage.getViewport({scale:1});const pageW=parseFloat(pageEl.dataset.pdfWidth)||pageEl.offsetWidth;const viewport=pdfPage.getViewport({scale:pageW/natural.width});const combined=mul(viewport.transform,ctm);const box=bboxFromMatrix(combined);
        if(box.width<8||box.height<8||box.width*box.height<180)continue;
        const ic=imageCanvas(obj);if(!ic)continue;
        const key=[Math.round(box.left),Math.round(box.top),Math.round(box.width),Math.round(box.height)].join(':');if(found.some(x=>x.key===key))continue;
        found.push({key,box,src:ic.toDataURL('image/png')});if(found.length>=80)break;
      }
      const bgData=await pageBackgroundCanvas(pageEl);let masked=0;
      for(let i=0;i<found.length;i++){
        const f=found[i];if(bgData&&borderFill(bgData.ctx,f.box,bgData.w,bgData.h))masked++;
        makeTransformObject(f.src,pageEl,f.box,i);
      }
      if(bgData&&masked)bgData.bg.src=bgData.c.toDataURL('image/png');
      pageEl.dataset.nativeImagesV8='1';
      if(found.length)toast(found.length+' imagen'+(found.length===1?'':'es')+' del PDF convertida'+(found.length===1?'':'s')+' en objetos editables');
    }catch(err){console.warn('Waltiva V8 automatic PDF image extraction failed',err);}finally{runtime.processing.delete(pageEl);}
  }

  async function processPdfObjects(){
    if(!runtime.pdfPromise)return;const pdf=await runtime.pdfPromise;if(!pdf)return;const pages=Array.from(editable.querySelectorAll('.pdf-fidelity-page'));
    for(let i=0;i<Math.min(pages.length,pdf.numPages);i++){if(pages[i].dataset.nativeImagesV8!=='1')await extractImagesForPage(await pdf.getPage(i+1),pages[i],i);}
  }
  function schedule(ms=280){clearTimeout(runtime.timer);runtime.timer=setTimeout(processPdfObjects,ms);}
  new MutationObserver(()=>schedule()).observe(editable,{childList:true,subtree:true});
  const edit=$('editToggle');if(edit)edit.addEventListener('click',()=>schedule(80),true);

  /* Public hook used by future editor modules. */
  window.WaltivaMediaV8={insertInlineFiles,processPdfObjects};
})();