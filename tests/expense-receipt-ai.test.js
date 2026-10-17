import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {normalizeExpenseReceipt} from '../receipt-ai.js';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),source=fs.readFileSync(new URL('../expense-receipt-ai.js',import.meta.url),'utf8'),app=fs.readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8');
const sourceOf=name=>app.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`))[0];
const accessSource=fs.readFileSync(new URL('../receipt-access.js',import.meta.url),'utf8');
const result={fields:{merchant:'Sakura',total:1850,currency:'JPY'},sourceLanguage:'en',originalText:'TOTAL JPY 1850',spanishText:'TOTAL JPY 1850',warnings:[]};

test('arranque de la app conecta Gemini, comparte el código de Grupo y sincroniza la foto y el progreso',async()=>{
 const dom=new JSDOM(html,{url:'https://test.local',runScripts:'outside-only'}),w=dom.window;
 try{
  const code='CODIGO-COMPARTIDO-DE-GRUPO';w.localStorage.setItem('cuaderno.receiptAccess.v1',code);
  w.$=selector=>w.document.querySelector(selector);w.pendingExpenseTicketTranslations={};
  const sources={};w.ticketOcrSource=prefix=>sources[prefix]||null;w.syncLensPasteAvailability=()=>{};
  w.eval(accessSource);w.eval(source);let finish,receivedCode,mounted=0;
  const mount=w.ExpenseReceiptAIUI.mount;
  w.ExpenseReceiptAIUI.mount=config=>{mounted++;mount({...config,status:async()=>({usageText:'Uso consultado'}),prepare:async()=>({data:'prepared'}),read:async(photo,access,report)=>{receivedCode=access;report({status:'Comprobando gratuidad y leyendo…'});return new Promise(resolve=>{finish=resolve;});}});};
  for(const name of ['rootExpenseAIBusy','applyExpenseAIProposal','syncTicketOcrAvailability','bindExpenseAIEvents'])w.eval(sourceOf(name));
  w.bindGroupEvents=()=>{};w.bindPreparationEvents=()=>{};
  // Execute the real startup block, stopping before unrelated navigation wiring.
  const start=app.indexOf('function bindEvents() {'),end=app.indexOf("  $('#tab-viajes')",start);
  w.eval(app.slice(start,end)+'}');w.bindEvents();assert.equal(mounted,1);
  for(const prefix of ['g','edit-gasto']){
   assert.equal(w.$('#'+prefix+'-ticket-ai-code').value,code);assert.equal(w.$('#'+prefix+'-ticket-ai-access').hidden,true);
   assert.equal(w.$('#'+prefix+'-ticket-ai-read').disabled,true);
   w.$('#'+prefix+'-ticket-ai-change-code').click();w.$('#'+prefix+'-ticket-ai-eye').click();assert.equal(w.$('#'+prefix+'-ticket-ai-code').type,'text');
   w.$('#'+prefix+'-ticket-ai-eye').click();assert.equal(w.$('#'+prefix+'-ticket-ai-code').type,'password');
  }
  sources.g={source:'data:photo'};w.syncTicketOcrAvailability('g');assert.equal(w.$('#g-ticket-ai-read').disabled,false);
  w.$('#add-gasto-dialog').setAttribute('open','');w.$('#g-ticket-ai-consent').checked=true;w.$('#g-ticket-ai-read').click();
  for(let i=0;i<100&&!finish;i++)await new Promise(resolve=>setTimeout(resolve,5));assert.ok(finish);assert.equal(receivedCode,code);
  assert.equal(w.$('#g-ticket-ai-progress-wrap').hidden,false);assert.equal(w.$('#g-ticket-ai-progress').hasAttribute('value'),false);
  await new Promise(resolve=>setTimeout(resolve,1050));assert.match(w.$('#g-ticket-ai-counter').textContent,/1 s/);
  finish(result);for(let i=0;i<100&&!w.$('#g-ticket-ai-apply');i++)await new Promise(resolve=>setTimeout(resolve,5));assert.ok(w.$('#g-ticket-ai-apply'));
  assert.equal(w.$('#g-ticket-ai-progress').value,1);assert.equal(w.$('#g-ticket-ai-read').disabled,false);
  sources.g={source:'data:new'};w.syncTicketOcrAvailability('g');assert.equal(w.$('#g-ticket-ai-proposal').innerHTML,'');assert.equal(w.$('#g-ticket-ai-consent').checked,false);
 }finally{w.close();}
});
async function setup(options={}){
 const dom=new JSDOM(html,{url:'https://test.local',runScripts:'outside-only'}),w=dom.window;
 if(options.rememberedCode)w.localStorage.setItem('cuaderno.receiptAccess.v1',options.rememberedCode);
 w.eval(accessSource);w.eval(source);
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
 w.document.querySelector('#expense-ai-error-dialog button').onclick=event=>{event.preventDefault();w.document.getElementById('expense-ai-error-dialog').close();};
 let sourceValue='data:image/jpeg;base64,original',reads=0,applied=0,last;
 const limits={daily:500,minute:15,inputTokensMinute:250000};
 const state={};w.ExpenseReceiptAIUI.mount({source:()=>({source:sourceValue}),context:()=>1,isOpen:()=>true,localBusy:()=>false,sync:()=>{},hasTranslation:()=>true,status:async()=>({limits,usage:{available:true,requests:7},usageText:'7 de 500 registrados'}),prepare:async()=>({data:'data:prepared'}),read:async(...args)=>{reads++;last=args;return options.read?options.read():result;},apply:async(...args)=>{applied++;state.args=args;return options.apply?options.apply(...args):'Aplicado';}});
 const $=id=>w.document.getElementById(id),click=id=>$(id).click(),change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('change'));};
 const wait=async predicate=>{for(let i=0;i<200&&!predicate();i++)await new Promise(r=>setTimeout(r,5));assert.ok(predicate());};
 return{w,$,click,change,wait,state,reads:()=>reads,applied:()=>applied,last:()=>last,setSource:value=>{sourceValue=value;w.ExpenseReceiptAIUI.sync('g');},close:()=>w.close()};
}
test('propuesta Gemini de gasto requiere consentimiento y revisión, recuerda el código y conserva Lens',async()=>{
 const ui=await setup();try{
  ui.$('g-ticket-ai-code').value='test-code';ui.click('g-ticket-ai-read');await ui.wait(()=>ui.$('g-ticket-ai-status').textContent.includes('Autoriza'));assert.equal(ui.reads(),0);
  assert.equal(ui.$('expense-ai-error-dialog').open,true);assert.match(ui.$('expense-ai-error-message').textContent,/Autoriza/);ui.$('expense-ai-error-dialog').querySelector('button').click();assert.equal(ui.$('expense-ai-error-dialog').open,false);
  ui.$('g-ticket-ai-consent').checked=true;ui.click('g-ticket-ai-read');await ui.wait(()=>!!ui.$('g-ticket-ai-apply'));
  assert.equal(ui.reads(),1);assert.equal(ui.applied(),0);assert.equal(ui.$('g-ticket-ai-save-translation').checked,false);assert.ok(ui.$('g-ticket-translate'));assert.ok(ui.$('g-ticket-read'));
  assert.equal(ui.w.localStorage.getItem('cuaderno.receiptAccess.v1'),'test-code');ui.click('g-ticket-ai-apply');await ui.wait(()=>ui.applied()===1);assert.equal(ui.state.args[2],false);
  assert.match(ui.$('g-ticket-ai-usage').parentElement.querySelector('summary').textContent,/7 \/ 500/);
  ui.setSource('data:other');assert.equal(ui.$('g-ticket-ai-consent').checked,false);assert.equal(ui.$('g-ticket-ai-proposal').innerHTML,'');
 }finally{ui.close();}
});
test('emisor japonés en alta y edición: muestra nombre legible y original, y aplica el legible tras revisión',async()=>{
 const proposal=normalizeExpenseReceipt({merchant:'ダイコクドラッグ',merchantReadable:'Daikoku Drug',total:'8000',currency:'JPY',sourceLanguage:'ja',originalText:'ダイコクドラッグ',spanishText:'Daikoku Drug',uncertain:{merchant:false,merchantReadable:false,total:false,currency:false},warnings:[]});
 const ui=await setup({read:async()=>proposal});try{
  for(const prefix of ['g','edit-gasto']){
   ui.$(prefix+'-ticket-ai-code').value='test';ui.$(prefix+'-ticket-ai-consent').checked=true;ui.click(prefix+'-ticket-ai-read');await ui.wait(()=>!!ui.$(prefix+'-ticket-ai-apply'));
   const text=ui.$(prefix+'-ticket-ai-proposal').querySelector('p').textContent;
   assert.match(text,/Emisor: Daikoku Drug/);assert.match(text,/Nombre original: ダイコクドラッグ/);assert.match(text,/Total: 8000 JPY/);
   const form=ui.$(prefix==='g'?'add-gasto-form':'edit-gasto-form'),dialog=form.closest('dialog');dialog.setAttribute('open','');dialog.scrollTop=1800;form.scrollTop=700;
   const before=ui.applied();ui.click(prefix+'-ticket-ai-apply');await ui.wait(()=>!ui.$(prefix+'-ticket-ai-applied').hidden);assert.equal(ui.applied(),before+1);assert.equal(ui.state.args[1].fields.merchant,'Daikoku Drug');assert.equal(ui.state.args[1].merchantOriginal,'ダイコクドラッグ');
   assert.equal(dialog.scrollTop,0);assert.equal(form.scrollTop,0);assert.equal(ui.w.document.activeElement,form.querySelector('h2'));assert.match(ui.$(prefix+'-ticket-ai-applied').textContent,/Daikoku Drug · 8000 JPY/);
  }
 }finally{ui.close();}
});

test('saturación y cambio de ticket no aplican campos ni disparan otro lector',async()=>{
 const ui=await setup({read:async()=>{throw new Error('Google saturado');}});try{
  ui.$('g-ticket-ai-code').value='test';ui.$('g-ticket-ai-consent').checked=true;ui.click('g-ticket-ai-read');await ui.wait(()=>ui.$('g-ticket-ai-status').textContent.includes('saturado'));assert.equal(ui.reads(),1);assert.equal(ui.applied(),0);assert.equal(ui.$('g-ticket-ai-read').disabled,false);
  assert.equal(ui.$('expense-ai-error-dialog').open,true);assert.match(ui.$('expense-ai-error-message').textContent,/Google saturado/);ui.$('expense-ai-error-dialog').querySelector('button').click();assert.equal(ui.$('expense-ai-error-dialog').open,false);
 }finally{ui.close();}
 let finish;const stale=await setup({read:()=>new Promise(resolve=>{finish=resolve;})});try{
  stale.$('g-ticket-ai-code').value='test';stale.$('g-ticket-ai-consent').checked=true;stale.click('g-ticket-ai-read');await stale.wait(()=>!!finish);stale.setSource('new-photo');finish(result);await stale.wait(()=>!stale.$('g-ticket-ai-read').disabled);assert.equal(stale.$('g-ticket-ai-proposal').innerHTML,'');
 }finally{stale.close();}
});

test('el código se guarda al escribir, sobrevive a saturación y se restaura en alta y edición al recargar',async()=>{
 const ui=await setup({read:async()=>{throw new Error('Google saturado');}});let saved;try{
  ui.$('g-ticket-ai-code').value='persistent-code';ui.$('g-ticket-ai-code').dispatchEvent(new ui.w.Event('input'));
  assert.equal(ui.w.localStorage.getItem('cuaderno.receiptAccess.v1'),'persistent-code');assert.equal(ui.$('edit-gasto-ticket-ai-code').value,'persistent-code');assert.equal(ui.reads(),0);
  ui.$('g-ticket-ai-consent').checked=true;ui.click('g-ticket-ai-read');await ui.wait(()=>ui.$('expense-ai-error-dialog').open);
  saved=ui.w.localStorage.getItem('cuaderno.receiptAccess.v1');assert.equal(saved,'persistent-code');assert.match(ui.$('g-ticket-ai-code-status').textContent,/guardado/);
 }finally{ui.close();}
 const reopened=await setup({rememberedCode:saved});try{for(const prefix of ['g','edit-gasto']){assert.equal(reopened.$(prefix+'-ticket-ai-code').value,saved);assert.equal(reopened.$(prefix+'-ticket-ai-access').hidden,true);}}finally{reopened.close();}
});

test('una respuesta tardía no sustituye ni borra el código nuevo introducido mientras se leía',async()=>{
 for(const fails of [false,true]){
  let finish;const ui=await setup({rememberedCode:'old-code',read:()=>new Promise((resolve,reject)=>{finish=()=>fails?reject(new Error('Código de acceso incorrecto.')):resolve(result);})});try{
   ui.$('g-ticket-ai-consent').checked=true;ui.click('g-ticket-ai-read');await ui.wait(()=>!!finish);assert.equal(ui.last()[1],'old-code');
   ui.$('edit-gasto-ticket-ai-code').value='new-code';ui.$('edit-gasto-ticket-ai-code').dispatchEvent(new ui.w.Event('input'));finish();await ui.wait(()=>!ui.$('g-ticket-ai-read').disabled);
   assert.equal(ui.w.ReceiptAccess.get(),'new-code');assert.equal(ui.w.localStorage.getItem('cuaderno.receiptAccess.v1'),'new-code');assert.equal(ui.$('g-ticket-ai-code').value,'new-code');
  }finally{ui.close();}
 }
});

test('reiniciar el formulario de un gasto recupera el código guardado aunque Gemini siga desplegado',async()=>{
 const ui=await setup({rememberedCode:'saved-after-update'});try{
  for(const prefix of ['g','edit-gasto']){
   const panel=ui.$(prefix+'-ticket-ai-panel');panel.open=true;
   const form=ui.$(prefix==='g'?'add-gasto-form':'edit-gasto-form');
   form.reset();
   await Promise.resolve();
   ui.w.ExpenseReceiptAIUI.sync(prefix);
   assert.equal(ui.$(prefix+'-ticket-ai-code').value,'saved-after-update');
   assert.equal(ui.$(prefix+'-ticket-ai-access').hidden,true);
   ui.$(prefix+'-ticket-ai-consent').checked=true;ui.click(prefix+'-ticket-ai-read');
   await ui.wait(()=>!!ui.$(prefix+'-ticket-ai-apply'));assert.equal(ui.last()[1],'saved-after-update');
   assert.equal(ui.w.localStorage.getItem('cuaderno.receiptAccess.v1'),'saved-after-update');
  }
 }finally{ui.close();}
});

test('un campo de código vaciado por el formulario reutiliza el guardado al leer sin reemplazar uno nuevo escrito',async()=>{
 const ui=await setup({rememberedCode:'saved-code'});try{
  ui.$('g-ticket-ai-code').value='';ui.$('g-ticket-ai-consent').checked=true;ui.click('g-ticket-ai-read');
  await ui.wait(()=>!!ui.$('g-ticket-ai-apply'));assert.equal(ui.last()[1],'saved-code');
  ui.$('g-ticket-ai-code').value='replacement-code';ui.click('g-ticket-ai-read');
  await ui.wait(()=>ui.reads()===2&&!ui.$('g-ticket-ai-read').disabled);assert.equal(ui.last()[1],'replacement-code');
 }finally{ui.close();}
});

test('Olvidar código sigue siendo definitivo tras reiniciar formularios y no lee sin un código nuevo',async()=>{
 const ui=await setup({rememberedCode:'forget-me'});try{
  ui.w.ReceiptAccess.forget();
  for(const prefix of ['g','edit-gasto']){
   ui.$(prefix==='g'?'add-gasto-form':'edit-gasto-form').reset();await Promise.resolve();ui.w.ExpenseReceiptAIUI.sync(prefix);
   assert.equal(ui.$(prefix+'-ticket-ai-code').value,'');assert.equal(ui.$(prefix+'-ticket-ai-access').hidden,false);
  }
  ui.$('g-ticket-ai-consent').checked=true;ui.click('g-ticket-ai-read');await ui.wait(()=>ui.$('expense-ai-error-dialog').open);
  assert.match(ui.$('expense-ai-error-message').textContent,/Introduce el código/);assert.equal(ui.reads(),0);assert.equal(ui.w.ReceiptAccess.get(),'');
 }finally{ui.close();}
});

test('error al aplicar: el aviso emergente conserva la propuesta y permite corregir sin otra lectura',async()=>{
 let missingAccount=true;const ui=await setup({apply:async()=>{if(missingAccount)throw Object.assign(new Error('Selecciona la cuenta del gasto.'),{focusTarget:'g-cuenta'});return 'Aplicado';}});try{
  ui.$('add-gasto-dialog').setAttribute('open','');let scrolled=false;ui.$('g-cuenta').scrollIntoView=()=>{scrolled=true;};
  ui.$('g-ticket-ai-code').value='test';ui.$('g-ticket-ai-consent').checked=true;ui.click('g-ticket-ai-read');await ui.wait(()=>!!ui.$('g-ticket-ai-apply'));
  ui.click('g-ticket-ai-apply');await ui.wait(()=>ui.$('expense-ai-error-dialog').open);assert.match(ui.$('expense-ai-error-message').textContent,/Selecciona la cuenta/);assert.ok(ui.$('g-ticket-ai-apply'));assert.equal(ui.$('g-ticket-ai-applied').hidden,true);
  ui.$('expense-ai-error-dialog').querySelector('button').click();assert.equal(ui.w.document.activeElement,ui.$('g-cuenta'));assert.equal(scrolled,true);missingAccount=false;ui.click('g-ticket-ai-apply');await ui.wait(()=>!ui.$('g-ticket-ai-applied').hidden);assert.equal(ui.reads(),1);assert.equal(ui.$('expense-ai-error-dialog').open,false);
 }finally{ui.close();}
});
test('aplicar emisor y total solo cambia esos campos; moneda incompatible o error de traducción conserva datos',async()=>{
 const dom=new JSDOM(html,{url:'https://test.local',runScripts:'outside-only'}),w=dom.window;
 try{
  const $=selector=>w.document.querySelector(selector);w.$=$;w.state={cuentas:[{id:1,moneda:'JPY'}]};
  $('#g-moneda').innerHTML='<option>JPY</option><option>EUR</option>';$('#g-cuenta').innerHTML='<option value="1">Cuenta yen</option>';
  for(const [id,value]of [['g-fecha','2026-10-17'],['g-hora','12:00'],['g-desc','Anterior'],['g-importe','99']])$('#'+id).value=value;
  w.pendingTicketOcr={g:{merchant:'Anterior'}};w.pendingExpenseTicketTranslations={g:{data:'old',kind:'translation'}};w.renderExpenseTicketTranslation=()=>{};w.scheduleFormDraftSave=()=>{};w.addExpenseDraftKey=()=>'';w.ADD_EXPENSE_DRAFT_FIELDS=[];
  w.eval(sourceOf('applyExpenseAIProposal'));
  await w.applyExpenseAIProposal('g',result,false);assert.equal($('#g-desc').value,'Sakura');assert.equal($('#g-importe').value,'1850.00');assert.equal($('#g-fecha').value,'2026-10-17');assert.equal($('#g-hora').value,'12:00');assert.equal(w.pendingExpenseTicketTranslations.g.data,'old');
  $('#g-cuenta').value='';await assert.rejects(w.applyExpenseAIProposal('g',result,false),/Selecciona la cuenta/);assert.equal($('#g-desc').value,'Sakura');assert.equal($('#g-importe').value,'1850.00');$('#g-cuenta').value='1';
  $('#g-moneda').value='EUR';await assert.rejects(w.applyExpenseAIProposal('g',result,false),/JPY/);assert.equal($('#g-importe').value,'1850.00');
  $('#g-moneda').value='JPY';w.createLensAiSummaryCompanion=async()=>{throw new Error('Imagen fallida');};await assert.rejects(w.applyExpenseAIProposal('g',{...result,fields:{...result.fields,merchant:'Nuevo',total:500}},true),/Imagen fallida/);assert.equal($('#g-desc').value,'Sakura');assert.equal(w.pendingExpenseTicketTranslations.g.data,'old');
  w.createLensAiSummaryCompanion=async()=>{$('#g-cuenta').value='';return {data:'new'};};await assert.rejects(w.applyExpenseAIProposal('g',{...result,fields:{...result.fields,merchant:'Nuevo',total:500}},true),/cuenta o la moneda/);assert.equal($('#g-desc').value,'Sakura');assert.equal($('#g-importe').value,'1850.00');assert.equal(w.pendingExpenseTicketTranslations.g.data,'old');
 }finally{w.close();}
});

test('imagen de Gemini conserva su identidad al crearse, guardarse y reabrirse; reconoce el marcado antiguo sin cambiar Lens',async()=>{
 const dom=new JSDOM(html,{url:'https://test.local',runScripts:'outside-only'}),w=dom.window;
 try{
  w.$=selector=>w.document.querySelector(selector);w.TICKET_OCR_BASE_LANGUAGES=['spa','eng'];
  const drawn=[];w.HTMLCanvasElement.prototype.getContext=()=>({measureText:text=>({width:text.length*16}),fillRect:()=>{},fillText:text=>drawn.push(text)});
  w.canvasToJpeg=async()=>new w.Blob(['image'],{type:'image/jpeg'});w.readBlobAsDataUrl=async()=> 'data:image/jpeg;base64,dGVzdA==';
  w.normalizeStoredImageRecord=record=>record;w.normalizeTicketDataValue=value=>value;
  for(const name of ['wrapLensAiSummaryLines','createLensAiSummaryCompanion','normalizeTicketCompanionKind','ticketCompanionLabel','ticketTranslationPatch','expenseTicketTranslationRecord','ticketTranslationRecordFromExpense','fillTicketTranslationPreview'])w.eval(sourceOf(name));
  const gemini=await w.createLensAiSummaryCompanion('Daikoku Drug\nTotal 8000 JPY',{gemini:true});assert.equal(gemini.kind,'gemini-translation');assert.equal(gemini.name,'traduccion-gemini.jpg');assert.ok(drawn.includes('Traducción al español · Gemini'));
  const saved=w.ticketTranslationPatch(gemini),record=w.ticketTranslationRecordFromExpense({...saved,id:1});assert.equal(record.kind,'gemini-translation');
  const preview=w.$('#g-ticket-translation-preview');w.fillTicketTranslationPreview(preview,record);assert.equal(preview.querySelector('button').dataset.companionLabel,'Traducción Gemini');
  const legacy=w.ticketTranslationRecordFromExpense({...saved,id:2,ticketTranslationKind:'ai-summary'});assert.equal(legacy.kind,'gemini-translation');assert.equal(w.ticketTranslationPatch(legacy).ticketTranslationKind,'gemini-translation');
  const lens=await w.createLensAiSummaryCompanion('Texto de Lens');assert.equal(lens.kind,'ai-summary');assert.equal(w.ticketTranslationRecordFromExpense(w.ticketTranslationPatch(lens)).kind,'ai-summary');w.fillTicketTranslationPreview(preview,lens);assert.equal(preview.querySelector('button').dataset.companionLabel,'Resumen Lens IA');
  assert.equal(w.normalizeTicketCompanionKind('ai-summary',true,'foto-gemini-usuario.jpg'),'ai-summary');
 }finally{w.close();}
});

test('fecha y hora del ticket aparecen en la propuesta y en la confirmación de alta y edición',async()=>{
 const dated={...result,fields:{...result.fields,date:'2024-09-05',time:'23:44'}};
 const ui=await setup({read:async()=>dated});try{
  for(const prefix of ['g','edit-gasto']){
   ui.$(prefix+'-ticket-ai-code').value='test';ui.$(prefix+'-ticket-ai-consent').checked=true;ui.click(prefix+'-ticket-ai-read');await ui.wait(()=>!!ui.$(prefix+'-ticket-ai-apply'));
   assert.match(ui.$(prefix+'-ticket-ai-proposal').textContent,/Fecha del ticket: 05\/09\/2024/);assert.match(ui.$(prefix+'-ticket-ai-proposal').textContent,/Hora del ticket: 23:44/);
   ui.click(prefix+'-ticket-ai-apply');await ui.wait(()=>!ui.$(prefix+'-ticket-ai-applied').hidden);assert.match(ui.$(prefix+'-ticket-ai-applied').textContent,/05\/09\/2024 · 23:44/);
  }
 }finally{ui.close();}
});

test('aplicar usa la fecha y hora impresas por separado y conserva campos ante error de cuenta o traducción',async()=>{
 const dom=new JSDOM(html,{url:'https://test.local',runScripts:'outside-only'}),w=dom.window;
 try{
  w.$=selector=>w.document.querySelector(selector);w.state={cuentas:[{id:1,moneda:'JPY'}]};w.pendingTicketOcr={};w.pendingExpenseTicketTranslations={};w.scheduleFormDraftSave=()=>{};w.addExpenseDraftKey=()=>'';w.ADD_EXPENSE_DRAFT_FIELDS=[];
  w.eval(sourceOf('applyExpenseAIProposal'));
  for(const prefix of ['g','edit-gasto']){
   const $=id=>w.document.getElementById(prefix+'-'+id);$('cuenta').innerHTML='<option value="">Sin cuenta</option><option value="1">JPY</option>';$('cuenta').value='1';if(prefix==='g')$('moneda').innerHTML='<option>JPY</option>';else $('moneda').value='JPY';
   $('fecha').value='2026-10-17';$('hora').value='18:00';
   await w.applyExpenseAIProposal(prefix,{...result,fields:{...result.fields,date:'2024-09-05'}},false);assert.equal($('fecha').value,'2024-09-05');assert.equal($('hora').value,'18:00');
   await w.applyExpenseAIProposal(prefix,{...result,fields:{...result.fields,time:'23:44'}},false);assert.equal($('fecha').value,'2024-09-05');assert.equal($('hora').value,'23:44');
   await w.applyExpenseAIProposal(prefix,result,false);assert.equal($('fecha').value,'2024-09-05');assert.equal($('hora').value,'23:44');
   const dated={...result,fields:{...result.fields,date:'2025-01-01',time:'01:00'}};$('cuenta').value='';await assert.rejects(w.applyExpenseAIProposal(prefix,dated,false),/cuenta/);assert.equal($('fecha').value,'2024-09-05');assert.equal($('hora').value,'23:44');
   $('cuenta').value='1';w.createLensAiSummaryCompanion=async()=>{throw new Error('No se pudo preparar');};await assert.rejects(w.applyExpenseAIProposal(prefix,dated,true),/No se pudo preparar/);assert.equal($('fecha').value,'2024-09-05');assert.equal($('hora').value,'23:44');
  }
 }finally{w.close();}
});

test('la categoría es una sugerencia escapada y solo se aplica al marcarla; una lectura dudosa no ofrece aplicar categoría',async()=>{
 const classified={...result,classification:{categoryId:'1',categoryName:'Comida <local>',subcategoryId:'2',subcategoryName:'Restaurantes',reason:'Menú <img src=x onerror=alert(1)>'}};
 const ui=await setup({read:async()=>classified});try{
  ui.$('g-ticket-ai-code').value='test';ui.$('g-ticket-ai-consent').checked=true;ui.click('g-ticket-ai-read');await ui.wait(()=>!!ui.$('g-ticket-ai-apply'));
  assert.equal(ui.$('g-ticket-ai-category').checked,false);assert.match(ui.$('g-ticket-ai-proposal').textContent,/Comida <local> → Restaurantes/);assert.equal(ui.$('g-ticket-ai-proposal').querySelector('img'),null);
  ui.click('g-ticket-ai-apply');await ui.wait(()=>ui.applied()===1&&!ui.$('g-ticket-ai-apply').disabled);assert.equal(ui.state.args[4],false);
  ui.$('g-ticket-ai-category').checked=true;ui.click('g-ticket-ai-apply');await ui.wait(()=>ui.applied()===2&&!ui.$('g-ticket-ai-apply').disabled);assert.equal(ui.state.args[4],true);assert.match(ui.$('g-ticket-ai-applied').textContent,/Comida <local> → Restaurantes/);
 }finally{ui.close();}
 const mixed=await setup({read:async()=>({...result,classification:null,classificationReason:'Ticket mixto de comida y ropa.'})});try{
  mixed.$('g-ticket-ai-code').value='test';mixed.$('g-ticket-ai-consent').checked=true;mixed.click('g-ticket-ai-read');await mixed.wait(()=>!!mixed.$('g-ticket-ai-apply'));assert.equal(mixed.$('g-ticket-ai-category'),null);assert.match(mixed.$('g-ticket-ai-proposal').textContent,/Ticket mixto/);
 }finally{mixed.close();}
});

test('aplicar una categoría confirmada respeta padre/hija, no guarda el gasto y rechaza cambios del catálogo sin mutar campos',async()=>{
 const dom=new JSDOM(html,{url:'https://test.local',runScripts:'outside-only'}),w=dom.window;
 try{
  w.$=selector=>w.document.querySelector(selector);w.state={cuentas:[{id:1,moneda:'JPY'}],categorias:[{id:10,nombre:'Comida',parentId:null},{id:11,nombre:'Restaurantes',parentId:10},{id:20,nombre:'Transporte',parentId:null},{id:21,nombre:'Tren',parentId:20}]};
  w.state.photoTypes=[{id:'comida',nombre:'Comida'},{id:'paisaje',nombre:'Paisaje'}];
  w.pendingTicketOcr={};w.pendingExpenseTicketTranslations={};w.scheduleFormDraftSave=()=>{};w.addExpenseDraftKey=()=>'';w.ADD_EXPENSE_DRAFT_FIELDS=[];
  for(const name of ['normalizePlaceName','expenseAIPhotoType','fillSelect','renderSubcategories','renderEditSubcategories','expenseAICategoryOptions','validateExpenseAICategory','applyExpenseAIProposal'])w.eval(sourceOf(name));
  assert.equal(w.expenseAICategoryOptions().length,4);assert.deepEqual(Object.keys(w.expenseAICategoryOptions()[0]).sort(),['id','name','parentId']);
  const proposal={...result,classification:{categoryId:'10',categoryName:'Comida',subcategoryId:'11',subcategoryName:'Restaurantes',reason:'Menú'}};
  for(const prefix of ['g','edit-gasto']){
   const $=id=>w.document.getElementById(prefix+'-'+id);
   $('ticket-type').innerHTML='<option value="">Sin clasificar</option><option value="comida">Comida</option><option value="paisaje">Paisaje</option>';$('ticket-type').value='paisaje';
   let changes=0;$('ticket-type').onchange=()=>changes++;
   $('cuenta').innerHTML='<option value="1">JPY</option>';
   if(prefix==='g')$('moneda').innerHTML='<option>JPY</option>';else $('moneda').value='JPY';
   $('cat').innerHTML='<option value="10">Comida</option><option value="20">Transporte</option>';$('cat').value='20';(prefix==='g'?w.renderSubcategories:w.renderEditSubcategories)();$('subcat').value='21';$('fecha').value='2026-10-17';$('hora').value='12:00';
   await w.applyExpenseAIProposal(prefix,proposal,false,()=>true,false);assert.equal($('cat').value,'20');assert.equal($('subcat').value,'21');assert.equal($('ticket-type').value,'paisaje');
   const applied=await w.applyExpenseAIProposal(prefix,proposal,false,()=>true,true);assert.equal($('cat').value,'10');assert.equal($('subcat').value,'11');assert.equal($('fecha').value,'2026-10-17');assert.equal($('hora').value,'12:00');assert.equal($('ticket-type').value,'comida');assert.match(applied,/Clasificación del ticket: Comida/);assert.equal(changes,0);
   w.state.photoTypes=[];$('ticket-type').value='paisaje';await w.applyExpenseAIProposal(prefix,proposal,false,()=>true,true);assert.equal($('ticket-type').value,'paisaje');w.state.photoTypes=[{id:'comida',nombre:'Comida'},{id:'paisaje',nombre:'Paisaje'}];
   $('desc').value='Conservar';$('importe').value='99';w.state.categorias[1].parentId=20;await assert.rejects(w.applyExpenseAIProposal(prefix,proposal,false,()=>true,true),/categorías han cambiado/);assert.equal($('desc').value,'Conservar');assert.equal($('importe').value,'99');assert.equal($('ticket-type').value,'paisaje');w.state.categorias[1].parentId=10;
  }
  w.createLensAiSummaryCompanion=async()=>{w.state.categorias[1].nombre='Renombrada';return {data:'new'};};await assert.rejects(w.applyExpenseAIProposal('g',proposal,true,()=>true,true),/categorías han cambiado/);assert.equal(w.$('#g-desc').value,'Conservar');assert.equal(w.pendingExpenseTicketTranslations.g,undefined);
 }finally{w.close();}
});

test('la clasificación de imagen usa el nombre configurado más específico, normaliza acentos y evita coincidencias ambiguas',()=>{
 const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window;
 try{
  w.state={photoTypes:[{id:'meal-photo',nombre:'COMÍDA'},{id:'restaurant-photo',nombre:'  Restaurantes  '}]};
  for(const name of ['normalizePlaceName','expenseAIPhotoType'])w.eval(sourceOf(name));
  const choice={categoryName:'Comida',subcategoryName:'Restaurantes'};
  assert.equal(w.expenseAIPhotoType(choice).id,'restaurant-photo');
  w.state.photoTypes.pop();assert.equal(w.expenseAIPhotoType(choice).id,'meal-photo');
  assert.equal(w.expenseAIPhotoType({...choice,subcategoryName:null}).id,'meal-photo');
  w.state.photoTypes.push({id:'duplicate',nombre:'comida'});assert.equal(w.expenseAIPhotoType(choice),null);
  w.state.photoTypes=[{id:'unrelated',nombre:'Transporte'}];assert.equal(w.expenseAIPhotoType(choice),null);
  w.state.photoTypes=[{id:'custom',nombre:' Material   deportivo '}];assert.equal(w.expenseAIPhotoType({categoryName:'Material deportivo'}).id,'custom');
 }finally{w.close();}
});
