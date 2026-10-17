/* Local images: no receipt data is sent to a server to create or preview them. */
(function(root){
  'use strict';
  const money=value=>root.TravelGroup.money(value);
  function wrap(context,text,width){
    const lines=[];let line='';
    for(const char of String(text).replace(/[\r\n\t]+/g,' ')){
      if(line&&context.measureText(line+char).width>width){lines.push(line.trimEnd());line='';}
      line+=char;
    }
    if(line||!lines.length)lines.push(line.trimEnd());return lines;
  }
  function layout(receipt,context){
    const pages=[];let rows=[],height=0;
    context.font='28px sans-serif';
    const nameWidth=860-Math.max(170,...receipt.rows.map(row=>context.measureText(money(row.amountCents)).width))-30;
    for(const row of receipt.rows){
      const lines=wrap(context,row.label,nameWidth),rowHeight=Math.max(58,lines.length*36+20);
      if(rows.length&&height+rowHeight>1500){pages.push(rows);rows=[];height=0;}
      rows.push({...row,lines,height:rowHeight});height+=rowHeight;
    }
    pages.push(rows);return pages;
  }
  async function createFiles(receipt){
    const measure=root.document.createElement('canvas').getContext('2d');
    if(!measure)throw new Error('No se pudo preparar la imagen del justificante.');
    const pages=layout(receipt,measure),files=[];
    for(let index=0;index<pages.length;index++){
      const rows=pages[index],last=index===pages.length-1,canvas=root.document.createElement('canvas');
      measure.font='bold 34px sans-serif';const title=wrap(measure,receipt.participantName+' · '+receipt.mealName,860);
      measure.font='24px sans-serif';const payer=wrap(measure,'Pagó: '+receipt.payerName,860);
      const header=200+title.length*44+payer.length*30;
      canvas.width=960;canvas.height=header+rows.reduce((sum,row)=>sum+row.height,0)+(last?270:100);
      const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);
      context.fillStyle='#176cb6';context.font='bold 22px sans-serif';context.fillText('CUADERNO DE BITÁCORA · DESGLOSE PERSONAL',50,48);
      context.fillStyle='#172033';context.font='bold 34px sans-serif';let y=104;
      title.forEach(line=>{context.fillText(line,50,y);y+=44;});
      context.font='24px sans-serif';context.fillStyle='#526174';context.fillText(receipt.date.split('-').reverse().join('/')+' · '+(index+1)+' / '+pages.length,50,y+3);y+=40;
      payer.forEach(line=>{context.fillText(line,50,y);y+=30;});y=header-40;
      const pair=(label,value,bold=false)=>{context.fillStyle='#172033';context.font=(bold?'bold ':'')+'28px sans-serif';context.textAlign='left';context.fillText(label,50,y);context.textAlign='right';context.fillText(money(value),910,y);context.textAlign='left';};
      context.font='bold 26px sans-serif';context.fillText('Concepto',50,y);context.textAlign='right';context.fillText('Tu importe',910,y);context.textAlign='left';y+=46;
      for(const row of rows){
        context.strokeStyle='#dae2ed';context.beginPath();context.moveTo(50,y-34);context.lineTo(910,y-34);context.stroke();
        pair(row.lines[0],row.amountCents);context.font='28px sans-serif';row.lines.slice(1).forEach((line,i)=>context.fillText(line,50,y+(i+1)*36));y+=row.height;
      }
      if(last){
        y+=12;pair('Total consumido',receipt.totalCents,true);y+=48;
        pair(receipt.isPayer?'Cubierto por ti':'Ya devuelto',receipt.paidCents);y+=48;
        pair('Pendiente',receipt.remainingCents,true);y+=64;
      }else y+=25;
      context.font='22px sans-serif';context.fillStyle='#526174';context.fillText(last?'Desglose del reparto de la comida.':'Continúa en la siguiente imagen.',50,y);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(!blob)throw new Error('No se pudo crear la imagen. Vuelve a abrir el justificante.');
      const slug=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,55)||'comida';
      files.push(new root.File([blob],`justificante-${slug(receipt.participantName)}-${slug(receipt.mealName)}${pages.length>1?'-'+(index+1):''}.png`,{type:'image/png'}));
    }
    return files;
  }
  function download(files){
    for(const file of files){const url=root.URL.createObjectURL(file),link=root.document.createElement('a');link.href=url;link.download=file.name;root.document.body.appendChild(link);link.click();link.remove();setTimeout(()=>root.URL.revokeObjectURL(url),30000);}
  }
  async function share(files){
    if(!files?.length)throw new Error('Espera a que termine de prepararse la imagen.');
    if(typeof root.navigator.share!=='function'||(root.navigator.canShare&&!root.navigator.canShare({files}))){download(files);return 'Imagen descargada. Puedes adjuntarla en WhatsApp.';}
    try{await root.navigator.share({files});return 'Se ha cerrado el menú de compartir.';}
    catch(error){if(error.name==='AbortError')return 'No se ha compartido el justificante.';throw new Error('No se pudo abrir el menú de compartir. Puedes usar Descargar imagen y adjuntarla en WhatsApp.');}
  }
  root.TravelGroupReceipt={createFiles,download,share,layout};
})(globalThis);
