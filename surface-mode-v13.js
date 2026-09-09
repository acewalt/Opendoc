(function(){
  'use strict';

  const original=document.getElementById('originalSurface');
  const editable=document.getElementById('editableSurface');
  const viewOriginal=document.getElementById('viewOriginal');
  const editToggle=document.getElementById('editToggle');
  const toolbar=document.getElementById('toolbar');
  const busy=document.getElementById('busy');
  const editor=document.getElementById('editorView');
  if(!original||!editable||!viewOriginal||!editToggle||!toolbar||!busy||!editor) return;

  function isPdfDocument(){
    return !!original.querySelector('.pdf-preview-page, canvas');
  }

  function hasOfficePair(){
    return !!original.querySelector('.word-edit-wrapper,.legacy-document') &&
           !!editable.querySelector('.word-edit-wrapper,.legacy-document');
  }

  function forceOfficeEditable(){
    if(!hasOfficePair() || isPdfDocument()) return;

    // Word-like formats open directly in the editable surface.
    if(toolbar.classList.contains('disabled') || !editToggle.classList.contains('active')){
      editToggle.click();
    }

    original.classList.add('hidden');
    editable.classList.remove('hidden');
    viewOriginal.classList.add('hidden');
    viewOriginal.classList.remove('active');
    editToggle.classList.add('active');

    editor.classList.add('waltiva-direct-edit-document');
  }

  function refreshMode(){
    // PDF keeps Preview/Edit dual mode. Word-like files do not.
    if(isPdfDocument()){
      editor.classList.remove('waltiva-direct-edit-document');
      return;
    }
    forceOfficeEditable();
  }

  const busyObserver=new MutationObserver(function(){
    if(busy.classList.contains('hidden')) setTimeout(refreshMode,0);
  });
  busyObserver.observe(busy,{attributes:true,attributeFilter:['class']});

  const contentObserver=new MutationObserver(function(){
    if(editor.classList.contains('hidden')) return;
    setTimeout(refreshMode,0);
  });
  contentObserver.observe(original,{childList:true,subtree:true});
  contentObserver.observe(editable,{childList:true,subtree:true});

  // Guard against older spread CSS accidentally resurrecting a hidden surface.
  document.addEventListener('input',refreshMode,true);
  window.addEventListener('resize',refreshMode);
  setTimeout(refreshMode,500);
})();
