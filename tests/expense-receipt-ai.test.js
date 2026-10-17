import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),source=fs.readFileSync(new URL('../expense-receipt-ai.js',import.meta.url),'utf8'),app=fs.readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8');
const sourceOf=name=>app.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`))[0];
const result={fields:{merchant:'Sakura',total:1850,currency:'JPY'},sourceLanguage:'en',originalText:'TOTAL JPY 1850',spanishText:'TOTAL JPY 1850',warnings:[]};

test('arranque de la app conecta Gemini, comparte el código de Grupo y sincroniza la foto y el progreso',async()=>{
 const dom=new JSDOM(html,{url:'https://test.local',runScripts:'outside-only'}),w=dom.window;
 try{
  const code='CODIGO-COMPARTIDO-DE-GRUPO';w.localStorage.setItem('cuaderno.receiptAccess.v1',code);
  w.$=selector=>w.document.querySelector(selector);w.pendingExpenseTicketTranslations={};
  const sources={};w.ticketOcrSource=prefix=>sources[prefix]||null;w.syncLensPasteAvailability=()=>{};
  w.eval(source);let finish,receivedCode,mounted=0;
  const mount=w.ExpenseReceiptAIUI.mount;
  w.ExpenseReceiptAIUI.mount=config=>{mounted++;mount({...config,status:async()=>({usageText:'Uso consultado'}),prepare:async()=>({data:'prepared'}),read:async(photo,access,report)=>{receivedCode=access;report({status:'Comprobando gratuidad y leyendo…'});return new Promise(resolve=>{finish=resolve;});}});};
  for(const name of ['rootExpenseAIBusy','syncTicketOcrAvailability','bindExpenseAIEvents'])w.eval(sourceOf(name));
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
 const dom=new JSDOM(html,{url:'https://test.local',runScripts:'outside-only'}),w=dom.window;w.eval(source);
 let sourceValue='data:image/jpeg;base64,original',reads=0,applied=0,last;
 const limits={daily:500,minute:15,inputTokensMinute:250000};
 const state={};w.ExpenseReceiptAIUI.mount({source:()=>({source:sourceValue}),context:()=>1,isOpen:()=>true,localBusy:()=>false,sync:()=>{},hasTranslation:()=>true,status:async()=>({limits,usage:{available:true,requests:7},usageText:'7 de 500 registrados'}),prepare:async()=>({data:'data:prepared'}),read:async(...args)=>{reads++;last=args;return options.read?options.read():result;},apply:async(...args)=>{applied++;state.args=args;return 'Aplicado';}});
 const $=id=>w.document.getElementById(id),click=id=>$(id).click(),change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('change'));};
 const wait=async predicate=>{for(let i=0;i<200&&!predicate();i++)await new Promise(r=>setTimeout(r,5));assert.ok(predicate());};
 return{w,$,click,change,wait,state,reads:()=>reads,applied:()=>applied,last:()=>last,setSource:value=>{sourceValue=value;w.ExpenseReceiptAIUI.sync('g');},close:()=>w.close()};
}
test('propuesta Gemini de gasto requiere consentimiento y revisión, recuerda el código y conserva Lens',async()=>{
 const ui=await setup();try{
  ui.$('g-ticket-ai-code').value='test-code';ui.click('g-ticket-ai-read');await ui.wait(()=>ui.$('g-ticket-ai-status').textContent.includes('Autoriza'));assert.equal(ui.reads(),0);
  ui.$('g-ticket-ai-consent').checked=true;ui.click('g-ticket-ai-read');await ui.wait(()=>!!ui.$('g-ticket-ai-apply'));
  assert.equal(ui.reads(),1);assert.equal(ui.applied(),0);assert.equal(ui.$('g-ticket-ai-save-translation').checked,false);assert.ok(ui.$('g-ticket-translate'));assert.ok(ui.$('g-ticket-read'));
  assert.equal(ui.w.localStorage.getItem('cuaderno.receiptAccess.v1'),'test-code');ui.click('g-ticket-ai-apply');await ui.wait(()=>ui.applied()===1);assert.equal(ui.state.args[2],false);
  assert.match(ui.$('g-ticket-ai-usage').parentElement.querySelector('summary').textContent,/7 \/ 500/);
  ui.setSource('data:other');assert.equal(ui.$('g-ticket-ai-consent').checked,false);assert.equal(ui.$('g-ticket-ai-proposal').innerHTML,'');
 }finally{ui.close();}
});
test('saturación y cambio de ticket no aplican campos ni disparan otro lector',async()=>{
 const ui=await setup({read:async()=>{throw new Error('Google saturado');}});try{
  ui.$('g-ticket-ai-code').value='test';ui.$('g-ticket-ai-consent').checked=true;ui.click('g-ticket-ai-read');await ui.wait(()=>ui.$('g-ticket-ai-status').textContent.includes('saturado'));assert.equal(ui.reads(),1);assert.equal(ui.applied(),0);assert.equal(ui.$('g-ticket-ai-read').disabled,false);
 }finally{ui.close();}
 let finish;const stale=await setup({read:()=>new Promise(resolve=>{finish=resolve;})});try{
  stale.$('g-ticket-ai-code').value='test';stale.$('g-ticket-ai-consent').checked=true;stale.click('g-ticket-ai-read');await stale.wait(()=>!!finish);stale.setSource('new-photo');finish(result);await stale.wait(()=>!stale.$('g-ticket-ai-read').disabled);assert.equal(stale.$('g-ticket-ai-proposal').innerHTML,'');
 }finally{stale.close();}
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
  $('#g-moneda').value='EUR';await assert.rejects(w.applyExpenseAIProposal('g',result,false),/JPY/);assert.equal($('#g-importe').value,'1850.00');
  $('#g-moneda').value='JPY';w.createLensAiSummaryCompanion=async()=>{throw new Error('Imagen fallida');};await assert.rejects(w.applyExpenseAIProposal('g',{...result,fields:{...result.fields,merchant:'Nuevo',total:500}},true),/Imagen fallida/);assert.equal($('#g-desc').value,'Sakura');assert.equal(w.pendingExpenseTicketTranslations.g.data,'old');
 }finally{w.close();}
});
