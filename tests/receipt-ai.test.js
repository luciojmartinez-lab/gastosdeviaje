import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { normalizeReceiptProposal, readReceiptWithAI, getReceiptAIStatus } from '../receipt-ai.js';
import '../group-meals.js';
import { createReceiptHandler } from '../netlify/functions/receipt-ai.js';
import { normalizeExpenseReceipt, normalizeReceiptCategories, receiptUsageText } from '../receipt-ai.js';

const receipt = {
  merchant:'A la Fresca',currency:'EUR',totalCents:7590,warnings:[],
  items:[['Mejillones',1,1050],['Sepia aperitivo',1,1270],['Fideuá',2,3390],['Jarra',1,340],['Coca-Cola Zero',2,540],['Tarrina chocolate y limón',1,500],['Tarrina avellana y limón',1,500]].map(([name,quantity,amountCents])=>({name,quantity,amountCents,uncertain:false}))
};
const copy = value => JSON.parse(JSON.stringify(value));
const privateKey = generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey;
const settings = {
  RECEIPT_AI_ENABLED:'free-only',RECEIPT_GEMINI_API_KEY:'test-api-key',RECEIPT_GOOGLE_PROJECT_NUMBER:'123456789012',
  RECEIPT_ACCESS_SHA256:createHash('sha256').update('test-access-code').digest('hex')
};
const image='data:image/jpeg;base64,'+Buffer.alloc(48,10).toString('base64');
function harness(options={}){
  const calls=[];let billingCalls=0;
  const handler=createReceiptHandler({
    usage:options.usage,
    env:key=>({...settings,...options.settings})[key],
    checker:async()=>options.noChecker?null:{type:'service_account',client_email:'checker@test.iam.gserviceaccount.com',private_key:privateKey},
    now:()=>1_700_000_000_000,
    fetcher:async(url,init)=>{
      calls.push({url,init});
      if(options.networkError)throw new Error('secret-provider-error test-api-key');
      if(options.provider403)return Response.json({error:'secret-provider-error test-api-key'},{status:403});
      if(url.includes('/token'))return Response.json({access_token:'test-google-token'});
      if(url.includes('lookupKey'))return Response.json({parent:`projects/${options.wrongProject?'987654321000':'123456789012'}/locations/global`,name:'projects/123456789012/locations/global/keys/test-key'});
      if(url.includes('billingInfo')){billingCalls++;return Response.json(typeof options.billing==='function'?options.billing(billingCalls):options.billing||{billingEnabled:false});}
      if(url.includes(':generateContent')){
        if(options.quota)return Response.json({error:'quota'},{status:429});
        if(options.modelStatus)return Response.json({error:'private-provider-error'},{status:options.modelStatus});
        return Response.json({candidates:[{finishReason:options.truncated?'MAX_TOKENS':'STOP',content:{parts:[{text:options.badJSON?'not-json':JSON.stringify(options.receipt||receipt)}]}}]});
      }
      throw new Error('Destino no esperado');
    }
  });
  const request=(body={image},headers={})=>new Request('https://test.netlify.app/.netlify/functions/receipt-ai',{method:'POST',headers:{'content-type':'application/json','x-receipt-access':'test-access-code',...headers},body:JSON.stringify(body)});
  return {handler,request,calls,inferences:()=>calls.filter(call=>call.url.includes(':generateContent'))};
}

test('IA: conserva cantidades e importes de línea, total y revisión obligatoria',()=>{
  const proposal=normalizeReceiptProposal(receipt);
  assert.equal(proposal.itemsStatus,'reconciled');assert.equal(proposal.fields.total,75.9);
  assert.match(proposal.itemText,/2 Fideuá 33,90/);assert.match(proposal.itemText,/1 Mejillones 10,50/);
});

const foreignReceipt={merchant:'Sakura Restaurant',currency:'JPY',total:'1850',sourceLanguage:'en',originalText:'TOTAL JPY 1850',spanishText:'TOTAL JPY 1850',uncertain:{merchant:false,total:false,currency:false},warnings:[]};
const japaneseReceipt={...foreignReceipt,merchant:'ダイコクドラッグ',merchantReadable:'Daikoku Drug',sourceLanguage:'ja',total:'8000',originalText:'ダイコクドラッグ 合計 ¥8,000',spanishText:'Daikoku Drug Total 8000 JPY',uncertain:{...foreignReceipt.uncertain,merchantReadable:false}};
const categories=[{id:'1',name:'Comida',parentId:null},{id:'2',name:'Restaurantes',parentId:'1'},{id:'3',name:'Transporte',parentId:null},{id:'4',name:'Tren',parentId:'3'}];
const classification={categoryId:'1',subcategoryId:'2',uncertain:false,mixed:false,reason:'Se lee un menú y bebidas.'};
test('categorías Gemini: solo admite opciones existentes, con su padre correcto, y deja las dudas y tickets mixtos para revisión',()=>{
 const read=change=>normalizeExpenseReceipt({...foreignReceipt,classification:{...classification,...change}},{categories});
 assert.deepEqual(read({}).classification,{categoryId:'1',categoryName:'Comida',subcategoryId:'2',subcategoryName:'Restaurantes',reason:classification.reason});
 assert.equal(read({subcategoryId:null}).classification.subcategoryId,null);
 for(const change of [{categoryId:'unknown'},{categoryId:'2'},{subcategoryId:'4'},{uncertain:true},{mixed:true},{categoryId:1}]){const result=read(change);assert.equal(result.classification,null);assert.equal(result.fields.total,1850);}
 assert.equal(normalizeExpenseReceipt({...foreignReceipt,classification}).classification,null);
 assert.equal(read({reason:'<img src=x onerror=alert(1)>'}).classification.reason,'<img src=x onerror=alert(1)>');
 assert.deepEqual(normalizeReceiptCategories([{...categories[0],account:'private'}]),[categories[0]]);
});

test('clasificación viaja en la misma petición con la foto y solo nombres/IDs de categorías; Google sigue verificándose una sola vez',async()=>{
 const h=harness({receipt:{...foreignReceipt,classification}});let sent;
 const result=await readReceiptWithAI({ticketData:image,accountId:42,trip:'private'},{accessCode:'test-access-code',consent:true,mode:'expense',categories:categories.map(item=>({...item,account:'private'}))},()=>{},(url,init)=>{sent=JSON.parse(init.body);return h.handler(new Request('https://test.netlify.app'+url,init));});
 assert.deepEqual(sent,{image,mode:'expense',categories});assert.equal(result.classification.subcategoryName,'Restaurantes');assert.equal(h.inferences().length,1);
 const payload=JSON.parse(h.inferences()[0].init.body);assert.ok(payload.contents[0].parts.some(part=>part.text?.includes(JSON.stringify(categories))));assert.match(payload.systemInstruction.parts[0].text,/mixta/);assert.equal(h.calls.filter(call=>call.url.includes('billingInfo')).length,1);
 const invalid=harness({receipt:{...foreignReceipt,classification:{...classification,subcategoryId:'4'}}});const rejected=await (await invalid.handler(invalid.request({image,mode:'expense',categories}))).json();assert.equal(rejected.expense.classification.categoryId,null);assert.equal(rejected.expense.classification.subcategoryId,null);assert.equal(rejected.expense.classification.uncertain,true);
});

test('catálogo inválido se rechaza antes de llamar a Google y no afecta al modo Grupo',async()=>{
 const invalid=[[categories[0],categories[0]],[{...categories[1],parentId:'missing'}],[{...categories[0],name:''}],Array.from({length:501},(_,i)=>({id:String(i),name:'Cat',parentId:null}))];
 for(const options of invalid){const h=harness();const response=await h.handler(h.request({image,mode:'expense',categories:options}));assert.equal(response.status,400);assert.equal(h.calls.length,0);}
 const h=harness();assert.equal((await h.handler(h.request({image,categories:'ignored'}))).status,200);assert.equal(h.inferences().length,1);
});
test('emisor extranjero: aplica el nombre legible y conserva la marca original, sin inventar ante dudas',async()=>{
 const proposal=normalizeExpenseReceipt(japaneseReceipt);
 assert.equal(proposal.fields.merchant,'Daikoku Drug');assert.equal(proposal.merchantOriginal,'ダイコクドラッグ');assert.equal(proposal.fields.total,8000);assert.equal(proposal.fields.currency,'JPY');
 for(const variant of [{merchantReadable:null},{merchantReadable:''},{uncertain:{...japaneseReceipt.uncertain,merchantReadable:true}},{uncertain:{...foreignReceipt.uncertain}}]){
  assert.equal(normalizeExpenseReceipt({...japaneseReceipt,...variant}).fields.merchant,'ダイコクドラッグ');
 }
 const unclear=normalizeExpenseReceipt({...japaneseReceipt,uncertain:{...japaneseReceipt.uncertain,merchant:true}});assert.equal(unclear.fields.merchant,'');assert.equal(unclear.merchantOriginal,'');
 const legacy=normalizeExpenseReceipt(foreignReceipt);assert.equal(legacy.fields.merchant,'Sakura Restaurant');assert.equal(legacy.merchantOriginal,'Sakura Restaurant');
 const h=harness({receipt:japaneseReceipt});
 const result=await readReceiptWithAI({ticketData:image},{consent:true,accessCode:'test-access-code',mode:'expense'},()=>{},(url,init)=>h.handler(new Request('https://test.netlify.app'+url,init)));
 assert.equal(result.fields.merchant,'Daikoku Drug');assert.equal(result.merchantOriginal,'ダイコクドラッグ');assert.equal(h.inferences().length,1);
 const prompt=JSON.parse(h.inferences()[0].init.body).systemInstruction.parts[0].text;assert.match(prompt,/transliteración fiel/);assert.match(prompt,/merchantReadable/);assert.match(prompt,/No sustituyas una marca/);
});
test('gastos Gemini: emisor y total con moneda original; fechas antiguas sin confianza explícita no se aplican',()=>{
 const result=normalizeExpenseReceipt({...foreignReceipt,date:'2026-01-01',category:'Comidas',items:[{name:'No contabilizar'}]});
 assert.deepEqual(result.fields,{merchant:'Sakura Restaurant',total:1850,currency:'JPY'});assert.equal(result.spanishText,'TOTAL JPY 1850');assert.equal(result.fields.date,undefined);
 const es=normalizeExpenseReceipt({...foreignReceipt,sourceLanguage:'es',currency:'EUR',total:'75.90',spanishText:'No usar',originalText:'No usar'});assert.equal(es.spanishText,'');assert.equal(es.originalText,'');assert.equal(es.fields.total,75.9);
 for(const total of ['1,850','18.500','-5','Infinity','1.234','0'])assert.equal(normalizeExpenseReceipt({...foreignReceipt,total}).fields.total,null);
 assert.equal(normalizeExpenseReceipt({...foreignReceipt,uncertain:{...foreignReceipt.uncertain,total:true}}).fields.total,null);
 assert.equal(normalizeExpenseReceipt({...foreignReceipt,currency:'$'}).fields.total,null);
});

test('fecha y hora impresas requieren confianza independiente y calendario real, sin usar la fecha del dispositivo',async()=>{
 const dated={...foreignReceipt,date:'2024-02-29',time:'23:44',uncertain:{...foreignReceipt.uncertain,date:false,time:false}};
 assert.equal(normalizeExpenseReceipt(dated).fields.date,'2024-02-29');assert.equal(normalizeExpenseReceipt(dated).fields.time,'23:44');
 for(const date of ['2023-02-29','2026-04-31','2026-13-01','2026-00-12','26-10-17','17/10/2026','2026-10-17T12:00:00Z','today',null])assert.equal(normalizeExpenseReceipt({...dated,date}).fields.date,undefined);
 for(const time of ['24:00','12:60','9:30','12:30:45','09:30 PM',null])assert.equal(normalizeExpenseReceipt({...dated,time}).fields.time,undefined);
 assert.equal(normalizeExpenseReceipt({...dated,uncertain:{...dated.uncertain,date:true}}).fields.date,undefined);
 assert.equal(normalizeExpenseReceipt({...dated,uncertain:{...dated.uncertain,time:true}}).fields.time,undefined);
 assert.equal(normalizeExpenseReceipt({...dated,date:null}).fields.time,'23:44');
 const h=harness({receipt:dated});const result=await readReceiptWithAI({ticketData:image},{consent:true,accessCode:'test-access-code',mode:'expense'},()=>{},(url,init)=>h.handler(new Request('https://test.netlify.app'+url,init)));
 assert.equal(result.fields.date,'2024-02-29');assert.equal(result.fields.time,'23:44');assert.equal(h.inferences().length,1);
 const prompt=JSON.parse(h.inferences()[0].init.body).systemInstruction.parts[0].text;assert.match(prompt,/No uses la fecha actual/);assert.match(prompt,/YYYY-MM-DD/);assert.match(prompt,/HH:mm/);
 const invalid=harness({receipt:{...dated,date:'2026-02-31',time:'99:00'}});const rejected=await (await invalid.handler(invalid.request({image,mode:'expense'}))).json();assert.equal(rejected.expense.date,null);assert.equal(rejected.expense.time,null);assert.equal(rejected.expense.uncertain.date,true);
});
test('gastos Gemini: la petición no transmite cuentas y verifica el modo antes de llamar a Google',async()=>{
 let sent;const result=await readReceiptWithAI({ticketData:image,accountId:42},{consent:true,accessCode:'code',mode:'expense'},()=>{},async(url,init)=>{sent=JSON.parse(init.body);return Response.json({expense:foreignReceipt});});
 assert.deepEqual(sent,{image,mode:'expense'});assert.equal(result.fields.currency,'JPY');
 const h=harness({receipt:foreignReceipt});assert.equal((await h.handler(h.request({image,mode:'expense'}))).status,200);
 const prompt=JSON.parse(h.inferences()[0].init.body).systemInstruction.parts[0].text;assert.match(prompt,/emisor \(merchant\)/);assert.match(prompt,/No conviertas monedas/);
 const invalid=harness();assert.equal((await invalid.handler(invalid.request({image,mode:'paid'}))).status,400);assert.equal(invalid.calls.length,0);
});
test('gastos Gemini: facturación, saturación y cuota mantienen bloqueos y no reintentan',async()=>{
 for(const options of [{billing:{billingEnabled:true}},{quota:true},{modelStatus:503}]){
  const h=harness({...options,receipt:foreignReceipt});const response=await h.handler(h.request({image,mode:'expense'}));assert.notEqual(response.status,200);assert.ok(h.inferences().length<=1);
 }
});
test('uso compartido: requiere código, registra solo intentos enviados y cuenta también saturación',async()=>{
 let attempts=0;const usage={attempt:async()=>{attempts++;},tokens:async()=>{},snapshot:async()=>({available:true,requests:attempts})};
 const h=harness({usage,modelStatus:503});
 let status=await (await h.handler(new Request('https://test.netlify.app/.netlify/functions/receipt-ai'))).json();assert.equal(status.usage.available,false);
 await h.handler(h.request({image,mode:'expense'}));assert.equal(attempts,1);
 status=await (await h.handler(new Request('https://test.netlify.app/.netlify/functions/receipt-ai',{headers:{'x-receipt-access':'test-access-code'}}))).json();assert.equal(status.usage.requests,1);assert.equal(status.limits.daily,500);
 const blocked=harness({usage,billing:{billingEnabled:true}});await blocked.handler(blocked.request());assert.equal(attempts,1);
 assert.match(receiptUsageText({limits:status.limits,usage:{available:false}}),/no significa/);
});
test('IA: una cifra ilegible o una suma distinta no produce una propuesta reconciliada',()=>{
  for(const change of [value=>value.items[0].amountCents=null,value=>value.items[0].uncertain=true,value=>value.totalCents=6900]){
    const value=copy(receipt);change(value);const proposal=normalizeReceiptProposal(value);
    assert.equal(proposal.itemsStatus,'review');assert.equal(proposal.itemText,'');
  }
  assert.throws(()=>normalizeReceiptProposal({...receipt,currency:'USD'}),/euros/);
});
test('IA: no envía la imagen sin consentimiento o código y no envía viajeros ni cuentas',async()=>{
  let sent;
  const fetcher=async(url,init)=>{sent={url,init};return Response.json({receipt});};
  await assert.rejects(readReceiptWithAI({ticketData:image},{consent:false,accessCode:'code'},()=>{},fetcher),/autorizas/);
  await assert.rejects(readReceiptWithAI({ticketData:image},{consent:true,accessCode:''},()=>{},fetcher),/código/);
  assert.equal(sent,undefined);
  await readReceiptWithAI({ticketData:image,participants:['PRIVATE NAME'],accountId:42},{consent:true,accessCode:'code'},()=>{},fetcher);
  assert.deepEqual(JSON.parse(sent.init.body),{image});assert.equal(sent.init.headers['X-Receipt-Access'],'code');
});
test('IA: el cliente no reintenta una cuota agotada ni cambia a otro proveedor',async()=>{
  let calls=0;
  await assert.rejects(readReceiptWithAI({ticketData:image},{consent:true,accessCode:'code'},()=>{},async()=>{calls++;return Response.json({message:'Cuota gratuita agotada'},{status:429});}),/Cuota gratuita/);
  assert.equal(calls,1);
});
test('IA: disponibilidad desactivada y fallo de red se muestran sin exponer configuración',async()=>{
  const h=harness({settings:{RECEIPT_AI_ENABLED:undefined}});
  const response=await h.handler(new Request('https://test.netlify.app/.netlify/functions/receipt-ai'));
  const value=await response.json();assert.equal(value.enabled,false);assert.equal(h.calls.length,0);
  assert.ok(!JSON.stringify(value).includes('test-api-key'));
  assert.equal((await getReceiptAIStatus(async()=>{throw new Error();})).enabled,false);
});
test('IA: sin configuración, sin código o sin verificador no llama a Google',async()=>{
  for(const options of [{settings:{RECEIPT_AI_ENABLED:undefined}},{noChecker:true}]){
    const h=harness(options);assert.equal((await h.handler(h.request())).status,503);assert.equal(h.calls.length,0);
  }
  const h=harness();assert.equal((await h.handler(h.request({image},{'x-receipt-access':'wrong'}))).status,401);assert.equal(h.calls.length,0);
});
test('IA: rechaza imágenes, tamaños y orígenes inválidos antes de comprobar Google',async()=>{
  const h=harness();
  assert.equal((await h.handler(h.request({image:'https://private.example/ticket.jpg'}))).status,400);
  assert.equal((await h.handler(h.request({image},{'content-length':'5000000'}))).status,413);
  assert.equal((await h.handler(h.request({image},{origin:'https://other.example'}))).status,403);
  assert.equal(h.calls.length,0);
});
test('IA: comprueba el proyecto propietario de la clave antes de facturación o inferencia',async()=>{
  const h=harness({wrongProject:true});assert.equal((await h.handler(h.request())).status,503);
  assert.equal(h.calls.length,2);assert.equal(h.inferences().length,0);
});
test('IA: facturación vinculada, activada, desconocida o error bloquean siempre la inferencia',async()=>{
  for(const billing of [{billingEnabled:true},{billingEnabled:false,billingAccountName:'billingAccounts/linked'},{}]){
    const h=harness({billing});const response=await h.handler(h.request());
    assert.equal(response.status,503);assert.equal(h.inferences().length,0);
  }
  for(const options of [{provider403:true},{networkError:true}]){
    const h=harness(options);const response=await h.handler(h.request());const body=await response.text();
    assert.equal(response.status,503);assert.equal(h.inferences().length,0);
    assert.ok(!body.includes('test-api-key'));assert.ok(!body.includes('secret-provider-error'));
  }
});
test('IA: revalida facturación en cada foto y usa un modelo fijo sin herramientas ni pagos',async()=>{
  const h=harness({billing:count=>({billingEnabled:count>1})});
  const response=await h.handler(h.request({image,model:'paid-model'}));assert.equal(response.status,200);
  assert.deepEqual((await response.json()).receipt,receipt);
  const inference=h.inferences()[0];const body=JSON.parse(inference.init.body);
  assert.ok(inference.url.includes('gemini-3.5-flash-lite:generateContent'));
  assert.equal(body.tools,undefined);assert.equal(body.model,undefined);
  assert.equal(body.generationConfig.responseMimeType,'application/json');
  assert.equal(body.generationConfig.responseJsonSchema,undefined);
  assert.equal(body.generationConfig.responseSchema,undefined);
  const contract=JSON.parse(body.systemInstruction.parts[0].text.split('este esquema: ')[1]);
  assert.deepEqual(contract.required,['merchant','currency','totalCents','items','warnings']);
  assert.deepEqual(contract.properties.items.items.required,['name','quantity','amountCents','uncertain']);
  assert.deepEqual(body.contents[0].parts[0].inlineData,{mimeType:'image/jpeg',data:image.split(',')[1]});
  assert.equal((await h.handler(h.request())).status,503);assert.equal(h.inferences().length,1);
});
test('IA: cuota agotada, respuesta truncada o JSON inválido no reintentan ni guardan datos',async()=>{
  for(const options of [{quota:true},{truncated:true},{badJSON:true}]){
    const h=harness(options);const response=await h.handler(h.request());
    assert.equal(response.status,options.quota?429:503);assert.equal(h.inferences().length,1);
  }
});


test('IA: los siete productos del ticket llegan a conceptos con sus precios sin desplazarse', () => {
  const proposal = normalizeReceiptProposal(receipt);
  const parsed = globalThis.TravelGroup.parseItems(proposal.itemText).items;
  assert.equal(parsed.length, 7);
  assert.deepEqual(parsed.map(item => [item.name, item.quantity, item.amountCents]), receipt.items.map(item => [item.name, item.quantity, item.amountCents]));
  assert.equal(parsed.reduce((sum, item) => sum + item.amountCents, 0), 7590);
  const fractional = copy(receipt); fractional.items[0].quantity = 2.5;
  assert.equal(globalThis.TravelGroup.parseItems(normalizeReceiptProposal(fractional).itemText).items[0].quantity, 2.5);
});


test('IA: Google saturado no se confunde con una verificación de gratuidad fallida', async () => {
  for (const modelStatus of [500, 503]) {
    const h=harness({modelStatus}); const response=await h.handler(h.request()); const body=await response.json();
    assert.equal(response.status,503); assert.match(body.message,/ocupado o temporalmente no disponible/);
    assert.doesNotMatch(body.message,/autorizado la comprobación|private-provider-error/);
    assert.equal(h.inferences().length,1);
  }
  const h=harness({modelStatus:403}); const response=await h.handler(h.request());
  assert.match((await response.json()).message,/no ha aceptado esta lectura/);
  assert.equal(h.inferences().length,1);
});

test('IA multifoto: envía todas las imágenes ordenadas en una única lectura y mantiene la comprobación gratuita',async()=>{
 const image2='data:image/jpeg;base64,'+Buffer.alloc(48,11).toString('base64');
 const multi={...copy(receipt),assembly:{photoCount:2,complete:true,overlapUncertain:false}};
 let sent;
 const proposal=await readReceiptWithAI({ticketPhotos:[{data:image,name:'PRIVATE1'},{data:image2,name:'PRIVATE2'}],participants:['PRIVATE PERSON']},{accessCode:'test',consent:true},()=>{},async(url,init)=>{sent=JSON.parse(init.body);return Response.json({receipt:multi});});
 assert.deepEqual(sent,{images:[image,image2]});assert.equal(proposal.itemsStatus,'reconciled');
 const h=harness({receipt:multi});const response=await h.handler(h.request(sent));assert.equal(response.status,200);
 assert.equal(h.inferences().length,1);
 const payload=JSON.parse(h.inferences()[0].init.body);
 assert.deepEqual(payload.contents[0].parts.filter(p=>p.inlineData).map(p=>p.inlineData.data),[image,image2].map(i=>i.split(',')[1]));
 assert.match(payload.systemInstruction.parts[0].text,/No dedupliques por nombre e importe/);
 assert.equal(h.calls.filter(call=>call.url.includes('billingInfo')).length,1);
 const blocked=harness({billing:{billingEnabled:true}});assert.equal((await blocked.handler(blocked.request(sent))).status,503);assert.equal(blocked.inferences().length,0);
});

test('IA multifoto: una unión incompleta, dudosa o con fotos omitidas no pasa a conceptos aunque sume',()=>{
 const multi={...copy(receipt),assembly:{photoCount:2,complete:true,overlapUncertain:false}};
 for(const change of [v=>delete v.assembly,v=>v.assembly.complete=false,v=>v.assembly.overlapUncertain=true,v=>v.assembly.photoCount=1,v=>v.warnings=['Duda en el solapamiento']]){
  const value=copy(multi);change(value);const proposal=normalizeReceiptProposal(value,{photoCount:2});
  assert.equal(proposal.itemsStatus,'review');assert.equal(proposal.itemText,'');assert.match(proposal.warnings.join(' '),/unión/);
 }
 const repeated=copy(multi);repeated.items[6].name=repeated.items[5].name;
 const proposal=normalizeReceiptProposal(repeated,{photoCount:2});assert.equal(proposal.itemsStatus,'reconciled');
 assert.equal(proposal.itemText.split('\n').filter(line=>line.includes('Tarrina chocolate')).length,2);
});

test('IA multifoto: rechaza exceso, repetición y fotos inválidas antes de enviar o verificar nada',async()=>{
 const h=harness(),photo='data:image/png;base64,'+Buffer.alloc(48,12).toString('base64');
 for(const images of [[],[image,image],Array(9).fill(image),[image,'data:application/pdf;base64,dGVzdA=='],[image,42]])assert.equal((await h.handler(h.request({images}))).status,400);
 assert.equal((await h.handler(h.request({images:[image,photo],image}))).status,400);assert.equal(h.calls.length,0);
 let calls=0;
 await assert.rejects(readReceiptWithAI({ticketPhotos:[{data:image},{data:image}]},{accessCode:'x',consent:true},()=>{},async()=>{calls++;}),/repetida/);
 await assert.rejects(readReceiptWithAI({ticketPhotos:[{data:image},{data:'data:image/jpeg;base64,'+'A'.repeat(4_000_000)}]},{accessCode:'x',consent:true},()=>{},async()=>{calls++;}),/demasiado grandes/);
 assert.equal(calls,0);
});
