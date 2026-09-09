(function(){
  'use strict';
  const editor=document.getElementById('editorView');
  if(!editor) return;

  function qs(sel,root){return (root||document).querySelector(sel)}
  function isMobile(){return window.matchMedia('(max-width:900px)').matches}

  function setPages(open,save){
    if(isMobile()){
      editor.classList.toggle('pages-mobile-open',!!open);
      editor.classList.remove('pages-collapsed');
    }else{
      editor.classList.toggle('pages-collapsed',!open);
      editor.classList.remove('pages-mobile-open');
      if(save!==false) localStorage.setItem('waltiva-pages-open',open?'1':'0');
    }
    const b=qs('.pages-panel-toggle',editor);
    if(b){
      b.classList.toggle('active',!!open);
      b.setAttribute('aria-pressed',open?'true':'false');
      b.title=open?'Ocultar panel Páginas':'Mostrar panel Páginas';
    }
  }

  function setFormat(open,save){
    editor.classList.toggle('format-open',!!open);
    if(save!==false) localStorage.setItem('waltiva-format-open',open?'1':'0');
    const b=qs('.format-toggle',editor);
    if(b){
      b.classList.toggle('active',!!open);
      b.setAttribute('aria-pressed',open?'true':'false');
      b.title=open?'Ocultar panel Formato':'Mostrar panel Formato';
    }
  }

  function init(){
    const quick=qs('.editor-quick-actions',editor);
    const sidebar=qs('.outline-sidebar',editor);
    const formatPanel=document.getElementById('editorFormatPanel');
    if(!quick||!sidebar||!formatPanel) return setTimeout(init,80);
    if(qs('.pages-panel-toggle',quick)) return;

    const pagesButton=document.createElement('button');
    pagesButton.type='button';
    pagesButton.className='editor-panel-toggle pages-panel-toggle';
    pagesButton.innerHTML='▥';
    pagesButton.setAttribute('aria-label','Mostrar u ocultar panel de páginas');

    const formatButton=qs('.format-toggle',quick);
    if(formatButton){
      formatButton.classList.add('editor-panel-toggle');
      formatButton.setAttribute('aria-label','Mostrar u ocultar panel de formato');
      quick.insertBefore(pagesButton,formatButton);
    }else quick.appendChild(pagesButton);

    const savedPages=localStorage.getItem('waltiva-pages-open');
    const savedFormat=localStorage.getItem('waltiva-format-open');
    setPages(isMobile()?false:(savedPages===null?true:savedPages==='1'),false);
    setFormat(isMobile()?false:(savedFormat===null?false:savedFormat==='1'),false);

    pagesButton.addEventListener('click',function(){
      if(isMobile()) setPages(!editor.classList.contains('pages-mobile-open'));
      else setPages(editor.classList.contains('pages-collapsed'));
    });

    if(formatButton){
      const oldHandler=formatButton.onclick;
      formatButton.onclick=null;
      formatButton.addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        setFormat(!editor.classList.contains('format-open'));
      });
    }

    const closeFormat=document.getElementById('closeFormatPanel');
    if(closeFormat){
      closeFormat.onclick=null;
      closeFormat.addEventListener('click',function(e){e.preventDefault();setFormat(false)});
    }

    /* Add a close button to Pages itself, useful on tablets and desktop. */
    const tabs=qs('.outline-tabs',sidebar);
    if(tabs&&!qs('.close-pages-panel',tabs)){
      const close=document.createElement('button');
      close.type='button';
      close.className='close-pages-panel';
      close.textContent='×';
      close.title='Ocultar panel Páginas';
      close.style.cssText='margin-left:auto;flex:0 0 28px;font-size:16px;color:var(--ed-muted);';
      tabs.appendChild(close);
      close.addEventListener('click',function(){setPages(false)});
    }

    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'){
        if(editor.classList.contains('pages-mobile-open')) setPages(false);
        if(editor.classList.contains('format-open')&&isMobile()) setFormat(false);
      }
      if(e.altKey&&e.key==='1'){e.preventDefault(); if(isMobile()) setPages(!editor.classList.contains('pages-mobile-open')); else setPages(editor.classList.contains('pages-collapsed'));}
      if(e.altKey&&e.key==='2'){e.preventDefault(); setFormat(!editor.classList.contains('format-open'));}
    });

    window.addEventListener('resize',function(){
      if(isMobile()){
        editor.classList.remove('pages-collapsed');
        editor.classList.remove('pages-mobile-open');
      }else{
        editor.classList.remove('pages-mobile-open');
        const pref=localStorage.getItem('waltiva-pages-open');
        setPages(pref===null?true:pref==='1',false);
      }
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
