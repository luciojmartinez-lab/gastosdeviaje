(function(root) {
  'use strict';
  const api = () => root.TravelGroup;
  let host, editor = null, saving = false, reading = false, cacheTail = Promise.resolve(), cacheTimer, paymentGroup, aiEnabled=false;
  const $ = selector => document.querySelector(selector);
  const all = selector => Array.from(document.querySelectorAll(selector));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const uid = () => crypto.randomUUID();
  const AI_CODE_KEY = 'cuaderno.receiptAccess.v1';
  function restoreAICode() {
    let saved='';try{saved=root.localStorage.getItem(AI_CODE_KEY)||'';}catch{}
    if(saved)$('#group-ai-code').value=saved;
    $('#group-ai-access-entry').hidden=!!saved;
    $('#group-ai-access-saved').hidden=!saved;
  }
  function rememberAICode() {
    try{
      root.localStorage.setItem(AI_CODE_KEY,$('#group-ai-code').value.trim());
      $('#group-ai-access-entry').hidden=true;$('#group-ai-access-saved').hidden=false;
    }catch{ /* A blocked device store must not prevent reading the receipt. */ }
  }
  function itemShares(item,meal) {
    return item.common?Object.fromEntries(meal.attendees.map(id=>[id,1])):(item.shares||{});
  }
  const today = () => { const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const amount = value => Number.isSafeInteger(value) ? (value/100).toFixed(2) : '';
  const trip = () => host.getState().viajes.find(value => Number(value.id) === Number($('#group-trip').value));
  const current = () => api().normalize(trip()?.group);
  const name = (group,id) => group.participants.find(person=>person.id===id)?.name || 'Persona no disponible';
  const message = (text,error=false,target='#group-message') => {
    $(target).textContent=text;$(target).classList.toggle('error',error);
    if(target==='#group-meal-message' && $('#group-parse-message')){
      $('#group-parse-message').textContent=text;$('#group-parse-message').classList.toggle('error',error);
    }
  };
  const showParseFeedback=()=>{ $('#group-text-panel').open=true;$('#group-parse-message').scrollIntoView?.({block:'nearest'}); };
  function accounts(id) { return host.getState().cuentas.filter(account=>account.moneda==='EUR'&&!account.groupClearing&&Number(account.viajeId)===Number(id)); }
  const options = (rows,value,empty='Elige una opción') => `<option value="">${esc(empty)}</option>${rows.map(row=>`<option value="${esc(row.id)}"${String(row.id)===String(value)?' selected':''}>${esc(row.name||row.nombre)}</option>`).join('')}`;
  async function commit(group, expected = group.revision, tripId = trip()?.id) {
    if(saving) throw new Error('Espera a que termine el guardado anterior.');
    saving=true; all('#view-grupo button, #group-meal-dialog button, #group-payment-dialog button').forEach(button=>button.disabled=true);
    try { return await host.save(tripId,expected,group); }
    finally { saving=false;all('#view-grupo button, #group-meal-dialog button, #group-payment-dialog button').forEach(button=>button.disabled=false);render(); }
  }
  function render() {
    if(!host || !$('#group-trip')) return;
    const state=host.getState(), selected=state.selectedViajeIds?.length===1?String(state.selectedViajeIds[0]):'';
    $('#group-trip').innerHTML=options(state.viajes,selected,'Elige un viaje');
    const selectedTrip=trip(),group=current();
    $('#group-content').hidden=!selectedTrip; $('#group-empty').hidden=!!selectedTrip;
    if(!selectedTrip)return;
    $('#group-self').innerHTML=options(group.participants,group.selfId,'Quién soy (opcional)');
    $('#group-integrate').checked=group.integrate;
    $('#group-roster').innerHTML=group.participants.map(person=>`<li><span>${esc(person.name)}${person.id===group.selfId?' · yo':''}${person.active?'':' · archivado'}</span><span><button type="button" class="ghost" data-group-person="${esc(person.id)}">Editar</button><button type="button" class="ghost" data-group-archive="${esc(person.id)}">${person.active?'Archivar':'Activar'}</button></span></li>`).join('')||'<li>Añade los nombres de los viajeros, uno por línea.</li>';
    $('#group-roster-count').textContent=`${group.participants.filter(person=>person.active).length} viajeros activos`;
    const balances=group.meals.some(meal=>meal.status==='closed')?api().balances(group):[];
    $('#group-balances').innerHTML=balances.length?`<div class="table-wrap"><table><thead><tr><th>Viajero</th><th>Consumido</th><th>Adelantado</th><th>Devuelto</th><th>Recibido</th><th>Saldo</th></tr></thead><tbody>${balances.map(row=>`<tr><td>${esc(row.name)}</td><td>${api().money(row.consumed)}</td><td>${api().money(row.advanced)}</td><td>${api().money(row.sent)}</td><td>${api().money(row.received)}</td><td>${api().money(row.balance)} ${row.balance>0?'a recuperar':row.balance<0?'a pagar':'saldado'}</td></tr>`).join('')}</tbody></table></div>`:'<p class="small">El resumen aparecerá al cerrar la primera comida.</p>';
    $('#group-meals').innerHTML=group.meals.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(meal=>{
      const closed=meal.status==='closed';
      const payments=closed?api().mealPayments(group,meal):[];
      return `<article class="group-meal-card"><h3>${esc(meal.name||'Comida sin nombre')} <span class="badge">${closed?'Cerrada':'Borrador'}</span></h3><p>${esc(meal.date)} · ${meal.attendees.length} asistentes · ${Number.isSafeInteger(meal.totalCents)?api().money(meal.totalCents):'Total por revisar'}${closed?` · Pagó ${esc(name(group,meal.payerId))}`:''}</p><div class="actions"><button class="btn ghost" type="button" data-group-edit="${esc(meal.id)}">${closed?'Revisar / corregir':'Continuar'}</button>${closed?`<button class="btn ghost" type="button" data-group-share="${esc(meal.id)}">Compartir resumen</button><button class="btn ghost" type="button" data-group-collect="${esc(meal.id)}">Registrar devolución</button>`:`<button class="ghost" type="button" data-group-delete="${esc(meal.id)}">Eliminar borrador</button>`}</div>${closed?`<div class="table-wrap"><table><thead><tr><th>Asistente</th><th>Consumo</th><th>Devuelto / cubierto</th><th>Pendiente</th></tr></thead><tbody>${payments.map(row=>`<tr><td>${esc(name(group,row.id))}</td><td>${api().money(row.due)}</td><td>${api().money(row.paid)}</td><td>${api().money(row.remaining)}</td></tr>`).join('')}</tbody></table></div>`:''}${group.settlements.filter(payment=>payment.mealId===meal.id).map(payment=>`<p class="group-payment">${esc(payment.date||'')} · ${esc(name(group,payment.fromId))} → ${esc(name(group,payment.toId))}: ${api().money(payment.amountCents)} ${payment.voided?`<strong>Anulada: ${esc(payment.voidReason)}</strong>`:`<button type="button" class="ghost" data-group-void="${esc(payment.id)}">Anular registro</button>`}</p>`).join('')}</article>`;
    }).join('')||'<p class="small">Todavía no hay comidas. Añade viajeros y pulsa Nueva comida.</p>';
    $('#group-new-meal').disabled=group.participants.filter(person=>person.active).length===0;
  }
  function stash(force = false) {
    if(!editor)return;
    const saved=JSON.parse(JSON.stringify({ tripId: editor.tripId, revision: editor.revision, meal: editor.meal }));
    clearTimeout(cacheTimer);
    const write = () => { cacheTail=cacheTail.catch(()=>{}).then(()=>host.cacheDraft(saved));cacheTail.catch(error=>message(`No se pudo guardar el borrador local: ${error.message}`,true,'#group-meal-message')); };
    if (force) write(); else cacheTimer=setTimeout(write,300);
  }
  function preview() {
    if(!editor)return;
    const result=api().allocation(editor.meal);
    $('#group-meal-check').textContent=result.errors.length?result.errors.join(' '):'Todo cuadra. Revisa el reparto y confirma antes de cerrar.';
    $('#group-meal-check').classList.toggle('error',result.errors.length>0);
    $('#group-meal-totals').innerHTML=`<p>Conceptos: ${api().money(result.totalCents)} · Diferencia con ticket: ${api().money(result.differenceCents)}</p><ul>${editor.meal.attendees.map(id=>`<li>${esc(name(editor.group,id))}: <strong>${api().money(result.totals[id]||0)}</strong></li>`).join('')}</ul>`;
  }
  function renderItems() {
    const meal=editor.meal,group=editor.group;
    $('#group-meal-items').innerHTML=meal.items.map(item=>{
      const shares=itemShares(item,meal);
      const people=group.participants.filter(person=>meal.attendees.includes(person.id)||Number(shares[person.id])>0);
      return `<fieldset class="group-item" data-group-item="${esc(item.id)}"><legend>Concepto del ticket</legend><div class="row3"><div><label>Concepto<input data-item-field="name" value="${esc(item.name)}" maxlength="160"></label></div><div><label>Unidades del ticket<input type="number" min="0.01" step="0.01" data-item-field="quantity" value="${esc(item.quantity??1)}"></label></div><div><label>Importe total de esta línea (€)<input inputmode="decimal" data-item-field="amountCents" value="${amount(item.amountCents)}"></label></div></div><p class="small">Marca quién consume este plato. Si marcas varias personas, se reparte por igual entre ellas.</p><div class="group-shares">${people.map(person=>`<label class="check-option"><input type="checkbox" data-item-diner="${esc(person.id)}"${Number(shares[person.id])>0?' checked':''}> ${esc(person.name)}${meal.attendees.includes(person.id)?'':' · AUSENTE: retira su asignación'}</label>`).join('')||'<p>Selecciona los asistentes antes de asignar.</p>'}</div><details><summary>Ajustar partes (opcional)</summary><p class="small">Una parte por persona reparte por igual. Aumenta las partes de quien consuma más.</p><div class="group-shares">${people.map(person=>`<label>Partes de ${esc(person.name)}${meal.attendees.includes(person.id)?'':' · AUSENTE'}<input type="number" min="0" max="1000000" step="0.01" data-item-person="${esc(person.id)}" value="${esc(shares[person.id]||0)}"></label>`).join('')}</div></details><button class="ghost" type="button" data-group-item-expand="${esc(item.id)}"${Number.isSafeInteger(Number(item.quantity))&&Number(item.quantity)>1?'':' hidden'}>Desglosar unidades</button><button class="ghost" type="button" data-group-item-remove="${esc(item.id)}">Quitar concepto</button></fieldset>`;
    }).join('');
    preview();
  }
  function renderTicket() {
    const meal=editor.meal;
    $('#group-meal-ticket').innerHTML=/^data:image\/(jpeg|png|webp);base64,/i.test(meal.ticketData||'')?`<p class="small" role="status">Foto cargada: <strong>${esc(meal.ticketName||'ticket')}</strong>. Pulsa «Leer foto con OCR local» para proponer los conceptos.</p><img class="group-ticket" src="${esc(meal.ticketData)}" alt="Ticket de ${esc(meal.name||'la comida')}">`:'';
  }
  function mountMeal() {
    const meal=editor.meal,group=editor.group;
    meal.items.forEach(item=>{item.mode='weights';});
    restoreAICode();
    $('#group-meal-name').value=meal.name||'';$('#group-meal-date').value=meal.date||today();$('#group-meal-total').value=amount(meal.totalCents);
    $('#group-meal-payer').innerHTML=options(group.participants,meal.payerId,'Quién pagó al restaurante');
    $('#group-meal-account').innerHTML=options(accounts(editor.tripId),meal.accountId,'Cuenta real si pagaste tú');
    $('#group-meal-attendees').innerHTML=group.participants.filter(person=>person.active||meal.attendees.includes(person.id)).map(person=>`<label class="check-option"><input type="checkbox" data-group-attendee="${esc(person.id)}"${meal.attendees.includes(person.id)?' checked':''}> ${esc(person.name)}</label>`).join('');
    $('#group-meal-reviewed').checked=false;$('#group-meal-file').value='';$('#group-meal-text').value=meal.ocrText||'';
    $('#group-text-panel').open=!!meal.ocrText;$('#group-parse-replace').hidden=true;$('#group-ocr-progress-wrap').hidden=true;
    $('#group-ai-read').disabled=true;$('#group-ai-consent').checked=false;$('#group-ai-status').textContent='Comprobando disponibilidad de la IA gratuita…';
    const activeEditor=editor;
    Promise.resolve(host.aiStatus?.()||{enabled:false,message:'La IA gratuita está pendiente de activación.'}).then(status=>{
      if(editor!==activeEditor)return;aiEnabled=status.enabled===true;
      $('#group-ai-status').textContent=status.message;$('#group-ai-read').disabled=!aiEnabled||reading;
    }).catch(()=>{if(editor===activeEditor){aiEnabled=false;$('#group-ai-status').textContent='No se pudo comprobar el acceso a Google. Puedes usar el OCR local.';}});
    renderTicket();
    message('El OCR propone conceptos. Comprueba cada línea, el total y la asignación antes de cerrar.',false,'#group-meal-message');renderItems();
    if(!$('#group-meal-dialog').open)$('#group-meal-dialog').showModal();
  }
  async function openMeal(id,resume=false) {
    const selectedTrip=trip();if(!selectedTrip)return;
    const group=current();
    if(resume){const draft=await host.readDraft(selectedTrip.id);if(!draft)throw new Error('No hay un borrador local en este viaje.');editor=draft;editor.group=group;if(editor.revision!==group.revision)message('El grupo ha cambiado: revisa el borrador antes de aplicarlo.',true);}
    else {
      const original=group.meals.find(meal=>meal.id===id);
      editor={tripId:selectedTrip.id,revision:group.revision,group,meal:original?JSON.parse(JSON.stringify(original)):{id:uid(),name:'',date:today(),currency:'EUR',status:'draft',attendees:group.participants.filter(person=>person.active).map(person=>person.id),payerId:'',accountId:null,totalCents:null,items:[]}};
    }
    mountMeal();stash();
  }
  async function saveMeal(closed) {
    if(!editor||reading)return;
    if(closed&&!$('#group-meal-reviewed').checked)throw new Error('Confirma que has revisado el ticket y el reparto.');
    const next=api().normalize(editor.group),meal=JSON.parse(JSON.stringify(editor.meal));meal.status=closed?'closed':'draft';
    const index=next.meals.findIndex(value=>value.id===meal.id);if(index<0)next.meals.push(meal);else next.meals[index]=meal;
    next.enabled=true;
    stash(true); await cacheTail;
    await commit(next,editor.revision,editor.tripId);
    await cacheTail;await host.clearDraft(editor.tripId);$('#group-meal-dialog').close();editor=null;message(closed?'Comida cerrada y guardada.':'Borrador guardado.');
  }
  function readCents(value) {try{return api().cents(value);}catch{return null;}}
  async function extract(useAI=false) {
    if(reading||!editor)return;
    const withAI=useAI===true;
    if(withAI && !aiEnabled)throw new Error('La IA gratuita está pendiente de activación. Puedes usar el OCR local.');
    if(withAI && !$('#group-ai-consent').checked)throw new Error('Marca que autorizas enviar esta foto a Google para leerla.');
    if(withAI && !$('#group-ai-code').value.trim())throw new Error('Introduce el código de acceso a la lectura gratuita.');
    reading=true;$('#group-ocr').disabled=true;$('#group-parse-text').disabled=true;
    $('#group-ai-read').disabled=true;$('#group-close-meal').disabled=true;$('#group-save-draft').disabled=true;$('#group-meal-file').disabled=true;
    $('#group-ocr-progress-wrap').hidden=false;$('#group-ocr-progress').value=0;
    const started=Date.now();let percent=0;
    const paintProgress=()=>{$('#group-ocr-counter').textContent=`${withAI&&percent<100?'IA gratuita':percent+'%'} · ${Math.floor((Date.now()-started)/1000)} s`;};
    paintProgress();const timer=setInterval(paintProgress,500);
    if(withAI)$('#group-ocr-progress').removeAttribute('value');
    let completed=false;
    try {
      if(!editor.meal.ticketData)throw new Error('Añade una foto del ticket.');
      message(withAI?'Preparando la lectura gratuita con Google…':'Leyendo el ticket en este dispositivo…',false,'#group-meal-message');
      const onProgress=progress=>{
        const status=typeof progress==='string'?progress:progress.status||'Leyendo…';
        if(!withAI&&Number.isFinite(progress?.progress)){percent=Math.max(percent,Math.min(99,Math.round(progress.progress*100)));$('#group-ocr-progress').value=percent;paintProgress();}
        message(status,false,'#group-meal-message');
      };
      const result=withAI?await host.recognizeAI(editor.meal,{accessCode:$('#group-ai-code').value,consent:$('#group-ai-consent').checked},onProgress):await host.recognize(editor.meal,onProgress);
      if(!editor)return;
      if(withAI)rememberAICode();
      completed=true;percent=100;$('#group-ocr-progress').value=100;paintProgress();
      $('#group-text-panel').open=true;
      $('#group-meal-text').value=result.itemText||result.text||'';editor.meal.ocrText=$('#group-meal-text').value;
      editor.meal.ocrUnsafeText=result.itemsStatus==='review'?editor.meal.ocrText:null;
      if(!editor.meal.name&&result.fields?.merchant){editor.meal.name=result.fields.merchant;$('#group-meal-name').value=editor.meal.name;}
      // Total remains a proposal requiring the user's independent review.
      if(Number.isFinite(result.fields?.total)&&result.fields.total>0){editor.meal.totalCents=Math.round(result.fields.total*100);$('#group-meal-total').value=amount(editor.meal.totalCents);}
      if(result.itemsStatus==='review'){
        $('#group-meal-reviewed').checked=false;stash();
        message('Se ha leído el texto, pero no se han podido emparejar todos los conceptos y precios con el total. No se han sustituido tus conceptos. No pases este texto directamente a conceptos: vuelve a leer la foto o corrige primero cada línea con su precio.',true,'#group-meal-message');
        return;
      }
      parseText();
    }catch(error){
      if(withAI && /código de acceso incorrecto/i.test(error.message||'')){
        $('#group-ai-access-entry').hidden=false;$('#group-ai-access-saved').hidden=true;
        try{root.localStorage.removeItem(AI_CODE_KEY);}catch{}
      }
      throw error;
    }finally{
      clearInterval(timer);reading=false;$('#group-ocr').disabled=false;$('#group-parse-text').disabled=false;
      $('#group-ai-read').disabled=!aiEnabled;$('#group-close-meal').disabled=false;$('#group-save-draft').disabled=false;$('#group-meal-file').disabled=false;
      if(!completed)$('#group-ocr-counter').textContent=`Lectura interrumpida · ${Math.floor((Date.now()-started)/1000)} s`;
      if(editor)showParseFeedback();
    }
  }
  function parseText(replaceExisting=false){
    if(!editor)return;
    const text=$('#group-meal-text').value;
    if(editor.meal.ocrUnsafeText!=null && text.trim()===editor.meal.ocrUnsafeText.trim())throw new Error('Esta lectura tiene conceptos y precios sin emparejar. No se puede pasar directamente a conceptos. Vuelve a leer la foto o corrige el texto mirando el ticket.');
    const result=api().parseItems(text);
    if(!result.items.length)throw new Error('No se han reconocido conceptos fiables. Introdúcelos manualmente; no se ha cambiado la lista.');
    if(Number.isSafeInteger(editor.meal.totalCents)&&editor.meal.totalCents>0 && result.items.reduce((sum,item)=>sum+item.amountCents,0)!==editor.meal.totalCents)throw new Error('Los conceptos reconocidos no suman el total del ticket. No se ha cambiado la lista: corrige las líneas y sus precios antes de proponerlos.');
    const proposed=api().expandUnits(result.items);
    if(editor.meal.items.length && replaceExisting!==true){
      $('#group-parse-replace').hidden=false;
      message(`Hay ${editor.meal.items.length} conceptos. La propuesta contiene ${proposed.length}. Pulsa «Sustituir conceptos» para reemplazarlos y revisar sus asignaciones, o conserva los actuales.`,false,'#group-meal-message');
      return;
    }
    $('#group-parse-replace').hidden=true;
    editor.meal.ocrText=$('#group-meal-text').value;editor.meal.items=proposed.map(item=>({...item,id:uid(),mode:'weights'}));$('#group-meal-reviewed').checked=false;renderItems();stash();
    message(`Propuesta de ${proposed.length} conceptos. ${result.ignored.length} líneas no incorporadas. El total del ticket se revisa aparte.`,false,'#group-meal-message');
  }
  function safe(action,target='#group-message'){return async event=>{try{await action(event);}catch(error){message(error.message||String(error),true,target);}};}
  function mount(callbacks) {
    host=callbacks;
    $('#group-trip').onchange=()=>host.selectTrip($('#group-trip').value);
    $('#group-settings-save').onclick=safe(async()=>{const group=current();group.enabled=true;group.selfId=$('#group-self').value;group.integrate=$('#group-integrate').checked;await commit(group);message('Identidad e integración guardadas.');});
    $('#group-add-people').onclick=safe(async()=>{const group=current();const names=$('#group-people').value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean);if(!names.length)throw new Error('Escribe al menos un nombre.');const known=new Set(group.participants.map(person=>person.name.toLocaleLowerCase('es')));for(const value of names){if(known.has(value.toLocaleLowerCase('es')))throw new Error(`Nombre repetido: ${value}. Añade un apellido para distinguirlo.`);known.add(value.toLocaleLowerCase('es'));group.participants.push({id:uid(),name:value,active:true});}group.enabled=true;await commit(group);$('#group-people').value='';message(`${names.length} viajeros añadidos.`);});
    $('#group-rebase').onclick=safe(async()=>{if(!editor)return;await host.refresh();const fresh=host.getState().viajes.find(trip=>Number(trip.id)===Number(editor.tripId));if(!fresh)throw new Error('El viaje ya no existe.');editor.group=api().normalize(fresh.group);editor.revision=editor.group.revision;mountMeal();message('Borrador conservado sobre la versión actual. Comprueba de nuevo asistentes, pagador, conceptos y devoluciones antes de guardar.',false,'#group-meal-message');stash();},'#group-meal-message');
    $('#group-new-meal').onclick=safe(()=>openMeal());$('#group-resume').onclick=safe(()=>openMeal(null,true));
    $('#group-close-editor').onclick=safe(async()=>{if(reading)throw new Error('Espera a que termine la lectura.');stash(true);await cacheTail;$('#group-meal-dialog').close();editor=null;},'#group-meal-message');
    $('#group-meal-dialog').oncancel=event=>{event.preventDefault();$('#group-close-editor').click();};
    $('#group-save-draft').onclick=safe(()=>saveMeal(false),'#group-meal-message');$('#group-close-meal').onclick=safe(()=>saveMeal(true),'#group-meal-message');
    $('#group-add-item').onclick=()=>{editor.meal.items.push({id:uid(),name:'',quantity:1,amountCents:null,common:false,shares:{}});renderItems();stash();};
    $('#group-meal-form').onsubmit=event=>event.preventDefault();
    $('#group-meal-form').oninput=event=>{
      if(!editor)return;const element=event.target;
      const fields={'group-meal-name':'name','group-meal-date':'date','group-meal-total':'totalCents','group-meal-payer':'payerId','group-meal-account':'accountId','group-meal-text':'ocrText'};
      if(fields[element.id])editor.meal[fields[element.id]]=element.id==='group-meal-total'?readCents(element.value):element.id==='group-meal-account'?(Number(element.value)||null):element.value;
      const item=editor.meal.items.find(item=>item.id===element.closest('[data-group-item]')?.dataset.groupItem);
      if(item&&element.dataset.itemField){const field=element.dataset.itemField;item[field]=field==='amountCents'?readCents(element.value):field==='quantity'?Number(element.value):field==='common'?element.checked:element.value;}
      if(item&&(element.dataset.itemPerson||element.dataset.itemDiner)){item.shares={...itemShares(item,editor.meal)};item.common=false;item.mode='weights';}
      if(item&&element.dataset.itemPerson){item.shares||={};item.shares[element.dataset.itemPerson]=Number(element.value);}
      if(item&&element.dataset.itemDiner){
        item.shares||={};item.shares[element.dataset.itemDiner]=element.checked?1:0;
        element.closest('[data-group-item]').querySelectorAll('[data-item-person]').forEach(input=>{if(input.dataset.itemPerson===element.dataset.itemDiner)input.value=element.checked?'1':'0';});
      }
      if(item&&element.dataset.itemPerson)element.closest('[data-group-item]').querySelectorAll('[data-item-diner]').forEach(input=>{if(input.dataset.itemDiner===element.dataset.itemPerson)input.checked=Number(element.value)>0;});
      if(element.id!=='group-meal-reviewed')$('#group-meal-reviewed').checked=false;
      preview();stash();
    };
    $('#group-meal-form').onchange=event=>{const element=event.target;if(element.dataset.groupAttendee){const id=element.dataset.groupAttendee;editor.meal.attendees=element.checked?[...new Set([...editor.meal.attendees,id])]:editor.meal.attendees.filter(value=>value!==id);$('#group-meal-reviewed').checked=false;renderItems();stash();}else if(element.dataset.itemField==='quantity')renderItems();};
    $('#group-meal-items').onclick=safe(event=>{
      const button=event.target.closest('button');if(!button)return;
      const id=button.dataset.groupItemRemove||button.dataset.groupItemExpand;
      const index=editor.meal.items.findIndex(item=>item.id===id);if(index<0)return;
      if(button.dataset.groupItemExpand){
        const expanded=api().expandUnits([editor.meal.items[index]]).map(item=>({...item,id:uid()}));
        if(editor.meal.items.length-1+expanded.length>150)throw new Error('No se pueden superar 150 platos o unidades en una comida.');
        editor.meal.items.splice(index,1,...expanded);
        message('Unidades desglosadas sin cambiar el total. Revisa los comensales de cada plato.',false,'#group-meal-message');
      }else editor.meal.items.splice(index,1);
      $('#group-meal-reviewed').checked=false;renderItems();stash();
    },'#group-meal-message');
    $('#group-meal-file').onchange=safe(async event=>{
      if(!editor||reading)return;
      const input=event.target;
      reading=true;
      const controls=['#group-meal-file','#group-ocr','#group-save-draft','#group-close-meal'];
      controls.forEach(selector=>$(selector).disabled=true);
      message('Cargando la foto del ticket…',false,'#group-meal-message');
      try{
        const file=await host.readTicket(input);
        if(!file){message('No se ha seleccionado una foto nueva.',false,'#group-meal-message');return;}
        if(!/^data:image\/(jpeg|png|webp);base64,/i.test(file.data||''))throw new Error('No se pudo cargar la fotografía. Selecciona una imagen JPEG, PNG o WebP.');
        editor.meal.ticketData=file.data;editor.meal.ticketName=file.name;editor.meal.ticketType=file.type;
        $('#group-meal-reviewed').checked=false;$('#group-ai-consent').checked=false;renderTicket();stash();
        message(`Foto cargada: ${file.name}. Ya puedes leerla con OCR o introducir los conceptos manualmente.`,false,'#group-meal-message');
      }catch(error){input.value='';throw error;}
      finally{reading=false;controls.forEach(selector=>$(selector).disabled=false);}
    },'#group-meal-message');
    $('#group-ocr').onclick=safe(extract,'#group-meal-message');
    $('#group-ai-change-code').onclick=()=>{$('#group-ai-access-entry').hidden=false;$('#group-ai-access-saved').hidden=true;$('#group-ai-code').focus();};
    $('#group-ai-forget-code').onclick=()=>{try{root.localStorage.removeItem(AI_CODE_KEY);}catch{}$('#group-ai-code').value='';restoreAICode();};
    $('#group-ai-read').onclick=safe(()=>extract(true),'#group-meal-message');
    const propose=replace=>async()=>{try{parseText(replace);}catch(error){message(error.message||String(error),true,'#group-meal-message');}showParseFeedback();};
    $('#group-parse-text').onclick=propose(false);
    $('#group-parse-confirm').onclick=propose(true);
    $('#group-parse-keep').onclick=()=>{$('#group-parse-replace').hidden=true;message('Se conservan los conceptos actuales.',false,'#group-meal-message');showParseFeedback();};
    $('#group-content').onclick=safe(async event=>{
      const button=event.target.closest('button');if(!button)return;const group=current();
      if(button.dataset.groupEdit)return openMeal(button.dataset.groupEdit);
      if(button.dataset.groupPerson){const person=group.participants.find(person=>person.id===button.dataset.groupPerson);const value=prompt('Nombre del viajero:',person.name);if(value===null)return;if(!value.trim())throw new Error('El nombre no puede estar vacío.');if(group.participants.some(other=>other.id!==person.id&&other.name.toLocaleLowerCase('es')===value.trim().toLocaleLowerCase('es')))throw new Error('Ya existe ese nombre. Usa un apellido para distinguirlo.');person.name=value.trim();return commit(group);}
      if(button.dataset.groupArchive){const person=group.participants.find(person=>person.id===button.dataset.groupArchive);person.active=!person.active;return commit(group);}
      if(button.dataset.groupDelete){if(!confirm('Eliminar este borrador de comida?'))return;group.meals=group.meals.filter(meal=>meal.id!==button.dataset.groupDelete);return commit(group);}
      if(button.dataset.groupVoid){const payment=group.settlements.find(payment=>payment.id===button.dataset.groupVoid);const reason=prompt('Motivo de la anulación (se conserva el registro):');if(!reason?.trim())return;payment.voided=true;payment.voidReason=reason.trim();return commit(group);}
      if(button.dataset.groupShare){const meal=group.meals.find(meal=>meal.id===button.dataset.groupShare);await host.share(api().summary(group,meal));message('Resumen preparado para compartir.');return;}
      if(button.dataset.groupCollect){const meal=group.meals.find(meal=>meal.id===button.dataset.groupCollect);paymentGroup=JSON.parse(JSON.stringify(group));$('#group-payment-message').textContent='';$('#group-payment-meal').value=meal.id;$('#group-payment-from').innerHTML=options(api().mealPayments(group,meal).filter(row=>row.remaining>0).map(row=>({id:row.id,name:`${name(group,row.id)} · pendiente ${api().money(row.remaining)}`})),'','Quién devuelve');$('#group-payment-account').innerHTML=options(accounts(trip().id),'','Cuenta real si te afecta');$('#group-payment-date').value=today();$('#group-payment-amount').value='';$('#group-payment-to').textContent=`Recibe: ${name(group,meal.payerId)}`;$('#group-payment-dialog').dataset.revision=group.revision;$('#group-payment-dialog').dataset.tripId=trip().id;$('#group-payment-dialog').showModal();}
    });
    $('#group-payment-close').onclick=()=>$('#group-payment-dialog').close();
    $('#group-payment-form').onsubmit=safe(async event=>{event.preventDefault();const group=api().normalize(paymentGroup),meal=group.meals.find(meal=>meal.id===$('#group-payment-meal').value);if(!meal)throw new Error('La comida ya no existe.');group.settlements.push({id:uid(),mealId:meal.id,fromId:$('#group-payment-from').value,toId:meal.payerId,amountCents:api().cents($('#group-payment-amount').value),date:$('#group-payment-date').value,accountId:Number($('#group-payment-account').value)||null});await commit(group,Number($('#group-payment-dialog').dataset.revision),Number($('#group-payment-dialog').dataset.tripId));$('#group-payment-dialog').close();message('Devolución registrada.');},'#group-payment-message');
    render();
  }
  root.TravelGroupUI={mount,render};
})(globalThis);
