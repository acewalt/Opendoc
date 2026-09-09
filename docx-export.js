(function(){
  'use strict';

  const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
  function rgbToHex(v){
    if(!v) return '000000';
    if(v[0]==='#') return v.slice(1,7).toUpperCase();
    const m=v.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/i);
    return m?[m[1],m[2],m[3]].map(x=>(+x).toString(16).padStart(2,'0')).join('').toUpperCase():'000000';
  }
  function pxToHalfPt(px){return Math.max(2,Math.round(parseFloat(px||16)*1.5));}
  function pxToTwip(px){return Math.max(0,Math.round(parseFloat(px||0)*15));}
  function cleanFont(v){return (v||'Arial').split(',')[0].replace(/["']/g,'').trim()||'Arial';}
  function safeName(s){return (s||'documento').replace(/[\\/:*?"<>|]+/g,'-').trim()||'documento';}
  function mimeExt(mime){
    mime=(mime||'').toLowerCase();
    if(mime.includes('png')) return ['png','image/png'];
    if(mime.includes('gif')) return ['gif','image/gif'];
    if(mime.includes('webp')) return ['webp','image/webp'];
    return ['jpg','image/jpeg'];
  }
  async function srcToBlob(src){
    if(!src) return null;
    try{return await (await fetch(src)).blob();}catch(_){return null;}
  }

  function paragraphProps(el){
    if(!el || el.nodeType!==1) return '';
    const cs=getComputedStyle(el); let xml='';
    const align=cs.textAlign;
    if(align==='center') xml+='<w:jc w:val="center"/>';
    else if(align==='right'||align==='end') xml+='<w:jc w:val="right"/>';
    else if(align==='justify') xml+='<w:jc w:val="both"/>';
    const before=pxToTwip(cs.marginTop), after=pxToTwip(cs.marginBottom);
    const fs=parseFloat(cs.fontSize)||16, lh=parseFloat(cs.lineHeight);
    const line=Number.isFinite(lh)?Math.max(200,Math.round((lh/fs)*240)):null;
    if(before||after||line) xml+='<w:spacing'+(before?' w:before="'+before+'"':'')+(after?' w:after="'+after+'"':'')+(line?' w:line="'+line+'" w:lineRule="auto"':'')+'/>';
    return xml?'<w:pPr>'+xml+'</w:pPr>':'';
  }

  function runProps(node){
    const el=node.nodeType===1?node:node.parentElement;
    if(!el) return '';
    const cs=getComputedStyle(el); let x='';
    const font=cleanFont(cs.fontFamily), size=pxToHalfPt(cs.fontSize);
    x+='<w:rFonts w:ascii="'+esc(font)+'" w:hAnsi="'+esc(font)+'"/>';
    x+='<w:sz w:val="'+size+'"/><w:szCs w:val="'+size+'"/>';
    if(parseInt(cs.fontWeight,10)>=600) x+='<w:b/>';
    if(cs.fontStyle==='italic') x+='<w:i/>';
    if((cs.textDecorationLine||'').includes('underline')) x+='<w:u w:val="single"/>';
    if((cs.textDecorationLine||'').includes('line-through')) x+='<w:strike/>';
    x+='<w:color w:val="'+rgbToHex(cs.color)+'"/>';
    const bg=cs.backgroundColor;
    if(bg && bg!=='rgba(0, 0, 0, 0)' && bg!=='transparent') x+='<w:shd w:val="clear" w:color="auto" w:fill="'+rgbToHex(bg)+'"/>';
    if(el.closest('sub')) x+='<w:vertAlign w:val="subscript"/>';
    if(el.closest('sup')) x+='<w:vertAlign w:val="superscript"/>';
    return '<w:rPr>'+x+'</w:rPr>';
  }

  async function buildDocx(){
    if(!window.JSZip) throw new Error('JSZip no está disponible.');
    const root=document.getElementById('editableSurface');
    if(!root) throw new Error('No hay documento editable.');

    const zip=new JSZip();
    const rels=[]; const media=[]; let relCounter=1, imageCounter=1, docPrId=1;

    function addRel(type,target,targetMode){
      const id='rId'+(relCounter++);
      rels.push({id,type,target,targetMode});
      return id;
    }

    async function imageXml(img){
      const blob=await srcToBlob(img.currentSrc||img.src); if(!blob) return '';
      const [ext,mime]=mimeExt(blob.type); const name='image'+(imageCounter++)+'.'+ext;
      media.push({name,blob,mime});
      const rid=addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image','media/'+name);
      const rect=img.getBoundingClientRect();
      let w=Math.max(24,Math.min(650,rect.width||img.naturalWidth||320));
      let h=Math.max(24,rect.height||img.naturalHeight||180);
      if(w>650){h*=650/w;w=650;}
      const cx=Math.round(w*9525), cy=Math.round(h*9525), id=docPrId++;
      return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+id+'" name="Picture '+id+'"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="'+esc(name)+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+rid+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
    }

    async function inlineXml(node){
      if(node.nodeType===3){
        const t=node.nodeValue||''; if(!t) return '';
        return '<w:r>'+runProps(node)+'<w:t xml:space="preserve">'+esc(t)+'</w:t></w:r>';
      }
      if(node.nodeType!==1) return '';
      const tag=node.tagName.toLowerCase();
      if(tag==='br') return '<w:r><w:br/></w:r>';
      if(tag==='img') return await imageXml(node);
      if(tag==='a'){
        const href=node.getAttribute('href')||'';
        const rid=href?addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',href,'External'):null;
        let inner=''; for(const ch of node.childNodes) inner+=await inlineXml(ch);
        return rid?'<w:hyperlink r:id="'+rid+'" w:history="1">'+inner+'</w:hyperlink>':inner;
      }
      let out=''; for(const ch of node.childNodes) out+=await inlineXml(ch); return out;
    }

    async function paragraphXml(el, prefixText){
      let inner='';
      if(prefixText) inner='<w:r><w:t xml:space="preserve">'+esc(prefixText)+'</w:t></w:r>';
      for(const ch of el.childNodes) inner+=await inlineXml(ch);
      if(!inner) inner='<w:r><w:t></w:t></w:r>';
      return '<w:p>'+paragraphProps(el)+inner+'</w:p>';
    }

    async function tableXml(table){
      const rows=Array.from(table.rows); if(!rows.length) return '';
      const first=Array.from(rows[0].cells); const rect=table.getBoundingClientRect(); const total=Math.max(1,rect.width);
      const widths=first.map(c=>Math.max(500,Math.round((c.getBoundingClientRect().width/total)*9000)));
      let xml='<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="A8A8A8"/><w:left w:val="single" w:sz="4" w:color="A8A8A8"/><w:bottom w:val="single" w:sz="4" w:color="A8A8A8"/><w:right w:val="single" w:sz="4" w:color="A8A8A8"/><w:insideH w:val="single" w:sz="4" w:color="BDBDBD"/><w:insideV w:val="single" w:sz="4" w:color="BDBDBD"/></w:tblBorders></w:tblPr><w:tblGrid>'+widths.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>';
      for(const tr of rows){
        xml+='<w:tr>';
        const cells=Array.from(tr.cells);
        for(let i=0;i<cells.length;i++){
          const cell=cells[i]; const w=widths[Math.min(i,widths.length-1)]||1800;
          let body='';
          const blocks=Array.from(cell.children).filter(x=>!x.classList.contains('w-table-resizer'));
          if(blocks.length){
            for(const b of blocks){
              const tag=b.tagName.toLowerCase();
              if(tag==='table') body+=await tableXml(b);
              else body+=await paragraphXml(b);
            }
          }else body+=await paragraphXml(cell);
          xml+='<w:tc><w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>'+body+'</w:tc>';
        }
        xml+='</w:tr>';
      }
      return xml+'</w:tbl>';
    }

    async function blockXml(el){
      const tag=el.tagName.toLowerCase();
      if(tag==='table') return await tableXml(el);
      if(tag==='ul'||tag==='ol'){
        let out=''; const ordered=tag==='ol'; let n=1;
        for(const li of Array.from(el.children).filter(x=>x.tagName&&x.tagName.toLowerCase()==='li')) out+=await paragraphXml(li,ordered?(n++)+'. ':'• ');
        return out;
      }
      if(tag==='img') return '<w:p>'+await imageXml(el)+'</w:p>';
      return await paragraphXml(el);
    }

    async function pageXml(page){
      let out=''; const children=Array.from(page.children).filter(el=>!el.classList.contains('page-break-marker'));
      if(!children.length) return await paragraphXml(page);
      for(const el of children){
        if(el.classList&&el.classList.contains('w-table-resizer')) continue;
        out+=await blockXml(el);
      }
      return out;
    }

    const pages=Array.from(root.querySelectorAll(':scope > .editable-page, :scope > .legacy-document, :scope > .word-edit-wrapper'));
    let body='';
    const sourcePages=pages.length?pages:Array.from(root.children);
    for(let i=0;i<sourcePages.length;i++){
      body+=await pageXml(sourcePages[i]);
      if(i<sourcePages.length-1) body+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    }

    const leftPx=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--waltiva-margin-left'))||96;
    const rightPx=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--waltiva-margin-right'))||96;
    const ml=pxToTwip(leftPx), mr=pxToTwip(rightPx);
    body+='<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="'+mr+'" w:bottom="1440" w:left="'+ml+'" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';

    const documentXml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="'+W+'" xmlns:r="'+R+'"><w:body>'+body+'</w:body></w:document>';
    const stylesXml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="'+W+'"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>';
    const relXml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+rels.map(r=>'<Relationship Id="'+r.id+'" Type="'+r.type+'" Target="'+esc(r.target)+'"'+(r.targetMode?' TargetMode="'+r.targetMode+'"':'')+'/>').join('')+'<Relationship Id="rStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    const rootRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
    const defaults=[['rels','application/vnd.openxmlformats-package.relationships+xml'],['xml','application/xml']];
    const imageDefaults=[]; for(const m of media){const ext=m.name.split('.').pop();if(!imageDefaults.some(x=>x[0]===ext)) imageDefaults.push([ext,m.mime]);}
    const contentTypes='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+defaults.concat(imageDefaults).map(x=>'<Default Extension="'+x[0]+'" ContentType="'+x[1]+'"/>').join('')+'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';

    zip.file('[Content_Types].xml',contentTypes);
    zip.folder('_rels').file('.rels',rootRels);
    zip.folder('word').file('document.xml',documentXml).file('styles.xml',stylesXml);
    zip.folder('word').folder('_rels').file('document.xml.rels',relXml);
    for(const m of media) zip.folder('word').folder('media').file(m.name,m.blob);
    return await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'});
  }

  async function exportDocx(){
    const btn=document.getElementById('exportDocx'); if(btn) btn.disabled=true;
    try{
      const blob=await buildDocx();
      const title=document.getElementById('documentTitle');
      const name=safeName(title&&title.value)+'.docx';
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
      const menu=document.getElementById('exportMenu'); if(menu) menu.classList.add('hidden');
    }catch(err){
      console.error(err); const t=document.getElementById('toast'); if(t){t.textContent='No se pudo crear el DOCX: '+(err.message||err);t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),3500);}
    }finally{if(btn) btn.disabled=false;}
  }

  window.WaltivaDocx={buildDocx,exportDocx};
})();
