export function createPdfViewer(root, options = {}) {
  const $ = id => root.getElementById(id);
  const dialog=$('pdf-viewer-dialog'),canvas=$('pdf-viewer-canvas'),stage=$('pdf-viewer-stage');
  const loadPdf=options.loadPdf||(()=>import('./vendor/pdfjs/pdf.min.mjs'));
  const urls=options.urls||URL;
  let sequence=0,renderSequence=0,pdf=null,task=null,renderTask=null,url='',page=1,zoom=1;
  function controls(){
    $('pdf-viewer-prev').disabled=!pdf||page<=1;
    $('pdf-viewer-next').disabled=!pdf||page>=pdf.numPages;
    $('pdf-viewer-zoom').disabled=!pdf;
    $('pdf-viewer-page').textContent=pdf?`${page} / ${pdf.numPages}`:'—';
  }
  async function release(){
    const oldRender=renderTask,oldTask=task,oldPdf=pdf,oldUrl=url;
    ++renderSequence;renderTask=null;task=null;pdf=null;url='';
    oldRender?.cancel();
    if(oldUrl)urls.revokeObjectURL(oldUrl);
    canvas.hidden=true;canvas.width=1;canvas.height=1;
    for(const id of ['pdf-viewer-download','pdf-viewer-external'])$(id).removeAttribute('href');
    controls();
    try{if(oldTask)await oldTask.destroy();else if(oldPdf)await oldPdf.destroy();}catch{}
  }
  async function render(){
    if(!pdf)return;
    const draw=++renderSequence,current=sequence,document=pdf,targetPage=page;
    renderTask?.cancel();
    const previous=renderTask;
    if(previous)try{await previous.promise;}catch{}
    if(draw!==renderSequence||current!==sequence||document!==pdf||targetPage!==page)return;
    renderTask=null;
    canvas.hidden=true;$('pdf-viewer-status').textContent=`Mostrando página ${page}…`;controls();
    try{
      const sheet=await document.getPage(targetPage);
      if(draw!==renderSequence||current!==sequence||document!==pdf||targetPage!==page)return;
      const base=sheet.getViewport({scale:1}),fit=Math.max(180,stage.clientWidth-24)/base.width;
      const viewport=sheet.getViewport({scale:fit*zoom});
      const ratio=Math.min(root.defaultView?.devicePixelRatio||1,2,Math.sqrt(4_000_000/(viewport.width*viewport.height)));
      canvas.width=Math.max(1,Math.floor(viewport.width*ratio));canvas.height=Math.max(1,Math.floor(viewport.height*ratio));
      canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
      canvas.setAttribute('aria-label',`Página ${page} de ${document.numPages} del PDF`);
      const active=sheet.render({canvasContext:canvas.getContext('2d'),viewport:sheet.getViewport({scale:fit*zoom*ratio})});renderTask=active;
      await active.promise;
      if(draw!==renderSequence||current!==sequence||document!==pdf||targetPage!==page||renderTask!==active)return;
      canvas.hidden=false;stage.scrollTop=0;stage.scrollLeft=0;
      $('pdf-viewer-status').textContent=`Página ${page} de ${document.numPages}`;
    }catch(error){
      if(draw===renderSequence&&current===sequence&&document===pdf&&targetPage===page&&error.name!=='RenderingCancelledException')$('pdf-viewer-status').textContent='No se ha podido mostrar esta página. Puedes descargar el PDF original.';
    }
  }
  async function open(blob,name='documento.pdf'){
    const current=++sequence;
    await release();if(current!==sequence)return;
    $('pdf-viewer-title').textContent=String(name||'Documento PDF');
    $('pdf-viewer-status').textContent='Abriendo PDF…';page=1;zoom=1;$('pdf-viewer-zoom').value='1';
    if(!dialog.open)dialog.showModal();
    const original=blob.type==='application/pdf'?blob:blob.slice(0,blob.size,'application/pdf');
    url=urls.createObjectURL(original);
    $('pdf-viewer-download').href=url;$('pdf-viewer-download').download=String(name||'documento.pdf').split(/[\\/]/).pop();
    $('pdf-viewer-external').href=url;
    try{
      const library=await loadPdf();if(current!==sequence)return;
      library.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.min.mjs',root.defaultView.location.href).href;
      const bytes=await original.arrayBuffer();if(current!==sequence)return;
      const loading=library.getDocument({data:new Uint8Array(bytes),isEvalSupported:false});task=loading;
      const document=await loading.promise;if(current!==sequence){await document.destroy();return;}
      pdf=document;controls();await render();
    }catch(error){
      if(current===sequence){$('pdf-viewer-status').textContent=error.name==='PasswordException'?'Este PDF está protegido con contraseña. Descarga el original para abrirlo con tu lector de PDF.':'No se ha podido abrir el PDF. Puedes descargar el original o abrirlo con otro lector.';controls();}
    }
  }
  async function close(){++sequence;if(dialog.open)dialog.close();await release();}
  $('pdf-viewer-prev').onclick=()=>{if(pdf&&page>1){page--;return render();}};
  $('pdf-viewer-next').onclick=()=>{if(pdf&&page<pdf.numPages){page++;return render();}};
  $('pdf-viewer-zoom').onchange=()=>{zoom=Math.min(3,Math.max(1,Number($('pdf-viewer-zoom').value)||1));return render();};
  $('pdf-viewer-close').onclick=close;$('pdf-viewer-done').onclick=close;
  dialog.oncancel=event=>{event.preventDefault();return close();};
  dialog.onclose=()=>{if(!dialog.open){++sequence;void release();}};
  controls();return {open,close};
}
