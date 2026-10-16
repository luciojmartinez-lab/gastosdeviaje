import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
const app=fs.readFileSync(new URL('../app.bundle.js',import.meta.url),'utf8');
const sourceOf=name=>app.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`))[0];
test('tickets de comidas viajan como adjuntos y se recuperan sin perder sus bytes',async()=>{
 const data='data:image/jpeg;base64,'+Buffer.from('foto-de-ticket-de-prueba').toString('base64');
 const context=vm.createContext({Blob,TextEncoder,Buffer,crypto:webcrypto,CLOUD_ATTACHMENT_CHUNK_CHARS:8,setSyncMessage:()=>{},
  ticketDataInfo:(url,mime)=>{const encoded=url.split(',')[1];return{blob:new Blob([Buffer.from(encoded,'base64')],{type:mime}),data:encoded,encoding:'base64'};},
  sha256Hex:async blob=>Buffer.from(await webcrypto.subtle.digest('SHA-256',await blob.arrayBuffer())).toString('hex'),
  localAttachmentDataById:async()=>new Map(),downloadCloudAttachment:async()=>data});
 for(const name of ['prepareCloudBackupData','hydrateCloudBackupData'])vm.runInContext(sourceOf(name),context);
 const input={viajes:[{id:1,group:{participants:[],meals:[{id:'m',ticketData:data,ticketName:'ticket.jpg',ticketType:'image/jpeg'}]}}],gastos:[],viajeDocumentos:[],blogEntries:[]};
 const packed=await context.prepareCloudBackupData(input);
 assert.equal(packed.attachments.length,1);assert.ok(packed.attachments[0].parts>1);
 assert.equal(packed.data.viajes[0].group.meals[0].ticketData,undefined);assert.ok(packed.data.viajes[0].group.meals[0].ticketRef);
 assert.equal(input.viajes[0].group.meals[0].ticketData,data);
 const restored=await context.hydrateCloudBackupData(packed.data);
 assert.equal(restored.viajes[0].group.meals[0].ticketData,data);
 const broken=JSON.parse(JSON.stringify(packed.data));broken.viajes[0].group.meals[0].ticketRef='no-existe';
 await assert.rejects(context.hydrateCloudBackupData(broken),/Falta el ticket/);
});
test('scripts del grupo se cargan antes de la app y están en las dos listas de caché obligatoria',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const core=sw.slice(sw.indexOf('const APP_SHELL_CORE'),sw.indexOf('const APP_SHELL_REQUIRED'));
 const required=sw.slice(sw.indexOf('const APP_SHELL_REQUIRED'),sw.indexOf('const APP_SHELL_OPTIONAL'));
 for(const file of ['group-meals.js','group-ledger.js','group-store.js','group-ui.js']){assert.ok(html.indexOf(file+'?v=800v002')<html.indexOf('app.bundle.js?v=800v002'));assert.ok(core.includes(file));assert.ok(required.includes(file));}
});
