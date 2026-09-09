(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const editable=$('editableSurface'), toolbar=$('toolbar'), editor=$('editorView');
  if(!editable||!toolbar||!editor) return;

  const state={selected:null,drag:null,extract:false,extractDrag:null,z:20};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const num=(v,f=0)=>Number.isFinite(parseFloat(v))?parseFloat(v):f;
  function toast(msg){const t=$('toast');if(!t)return;t.textContent=msg;t.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.add('hidden'),2800);}
  function fireInput(){editable.dispatchEvent(new Event('input',{bubbles:true}));}
  function editingEnabled(){return !toolbar.classList.contains('disabled')&&!editable.classList.contains('hidden');}
  function px(n){return Math.round(n*100)/100+'px';}
  function pageScale(obj){const page=obj.closest('.editable-page,.legacy-document,.pdf-fidelity-page');if(!page)return 1;const r=page.getBoundingClientRect();return page.offsetWidth?Math.max(.05,r.width/page.offsetWidth):1;}

  /* Add the PDF crop tool beside Image. */
  let extractBtn=$('extractGraphic');
  if(!extractBtn){
    const imageBtn=$('insertImage');
    extractBtn=document.createElement('button');extractBtn.id='extractGraphic';extractBtn.type='button';extractBtn.title='Extraer gráfico del PDF como objeto transformable';extractBtn.textContent='◩';
    if(imageBtn) imageBtn.insertAdjacentElement('afterend',extractBtn); else toolbar.appendChild(extractBtn);
  }

  const objectBar=document.createElement('div');
  objectBar.className='waltiva-object-toolbar hidden';objectBar.id='waltivaObjectToolbar';
  objectBar.innerHTML='<button data-obj="lock" class="active" title="Mantener proporción">🔗</button><span>Rot.</span><input data-obj="angle" type="number" step="1" min="-360" max="360" value="0" title="Rotación en grados"><button data-obj="r90" title="Rotar 90°">↻90</button><span class="separator"></span><button data-obj="flipH" title="Voltear horizontal">↔</button><button data-obj="flipV" title="Voltear vertical">↕</button><span class="separator"></span><button data-obj="front" title="Traer al frente">↑</button><button data-obj="back" title="Enviar atrás">↓</button><button data-obj="dup" title="Duplicar">⧉</button><button data-obj="delete" class="danger" title="Eliminar">⌫</button>';
  document.body.appendChild(objectBar);

  function apply(obj){
    obj.style.setProperty('--obj-tx',num(obj.dataset.tx)+'px');
    obj.style.setProperty('--obj-ty',num(obj.dataset.ty)+'px');
    obj.style.setProperty('--obj-rotate',num(obj.dataset.rotation)+'deg');
    obj.style.setProperty('--obj-flip-x',obj.dataset.flipX||'1');
    obj.style.setProperty('--obj-flip-y',obj.dataset.flipY||'1');
    if(obj.dataset.z)obj.style.zIndex=obj.dataset.z;
  }
  function sizeLabel(obj,show){const lab=obj.querySelector('.waltiva-object-size-label');if(!lab)return;lab.textContent=Math.round(obj.offsetWidth)+' × '+Math.round(obj.offsetHeight)+' px';lab.style.display=show?'block':'none';}
  function ensureHandles(obj){
    if(obj.dataset.handles==='1')return;obj.dataset.handles='1';
    ['nw','n','ne','e','se','s','sw','w'].forEach(h=>{const el=document.createElement('span');el.className='waltiva-transform-handle';el.dataset.handle=h;el.contentEditable='false';obj.appendChild(el);});
    const stem=document.createElement('span');stem.className='waltiva-rotate-stem';stem.contentEditable='false';obj.appendChild(stem);
    const rot=document.createElement('span');rot.className='waltiva-rotate-handle';rot.dataset.rotate='1';rot.contentEditable='false';obj.appendChild(rot);
    const lab=document.createElement('span');lab.className='waltiva-object-size-label';lab.contentEditable='false';lab.style.display='none';obj.appendChild(lab);
  }
  function promoteImage(img,opts={}){
    if(!img||img.classList.contains('pdf-fidelity-bg')||img.closest('.waltiva-transform-object')||img.dataset.noTransform==='1')return img&&img.closest('.waltiva-transform-object');
    const r=img.getBoundingClientRect();const w=Math.max(24,r.width||img.naturalWidth||240),h=Math.max(24,r.height||img.naturalHeight||160);
    const wrap=document.createElement(opts.absolute?'div':'span');wrap.className='waltiva-transform-object'+(opts.absolute?' absolute-object':'');wrap.contentEditable='false';wrap.dataset.tx='0';wrap.dataset.ty='0';wrap.dataset.rotation='0';wrap.dataset.flipX='1';wrap.dataset.flipY='1';wrap.dataset.lockAspect='1';wrap.dataset.z=String(++state.z);
    wrap.style.width=px(opts.width||w);wrap.style.height=px(opts.height||h);
    if(opts.absolute){wrap.style.left=px(opts.left||0);wrap.style.top=px(opts.top||0);}
    img.parentNode.insertBefore(wrap,img);wrap.appendChild(img);img.draggable=false;img.style.width='100%';img.style.height='100%';img.style.objectFit=opts.objectFit||'fill';
    ensureHandles(wrap);apply(wrap);return wrap;
  }
  function buildObjectFromImage(src,page,left,top,width,height){
    const wrap=document.createElement('div');wrap.className='waltiva-transform-object absolute-object';wrap.contentEditable='false';wrap.dataset.tx='0';wrap.dataset.ty='0';wrap.dataset.rotation='0';wrap.dataset.flipX='1';wrap.dataset.flipY='1';wrap.dataset.lockAspect='1';wrap.dataset.z=String(++state.z);wrap.dataset.extractedPdf='1';
    wrap.style.left=px(left);wrap.style.top=px(top);wrap.style.width=px(width);wrap.style.height=px(height);
    const img=document.createElement('img');img.src=src;img.alt='Gráfico extraído';img.draggable=false;wrap.appendChild(img);ensureHandles(wrap);apply(wrap);page.appendChild(wrap);return wrap;
  }

  function deselect(){if(!state.selected)return;state.selected.classList.remove('is-selected');sizeLabel(state.selected,false);state.selected=null;objectBar.classList.add('hidden');}
  function positionBar(){const o=state.selected;if(!o||!o.isConnected)return;const r=o.getBoundingClientRect(),bw=objectBar.offsetWidth||430,bh=objectBar.offsetHeight||38;let left=clamp(r.left+(r.width-bw)/2,6,window.innerWidth-bw-6);let top=r.top-bh-12;if(top<6)top=Math.min(window.innerHeight-bh-6,r.bottom+12);objectBar.style.left=left+'px';objectBar.style.top=top+'px';}
  function select(obj){if(!obj||!editingEnabled())return;if(state.selected!==obj)deselect();state.selected=obj;ensureHandles(obj);obj.classList.add('is-selected');apply(obj);const lock=objectBar.querySelector('[data-obj="lock"]');lock.classList.toggle('active',obj.dataset.lockAspect!=='0');objectBar.querySelector('[data-obj="angle"]').value=Math.round(num(obj.dataset.rotation));objectBar.classList.remove('hidden');positionBar();}

  function startMove(e,obj){const s=pageScale(obj);state.drag={type:'move',obj,startX:e.clientX,startY:e.clientY,tx:num(obj.dataset.tx),ty:num(obj.dataset.ty),scale:s};select(obj);sizeLabel(obj,true);try{obj.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();}
  function startResize(e,obj,handle){
    const s=pageScale(obj),angle=num(obj.dataset.rotation)*Math.PI/180;
    state.drag={type:'resize',obj,handle,startX:e.clientX,startY:e.clientY,w:obj.offsetWidth,h:obj.offsetHeight,tx:num(obj.dataset.tx),ty:num(obj.dataset.ty),scale:s,angle,ratio:(obj.offsetWidth||1)/(obj.offsetHeight||1)};select(obj);sizeLabel(obj,true);try{e.target.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();e.stopPropagation();
  }
  function startRotate(e,obj){const r=obj.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;const pointer=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI;state.drag={type:'rotate',obj,cx,cy,offset:pointer-num(obj.dataset.rotation)};select(obj);try{e.target.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();e.stopPropagation();}

  editable.addEventListener('pointerdown',e=>{
    if(!editingEnabled()||state.extract)return;
    let obj=e.target.closest&&e.target.closest('.waltiva-transform-object');
    if(!obj&&e.target.tagName==='IMG'&&editable.contains(e.target)&&!e.target.classList.contains('pdf-fidelity-bg'))obj=promoteImage(e.target);
    if(!obj)return;
    const h=e.target.closest('.waltiva-transform-handle');if(h){startResize(e,obj,h.dataset.handle);return;}
    if(e.target.closest('.waltiva-rotate-handle')){startRotate(e,obj);return;}
    startMove(e,obj);
  },true);

  window.addEventListener('pointermove',e=>{
    const d=state.drag;if(!d)return;const obj=d.obj;
    if(d.type==='move'){
      obj.dataset.tx=String(d.tx+(e.clientX-d.startX)/d.scale);obj.dataset.ty=String(d.ty+(e.clientY-d.startY)/d.scale);apply(obj);positionBar();e.preventDefault();return;
    }
    if(d.type==='rotate'){
      let a=Math.atan2(e.clientY-d.cy,e.clientX-d.cx)*180/Math.PI-d.offset;if(e.shiftKey)a=Math.round(a/15)*15;obj.dataset.rotation=String(a);apply(obj);objectBar.querySelector('[data-obj="angle"]').value=Math.round(a);positionBar();e.preventDefault();return;
    }
    if(d.type==='resize'){
      const rawX=(e.clientX-d.startX)/d.scale,rawY=(e.clientY-d.startY)/d.scale,c=Math.cos(d.angle),s=Math.sin(d.angle);const dx=rawX*c+rawY*s,dy=-rawX*s+rawY*c;const h=d.handle;
      let w=d.w,hgt=d.h,shiftX=0,shiftY=0;
      if(h.includes('e'))w=d.w+dx;if(h.includes('w')){w=d.w-dx;shiftX=dx;}if(h.includes('s'))hgt=d.h+dy;if(h.includes('n')){hgt=d.h-dy;shiftY=dy;}
      const lock=(obj.dataset.lockAspect!=='0')!==!!e.shiftKey;
      if(lock){
        if(h.length===2){if(Math.abs((w-d.w)/d.w)>=Math.abs((hgt-d.h)/d.h))hgt=w/d.ratio;else w=hgt*d.ratio;}
        else if(h==='e'||h==='w')hgt=w/d.ratio;else if(h==='n'||h==='s')w=hgt*d.ratio;
      }
      w=Math.max(20,w);hgt=Math.max(20,hgt);
      if(e.altKey){shiftX-=(w-d.w)/2;shiftY-=(hgt-d.h)/2;}
      obj.style.width=px(w);obj.style.height=px(hgt);
      if(h.includes('w')||h.includes('n')||e.altKey){const sx=shiftX*c-shiftY*s,sy=shiftX*s+shiftY*c;obj.dataset.tx=String(d.tx+sx);obj.dataset.ty=String(d.ty+sy);}
      apply(obj);sizeLabel(obj,true);positionBar();e.preventDefault();
    }
  },{passive:false});
  window.addEventListener('pointerup',()=>{if(!state.drag)return;sizeLabel(state.drag.obj,false);state.drag=null;fireInput();});

  function duplicate(obj){const c=obj.cloneNode(true);c.classList.remove('is-selected');c.dataset.tx=String(num(obj.dataset.tx)+16);c.dataset.ty=String(num(obj.dataset.ty)+16);c.dataset.z=String(++state.z);c.querySelectorAll('.waltiva-transform-handle,.waltiva-rotate-handle,.waltiva-rotate-stem,.waltiva-object-size-label').forEach(x=>x.remove());delete c.dataset.handles;obj.insertAdjacentElement('afterend',c);ensureHandles(c);apply(c);select(c);fireInput();}
  objectBar.addEventListener('click',e=>{
    const b=e.target.closest('button[data-obj]');if(!b||!state.selected)return;const o=state.selected,a=b.dataset.obj;
    if(a==='lock'){o.dataset.lockAspect=o.dataset.lockAspect==='0'?'1':'0';b.classList.toggle('active',o.dataset.lockAspect!=='0');}
    else if(a==='r90'){o.dataset.rotation=String(num(o.dataset.rotation)+90);apply(o);objectBar.querySelector('[data-obj="angle"]').value=Math.round(num(o.dataset.rotation));}
    else if(a==='flipH'){o.dataset.flipX=String(-num(o.dataset.flipX,1));apply(o);}
    else if(a==='flipV'){o.dataset.flipY=String(-num(o.dataset.flipY,1));apply(o);}
    else if(a==='front'){o.dataset.z=String(++state.z);apply(o);}
    else if(a==='back'){o.dataset.z='2';apply(o);}
    else if(a==='dup'){duplicate(o);return;}
    else if(a==='delete'){const next=o.parentElement;o.remove();deselect();fireInput();return;}
    positionBar();fireInput();
  });
  objectBar.querySelector('[data-obj="angle"]').addEventListener('change',e=>{if(!state.selected)return;state.selected.dataset.rotation=String(num(e.target.value));apply(state.selected);positionBar();fireInput();});

  /* PDF graphic extraction: crop the preserved page raster into an independent object. */
  function setExtract(on){state.extract=!!on;document.body.classList.toggle('extracting-graphic',state.extract);extractBtn.classList.toggle('extract-graphic-active',state.extract);if(on){deselect();toast('Arrastra un rectángulo sobre el gráfico que quieras convertir en objeto.');}else if(state.extractDrag){state.extractDrag.box.remove();state.extractDrag=null;}}
  extractBtn.addEventListener('click',e=>{e.preventDefault();if(!editable.querySelector('.pdf-fidelity-page')){toast('“Extraer gráfico” está disponible al editar un PDF.');return;}setExtract(!state.extract);});

  function pagePoint(page,e){const r=page.getBoundingClientRect(),sx=page.offsetWidth/r.width,sy=page.offsetHeight/r.height;return{x:clamp((e.clientX-r.left)*sx,0,page.offsetWidth),y:clamp((e.clientY-r.top)*sy,0,page.offsetHeight)};}
  editable.addEventListener('pointerdown',e=>{
    if(!state.extract||!editingEnabled())return;const page=e.target.closest('.pdf-fidelity-page');if(!page)return;const p=pagePoint(page,e),box=document.createElement('div');box.className='waltiva-extract-selection';box.style.left=px(p.x);box.style.top=px(p.y);box.style.width='1px';box.style.height='1px';page.appendChild(box);state.extractDrag={page,box,start:p,current:p,pointerId:e.pointerId};try{page.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();e.stopPropagation();
  },true);
  editable.addEventListener('pointermove',e=>{const d=state.extractDrag;if(!d)return;const p=pagePoint(d.page,e);d.current=p;const x=Math.min(d.start.x,p.x),y=Math.min(d.start.y,p.y),w=Math.abs(p.x-d.start.x),h=Math.abs(p.y-d.start.y);Object.assign(d.box.style,{left:px(x),top:px(y),width:px(w),height:px(h)});e.preventDefault();},true);

  function borderStats(ctx,x,y,w,h){
    const pts=[];const step=Math.max(1,Math.round(Math.min(w,h)/14));
    for(let xx=x;xx<=x+w;xx+=step){pts.push(ctx.getImageData(clamp(xx,0,ctx.canvas.width-1),clamp(y,0,ctx.canvas.height-1),1,1).data);pts.push(ctx.getImageData(clamp(xx,0,ctx.canvas.width-1),clamp(y+h,0,ctx.canvas.height-1),1,1).data);}
    for(let yy=y;yy<=y+h;yy+=step){pts.push(ctx.getImageData(clamp(x,0,ctx.canvas.width-1),clamp(yy,0,ctx.canvas.height-1),1,1).data);pts.push(ctx.getImageData(clamp(x+w,0,ctx.canvas.width-1),clamp(yy,0,ctx.canvas.height-1),1,1).data);}
    const avg=[0,1,2].map(k=>pts.reduce((s,p)=>s+p[k],0)/Math.max(1,pts.length));let variance=0;for(const p of pts)variance+=(p[0]-avg[0])**2+(p[1]-avg[1])**2+(p[2]-avg[2])**2;variance/=Math.max(1,pts.length);return{avg,variance};
  }
  async function cropSelection(d){
    const page=d.page,bg=page.querySelector('.pdf-fidelity-bg');if(!bg||!bg.src)throw new Error('No hay imagen base de la página.');
    if(!bg.complete)await new Promise(r=>{bg.onload=r;bg.onerror=r;});
    const x=Math.min(d.start.x,d.current.x),y=Math.min(d.start.y,d.current.y),w=Math.abs(d.current.x-d.start.x),h=Math.abs(d.current.y-d.start.y);if(w<12||h<12)throw new Error('La selección es demasiado pequeña.');
    const nw=bg.naturalWidth||page.offsetWidth,nh=bg.naturalHeight||page.offsetHeight,sx=nw/page.offsetWidth,sy=nh/page.offsetHeight;const full=document.createElement('canvas');full.width=nw;full.height=nh;const fctx=full.getContext('2d',{willReadFrequently:true});fctx.drawImage(bg,0,0,nw,nh);
    const cx=Math.round(x*sx),cy=Math.round(y*sy),cw=Math.max(1,Math.round(w*sx)),ch=Math.max(1,Math.round(h*sy));const crop=document.createElement('canvas');crop.width=cw;crop.height=ch;crop.getContext('2d').drawImage(full,cx,cy,cw,ch,0,0,cw,ch);
    const src=crop.toDataURL('image/png');const obj=buildObjectFromImage(src,page,x,y,w,h);obj.dataset.sourceX=String(x);obj.dataset.sourceY=String(y);obj.dataset.sourceW=String(w);obj.dataset.sourceH=String(h);
    const stats=borderStats(fctx,cx,cy,cw,ch);if(stats.variance<1500){const mask=document.createElement('div');mask.className='waltiva-source-mask';mask.dataset.objectSourceMask='1';mask.style.left=px(x);mask.style.top=px(y);mask.style.width=px(w);mask.style.height=px(h);mask.style.background='rgb('+stats.avg.map(Math.round).join(',')+')';page.insertBefore(mask,obj);obj.dataset.hasSourceMask='1';}else{toast('Gráfico extraído. El fondo es complejo, así que el original se mantiene debajo para no dañarlo.');}
    return obj;
  }
  editable.addEventListener('pointerup',async e=>{const d=state.extractDrag;if(!d)return;state.extractDrag=null;d.box.remove();try{const obj=await cropSelection(d);setExtract(false);select(obj);fireInput();toast(obj.dataset.hasSourceMask==='1'?'Gráfico extraído y separado del fondo':'Gráfico convertido en objeto transformable');}catch(err){setExtract(false);toast(err.message||'No se pudo extraer el gráfico.');}},true);

  /* Click any normal document image to turn it into a transformable object. */
  editable.addEventListener('click',e=>{if(state.extract)return;const img=e.target.closest&&e.target.closest('img');if(img&&editable.contains(img)&&!img.classList.contains('pdf-fidelity-bg')){const obj=img.closest('.waltiva-transform-object')||promoteImage(img);if(obj)select(obj);return;}if(!e.target.closest('.waltiva-transform-object')&&!e.target.closest('.waltiva-object-toolbar'))deselect();},true);
  document.addEventListener('pointerdown',e=>{if(state.selected&&!editable.contains(e.target)&&!objectBar.contains(e.target))deselect();},true);
  window.addEventListener('scroll',()=>state.selected&&positionBar(),true);window.addEventListener('resize',()=>state.selected&&positionBar());

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(state.extract)setExtract(false);else deselect();return;}
    const o=state.selected;if(!o)return;const ae=document.activeElement;if(ae&&(ae.matches('input,textarea,select')||(ae.isContentEditable&&!ae.classList.contains('waltiva-transform-object'))))return;
    if((e.key==='Delete'||e.key==='Backspace')){e.preventDefault();o.remove();deselect();fireInput();return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate(o);return;}
    const step=e.shiftKey?10:1;if(e.key==='ArrowLeft'){o.dataset.tx=String(num(o.dataset.tx)-step);}else if(e.key==='ArrowRight'){o.dataset.tx=String(num(o.dataset.tx)+step);}else if(e.key==='ArrowUp'){o.dataset.ty=String(num(o.dataset.ty)-step);}else if(e.key==='ArrowDown'){o.dataset.ty=String(num(o.dataset.ty)+step);}else return;e.preventDefault();apply(o);positionBar();fireInput();
  });

  window.WaltivaTransform={promoteImage,select,deselect,setExtract};
})();
