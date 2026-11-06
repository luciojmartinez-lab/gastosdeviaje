import test from 'node:test';
import assert from 'node:assert/strict';
import '../tourism-photos.js';
import '../city-guide.js';

const photos = globalThis.TourismPhotos;
const photo = {title:'File:Cathedral.jpg', author:'Author', credit:'Own work', url:'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Cathedral.jpg/800px-Cathedral.jpg', sourceUrl:'https://commons.wikimedia.org/wiki/File:Cathedral.jpg', license:'CC BY-SA 4.0', licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/', data:'data:image/jpeg;base64,/9j/AA=='};
const page = (overrides = {}) => ({title:photo.title, imageinfo:[{mime:'image/jpeg', thumburl:photo.url, thumbwidth:800, thumbheight:600, descriptionurl:photo.sourceUrl, extmetadata:{Artist:{value:'<b>Author</b>'}, Credit:{value:'Own &amp; work'}, LicenseShortName:{value:photo.license}, LicenseUrl:{value:photo.licenseUrl}, ...overrides}}]});

test('solo acepta fotos Commons con licencia libre conocida y créditos íntegros', () => {
  assert.equal(photos.normalize(photo).data, photo.data);
  assert.equal(photos.fromCommons(page()).author, 'Author');
  assert.equal(photos.fromCommons(page()).credit, 'Own & work');
  for (const change of [{author:''}, {license:'CC BY-NC 4.0'}, {licenseUrl:'https://example.org/license'}, {url:'https://evil.example/x.jpg'}, {sourceUrl:'https://commons.wikimedia.org.evil/wiki/File:X'}]) assert.equal(photos.normalize({...photo, ...change}), null);
  assert.equal(photos.fromCommons(page({Restrictions:{value:'personality rights'}})), null);
  assert.equal(photos.fromCommons(page({LicenseUrl:{value:'https://creativecommons.org/licenses/by/4.0/'}})), null, 'nombre y URL de licencia deben corresponder');
  assert.equal(photos.normalize({...photo, author:'a'.repeat(2001)}), null, 'no se truncan créditos obligatorios');
  assert.equal(photos.normalize({...photo, data:'data:text/html;base64,AA=='}).data, undefined);
  assert.equal(photos.normalize({...photo, data:photo.data+'A'.repeat(450000)}).data, undefined);
  assert.ok(photos.normalize({...photo, license:'CC0', licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/', author:''}));
  assert.equal(globalThis.CityGuide.normalize({items:[{name:'Cathedral', photo}], reviewed:true}).items[0].photo.data, photo.data);
});

test('busca directamente en Commons sin claves, filtra licencias y no hace reintentos', async () => {
  let calls = 0;
  const result = await photos.search('Cathedral Helsinki', {fetchImpl:async (url, options) => {
    calls++; const params = new URL(url).searchParams;
    assert.equal(new URL(url).hostname, 'commons.wikimedia.org'); assert.equal(params.get('origin'), '*');
    assert.equal(params.get('gsrnamespace'), '6'); assert.equal(options.credentials, 'omit');
    assert.match(params.get('gsrsearch'), /Cathedral Helsinki/);
    return Response.json({query:{pages:[page(), page({LicenseShortName:{value:'All rights reserved'}})]}});
  }});
  assert.equal(calls, 1); assert.equal(result.length, 1);
  await assert.rejects(photos.search('Helsinki', {fetchImpl:async()=>{calls++; return new Response('', {status:429});}}), /no está disponible/);
  assert.equal(calls, 2);
});

test('descarga solo miniaturas admitidas y limita bytes y tipos antes de guardar', async () => {
  let calls = 0;
  const blob = await photos.download(photo, {fetchImpl:async (url, options)=>{calls++; assert.equal(options.redirect, 'error'); return new Response('jpeg', {headers:{'content-type':'image/jpeg'}});}});
  assert.equal(blob.size, 4); assert.equal(calls, 1);
  await assert.rejects(photos.download({...photo, url:'http://localhost/image'}, {fetchImpl:()=>{throw Error('No debe llamar');}}), /licencia/);
  for (const response of [new Response('HTML', {headers:{'content-type':'text/html'}}), new Response('big', {headers:{'content-type':'image/jpeg','content-length':'2000000'}}), new Response(new Uint8Array(1500001), {headers:{'content-type':'image/jpeg'}})]) await assert.rejects(photos.download(photo, {fetchImpl:async()=>response}), /grande|descargar/);
  const credits = photos.credits(photo).join('\n');
  for (const value of [photo.author, photo.sourceUrl, photo.license, photo.licenseUrl]) assert.ok(credits.includes(value));
});

test('licencias CC0 y CC BY con enlaces HTTP/deed de Commons se canonizan sin aceptar otras licencias',()=>{
 const result=photos.fromCommons(page({LicenseShortName:{value:'CC0'},LicenseUrl:{value:'http://creativecommons.org/publicdomain/zero/1.0/deed.en'}}));
 assert.ok(result);assert.equal(result.license,'CC0 1.0');assert.equal(result.licenseUrl,'https://creativecommons.org/publicdomain/zero/1.0/');
 assert.ok(photos.fromCommons(page({LicenseShortName:{value:'CC BY-SA 4.0'},LicenseUrl:{value:'http://creativecommons.org/licenses/by-sa/4.0/deed.es'}})));
 for(const url of ['http://creativecommons.org.evil/publicdomain/zero/1.0/deed.en','https://creativecommons.org/licenses/by-nc/4.0/','https://creativecommons.org/publicdomain/zero/1.0/?redirect=other'])assert.equal(photos.fromCommons(page({LicenseShortName:{value:'CC0'},LicenseUrl:{value:url}})),null);
});

test('un nombre español sin fotos tiene una segunda búsqueda simplificada, nunca reintenta errores de red',async()=>{
 const queries=[],events=[];
 const result=await photos.search('Plaza del Mercado de Oulu Oulu',{onProgress:e=>events.push(e),fetchImpl:async url=>{queries.push(new URL(url).searchParams.get('gsrsearch'));return Response.json(queries.length===1?{query:{pages:[]}}:{query:{pages:[page()]}});}});
 assert.equal(result.length,1);assert.equal(queries.length,2);assert.equal(queries[1],'square market Oulu filetype:bitmap');assert.equal(events[1].attempt,2);
});

test('la descarga comunica bytes y total reales y avanza también sin Content-Length',async()=>{
 for(const known of [true,false]){
  const events=[];const chunks=[new Uint8Array(100),new Uint8Array(200)];
  const stream=new ReadableStream({pull(controller){if(chunks.length)controller.enqueue(chunks.shift());else controller.close();}});
  const blob=await photos.download(photo,{onProgress:e=>events.push(e),fetchImpl:async()=>new Response(stream,{headers:{'content-type':'image/jpeg',...(known?{'content-length':'300'}:{})}})});
  assert.equal(blob.size,300);assert.equal(events[0].loaded,0);assert.equal(events[0].total,known?300:null);assert.equal(events[1].loaded,100);assert.equal(events.at(-1).loaded,300);assert.equal(events.at(-1).total,300);
 }
});
