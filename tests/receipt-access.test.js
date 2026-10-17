import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const source=fs.readFileSync(new URL('../receipt-access.js',import.meta.url),'utf8'),key='cuaderno.receiptAccess.v1';
function setup(saved){const dom=new JSDOM('',{url:'https://test.local',runScripts:'outside-only'});if(saved)dom.window.localStorage.setItem(key,saved);dom.window.eval(source);return dom;}

test('código compartido conserva la clave anterior, guarda sin leer tickets y se recupera al recargar',()=>{
 const first=setup('legacy-code');let saved;
 try{
  const api=first.window.ReceiptAccess;assert.equal(api.get(),'legacy-code');assert.equal(api.isPersistent(),true);
  api.save('  new-code  ');api.save('');assert.equal(api.get(),'new-code');saved=first.window.localStorage.getItem(key);assert.equal(saved,'new-code');assert.match(api.description(),/guardado/);
 }finally{first.window.close();}
 const reopened=setup(saved);try{assert.equal(reopened.window.ReceiptAccess.get(),'new-code');reopened.window.ReceiptAccess.forget();assert.equal(reopened.window.localStorage.getItem(key),null);assert.equal(reopened.window.ReceiptAccess.get(),'');}finally{reopened.window.close();}
});

test('almacenamiento bloqueado conserva el código en memoria y avisa de que no durará al cerrar',()=>{
 const dom=setup('old-code');try{
  Object.defineProperty(dom.window,'localStorage',{get(){throw new Error('Blocked');}});
  const api=dom.window.ReceiptAccess;assert.equal(api.get(),'old-code');assert.equal(api.save('session-code'),false);assert.equal(api.get(),'session-code');assert.equal(api.isPersistent(),false);assert.match(api.description(),/solo mientras esta página/);
  api.save('');assert.equal(api.get(),'session-code');
 }finally{dom.window.close();}
});

test('cambios de otra pestaña sincronizan el código y el olvido sin escribir valores antiguos de vuelta',()=>{
 const dom=setup('old');try{
  const w=dom.window,updates=[];w.ReceiptAccess.subscribe(value=>updates.push(value));
  const event=(changedKey,value)=>w.dispatchEvent(new w.StorageEvent('storage',{key:changedKey,newValue:value,storageArea:w.localStorage}));
  event('unrelated','ignore');assert.equal(w.ReceiptAccess.get(),'old');assert.equal(updates.length,0);
  w.localStorage.setItem(key,'from-other-tab');event(key,'from-other-tab');assert.equal(w.ReceiptAccess.get(),'from-other-tab');assert.equal(updates.at(-1).reason,'external');assert.equal(w.localStorage.getItem(key),'from-other-tab');
  w.ReceiptAccess.save('newer-local');event(key,'older-queued-value');assert.equal(w.ReceiptAccess.get(),'newer-local');assert.equal(w.localStorage.getItem(key),'newer-local');
  w.localStorage.removeItem(key);event(key,null);assert.equal(w.ReceiptAccess.get(),'');w.localStorage.setItem(key,'new');event(key,'new');w.localStorage.clear();event(null,null);assert.equal(w.ReceiptAccess.get(),'');
 }finally{dom.window.close();}
});

test('el módulo compartido se carga antes de Gastos y Grupo y forma parte de ambas cachés obligatorias',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const index=html.indexOf('src="receipt-access.js?');assert.ok(index>0);for(const file of ['expense-receipt-ai.js','group-ui.js'])assert.ok(index<html.indexOf('src="'+file));
 for(const [start,end]of [['const APP_SHELL_CORE','const APP_SHELL_REQUIRED'],['const APP_SHELL_REQUIRED','const APP_SHELL_OPTIONAL']])assert.ok(sw.slice(sw.indexOf(start),sw.indexOf(end)).includes('receipt-access.js?'));
});
