import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {JSDOM} from 'jsdom';
import '../tourism-photos.js';
import '../city-guide.js';

const {CityGuide} = globalThis;
const app = fs.readFileSync(new URL('../app.bundle.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const guide = {intro: 'Ciudad de prueba', items: [{name: 'Lugar A', description: 'Descripción A', photoTip: 'Consejo A'}], reviewed: true};
function fixture() {
  const dom = new JSDOM(html);
  const context = {CityGuide, TourismPhotos: {...globalThis.TourismPhotos}, document: dom.window.document, AbortController, setTimeout, clearTimeout, routePlanShareState: null,
    $: selector => dom.window.document.querySelector(selector),
    $$: selector => [...dom.window.document.querySelectorAll(selector)],
    state: {lugares: [{id: 1, nombre: 'Finlandia'}, {id: 2, nombre: 'Oulu', parentId: 1, tourism: JSON.parse(JSON.stringify(guide))}]},
    escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
    ReceiptAccess: {get: () => 'codigo-prueba', save() {}},
    alert: message => {context.alertMessage = message;}, renderLugares() {}, renderRouteSharePreview() {},
    setMessage: (selector, message) => {context.$(selector).textContent = message;},
    updateLugar: async (id, patch) => {context.saved = {...context.state.lugares.find(city => city.id === id), ...patch}; return context.saved;}
  };
  const dialog = context.$('#city-guide-dialog');
  dialog.showModal = () => dialog.setAttribute('open', ''); dialog.close = () => dialog.removeAttribute('open');
  runInNewContext(app.slice(app.indexOf('function cityTourism('), app.indexOf('function normalizeRouteLodging(')), context);
  return {context, dom};
}

test('la ficha limita cinco lugares y la propuesta exige campos válidos sin repetir nombres', () => {
  assert.equal(CityGuide.normalize({items: Array.from({length: 8}, (_, i) => ({name: 'Lugar '+i}))}).items.length, 5);
  assert.throws(() => CityGuide.normalize({intro: '', items: [{name: 'Café', description: 'D', photoTip: ''}, {name: 'CAFE', description: 'D', photoTip: ''}]}, true), /repetidos/);
  assert.throws(() => CityGuide.normalize({intro: '', items: [{name: 'A', description: {}, photoTip: ''}]}, true), /campos/);
  assert.equal(CityGuide.normalize(null).items.length, 0);
});

test('solo destinos únicos entran en el folleto; tránsito e inicio/regreso quedan fuera', () => {
  const destinations = CityGuide.destinations([{role: 'endpoint', city: {id: 1}}, {role: 'transit', city: {id: 2}}, {role: 'destination', city: {id: 3}}, {role: 'destination', city: {id: 3}}, {role: 'destination', city: {id: 4}}]);
  assert.deepEqual(destinations.map(stage => stage.city.id), [3, 4]);
});

test('la ficha existente se consulta, cancela sin cambios y guarda solo al pulsar Guardar', async () => {
  const {context} = fixture();
  context.openCityGuide(2);
  context.$('[data-guide-name="0"]').value = 'Nombre editado';
  context.closeCityGuide(); assert.equal(context.saved, undefined);
  context.openCityGuide(2); assert.equal(context.$('[data-guide-name="0"]').value, 'Lugar A');
  context.$('[data-guide-name="0"]').value = 'Nombre guardado';
  await context.saveCityGuide();
  assert.equal(context.saved.tourism.items[0].name, 'Nombre guardado');
  assert.equal(context.saved.tourism.reviewed, true);
  assert.equal(context.$('#city-guide-dialog').open, false);
});

test('al crear una ciudad prepara la ficha para Añadir y exige elegir antes el país', async () => {
  const {context} = fixture();
  context.$('#lugar-nombre').value = 'Kuopio'; context.openCityGuide();
  assert.match(context.alertMessage, /elige su país/);
  context.$('#lugar-parent').innerHTML = '<option value="1">Finlandia</option>';
  context.openCityGuide(); context.$('[data-guide-name="0"]').value = 'Lugar nuevo';
  await context.saveCityGuide();
  assert.equal(context.saved, undefined);
  const pending = runInNewContext('pendingCityGuide', context);
  assert.equal(pending.name, 'Kuopio'); assert.equal(pending.countryId, 1);
  assert.equal(pending.guide.items[0].name, 'Lugar nuevo');
  assert.match(context.$('#msg-lugar').textContent, /Pulsa Añadir/);
});

test('la propuesta usa solo ciudad y país, requiere consentimiento y no sustituye la ficha guardada', async () => {
  const {context} = fixture(); let sent;
  context.fetch = async (url, options) => {sent = JSON.parse(options.body); return Response.json({guide: {...guide, source: 'gemini', reviewed: false}});};
  context.openCityGuide(2); await context.proposeCityGuide(); assert.equal(sent, undefined);
  context.$('#city-guide-consent').checked = true;
  await context.proposeCityGuide();
  assert.deepEqual(sent, {mode: 'city-guide', city: 'Oulu', country: 'Finlandia', consent: true});
  assert.equal(context.saved, undefined);
  assert.equal(context.state.lugares[1].tourism.items[0].name, 'Lugar A');
  assert.match(context.$('#city-guide-status').textContent, /Revisa/);
});

test('elegir foto conserva cambios de texto, no guarda sin confirmar y Cancelar descarta la elección', async () => {
  const {context} = fixture();
  const photo = {title:'File:Oulu.jpg', author:'Fotógrafo', credit:'Own work', url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Oulu.jpg', sourceUrl:'https://commons.wikimedia.org/wiki/File:Oulu.jpg', license:'CC BY 4.0', licenseUrl:'https://creativecommons.org/licenses/by/4.0/'};
  context.TourismPhotos.search = async () => [photo];
  context.TourismPhotos.download = async () => new Blob(['jpeg']);
  context.prepareCityGuidePhoto = async () => 'data:image/jpeg;base64,/9j/AA==';
  context.openCityGuide(2);
  context.$('[data-guide-description="0"]').value = 'Mi descripción editada';
  await context.cityGuidePhotoAction({target:context.$('[data-guide-photo-search="0"]')});
  assert.equal(context.saved, undefined);
  await context.cityGuidePhotoAction({target:context.$('[data-guide-photo-use="0:0"]')});
  assert.equal(context.$('[data-guide-description="0"]').value, 'Mi descripción editada');
  assert.equal(context.cityGuideFormData().items[0].photo.author, 'Fotógrafo');
  assert.equal(context.saved, undefined);
  context.closeCityGuide(); context.openCityGuide(2);
  assert.equal(context.cityGuideFormData().items[0].photo, undefined);
  await context.cityGuidePhotoAction({target:context.$('[data-guide-photo-search="0"]')});
  await context.cityGuidePhotoAction({target:context.$('[data-guide-photo-use="0:0"]')});
  await context.saveCityGuide();
  assert.equal(context.saved.tourism.items[0].photo.data, 'data:image/jpeg;base64,/9j/AA==');
  context.openCityGuide(2);
  await context.cityGuidePhotoAction({target:context.$('[data-guide-photo-remove="0"]')});
  await context.saveCityGuide();
  assert.equal(context.saved.tourism.items[0].photo, undefined);
});

test('cerrar durante una búsqueda no aplica respuestas tardías y los fallos dejan la ficha editable', async () => {
  const {context} = fixture(); let finish;
  context.TourismPhotos.search = () => new Promise(resolve=>{finish=resolve;});
  context.openCityGuide(2);
  const pending = context.cityGuidePhotoAction({target:context.$('[data-guide-photo-search="0"]')});
  context.closeCityGuide(); context.openCityGuide(2); finish([]); await pending;
  assert.equal(context.$('#city-guide-save').disabled, false);
  assert.equal(context.saved, undefined);
  context.TourismPhotos.search = async () => {throw new Error('Sin conexión');};
  await context.cityGuidePhotoAction({target:context.$('[data-guide-photo-search="0"]')});
  assert.match(context.$('[data-guide-photo-status="0"]').textContent, /Sin conexión/);
  assert.equal(context.$('#city-guide-save').disabled, false);
  assert.equal(context.cityGuideFormData().items[0].name, 'Lugar A');
});

test('reduce una foto sin recortarla y libera el canvas; rechaza dimensiones excesivas',async()=>{
 const {context}=fixture();let closed=0,drawn;
 context.loadImageFile=async()=>({width:1200,height:800,close(){closed++;}});
 context.document={createElement:()=>({getContext:()=>({fillRect(){},drawImage(...args){drawn=args.slice(3);}})})};
 context.canvasToJpeg=async()=>new Blob(['jpeg']);context.readBlobAsDataUrl=async()=> 'data:image/jpeg;base64,/9j/AA==';
 await context.prepareCityGuidePhoto(new Blob(['jpeg']));assert.deepEqual(drawn,[800,533]);assert.equal(closed,1);
 context.loadImageFile=async()=>({width:12000,height:8000,close(){closed++;}});
 await assert.rejects(context.prepareCityGuidePhoto(new Blob(['jpeg'])),/tamaño reducido/);assert.equal(closed,2);
});

test('buscar mantiene el lugar actual; elegir y reabrir indica Ya tiene foto y permite cambiarla', async () => {
  const {context,dom}=fixture(),scrolled=[];
  dom.window.HTMLElement.prototype.scrollIntoView=function(){scrolled.push(this);};
  const photo={title:'File:Oulu.jpg',author:'Autora',credit:'Own work',url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Oulu.jpg',sourceUrl:'https://commons.wikimedia.org/wiki/File:Oulu.jpg',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'};
  context.TourismPhotos.search=async()=>[photo];context.TourismPhotos.download=async()=>new Blob(['jpeg']);context.prepareCityGuidePhoto=async()=> 'data:image/jpeg;base64,/9j/AA==';
  context.openCityGuide(2);scrolled.length=0;
  context.$('[data-guide-name="2"]').value='Lugar tercero';
  const search=context.$('[data-guide-photo-search="2"]');search.focus();
  await context.cityGuidePhotoAction({target:search});
  assert.equal(scrolled.length,0,'buscar no sube al aviso general ni desplaza el formulario');
  assert.equal(dom.window.document.activeElement,search);
  assert.match(context.$('[data-guide-photo-status="2"]').textContent,/Usar esta foto/);
  await context.cityGuidePhotoAction({target:context.$('[data-guide-photo-use="2:0"]')});
  assert.equal(scrolled.length,1);assert.equal(scrolled[0],context.$('[data-guide-photo-preview="2"]'));
  assert.match(context.$('[data-guide-photo-preview="2"]').textContent,/pendiente de guardar/);
  assert.equal(search.textContent,'Buscar otra foto');
  await context.saveCityGuide();context.openCityGuide(2);
  assert.match(context.$('[data-guide-photo-preview="1"]').textContent,/Ya tiene foto/,'se conserva el indicador tras guardar y reabrir; huecos vacíos se omiten');
  assert.equal(context.$('[data-guide-photo-search="1"]').textContent,'Buscar otra foto');
  scrolled.length=0;
  context.TourismPhotos.search=async()=>{throw Error('Sin conexión');};
  await context.cityGuidePhotoAction({target:context.$('[data-guide-photo-search="1"]')});
  assert.equal(scrolled.length,0);assert.match(context.$('[data-guide-photo-status="1"]').textContent,/Sin conexión/);
  await context.cityGuidePhotoAction({target:context.$('[data-guide-photo-remove="1"]')});
  assert.equal(scrolled.length,0);assert.doesNotMatch(context.$('[data-guide-photo-preview="1"]').textContent,/Ya tiene foto/);
  assert.equal(context.$('[data-guide-photo-search="1"]').textContent,'Buscar foto libre');
});

test('el progreso de foto permanece en su lugar y diferencia seleccionada de guardada',async()=>{
 const {context}=fixture();context.openCityGuide(2);let finish;
 const photo={title:'File:Oulu.jpg',author:'Autora',credit:'Own work',url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Oulu.jpg',sourceUrl:'https://commons.wikimedia.org/wiki/File:Oulu.jpg',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'};
 context.TourismPhotos.search=async()=>[photo];await context.cityGuidePhotoAction({target:context.$('[data-guide-photo-search="0"]')});
 context.TourismPhotos.download=async(p,{onProgress})=>{onProgress({phase:'download',loaded:50,total:100});return new Promise(resolve=>{finish=resolve;});};
 context.prepareCityGuidePhoto=async()=> 'data:image/jpeg;base64,/9j/AA==';
 const downloading=context.cityGuidePhotoAction({target:context.$('[data-guide-photo-use="0:0"]')});
 assert.equal(context.$('[data-guide-photo-progress="0"]').hidden,false);assert.equal(context.$('[data-guide-photo-progress="0"]').value,50);assert.match(context.$('[data-guide-photo-progress-text="0"]').textContent,/50 %/);
 assert.equal(context.$('#city-guide-save').disabled,true);finish(new Blob(['jpeg']));await downloading;
 assert.equal(context.$('[data-guide-photo-progress="0"]').value,100);assert.match(context.$('[data-guide-photo-preview="0"]').textContent,/pendiente de guardar/);
 await context.saveCityGuide();context.openCityGuide(2);assert.match(context.$('[data-guide-photo-preview="0"]').textContent,/foto guardada/);
});

test('sin fotos exactas ofrece fotos generales solo al pulsar y conserva esa advertencia al guardar',async()=>{
 const {context}=fixture();context.openCityGuide(2);const queries=[];
 const photo={title:'File:Oulu.jpg',author:'Autora',credit:'Own work',url:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Oulu.jpg',sourceUrl:'https://commons.wikimedia.org/wiki/File:Oulu.jpg',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'};
 context.TourismPhotos.search=async query=>{queries.push(query);return query==='Oulu'?[photo]:[];};
 await context.cityGuidePhotoAction({target:context.$('[data-guide-photo-search="0"]')});
 assert.equal(queries.length,1);assert.equal(context.$('[data-guide-photo-city="0"]').hidden,false);assert.equal(context.saved,undefined);
 await context.cityGuidePhotoAction({target:context.$('[data-guide-photo-city="0"]')});
 assert.equal(queries.length,2);assert.equal(queries[1],'Oulu');assert.match(context.$('[data-guide-photo-results="0"]').textContent,/Foto general de Oulu/);
 context.TourismPhotos.download=async()=>new Blob(['jpeg']);context.prepareCityGuidePhoto=async()=> 'data:image/jpeg;base64,/9j/AA==';
 await context.cityGuidePhotoAction({target:context.$('[data-guide-photo-use="0:0"]')});await context.saveCityGuide();context.openCityGuide(2);
 assert.equal(context.saved.tourism.items[0].photo.scope,'city');assert.match(context.$('[data-guide-photo-preview="0"]').textContent,/Foto general de Oulu/);
});

test('la foto propia se prepara sin red, conserva créditos y solo se persiste al guardar',async()=>{
 const {context,dom}=fixture();context.openCityGuide(2);context.TourismPhotos.download=()=>assert.fail('No debe descargar');context.TourismPhotos.search=()=>assert.fail('No debe consultar');
 const input=context.$('[data-guide-photo-file="0"]'),file=new dom.window.File(['jpeg'],'mi-foto.jpg',{type:'image/jpeg'});Object.defineProperty(input,'files',{configurable:true,value:[file]});
 context.$('[data-guide-photo-author="0"]').value='Autora propia';
 context.prepareCityGuidePhoto=async(blob,options)=>{assert.equal(blob,file);assert.equal(options.own,true);return 'data:image/jpeg;base64,/9j/AA==';};
 await context.cityGuidePhotoAction({target:input});assert.equal(context.saved,undefined);assert.equal(context.cityGuideFormData().items[0].photo.source,'own');assert.match(context.$('[data-guide-photo-preview="0"]').textContent,/Foto propia/);assert.equal(context.$('[data-guide-photo-preview="0"] a'),null);
 context.$('[data-guide-photo-author="0"]').value='Créditos corregidos';await context.saveCityGuide();assert.equal(context.saved.tourism.items[0].photo.author,'Créditos corregidos');context.openCityGuide(2);assert.match(context.$('[data-guide-photo-preview="0"]').textContent,/foto guardada/);
});

test('el selector de fuente llega al buscador y una foto propia inválida no borra la anterior',async()=>{
 const {context,dom}=fixture();const previous={source:'own',title:'anterior.jpg',author:'Autora',data:'data:image/jpeg;base64,/9j/AA=='};context.state.lugares[1].tourism.items[0].photo=previous;context.openCityGuide(2);let source;
 context.TourismPhotos.search=async(query,options)=>{source=options.source;return [];};context.$('[data-guide-photo-source="0"]').value='openverse';await context.cityGuidePhotoAction({target:context.$('[data-guide-photo-search="0"]')});assert.equal(source,'openverse');
 const input=context.$('[data-guide-photo-file="0"]');Object.defineProperty(input,'files',{value:[new dom.window.File(['pdf'],'archivo.pdf',{type:'application/pdf'})]});context.prepareCityGuidePhoto=()=>assert.fail('No debe decodificar PDF');
 await context.cityGuidePhotoAction({target:input});assert.match(context.$('[data-guide-photo-status="0"]').textContent,/JPEG, PNG o WebP/);assert.equal(context.cityGuideFormData().items[0].photo.data,previous.data);assert.equal(context.saved,undefined);assert.equal(context.$('#city-guide-save').disabled,false);
});
