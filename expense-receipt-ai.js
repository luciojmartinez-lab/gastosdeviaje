(function(root){
  'use strict';
  let host;const state={};const $=id=>document.getElementById(id);
  const access=root.ReceiptAccess;
  function progress(prefix,running,started=Date.now(),succeeded=true){
    const wrap=$(prefix+'-ticket-ai-progress-wrap'),bar=$(prefix+'-ticket-ai-progress'),counter=$(prefix+'-ticket-ai-counter');
    wrap.hidden=false;
    if(running)bar.removeAttribute('value');else bar.value=succeeded?1:0;
    counter.textContent=`${running?'Lectura en curso':succeeded?'Lectura completada':'Lectura interrumpida'} · ${Math.floor((Date.now()-started)/1000)} s`;
  }
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const message=(prefix,text,error=false)=>{const el=$(prefix+'-ticket-ai-status');el.textContent=text;el.classList.toggle('error',error);};
  function showError(text,focusTarget){
    const dialog=$('expense-ai-error-dialog');
    $('expense-ai-error-message').textContent=text;
    dialog.onclose=()=>{
      const target=focusTarget&&$(focusTarget);
      if(target?.closest('dialog')?.open){target.focus({preventScroll:true});target.scrollIntoView?.({block:'center',behavior:'instant'});}
    };
    if(!dialog.open)dialog.showModal();
  }
  function reviewApplied(prefix,result){
    const notice=$(prefix+'-ticket-ai-applied'),fields=result.fields;
    const applied=[fields.merchant,fields.total===null?'':`${fields.total.toLocaleString('es-ES',{maximumFractionDigits:2})} ${fields.currency}`].filter(Boolean).join(' · ');
    notice.textContent=`Aplicado: ${applied}. Revisa los datos antes de guardar.`;notice.hidden=false;
    const form=$(prefix==='g'?'add-gasto-form':'edit-gasto-form'),dialog=form.closest('dialog'),heading=form.querySelector('h2');
    heading.tabIndex=-1;heading.focus({preventScroll:true});
    form.scrollTop=0;dialog.scrollTop=0;
  }
  function refreshCode(prefix,reason){
    const input=$(prefix+'-ticket-ai-code');
    if(reason==='forget'||reason==='external'||document.activeElement!==input)input.value=access.get();
    if(!access.get())$(prefix+'-ticket-ai-access').hidden=false;
    $(prefix+'-ticket-ai-code-status').textContent=access.description();
  }
  function restore(prefix){refreshCode(prefix,'restore');$(prefix+'-ticket-ai-access').hidden=!!access.get()&&access.isPersistent();$(prefix+'-ticket-ai-code').type='password';$(prefix+'-ticket-ai-eye').textContent='Mostrar';$(prefix+'-ticket-ai-eye').setAttribute('aria-pressed','false');}
  async function status(prefix){const value=await host.status($(prefix+'-ticket-ai-code').value.trim());const usage=$(prefix+'-ticket-ai-usage');usage.textContent=value.usageText||value.message;usage.parentElement.querySelector('summary').textContent=value.usage?.available?`Registro hoy: ${value.usage.requests} / ${value.limits.daily} · ${Math.max(0,value.limits.daily-value.usage.requests)} restantes estimados*`:'Cuota gratuita y uso registrado';}
  function sync(prefix){
    if(!host||!$(prefix+'-ticket-ai-read'))return;
    const source=host.source(prefix),value=state[prefix];
    const context=host.context(prefix);
    if(value.source!==source?.source||value.context!==context){value.source=source?.source;value.context=context;value.sequence++;value.proposal=null;$(prefix+'-ticket-ai-proposal').innerHTML='';$(prefix+'-ticket-ai-consent').checked=false;$(prefix+'-ticket-ai-applied').hidden=true;message(prefix,'');}
    $(prefix+'-ticket-ai-read').disabled=!source||value.busy||host.localBusy(prefix);
  }
  async function read(prefix){
    const value=state[prefix];if(value.busy)return;
    const code=$(prefix+'-ticket-ai-code').value.trim();if(code)access.save(code);
    if(host.localBusy(prefix))throw new Error('Espera a que termine la lectura local.');
    if(!$(prefix+'-ticket-ai-consent').checked)throw new Error('Autoriza enviar esta foto a Google para leerla.');
    if(!code){$(prefix+'-ticket-ai-access').hidden=false;throw new Error('Introduce el código de acceso que usas en Grupo.');}
    value.busy=true;value.proposal=null;$(prefix+'-ticket-ai-proposal').innerHTML='';host.sync(prefix);sync(prefix);
    const sequence=++value.sequence,source=host.source(prefix)?.source,context=host.context(prefix);
    const started=Date.now();progress(prefix,true,started);$(prefix+'-ticket-ai-read').textContent='Leyendo con Gemini…';
    const timer=root.setInterval(()=>progress(prefix,true,started),500);
    try{
      message(prefix,'Preparando la foto…');
      const photo=await host.prepare(prefix);
      if(sequence!==value.sequence||source!==host.source(prefix)?.source)throw new Error('La foto ha cambiado mientras se preparaba. Autoriza la foto actual y vuelve a leerla.');
      const result=await host.read(photo,code,progress=>message(prefix,progress.status));
      if(sequence!==value.sequence||source!==host.source(prefix)?.source||context!==host.context(prefix)||!host.isOpen(prefix))return;
      value.proposal=result;value.proposalSource=source;value.proposalContext=context;
      restore(prefix);
      const fields=result.fields,total=fields.total===null?'No legible':`${fields.total.toLocaleString('es-ES',{maximumFractionDigits:2})} ${fields.currency}`;
      const previous=host.hasTranslation(prefix);
      const originalMerchant=result.merchantOriginal&&result.merchantOriginal!==fields.merchant?`<br><small>Nombre original: ${esc(result.merchantOriginal)}</small>`:'';
      $(prefix+'-ticket-ai-proposal').innerHTML=`<p><strong>Emisor:</strong> ${esc(fields.merchant||'No legible')}${originalMerchant}<br><strong>Total:</strong> ${esc(total)}</p>${result.spanishText?`<details open><summary>Traducción al español</summary><pre>${esc(result.spanishText)}</pre></details><label class="check-option"><input type="checkbox" id="${prefix}-ticket-ai-save-translation"${previous?'':' checked'}> ${previous?'Sustituir la traducción anterior por esta':'Guardar traducción junto al ticket original'}</label>`:''}${result.originalText?`<details><summary>Texto original</summary><pre>${esc(result.originalText)}</pre></details>`:''}<button type="button" class="btn" id="${prefix}-ticket-ai-apply">Aplicar emisor y total</button>`;
      $(prefix+'-ticket-ai-apply').onclick=safe(prefix,()=>apply(prefix));
      message(prefix,'Propuesta preparada. Revisa emisor, total y moneda antes de aplicarla.'+(result.warnings.length?' '+result.warnings.join(' '):''));
    }finally{root.clearInterval(timer);progress(prefix,false,started,!!value.proposal);$(prefix+'-ticket-ai-read').textContent='Leer con Gemini gratis';value.busy=false;host.sync(prefix);sync(prefix);status(prefix).catch(()=>{});}
  }
  async function apply(prefix){
    const value=state[prefix],result=value.proposal;
    if(!result||value.proposalSource!==host.source(prefix)?.source||value.proposalContext!==host.context(prefix))throw new Error('El ticket ha cambiado. Vuelve a leerlo con Gemini.');
    $(prefix+'-ticket-ai-apply').disabled=true;
    try{
      const text=await host.apply(prefix,result,$(prefix+'-ticket-ai-save-translation')?.checked===true,()=>value.proposal===result&&value.proposalSource===host.source(prefix)?.source&&value.proposalContext===host.context(prefix)&&host.isOpen(prefix));
      message(prefix,text);
      reviewApplied(prefix,result);
    }finally{if($(prefix+'-ticket-ai-apply'))$(prefix+'-ticket-ai-apply').disabled=false;}
  }
  const safe=(prefix,action)=>async()=>{
    const context=host.context(prefix),source=host.source(prefix)?.source;
    try{await action();}catch(error){
      if(!host.isOpen(prefix)||context!==host.context(prefix)||source!==host.source(prefix)?.source)return;
      const text=error.message||'No se pudo completar la lectura. Puedes usar el OCR local o Lens.';
      if(/código de acceso incorrecto/i.test(text))$(prefix+'-ticket-ai-access').hidden=false;
      message(prefix,text,true);showError(text,error.focusTarget);
    }
  };
  function mount(config){host=config;for(const prefix of ['g','edit-gasto']){
    state[prefix]={sequence:0,busy:false,proposal:null};restore(prefix);
    $(prefix+'-ticket-ai-panel').ontoggle=()=>{if($(prefix+'-ticket-ai-panel').open){if($(prefix+'-ticket-ai-access').hidden||!$(prefix+'-ticket-ai-code').value)restore(prefix);else $(prefix+'-ticket-ai-code').type='password';status(prefix).catch(()=>{});sync(prefix);}};
    $(prefix+'-ticket-ai-read').onclick=safe(prefix,()=>read(prefix));
    $(prefix+'-ticket-ai-code').oninput=$(prefix+'-ticket-ai-code').onchange=()=>{access.save($(prefix+'-ticket-ai-code').value);};
    $(prefix+'-ticket-ai-change-code').onclick=()=>{$(prefix+'-ticket-ai-access').hidden=false;$(prefix+'-ticket-ai-code').type='password';};
    $(prefix+'-ticket-ai-eye').onclick=()=>{const visible=$(prefix+'-ticket-ai-code').type==='password';$(prefix+'-ticket-ai-code').type=visible?'text':'password';$(prefix+'-ticket-ai-eye').textContent=visible?'Ocultar':'Mostrar';$(prefix+'-ticket-ai-eye').setAttribute('aria-pressed',String(visible));};
    sync(prefix);
  }access.subscribe(({reason})=>{for(const prefix of ['g','edit-gasto'])refreshCode(prefix,reason);});}
  root.ExpenseReceiptAIUI={mount,sync,isBusy:prefix=>state[prefix]?.busy===true};
})(globalThis);
