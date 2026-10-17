(function(root){
  'use strict';
  const $=id=>document.getElementById('ticket-camera-'+id);
  const constraints={audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:2048,max:2560},height:{ideal:1536,max:2560},frameRate:{ideal:15,max:20}}};
  let host,sequence=0,stream=null,photo=null,url='',prefix='',busy=false,failed=false;
  let location=null,locationWatch=null,locationTimer=null,locationRun=0;
  function stopLocation(){
    locationRun++;if(locationWatch!=null)root.navigator.geolocation?.clearWatch(locationWatch);
    locationWatch=null;root.clearTimeout(locationTimer);locationTimer=null;
  }
  function startLocation(){
    stopLocation();location=null;
    if(!$('gps').checked){$('gps-status').textContent='Foto sin ubicación.';return;}
    const geo=root.navigator.geolocation;
    if(!geo?.watchPosition){$('gps-status').textContent='Ubicación no disponible. Puedes hacer y usar la foto sin GPS.';return;}
    const run=locationRun,started=Date.now();
    const current=()=>run===locationRun&&$('dialog').open&&$('gps').checked;
    const unavailable=()=>{if(!current())return;stopLocation();$('gps-status').textContent=location?'Ubicación aproximada guardada para esta foto.':'Sin ubicación. Puedes hacer y usar la foto; comprueba el permiso de ubicación si quieres GPS.';};
    $('gps-status').textContent='Buscando ubicación… Puedes hacer y usar la foto mientras tanto.';
    locationTimer=root.setTimeout(unavailable,10000);
    try{
      const watch=geo.watchPosition(position=>{
        if(!current())return;
        const {latitude,longitude,accuracy}=position.coords||{};
        if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<-90||latitude>90||longitude<-180||longitude>180||!Number.isFinite(accuracy)||accuracy<0||!Number.isFinite(position.timestamp)||position.timestamp<started-15000)return;
        if(location&&location.accuracy<=accuracy)return;
        location={latitude,longitude,accuracy,source:'device',capturedAt:position.timestamp};
        $('gps-status').textContent=`Ubicación de la foto obtenida (precisión aproximada: ${Math.round(accuracy)} m).`;
        if(accuracy<=100)stopLocation();
      },unavailable,{enableHighAccuracy:true,maximumAge:0,timeout:10000});
      if(current())locationWatch=watch;else geo.clearWatch(watch);
    }catch{unavailable();}
  }
  const stop=value=>value?.getTracks().forEach(track=>track.stop());
  function release(){stopLocation();location=null;stop(stream);stream=null;$('video').srcObject=null;if(url){URL.revokeObjectURL(url);url='';}$('preview').removeAttribute('src');photo=null;}
  function controls(){
    $('take').disabled=busy||!stream;$('take').hidden=!!photo;$('use').disabled=busy||!photo;
    $('use').hidden=!photo;$('repeat').hidden=!photo&&!failed;$('repeat').disabled=busy;
    $('repeat').textContent=photo?'Repetir foto':'Reintentar cámara';
    $('close').disabled=busy;$('cancel').disabled=busy;$('native').disabled=busy;
    $('gps').disabled=busy;
    $('video').hidden=!!photo;$('preview').hidden=!photo;
  }
  function close(force=false){
    if(busy&&!force)return;
    sequence++;busy=false;release();controls();
    if($('dialog').open)$('dialog').close();
  }
  function errorText(error){
    if(error?.name==='NotAllowedError')return 'No se ha permitido usar la cámara. Puedes autorizarla en el navegador o usar Cámara del móvil / Elegir archivo.';
    return 'No se pudo abrir o preparar la cámara de la app. Puedes usar Cámara del móvil o Elegir archivo.';
  }
  async function start(){
    const run=++sequence;busy=false;failed=false;release();controls();$('status').textContent='Abriendo cámara…';$('gps-status').textContent='';
    try{
      await host.before(prefix);
      if(run!==sequence||!$('dialog').open)return;
      if(!host.isOpen(prefix)){close(true);return;}
      if(!root.isSecureContext||!root.navigator.mediaDevices?.getUserMedia||typeof root.DataTransfer!=='function')throw new Error('unsupported');
      const camera=await root.navigator.mediaDevices.getUserMedia(constraints);
      if(run!==sequence||!$('dialog').open||!host.isOpen(prefix)){stop(camera);return;}
      stream=camera;$('video').srcObject=camera;
      let timer;
      try{await Promise.race([$('video').play(),new Promise((resolve,reject)=>{timer=root.setTimeout(()=>reject(new Error('camera-timeout')),10000);})]);}
      finally{root.clearTimeout(timer);}
      if(run!==sequence)return;
      const width=$('video').videoWidth,height=$('video').videoHeight;
      if(!width||!height||width>2560||height>2560)throw new Error('unsupported-size');
      $('status').textContent='Encuadra todo el ticket, con buena luz y sin reflejos. Pulsa Hacer foto.';controls();startLocation();
    }catch(error){
      if(run!==sequence)return;
      release();failed=true;controls();$('status').textContent=errorText(error);
    }
  }
  async function take(){
    if(busy||!stream)return;
    const run=sequence,video=$('video'),canvas=document.createElement('canvas');busy=true;controls();$('status').textContent='Preparando foto…';
    try{
      const scale=Math.min(1,2200/Math.max(video.videoWidth,video.videoHeight));
      canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
      const context=canvas.getContext('2d',{alpha:false});if(!context)throw new Error('canvas');
      context.drawImage(video,0,0,canvas.width,canvas.height);
      // Release camera buffers as soon as the chosen frame has been copied.
      stop(stream);stream=null;video.srcObject=null;
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('jpeg')),'image/jpeg',0.88));
      if(run!==sequence||!$('dialog').open)return;
      photo=new File([blob],`ticket-${Date.now()}.jpg`,{type:'image/jpeg'});url=URL.createObjectURL(photo);$('preview').src=url;
      $('status').textContent='Revisa que se lean las letras y los importes. Usa la foto o repítela.';
    }catch(error){if(run===sequence){release();failed=true;$('status').textContent=errorText(error);}}
    finally{canvas.width=1;canvas.height=1;if(run===sequence){busy=false;controls();}}
  }
  async function use(){
    if(busy||!photo)return;
    const run=sequence;stopLocation();busy=true;controls();$('status').textContent='Añadiendo foto al gasto…';
    try{
      await host.accept(prefix,photo,()=>run===sequence&&$('dialog').open&&host.isOpen(prefix),{point:location});
      if(run===sequence)close(true);
    }catch(error){if(run===sequence){busy=false;controls();$('status').textContent=error?.message||'No se pudo añadir la foto. Puedes repetirla.';}}
  }
  function open(target){
    if(busy)return;
    prefix=target;if(!$('dialog').open)$('dialog').showModal();return start();
  }
  function mount(config){
    host=config;$('take').onclick=take;$('use').onclick=use;$('repeat').onclick=start;
    $('gps').onchange=()=>{if(stream||photo)startLocation();};
    $('close').onclick=$('cancel').onclick=()=>close();
    $('native').onclick=()=>{const target=prefix;close();host.native(target);};
    $('dialog').oncancel=event=>{event.preventDefault();close();};
    $('dialog').addEventListener('close',()=>{sequence++;busy=false;release();controls();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)close(true);});
    root.addEventListener('pagehide',()=>close(true));
    controls();
  }
  root.TicketCameraUI={mount,open};
})(globalThis);
