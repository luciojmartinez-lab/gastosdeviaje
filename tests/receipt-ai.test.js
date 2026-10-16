import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { normalizeReceiptProposal, readReceiptWithAI, getReceiptAIStatus } from '../receipt-ai.js';
import '../group-meals.js';
import { createReceiptHandler } from '../netlify/functions/receipt-ai.js';

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
