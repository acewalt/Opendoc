(function(){
  'use strict';
  function $(id){ return document.getElementById(id); }
  function build(){
    var main=document.querySelector('.library-main');
    var grid=$('documentGrid');
    var recent=$('recentFilesSection');
    var supported=document.querySelector('.supported-card');
    var downloadsButton=$('downloadsFilesButton');
    var libraryView=document.querySelector('.library-view');
    if(!main||!grid||!supported||!libraryView) return;

    if(!$('fileSourceModule')){
      var source=document.createElement('section');
      source.id='fileSourceModule';
      source.className='file-source-module';
      source.innerHTML='<div class="file-source-head"><div><h3>Tus archivos</h3><p>Elige desde dónde quieres abrir un documento.</p></div></div><div class="file-source-grid"><button type="button" class="file-source-card downloads-choice" id="downloadsChoice"><span class="file-source-icon">⌄</span><span><strong>Descargas / Archivos</strong><small>Abre el selector del dispositivo o una carpeta autorizada.</small></span></button><button type="button" class="file-source-card recent-choice" id="recentChoice"><span class="file-source-icon">↺</span><span><strong>Recientes</strong><small>Vuelve a los documentos que ya abriste en Waltiva.</small></span></button></div>';
      if(recent) main.insertBefore(source,recent); else main.insertBefore(source,supported);
      var d=$('downloadsChoice');
      var r=$('recentChoice');
      if(downloadsButton){
        downloadsButton.style.display='none';
        d.addEventListener('click',function(){ downloadsButton.click(); });
      }else{
        d.addEventListener('click',function(){ var i=$('fileInputLibrary'); if(i) i.click(); });
      }
      r.addEventListener('click',function(){
        var section=$('recentFilesSection');
        if(section&&!section.classList.contains('hidden')) section.scrollIntoView({behavior:'smooth',block:'start'});
        else { var i=$('fileInputLibrary'); if(i) i.click(); }
      });
    }

    if(!$('mobileLibraryNav')){
      var nav=document.createElement('nav');
      nav.id='mobileLibraryNav';
      nav.className='mobile-library-nav';
      nav.innerHTML='<button type="button" class="active" id="navHome"><span class="nav-icon">⌂</span><span>Inicio</span></button><button type="button" id="navCreate"><span class="nav-icon">＋</span><span>Crear</span></button><button type="button" id="navBrowse"><span class="nav-icon">⌕</span><span>Examinar</span></button>';
      libraryView.appendChild(nav);
      $('navHome').addEventListener('click',function(){ window.scrollTo({top:0,behavior:'smooth'}); });
      $('navCreate').addEventListener('click',function(){ var b=$('newDocument'); if(b) b.click(); });
      $('navBrowse').addEventListener('click',function(){ var b=$('downloadsChoice'); if(b) b.click(); });
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
  setTimeout(build,120);
})();
