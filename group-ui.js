(function(root) {
  'use strict';
  const api = () => root.TravelGroup;
  let host, editor = null, saving = false, reading = false, cacheTail = Promise.resolve(), cacheTimer, paymentGroup;
  const $ = selector => document.querySelector(selector);
  const all = selector => Array.from(document.querySelectorAll(selector));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const uid = () => crypto.randomUUID();
  const today = () => { const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const amount = value => Number.isSafeInteger(value) ? (value/100).toFixed(2) : '';
  const trip = () => host.getState().viajes.find(value => Number(value.id) === Number($('#group-trip').value));
  const current = () => api().normalize(trip()?.group);
  const name = (group,id) => group.participants.find(person=>person.id===id)?.name || 'Persona no disponible';
  const message = (text,error=false,target='#group-message') => { $(target).textContent=text;$(target).classList.toggle('error',error); };
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
    $('#group-meal-items').innerHTML=meal.items.map(item=>`<fieldset class="group-item" data-group-item="${esc(item.id)}"><legend>Concepto del ticket</legend><div class="row3"><div><label>Concepto<input data-item-field="name" value="${esc(item.name)}" maxlength="160"></label></div><div><label>Unidades del ticket<input type="number" min="0.01" step="0.01" data-item-field="quantity" value="${esc(item.quantity??1)}"></label></div><div><label>Importe total de esta línea (€)<input inputmode="decimal" data-item-field="amountCents" value="${amount(item.amountCents)}"></label></div></div><label class="check-option"><input type="checkbox" data-item-field="common"${item.common?' checked':''}> Compartido por igual entre asistentes (pan / agua)</label><label>Asignación<select data-item-field="mode" aria-label="Asignación"><option value="weights"${item.mode!=='units'?' selected':''}>Por personas / pesos (1 = una parte)</option><option value="units"${item.mode==='units'?' selected':''}>Por unidades consumidas (deben sumar las del ticket)</option></select></label><div class="group-shares"${item.common?' hidden':''}>${group.participants.filter(person=>meal.attendees.includes(person.id)||Number(item.shares?.[person.id])>0).map(person=>`<label>${esc(person.name)}${meal.attendees.includes(person.id)?'':' · AUSENTE: retira su asignación'}<input type="number" min="0" max="1000000" step="0.01" data-item-person="${esc(person.id)}" value="${esc(item.shares?.[person.id]||0)}"></label>`).join('')||'<p>Selecciona los asistentes antes de asignar.</p>'}</div><button class="ghost" type="button" data-group-item-remove="${esc(item.id)}">Quitar concepto</button></fieldset>`).join('');
    preview();
  }
  function mountMeal() {
    const meal=editor.meal,group=editor.group;
    $('#group-meal-name').value=meal.name||'';$('#group-meal-date').value=meal.date||today();$('#group-meal-total').value=amount(meal.totalCents);
    $('#group-meal-payer').innerHTML=options(group.participants,meal.payerId,'Quién pagó al restaurante');
    $('#group-meal-account').innerHTML=options(accounts(editor.tripId),meal.accountId,'Cuenta real si pagaste tú');
    $('#group-meal-attendees').innerHTML=group.participants.filter(person=>person.active||meal.attendees.includes(person.id)).map(person=>`<label class="check-option"><input type="checkbox" data-group-attendee="${esc(person.id)}"${meal.attendees.includes(person.id)?' checked':''}> ${esc(person.name)}</label>`).join('');
    $('#group-meal-reviewed').checked=false;$('#group-meal-file').value='';$('#group-meal-text').value=meal.ocrText||'';
    $('#group-meal-ticket').innerHTML=/^data:image\/(jpeg|png|webp);base64,/i.test(meal.ticketData||'')?`<details><summary>Ver foto del ticket</summary><img class="group-ticket" src="${esc(meal.ticketData)}" alt="Ticket de ${esc(meal.name||'la comida')}"></details>`:'';
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
  async function extract() {
    if(reading||!editor)return;
    reading=true;$('#group-ocr').disabled=true;
    try {
      if(!editor.meal.ticketData)throw new Error('Añade una foto del ticket.');
      message('Leyendo el ticket en este dispositivo…',false,'#group-meal-message');
      const result=await host.recognize(editor.meal,progress=>message(progress,false,'#group-meal-message'));
      if(!editor)return;
      $('#group-meal-text').value=result.text||'';editor.meal.ocrText=result.text||'';
      if(!editor.meal.name&&result.fields?.merchant){editor.meal.name=result.fields.merchant;$('#group-meal-name').value=editor.meal.name;}
      // Total remains a proposal requiring the user's independent review.
      if(Number.isFinite(result.fields?.total)&&result.fields.total>0){editor.meal.totalCents=Math.round(result.fields.total*100);$('#group-meal-total').value=amount(editor.meal.totalCents);}
      parseText();
    }finally{reading=false;$('#group-ocr').disabled=false;}
  }
  function parseText(){
    if(!editor)return;
    const result=api().parseItems($('#group-meal-text').value);
    if(!result.items.length)throw new Error('No se han reconocido conceptos fiables. Introdúcelos manualmente; no se ha cambiado la lista.');
    if(editor.meal.items.length&&!confirm('Sustituir los conceptos por esta propuesta OCR? Tendrás que revisar y asignar de nuevo las líneas.'))return;
    editor.meal.ocrText=$('#group-meal-text').value;editor.meal.items=result.items.map(item=>({...item,id:uid()}));$('#group-meal-reviewed').checked=false;renderItems();stash();
    message(`Propuesta de ${result.items.length} conceptos. ${result.ignored.length} líneas no incorporadas. El total del ticket se revisa aparte.`,false,'#group-meal-message');
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
      if(item&&element.dataset.itemPerson){item.shares||={};item.shares[element.dataset.itemPerson]=Number(element.value);}
      if(element.id!=='group-meal-reviewed')$('#group-meal-reviewed').checked=false;
      preview();stash();
    };
    $('#group-meal-form').onchange=event=>{const element=event.target;if(element.dataset.groupAttendee){const id=element.dataset.groupAttendee;editor.meal.attendees=element.checked?[...new Set([...editor.meal.attendees,id])]:editor.meal.attendees.filter(value=>value!==id);$('#group-meal-reviewed').checked=false;renderItems();stash();}else if(element.dataset.itemField==='common')renderItems();};
    $('#group-meal-items').onclick=event=>{const id=event.target.closest('[data-group-item-remove]')?.dataset.groupItemRemove;if(!id)return;editor.meal.items=editor.meal.items.filter(item=>item.id!==id);$('#group-meal-reviewed').checked=false;renderItems();stash();};
    $('#group-meal-file').onchange=safe(async event=>{if(!editor)return;reading=true;try{const file=await host.readTicket(event.target);if(!file)return;editor.meal.ticketData=file.data;editor.meal.ticketName=file.name;editor.meal.ticketType=file.type;$('#group-meal-reviewed').checked=false;mountMeal();stash();}finally{reading=false;}},'#group-meal-message');
    $('#group-ocr').onclick=safe(extract,'#group-meal-message');$('#group-parse-text').onclick=safe(parseText,'#group-meal-message');
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
