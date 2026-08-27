import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  correctTicketMerchantFromKnown,
  detectTicketDocumentType,
  extractTicketDate,
  extractTicketFields,
  extractTicketFoodEvidence,
  extractTicketMerchant,
  extractTicketTime,
  extractTicketTotal,
  findFirstTextBand,
  findReceiptBounds,
  isPlausibleTicketMerchant,
  parseTicketAmount
} from '../ticket-ocr.js';
import { orderReceiptCorners } from '../ticket-image-processing.js';

const shopReceipt = `BEKER-CAFE
FACTURA SIMPLIFICADA
Fecha 19/07/2026 10:19
BASE IMPONIBLE 6,45
IVA 10% 0,65
TOTAL A PAGAR 7,10 EUR`;

const cardCopy = `COMERCIA GLOBAL PAYMENTS
COPIA PARA EL CLIENTE
BEKER CAFE
VENTA
FECHA: 19/07/26 HORA: 1020
AUTORIZACION 123456
IMPORTE EUR 7,10`;

const unlabeledCardCopy = `UNICAJA BANCO
TJA. VISA
09-08-26 10:25
ALIMENTACION MAITE
CUENCA - ESPAÑA
VENTA
AUT: KTH6FJ DEB
*****16,54EUR
VERIFICADO EN DISPOSITIVO`;

const milleniumReceiptOcr = `MILLENIUM
MARTA RODRIGUEZ GAVIEIRO
FRA SIMP: COMPROBANTE FECHA: 18/07/2026
UNID. DESCRIPCION PRECIO IMPORTE
1,000 CANA / CLARA 2,80 2,80
1,000 PATATAS ALIOLI 5,50 5,50
BASE 7,55 IVA 10,00 IMP. IVA 0,75
TOTAL IMPORTE
8,30
PENDIENTE DE COBRO 8,30`;

test('distingue un ticket comercial de un justificante de tarjeta', () => {
  assert.equal(detectTicketDocumentType(shopReceipt), 'receipt');
  assert.equal(detectTicketDocumentType(cardCopy), 'card_payment');
});

test('en tickets prioriza el encabezado del comercio', () => {
  assert.equal(extractTicketMerchant(shopReceipt), 'BEKER-CAFE');
});

test('en copias de tarjeta omite el sistema de pago y localiza el comercio', () => {
  assert.equal(extractTicketMerchant(cardCopy), 'BEKER CAFE');
  assert.equal(extractTicketMerchant(`BBVA
COPIA CLIENTE
COMERCIO: FARMACIA CENTRAL
TERMINAL 1234
IMPORTE 15,45 EUR`), 'FARMACIA CENTRAL');
});

test('reconoce más formatos de fecha y hora', () => {
  assert.equal(extractTicketDate('FECHA 19 JULIO 2026'), '2026-07-19');
  assert.equal(extractTicketDate('Fecha 2026-07-19'), '2026-07-19');
  assert.equal(extractTicketDate('FECHA 19 07 26'), '2026-07-19');
  assert.equal(extractTicketTime('19/07/2026 10:19'), '10:19');
  assert.equal(extractTicketTime('HORA: 1020'), '10:20');
  assert.equal(extractTicketTime('2026-07-19 18h26'), '18:26');
  assert.equal(extractTicketDate('3 de septiembre de 2024 (martes) 11:16'), '2024-09-03');
  assert.equal(extractTicketTime('Teléfono: 07:35-52-1875\n3 de septiembre de 2024 (martes) 11:16'), '11:16');
  assert.equal(extractTicketTime('2026/07/12 23:06'), '23:06');
  assert.equal(extractTicketDate('Data 19 juliol 2026'), '2026-07-19');
  assert.equal(extractTicketDate('Päivämäärä 19 heinäkuu 2026'), '2026-07-19');
  assert.equal(extractTicketDate('Date 19 July 2026'), '2026-07-19');
  assert.equal(extractTicketTime('Aika 18.26'), '18:26');
  assert.equal(extractTicketDate('日付 2026年8月1日'), '2026-08-01');
  assert.equal(extractTicketDate('날짜 2026년 8월 1일'), '2026-08-01');
  assert.equal(extractTicketTime('時刻 12時34分'), '12:34');
  assert.equal(extractTicketTime('시간 19시 05분'), '19:05');
});

test('elige Total o Importe y no confunde IVA ni base imponible', () => {
  assert.equal(extractTicketTotal(shopReceipt), 7.1);
  assert.equal(extractTicketTotal(cardCopy), 7.1);
  assert.equal(extractTicketTotal(unlabeledCardCopy), 16.54);
  assert.equal(extractTicketTotal('BASE IMPONIBLE 10,00\nIVA 21% 2,10\nTOTAL\n12,10 EUR'), 12.1);
  assert.equal(extractTicketTotal('IMPORTE IVA: 2,10\nT0TAL A PAGAR 12,10 EUR'), 12.1);
  assert.equal(extractTicketTotal('BASE IMPONIBLE 10,00\nIVA 21% 2,10\nEFECTIVO 12,10'), null);
  assert.equal(extractTicketTotal(milleniumReceiptOcr), 8.3);
  assert.equal(extractTicketTotal('UNID DESCRIPCION PRECIO IMPORTE\n1,000 CANA CLARA 2,80 2,80'), null);
  assert.equal(extractTicketTotal('IMPORTE\n2,80 2,80'), null);
  assert.equal(extractTicketTotal('PENDIENTE DE COBRO 8,30'), 8.3);
  assert.equal(extractTicketTotal('een 8,30\nTOTAL IMPORTE E'), 8.3);
  assert.equal(extractTicketTotal('IMPORT PODER ABONAR 18,40 EUR'), 18.4);
  assert.equal(extractTicketTotal('IMPORT PER ABONAR\n18,40 EUR'), 18.4);
  assert.equal(extractTicketTotal('AMOUNT DUE £12.50'), 12.5);
  assert.equal(extractTicketTotal('GRAND TOTAL\n£12.50'), 12.5);
  assert.equal(extractTicketTotal('YHTEENSÄ 24,90 EUR'), 24.9);
  assert.equal(extractTicketTotal('MAKSETTAVAA\n24,90 EUR'), 24.9);
  assert.equal(extractTicketTotal('VÄLISUMMA 20,00\nALV 4,90'), null);
  assert.equal(extractTicketTotal('小計 ¥1,100\n消費税 ¥110\n合計 ¥1,210'), 1210);
  assert.equal(extractTicketTotal('内消費税10% ¥990\n合 計 10,885'), 10885);
  assert.equal(extractTicketTotal('total 827'), 827);
  assert.equal(extractTicketTotal('total Y827'), 827);
  assert.equal(extractTicketTotal('total ¥8 27'), 827);
  assert.equal(extractTicketTotal('total 2,481'), 2481);
  assert.equal(extractTicketTotal('total (objetivo del 8%) 827'), 827);
  assert.equal(extractTicketTotal(`total ¥2,481
(objetivo del 8% ¥2,481)
¥183
Depósito total ¥10,481
cambiar ¥8,000`), 2481);
  assert.equal(extractTicketTotal(`(Total del producto) ¥857
(Descuento total) -30
total ¥827
pago de dinero de transporte ¥827
Saldo de dinero de transporte ¥4,489`), 827);
  assert.equal(extractTicketTotal('Depósito total ¥10,481\ncambiar ¥8,000'), null);
  assert.equal(extractTicketTotal(`領収書
小計 本信
\\8, 0U0
者全休
\\8,.000
お預り
\\8, 0U0`), 8000);
  assert.equal(extractTicketTotal('소계 ₩10,000\n부가세 ₩1,000\n결제금액 ₩11,000'), 11000);
});

test('extrae los datos principales de tickets japoneses y coreanos', () => {
  assert.deepEqual(extractTicketFields(`東京食堂
領収書
日付 2026年8月1日
時刻 12時34分
合計 ¥1,280`), {
    documentType: 'receipt',
    date: '2026-08-01',
    time: '12:34',
    merchant: '東京食堂',
    total: 1280
  });
  assert.deepEqual(extractTicketFields(`서울식당
영수증
날짜 2026년 8월 1일
시간 19시 05분
결제금액 ₩12,000`), {
    documentType: 'receipt',
    date: '2026-08-01',
    time: '19:05',
    merchant: '서울식당',
    total: 12000
  });
});

test('el lector cambia de paquete según los idiomas solicitados', () => {
  const ocr = readFileSync(new URL('../ticket-ocr.js', import.meta.url), 'utf8');
  assert.match(ocr, /normalizeWorkerLanguages\(languages\)/);
  assert.match(ocr, /createWorker\(languageKey/);
  assert.match(ocr, /options\.languages \|\| \['spa'\]/);
});

test('deduce comida por los conceptos y restaurante por cantidad o total', () => {
  assert.deepEqual(extractTicketFoodEvidence(milleniumReceiptOcr, 8.3), {
    isFood: true,
    conceptCount: 2,
    restaurantLikely: false,
    subcategories: [],
    terms: ['cana', 'patatas', 'alioli']
  });
  assert.equal(extractTicketFoodEvidence(`${milleniumReceiptOcr}\n1,000 CROQUETAS 6,00 6,00`, 14.3).restaurantLikely, true);
  assert.equal(extractTicketFoodEvidence('1,000 PATATAS 16,50 16,50\nTOTAL 16,50', 16.5).restaurantLikely, true);
  assert.equal(extractTicketFoodEvidence('1,000 PATATAS 5,50 5,50\nSIVA 7,55 10,00 0,75', 5.5).conceptCount, 1);
  assert.deepEqual(extractTicketFoodEvidence('BILLETE DE TREN\nTOTAL 45,00', 45), {
    isFood: false,
    conceptCount: 0,
    restaurantLikely: false,
    subcategories: [],
    terms: []
  });
  assert.deepEqual(extractTicketFoodEvidence('CAFETERIA MILLENIUM\nTOTAL 4,50', 4.5).subcategories, ['Cafeteria']);
  assert.deepEqual(extractTicketFoodEvidence('PANADERIA CENTRAL\nTOTAL 3,20', 3.2).subcategories, ['Panaderia']);
  assert.deepEqual(extractTicketFoodEvidence('BAR ORENSE\nTOTAL 6,00', 6).subcategories, ['Bar']);
  assert.deepEqual(extractTicketFoodEvidence('TAPERIA CATEDRAL\nTOTAL 12,00', 12).subcategories, ['Restaurante']);
});

test('mantiene el comercio del encabezado y descarta líneas de productos', () => {
  assert.equal(extractTicketMerchant(milleniumReceiptOcr), 'MILLENIUM');
  assert.equal(extractTicketMerchant('FACTURA SIMPLIFICADA\nFECHA 18/07/2026\nUNID DESCRIPCION PRECIO IMPORTE\nCANA CLARA 2,80'), '');
  assert.equal(extractTicketMerchant('mE. Hora'), '');
  assert.equal(extractTicketMerchant(`NA
ILEETRITCIIIY
MILLENTUM
MARTA RODRIGUEZ GAVIEIRO
RUA DA CRUZ 18 B
TEL 982253055
NIF-33307299X
FRA SIMP COMPROBANTE`), 'MILLENTUM');
  assert.equal(extractTicketMerchant('f MILLENIUM I\nMARTA RODRIGUEZ\nNIF-33307299X'), 'MILLENIUM');
  assert.equal(isPlausibleTicketMerchant('Ad O'), false);
  assert.equal(isPlausibleTicketMerchant('mE. Hora'), false);
  assert.equal(isPlausibleTicketMerchant('MILLENIUM'), true);
});

test('corrige una o dos letras usando comercios guardados anteriormente', () => {
  assert.equal(
    correctTicketMerchantFromKnown('MILLENTUM', ['Millenium. Patatas con alioli', 'BEKER-CAFE']),
    'Millenium'
  );
  assert.equal(correctTicketMerchantFromKnown('MILLENTUM', ['Restaurante Central']), 'MILLENTUM');
  assert.equal(correctTicketMerchantFromKnown('BAR', ['Bar Central']), 'BAR');
});

test('detecta el papel del ticket para recortarlo antes del OCR', () => {
  const width = 40;
  const height = 30;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const value = x >= 8 && x <= 31 && y >= 2 && y <= 27 ? 240 : 90;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  }
  const bounds = findReceiptBounds(pixels, width, height);
  assert.ok(bounds);
  assert.ok(bounds.x <= 8 && bounds.y <= 2);
  assert.ok(bounds.width >= 24 && bounds.height >= 26);
  pixels.fill(245);
  assert.equal(findReceiptBounds(pixels, width, height), null);
});

test('aísla la primera línea de texto para leer el comercio', () => {
  const width = 100;
  const height = 100;
  const pixels = new Uint8ClampedArray(width * height * 4);
  pixels.fill(255);
  const drawBand = (fromY, toY, fromX, toX) => {
    for (let y = fromY; y <= toY; y += 1) {
      for (let x = fromX; x <= toX; x += 1) {
        const offset = (y * width + x) * 4;
        pixels[offset] = 25;
        pixels[offset + 1] = 25;
        pixels[offset + 2] = 25;
      }
    }
  };
  drawBand(20, 25, 30, 70);
  drawBand(40, 46, 15, 85);
  const bounds = findFirstTextBand(pixels, width, height);
  assert.ok(bounds);
  assert.ok(bounds.y <= 20 && bounds.y + bounds.height < 40);
  assert.ok(bounds.x <= 30 && bounds.x + bounds.width >= 70);
});

test('ordena las esquinas del papel antes de corregir la perspectiva', () => {
  assert.deepEqual(orderReceiptCorners([
    { x: 92, y: 12 },
    { x: 8, y: 88 },
    { x: 10, y: 10 },
    { x: 90, y: 90 }
  ]), [
    { x: 10, y: 10 },
    { x: 92, y: 12 },
    { x: 90, y: 90 },
    { x: 8, y: 88 }
  ]);
});

test('activa lecturas de rescate separadas para cabecera y total', () => {
  const ocr = readFileSync(new URL('../ticket-ocr.js', import.meta.url), 'utf8');
  assert.match(ocr, /Revisando la cabecera/);
  assert.match(ocr, /Revisando el total/);
  assert.match(ocr, /Leyendo el título/);
  assert.match(ocr, /OCR_PSM_SINGLE_BLOCK/);
  assert.match(ocr, /OCR_PSM_SINGLE_LINE/);
  assert.match(ocr, /options\.preferLargeTitle/);
  assert.match(ocr, /titleMinimumConfidence = options\.preferLargeTitle \? 35 : 60/);
  assert.match(ocr, /preparedResult\.documentDetected \|\| !fields\.total/);
  assert.match(ocr, /binaryFields\.merchant \|\| fields\.merchant/);
  assert.match(ocr, /cropCanvas\(prepared, 0, 0\.56\)/);
  assert.match(ocr, /cropCanvas\(prepared, 0\.43, 1\)/);
});

test('tolera una O leída dentro de un importe', () => {
  assert.equal(parseTicketAmount('12,1O EUR'), 12.1);
});

test('devuelve juntos el tipo, comercio, fecha, hora y total', () => {
  assert.deepEqual(extractTicketFields(cardCopy), {
    documentType: 'card_payment',
    date: '2026-07-19',
    time: '10:20',
    merchant: 'BEKER CAFE',
    total: 7.1
  });
});

test('la interfaz avisa cuando no encuentra un total inequívoco', () => {
  const app = readFileSync(new URL('../app.bundle.js', import.meta.url), 'utf8');
  assert.match(app, /Justificante de tarjeta detectado/);
  assert.match(app, /se mantiene el importe que ya figuraba/);
});

test('el OCR normal conserva datos existentes y Lens puede sustituirlos', () => {
  const app = readFileSync(new URL('../app.bundle.js', import.meta.url), 'utf8');
  assert.match(app, /const preserveExisting = !options\.replaceExisting/);
  assert.match(app, /if \(preserveCurrent && current\)/);
  assert.match(app, /replaceExisting: true/);
  assert.match(app, /result\.classificationText \|\| result\.text \|\| ''/);
  assert.match(app, /result\.foodEvidence/);
  assert.match(app, /Se conservaron sin cambios/);
  assert.match(app, /ticketDateAlignedToTrip/);
  assert.match(app, /fecha \(año ajustado al viaje\)/);
  assert.match(app, /fecha incompatible con las fechas del viaje/);
});

test('analiza como ticket español el resultado traducido por Lens', () => {
  assert.deepEqual(extractTicketFields(`FamiliaMart
Tienda Ryogoku
Teléfono: 03-5625-4705
3 de septiembre de 2024 (martes) 11:16
Registro: #2 22463
[Recibo correcto]
total ¥2,481
(objetivo del 8% ¥2,481)
¥183
Depósito total ¥10,481
cambiar ¥8,000`), {
    documentType: 'receipt',
    date: '2024-09-03',
    time: '11:16',
    merchant: 'FamiliaMart',
    total: 2481
  });
});

test('los comercios de comida tienen prioridad y solo usan una subcategoría configurada', () => {
  const app = readFileSync(new URL('../app.bundle.js', import.meta.url), 'utf8');
  const foodRule = app.indexOf('const foodBusinessRules = [');
  const learnedRule = app.indexOf('const learned = learnedTicketCategory(merchant);', foodRule);

  assert.ok(foodRule >= 0);
  assert.ok(learnedRule > foodRule, 'La regla de comida debe preceder a la clasificación aprendida');
  assert.match(app, /'restaurante', 'taperia', 'meson', 'pizzeria'/);
  assert.match(app, /'cafeteria', 'cafe'/);
  assert.match(app, /'panaderia'/);
  assert.match(app, /findCategoryByNames\(\['Comida'\]\)/);
  assert.match(app, /findCategoryByNames\(foodRule\.subcategories, category\.id\)/);
  assert.match(app, /subcategory: subcategory \|\| null/);
  assert.match(app, /foodEvidence\?\.isFood/);
  assert.match(app, /foodEvidence\.restaurantLikely/);
  assert.match(app, /Array\.isArray\(foodEvidence\.subcategories\)/);
  assert.match(app, /foodEvidence\.restaurantLikely \? \['Restaurante'\] : \[\]/);
});

test('la ayuda explica solo el resultado de Leer ticket y su alcance multilingüe', () => {
  const help = readFileSync(new URL('../ayuda.html', import.meta.url), 'utf8');
  const section = help.match(/<td id="ocr">Leer ticket<\/td><td>([\s\S]*?)<\/td>/)?.[1] || '';
  assert.match(section, /propone comercio, fecha, hora, importe, categoría y subcategoría/);
  assert.match(section, /idiomas elegidos o activados por el país del viaje/);
  assert.match(section, /japonés y coreano/);
  assert.match(section, /completa solo campos vacíos/);
  assert.match(section, /nunca rellena un importe dudoso/);
  assert.ok(section.length < 600, `La explicación de Leer ticket vuelve a ser demasiado larga (${section.length})`);
  assert.doesNotMatch(section, /perspectiva|contraste adaptativo|esquinas|procesamiento|lecturas complementarias/);
});
