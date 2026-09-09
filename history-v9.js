(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const editable=$('editableSurface'), editor=$('editorView'), title=$('documentTitle');
  if(!editable||!editor) return;

  const MAX_STATES=40;
  const MAX_SERIALIZED_BYTES=14*1024*1024;
  const state={undo:[],redo:[],media:new Map(),mediaReverse:new Map(),mediaId:0,timer:null,restoring:false,suspend:0,docToken:0,last:'',bytes:0};
  const transientSelector='.waltiva-transform-handle,.waltiva-rotate-handle,.waltiva-rotate-stem,.waltiva-object-size-label,.waltiva-extract-selection,.w-table-resizer';

  function toast(msg){const t=$('toast');if(!t)return;t.textContent=msg;t.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.add('hidden'),1500);}
  function editorVisible(){return !editor.classList.contains('hidden');}
  function registerMedia(src){
    if(!src)return '';
    if(state.mediaReverse.has(src))return state.mediaReverse.get(src);
    const id='m'+(++state.mediaId);state.media.set(id,src);state.mediaReverse.set(src,id);return id;
  }
  function sanitizeClone(clone){
    clone.querySelectorAll(transientSelector).forEach(n=>n.remove());
    clone.querySelectorAll('.is-selected,.resizing,.page-dragging,.page-drop-target').forEach(n=>n.classList.remove('is-selected','resizing','page-dragging','page-drop-target'));
    clone.classList.remove('waltiva-image-drop-active');
    const imgs=Array.from(clone.querySelectorAll('img'));
    const originals=Array.from(editable.querySelectorAll('img'));
    imgs.forEach((img,i)=>{
      const src=(originals[i]&&(originals[i].currentSrc||originals[i].getAttribute('src')))||img.getAttribute('src')||'';
      if(src){const id=registerMedia(src);img.removeAttribute('src');img.setAttribute('data-waltiva-history-media',id);}
    });
    const cloneCanvases=Array.from(clone.querySelectorAll('canvas'));
    const originalCanvases=Array.from(editable.querySelectorAll('canvas'));
    cloneCanvases.forEach((c,i)=>{
      const original=originalCanvases[i];let src='';try{src=original&&original.toDataURL?original.toDataURL('image/png'):'';}catch(_){}
      if(src){const img=document.createElement('img');img.className=c.className;img.setAttribute('style',c.getAttribute('style')||'');img.setAttribute('data-waltiva-history-media',registerMedia(src));img.setAttribute('data-history-canvas','1');c.replaceWith(img);}
    });
    return clone;
  }
  function snapshot(){
    const clone=sanitizeClone(editable.cloneNode(true));
    return JSON.stringify({html:clone.innerHTML,title:title?title.value:'',token:state.docToken});
  }
  function hydrate(root){
    root.querySelectorAll('[data-waltiva-history-media]').forEach(img=>{
      const id=img.getAttribute('data-waltiva-history-media'),src=state.media.get(id);
      if(src)img.setAttribute('src',src);img.removeAttribute('data-waltiva-history-media');
    });
  }
  function updateButtons(){
    document.querySelectorAll('button[data-cmd="undo"]').forEach(b=>{b.disabled=state.undo.length<=1;b.title='Deshacer (Ctrl+Z)';});
    document.querySelectorAll('button[data-cmd="redo"]').forEach(b=>{b.disabled=!state.redo.length;b.title='Rehacer (Ctrl+Y)';});
  }
  function trim(){
    while(state.undo.length>MAX_STATES){const old=state.undo.shift();state.bytes-=old.length;}
    while(state.bytes>MAX_SERIALIZED_BYTES&&state.undo.length>3){const old=state.undo.shift();state.bytes-=old.length;}
  }
  function commit(force=false){
    clearTimeout(state.timer);state.timer=null;
    if(state.restoring||state.suspend||!editorVisible())return false;
    let s;try{s=snapshot();}catch(err){console.warn('Waltiva history snapshot failed',err);return false;}
    if(!force&&s===state.last)return false;
    state.undo.push(s);state.bytes+=s.length;state.last=s;state.redo.length=0;trim();updateButtons();return true;
  }
  function schedule(ms=360){
    if(state.restoring||state.suspend)return;clearTimeout(state.timer);state.timer=setTimeout(()=>commit(false),ms);
  }
  function flush(){if(state.restoring)return;clearTimeout(state.timer);state.timer=null;if(state.suspend)return;commit(false);}
  function restore(serialized){
    let snap;try{snap=JSON.parse(serialized);}catch(err){console.warn('Invalid Waltiva history state',err);return;}
    state.restoring=true;clearTimeout(state.timer);state.timer=null;
    editable.innerHTML=snap.html||'';hydrate(editable);if(title&&typeof snap.title==='string')title.value=snap.title;
    state.last=serialized;
    try{editable.dispatchEvent(new Event('input',{bubbles:true}));}catch(_){}
    document.dispatchEvent(new CustomEvent('waltiva-history-restored'));
    requestAnimationFrame(()=>{state.restoring=false;updateButtons();});
  }
  function undo(){
    if(state.suspend)return;flush();if(state.undo.length<=1){toast('No hay más cambios para deshacer');return;}
    const current=state.undo.pop();state.bytes-=current.length;state.redo.push(current);const prev=state.undo[state.undo.length-1];restore(prev);toast('Deshacer');
  }
  function redo(){
    if(state.suspend)return;flush();if(!state.redo.length){toast('No hay cambios para rehacer');return;}
    const next=state.redo.pop();state.undo.push(next);state.bytes+=next.length;trim();restore(next);toast('Rehacer');
  }
  function reset(){
    clearTimeout(state.timer);state.timer=null;state.undo.length=0;state.redo.length=0;state.bytes=0;state.last='';state.media.clear();state.mediaReverse.clear();state.mediaId=0;state.docToken++;setTimeout(()=>commit(true),120);
  }
  function beginTransaction(){if(state.restoring)return;flush();state.suspend++;}
  function endTransaction(){if(state.suspend>0)state.suspend--;if(!state.suspend)setTimeout(()=>commit(false),0);}

  editable.addEventListener('input',()=>schedule(320),true);
  title&&title.addEventListener('input',()=>schedule(450),true);
  const observer=new MutationObserver(()=>schedule(460));
  observer.observe(editable,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class','data-tx','data-ty','data-rotation','data-flip-x','data-flip-y','data-z','data-lock-aspect']});

  document.addEventListener('pointerdown',e=>{
    if(!editorVisible())return;
    if(e.target.closest('.waltiva-transform-object,.w-table-resizer'))beginTransaction();
  },true);
  window.addEventListener('pointerup',()=>{if(state.suspend)endTransaction();},true);
  document.addEventListener('dragstart',e=>{if(editorVisible()&&e.target.closest('.page-item'))beginTransaction();},true);
  document.addEventListener('dragend',()=>{if(state.suspend)endTransaction();},true);

  document.addEventListener('keydown',e=>{
    if(!editorVisible())return;
    const active=document.activeElement;const form=active&&active.matches&&active.matches('input,textarea,select')&&!editable.contains(active);
    if(form)return;
    const mod=e.ctrlKey||e.metaKey;if(!mod)return;
    const k=e.key.toLowerCase();
    if(k==='z'){e.preventDefault();e.stopImmediatePropagation();e.shiftKey?redo():undo();}
    else if(k==='y'){e.preventDefault();e.stopImmediatePropagation();redo();}
  },true);
  document.addEventListener('click',e=>{
    const b=e.target.closest('button[data-cmd="undo"],button[data-cmd="redo"]');if(!b||!editorVisible())return;
    e.preventDefault();e.stopImmediatePropagation();b.dataset.cmd==='undo'?undo():redo();
  },true);

  ['newDocument','newDocumentCard'].forEach(id=>{const el=$(id);if(el)el.addEventListener('click',reset,true);});
  document.addEventListener('change',e=>{if(e.target&&e.target.matches&&e.target.matches('#fileInputLibrary,#fileInputCard'))reset();},true);
  const viewObserver=new MutationObserver(()=>{if(editorVisible()&&!state.undo.length)schedule(180);});
  viewObserver.observe(editor,{attributes:true,attributeFilter:['class']});

  window.WaltivaHistory={undo,redo,commit,reset,begin:beginTransaction,end:endTransaction,canUndo:()=>state.undo.length>1,canRedo:()=>!!state.redo.length};
  setTimeout(()=>{if(editorVisible())commit(true);else updateButtons();},250);
})();