(function(){
  'use strict';
  if(!window.WaltivaDocx||!window.JSZip) return;
  const originalExport=window.WaltivaDocx.exportDocx;

  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const safe=s=>(s||'documento').replace(/[\\/:*?"<>|]+/g,'-').trim()||'documento';
  function rgbHex(v,fallback){
    const m=String(v||'').match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/i);
    if(m)return [m[1],m[2],m[3]].map(x=>(+x).toString(16).padStart(2,'0')).join('').toUpperCase();
    if(/^#[0-9a-f]{6}$/i.test(v||''))return v.slice(1).toUpperCase();
    return fallback||'000000';
  }
  function dataUrlBlob(src){return fetch(src).then(r=>r.blob());}
  function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2500);}
  function toast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),3200);}

  function textRun(span){
    const font=span.dataset.fontFamily||'Arial';
    const px=parseFloat(span.dataset.fontSize)||16;
    const halfPt=Math.max(2,Math.round(px*1.5));
    const fg=rgbHex(span.dataset.fg||span.style.color,'111111');
    let rPr='<w:rFonts w:ascii="'+esc(font)+'" w:hAnsi="'+esc(font)+'"/><w:sz w:val="'+halfPt+'"/><w:szCs w:val="'+halfPt+'"/><w:color w:val="'+fg+'"/>';
    const cs=getComputedStyle(span);
    if(parseInt(cs.fontWeight,10)>=600)rPr+='<w:b/>';
    if(cs.fontStyle==='italic')rPr+='<w:i/>';
    return '<w:r><w:rPr>'+rPr+'</w:rPr><w:t xml:space="preserve">'+esc(span.textContent||'')+'</w:t></w:r>';
  }

  async function exportPdfLayoutDocx(){
    const root=document.getElementById('editableSurface');
    const pages=Array.from(root.querySelectorAll(':scope > .pdf-fidelity-page'));
    if(!pages.length) return false;
    const zip=new JSZip(), rels=[]; let rid=1;
    const firstW=parseFloat(pages[0].dataset.pdfWidth)||612, firstH=parseFloat(pages[0].dataset.pdfHeight)||792;
    let body='';

    for(let pi=0;pi<pages.length;pi++){
      const page=pages[pi], bg=page.querySelector('.pdf-fidelity-bg');
      const baseW=parseFloat(page.dataset.pdfWidth)||firstW, baseH=parseFloat(page.dataset.pdfHeight)||firstH;
      const bgRid='rId'+(rid++), imageName='pdf-page-'+(pi+1)+'.png';
      if(bg&&bg.src){zip.folder('word').folder('media').file(imageName,await dataUrlBlob(bg.src));rels.push('<Relationship Id="'+bgRid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+imageName+'"/>');}
      const wPt=baseW*.75,hPt=baseH*.75;
      body+='<w:p><w:r><w:pict><v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" style="position:absolute;margin-left:0pt;margin-top:0pt;width:'+wPt+'pt;height:'+hPt+'pt;z-index:-251654144;mso-position-horizontal-relative:page;mso-position-vertical-relative:page" stroked="f" filled="f"><v:imagedata r:id="'+bgRid+'" o:title="PDF page '+(pi+1)+'"/></v:rect></w:pict></w:r></w:p>';

      const spans=Array.from(page.querySelectorAll('.pdf-fidelity-text'));
      for(let si=0;si<spans.length;si++){
        const s=spans[si],x=(parseFloat(s.dataset.x)||0)*.75,y=(parseFloat(s.dataset.y)||0)*.75;
        const w=Math.max(3,(parseFloat(s.dataset.w)||20)*.75),h=Math.max(5,(parseFloat(s.dataset.h)||16)*.75);
        const bgc=rgbHex(s.dataset.bg,'FFFFFF');
        body+='<w:p><w:r><w:pict><v:rect xmlns:v="urn:schemas-microsoft-com:vml" style="position:absolute;margin-left:'+x+'pt;margin-top:'+y+'pt;width:'+w+'pt;height:'+h+'pt;z-index:'+(100+si)+';mso-position-horizontal-relative:page;mso-position-vertical-relative:page" fillcolor="#'+bgc+'" stroked="f"><v:textbox inset="0,0,0,0"><w:txbxContent><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="200" w:lineRule="auto"/></w:pPr>'+textRun(s)+'</w:p></w:txbxContent></v:textbox></v:rect></w:pict></w:r></w:p>';
      }
      if(pi<pages.length-1) body+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    }

    const pgW=Math.round(firstW*15),pgH=Math.round(firstH*15);
    body+='<w:sectPr><w:pgSz w:w="'+pgW+'" w:h="'+pgH+'"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>';
    const doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><w:body>'+body+'</w:body></w:document>';
    const rel='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+rels.join('')+'</Relationships>';
    const rootRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
    const types='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
    zip.file('[Content_Types].xml',types);zip.folder('_rels').file('.rels',rootRels);zip.folder('word').file('document.xml',doc);zip.folder('word').folder('_rels').file('document.xml.rels',rel);
    const blob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'});
    const title=document.getElementById('documentTitle');download(blob,safe(title&&title.value)+'.docx');
    const menu=document.getElementById('exportMenu');if(menu)menu.classList.add('hidden');
    toast('DOCX creado con la disposición visual del PDF');
    return true;
  }

  window.WaltivaDocx.exportDocx=async function(){
    const btn=document.getElementById('exportDocx'); if(btn)btn.disabled=true;
    try{
      if(await exportPdfLayoutDocx()) return;
      const root=document.documentElement, previous=root.getAttribute('data-theme');
      root.setAttribute('data-theme','light');
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      try{return await originalExport();}
      finally{if(previous)root.setAttribute('data-theme',previous);else root.removeAttribute('data-theme');}
    }catch(err){console.error(err);toast('No se pudo crear el DOCX: '+(err.message||err));}
    finally{if(btn)btn.disabled=false;}
  };

  const obs=new MutationObserver(()=>{
    const b=document.getElementById('exportDocx');if(!b)return;
    b.textContent=document.querySelector('.pdf-fidelity-page')?'Word nativo (.docx) · conservar diseño':'Word nativo (.docx)';
  });
  obs.observe(document.getElementById('editableSurface')||document.body,{childList:true,subtree:false});
})();
