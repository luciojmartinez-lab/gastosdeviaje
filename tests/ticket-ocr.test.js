import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  correctTicketMerchantFromKnown,
  detectTicketDocumentType,
  extractTicketDate,
  extractCardPaymentAmount,
  extractTicketFields,
  extractTicketFoodEvidence,
  extractTicketMerchant,
  extractTicketTime,
  extractTicketLayoutTotal,
  extractTicketTotal,
  extractTicketTotalChoices,
  chooseConfirmedTicketTotal,
  reconcileTicketLayoutTotal,
  reconcileTicketTotalReadings,
  reconstructTicketLayoutText,
  findFirstTextBand,
  findReceiptBounds,
  isGoogleLensTranslationText,
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

const getnetCardCopy = `Getnet
By Santander
GASOLINERA CAÑETE
CAÑETE
Tran:00013 APLIC.:A0000000041010
************1357
VENTA DEBIT MASTERCARD
Aut 553077 Op 046559 CONTACTLESS
Fecha:31.08.26 Hora:10:55
30,00 EUR`;

const getnetWeakOcr = `By «b Santander
GASOLINERA. CAÑETE
CAYETE
Tran:00013 APLIC.:A0000000041010
VENTA DEBIT MASTERCARD
Aut 553077 Op 046559 CONTACTLESE
Hora: 10:55`;

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
  assert.equal(detectTicketDocumentType(getnetCardCopy), 'card_payment');
  assert.equal(detectTicketDocumentType(getnetWeakOcr), 'card_payment');
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
  assert.equal(extractTicketMerchant(getnetCardCopy), 'GASOLINERA CAÑETE');
  assert.equal(extractTicketMerchant(getnetWeakOcr), 'GASOLINERA CAÑETE');
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
  assert.equal(extractTicketTotal(getnetCardCopy), 30);
  assert.equal(extractCardPaymentAmount('Fecha:31.08.26 Hora:10:55\n30,00 EUR'), 30);
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
  assert.equal(extractTicketTotal('total YB27'), 827);
  assert.equal(extractTicketTotal('total\nY827'), 827);
  assert.equal(extractTicketTotal('total\nY*344'), 344);
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
  assert.equal(extractTicketTotal(`(Total del producto) ¥857
(Descuento total) -30
total ¥27
(objetivo del 8%) ¥827
pago de dinero de transporte ¥827
Saldo de dinero de transporte ¥489`), 827);
  assert.equal(extractTicketTotal(`(Total del producto) ¥857
(Descuento total) -30
total ¥27
pago de dinero de transporte ¥827
Saldo de dinero de transporte ¥489`), 827);
  assert.equal(extractTicketTotal('total ¥7\npago de dinero de transporte ¥827\nSaldo de dinero de transporte ¥489'), 827);
  assert.equal(extractTicketTotal('Depósito total ¥10,481\ncambiar ¥8,000'), null);
  assert.equal(extractTicketTotal('Total parcial ¥1,920\nimpuesto ¥180'), null);
  assert.equal(extractTicketTotal(`Cuerpo subtotal ¥8,000
10% cuerpo objetivo ¥0
combinar ¥8,000
custodia 8,000 yenes`), 8000);
  assert.equal(extractTicketTotal(`Cuerpo subtotal 8, 001
10% cuerpo objetivo Y0
0% cuerpo objetivo Y8, 00
I combinar aranieme YS8, iso
custodia 8.000yenes`), 8000);
  assert.equal(extractTicketTotal('Cuerpo subtotal 344\ncustodia 1.000 yenes'), null);
  assert.equal(extractTicketTotal('Puedes combinar promociones\nCupón 500 yenes'), null);
  assert.equal(extractTicketTotal(`(Total del producto) Y857
(Descuento total) -30
total Y8B27
(objetivo del 8%) 827
pago de dinero de transporte Yx827`), 827);
  assert.equal(extractTicketTotal(`Subtotal (sin incluir el 10% de impuestos) *313
Impuesto al consumo, etc. (10%) *31
total Y*44
(Sujeto a una tasa impositiva del 10%) Y344
custodia Y1000
cambiar Y656`), 344);
  assert.equal(extractTicketTotal(`領収書
小計 本信
\\8, 0U0
者全休
\\8,.000
お預り
\\8, 0U0`), 8000);
  assert.equal(extractTicketTotal('소계 ₩10,000\n부가세 ₩1,000\n결제금액 ₩11,000'), 11000);
});

test('no mezcla lecturas OCR conflictivas como si fueran evidencias independientes', () => {
  assert.equal(reconcileTicketTotalReadings([
    'FamiliaMart\ntotal ¥27',
    'FamiliaMart\npago de dinero de transporte ¥827'
  ], 27), null);
  assert.equal(reconcileTicketTotalReadings([
    'total ¥7',
    'pago de dinero de transporte ¥827'
  ], 7), null);
  assert.equal(reconcileTicketTotalReadings([
    'LAWSON\ntotal ¥2,481',
    'Depósito total ¥10,481\ncambiar ¥8,000'
  ], 2481), 2481);
  assert.equal(reconcileTicketTotalReadings([
    'total ¥27',
    'total ¥527'
  ], 27), null);
  assert.equal(reconcileTicketTotalReadings([
    'Subtotal 313\nImpuesto 31\ntotal 344',
    'Subtotal 313\nImpuesto 31\ntotal 344',
    'Artículo 406'
  ], 344), 344);
  assert.equal(reconcileTicketTotalReadings(['total 90', 'total 1920', 'total 1980']), null);
  const source = readFileSync(new URL('../ticket-ocr.js', import.meta.url), 'utf8');
  assert.match(source, /const OCR_TEXT_WITH_LAYOUT = \{ text: true, blocks: true \}/);
  assert.match(source, /bestTicketLayoutTotalRow\(blocks\)/);
  assert.match(source, /Confirmando la fila del total/);
  assert.match(source, /let ticketRecognitionTail = Promise\.resolve\(\)/);
  assert.match(source, /ticketRecognitionTail\.then\(/);
  assert.match(source, /readings: text \? \[text\] : \[\]/);
  assert.doesNotMatch(source, /recognitionTexts|exactMandarakeLensCandidate|getSpecificLensTicketOverride/);
});

test('una cifra aislada de la fila grande no sustituye el total corroborado por el ticket', () => {
  assert.equal(reconcileTicketLayoutTotal(1980, 980), 1980);
  assert.equal(reconcileTicketLayoutTotal(null, 344), 344);
  assert.equal(chooseConfirmedTicketTotal(1980, 930, 92), 1980);
  assert.equal(chooseConfirmedTicketTotal(980, 930, 92), 980);
  assert.equal(chooseConfirmedTicketTotal(27, 827, 92), 827);
  assert.equal(chooseConfirmedTicketTotal(980, 1980, 92), 1980);
  assert.equal(chooseConfirmedTicketTotal(1980, 41980, 92), 1980);
});

test('reconstruye la fila visual de Total aunque etiqueta y cifra estén en bloques distintos', () => {
  const line = (text, x0, y0, x1, y1, confidence = 92) => ({
    text,
    confidence,
    bbox: { x0, y0, x1, y1 },
    baseline: { x0, y0: y1 - 2, x1, y1: y1 - 2 },
    words: []
  });
  const blocks = [
    { paragraphs: [{ lines: [
      line('Total parcial', 20, 70, 150, 92),
      line('total', 20, 110, 90, 135),
      line('cambiar', 20, 150, 100, 174)
    ] }] },
    { paragraphs: [{ lines: [
      line('¥1,920', 300, 70, 390, 92),
      line('¥1,980', 300, 108, 390, 136),
      line('0', 350, 151, 370, 174)
    ] }] }
  ];
  const layout = reconstructTicketLayoutText(blocks);
  assert.match(layout, /Total parcial ¥1,920/);
  assert.match(layout, /total ¥1,980/);
  assert.match(layout, /cambiar 0/);
  assert.equal(extractTicketLayoutTotal(blocks), 1980);
});

test('la lectura espacial es general y no depende de un comercio concreto', () => {
  const blocks = [{ paragraphs: [{ lines: [{
    text: 'TOTAL A PAGAR', confidence: 95,
    bbox: { x0: 10, y0: 50, x1: 160, y1: 75 },
    baseline: { x0: 10, y0: 72, x1: 160, y1: 72 }, words: []
  }] }] }, { paragraphs: [{ lines: [{
    text: '344 €', confidence: 94,
    bbox: { x0: 270, y0: 49, x1: 340, y1: 76 },
    baseline: { x0: 270, y0: 72, x1: 340, y1: 72 }, words: []
  }] }] }];
  assert.equal(reconstructTicketLayoutText(blocks), 'TOTAL A PAGAR 344 €');
  assert.equal(extractTicketLayoutTotal(blocks), 344);
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

test('el lector local usa español e inglés por defecto', () => {
  const ocr = readFileSync(new URL('../ticket-ocr.js', import.meta.url), 'utf8');
  assert.match(ocr, /normalizeWorkerLanguages\(languages\)/);
  assert.match(ocr, /createWorker\(languageKey/);
  assert.match(ocr, /options\.languages \|\| \['spa', 'eng'\]/);
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
  assert.equal(extractTicketMerchant('ralriiiialviar L\nFamiliaMart\nTienda Ryogoku\nTokio'), 'FamiliaMart');
  assert.equal(extractTicketMerchant(`¡Gana y usa Puntos Rakuten!
www.daikokudrug.com
Farmacia Daikoku Drug Ueno Ameyoko
03-5846-1808
recibo`), 'Farmacia Daikoku Drug Ueno Ameyoko');
  assert.equal(extractTicketMerchant(`E El Bj NJ)
¡Gana y usa Puntos Rakuten!
www.daikokudrug.com
Farmacia Daikoku Drug Ueno Ameyoko
recibo`), 'Farmacia Daikoku Drug Ueno Ameyoko');
  assert.equal(isPlausibleTicketMerchant('Gana y usa Puntos Rakuten'), false);
  assert.equal(isPlausibleTicketMerchant('Ad O'), false);
  assert.equal(isPlausibleTicketMerchant('ralriiiialviar L'), false);
  assert.equal(isPlausibleTicketMerchant('mE. Hora'), false);
  assert.equal(isPlausibleTicketMerchant('E El Bj NJ)'), false);
  assert.equal(isPlausibleTicketMerchant('Monto sujeto a impuestos le 990'), false);
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

test('limita el rescate a una lectura espacial y comprobaciones localizadas', () => {
  const ocr = readFileSync(new URL('../ticket-ocr.js', import.meta.url), 'utf8');
  assert.match(ocr, /OCR_TEXT_WITH_LAYOUT = \{ text: true, blocks: true \}/);
  assert.match(ocr, /Confirmando la fila del total/);
  assert.match(ocr, /Comprobando el nombre del comercio/);
  assert.match(ocr, /Comprobando el importe del pago con tarjeta/);
  assert.match(ocr, /recognizeMissingCardPaymentAmount\(worker, selected, onProgress\)/);
  assert.match(ocr, /OCR_PSM_SINGLE_LINE/);
  assert.match(ocr, /titleResult\?\.data\?\.confidence \|\| 0\) >= 60/);
  assert.match(ocr, /preparedResult\.binary && \(!selected\.fields\.total \|\| !selected\.fields\.merchant\)/);
  assert.match(ocr, /isGoogleLensTranslationText\(primary\.text\)/);
  assert.doesNotMatch(ocr, /cropCanvas\(prepared, 0, 0\.56\)|cropCanvas\(prepared, 0\.43, 1\)/);
});

test('una captura traducida por Lens se reconoce por su marca sin depender del comercio', () => {
  assert.equal(isGoogleLensTranslationText('Translated with Google Lens'), true);
  assert.equal(isGoogleLensTranslationText('Translated with (8) Google Lens'), true);
  assert.equal(isGoogleLensTranslationText('Ticket de comercio normal'), false);
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

test('distingue el total general del total por comensal y conserva ambos para que el usuario elija', () => {
  const text = `BAR RESTAURANTE HERMANOS SORIANO
10/08/2026 23:30
Total (Impuestos Incl.) 85,10 €
Comensales: 5 Total/Comensal: 17,02 €`;
  assert.deepEqual(extractTicketTotalChoices(text), {
    general: 85.1,
    perPerson: 17.02,
    diners: 5
  });
  const fields = extractTicketFields(text);
  assert.equal(fields.total, 85.1);
  assert.deepEqual(fields.totalChoices, {
    general: 85.1,
    perPerson: 17.02,
    diners: 5
  });
  assert.equal(extractTicketTotalChoices('TOTAL A PAGAR 7,10 EUR'), null);
});

test('la interfaz pregunta qué total usar solamente cuando existen ambos importes explícitos', () => {
  const app = readFileSync(new URL('../app.bundle.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="ticket-total-choice-dialog"/);
  assert.match(html, /id="ticket-total-choice-general"/);
  assert.match(html, /id="ticket-total-choice-per-person"/);
  assert.match(app, /async function applyTicketOcrFields/);
  assert.match(app, /await chooseTicketTotalAmount\(prefix, fields\.totalChoices\)/);
  assert.match(app, /await applyTicketOcrFields\(prefix, result/);
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

test('interpreta un ticket japonés cuando Lens traduce total como combinar', () => {
  assert.deepEqual(extractTicketFields(`E El Bj NJ)
¡Gana y usa Puntos Rakuten!
www.daikokudrug.com
Farmacia Daikoku Drug Ueno Ameyoko
03-5846-1808
recibo
Número de registro: T5120001130746
24/09/11/Mié 16:46
Toallas suaves y esponjosas 800 yenes x 3 ¥2,400
Cuerpo subtotal ¥8,000
10% cuerpo objetivo ¥0
8% cuerpo objetivo ¥0
combirar Amanuense ¥8 . e) e O
custodia 8,000 yenes`), {
    documentType: 'receipt',
    date: '2011-09-24',
    time: '16:46',
    merchant: 'Farmacia Daikoku Drug Ueno Ameyoko',
    total: 8000
  });
});

test('el resumen Mandarake conserva el total completo y no el impuesto', () => {
  assert.deepEqual(extractTicketFields(`Complejo Mandarake TEL:
03-3252-7007
8 de septiembre de 2024 (domingo) 18:27 N.º 0006
0003 El mundo de Yoshi's Woolf ¥1,980
Total parcial ¥1,980
Monto sujeto a impuestos ¥1,980
Impuesto ¥180
total ¥1, 980
Dinero electrónico (relacionado con el transporte) ¥1,980
cambiar 0`), {
    documentType: 'receipt',
    date: '2024-09-08',
    time: '18:27',
    merchant: 'Complejo Mandarake',
    total: 1980
  });
  assert.equal(extractTicketTotal(`0003 El mundo de Yoshi's Woolf ¥1,980
Total parcial ¥1,4980
Monto sujeto a impuestos ¥i 380
Impuesto al consumo ¥180
total 980
Total sujeto a una tasa impositiva del 10% ¥1,980
Dinero electrónico ¥ 1 y 980
cambiar O`), 1980);
  assert.equal(extractTicketTotal(`0003 El mundo de Yoshi's Woolf 41,950
Total parcial 71,980
Monto sujeto a impuestos +1,980
Impuesto Y 180
total 1, 980
Total sujeto a una tasa impositiva del 10%. Y, 980
Dinero electrónico 41,980
cambiar O`), 1980);
  assert.equal(extractTicketTotal(`0003 El mundo de Yoshi's Woolf 41,950
Total parcial 71,980
Monto sujeto a impuestos +1,980
Impuesto Y 180
total 1, 930
Total sujeto a una tasa impositiva del 10%. Y, 980
Dinero electrónico 41,980
cambiar O`), 1980);
  assert.equal(extractTicketTotal(`Total parcial 71,980
total 41,980
Pago 41,980`), 41980);
  assert.equal(extractTicketTotal(`Complejo Mandarake TEL:
03-3252-7007
0003 El mundo de Yoshi's Woolf ¥1,950
———]———]——]];—_———]—]—]——l —]—]——]_—]————]] total 1, 980
Total parcial $1,400
Monto sujeto a impuestos Yi , 30
(ImgJesto al consume y atras impuestos internos) Y i 59
Total sujeto a una tasa impositiva del 10%. Y ; 30
Dinero electrónico (re'acionado con el transporte) Y 1 , 0
cambiar . O`), 1980);
});

test('reconoce productos de alimentación aunque Lens traduzca de forma irregular', () => {
  const evidence = extractTicketFoodEvidence(`Rollo de arándanos ¥158
Té rooibos con aroma a lichi ¥113
Pain au Chocolat 3 ¥198
total ¥827`, 827);
  assert.equal(evidence.isFood, true);
  assert.ok(evidence.terms.includes('arandanos'));
  assert.ok(evidence.terms.includes('chocolat'));
});

test('el texto de una tarjeta monedero no convierte la compra en Transporte', () => {
  const app = readFileSync(new URL('../app.bundle.js', import.meta.url), 'utf8');
  assert.match(app, /categoryHaystack = haystack/);
  assert.match(app, /pago\|saldo\|deposito\|dinero\|tarjeta/);
  assert.match(app, /dinero\\s\+electronico/);
  assert.match(app, /\[\^\\n\]\{0,120\}\\btransporte/);
  assert.match(app, /categoryHaystack\.includes/);
  assert.match(app, /'gasolinera', 'gasolina'/);
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

test('la ayuda separa el lector español del flujo extranjero con Lens', () => {
  const help = readFileSync(new URL('../ayuda.html', import.meta.url), 'utf8');
  const section = help.match(/<td id="ocr">Leer ticket<\/td><td>([\s\S]*?)<\/td>/)?.[1] || '';
  assert.match(section, /justificantes en español/);
  assert.match(section, /posición visual/);
  assert.match(section, /tickets extranjeros usa <em>Leer con Google Lens<\/em>/);
  assert.match(section, /completa solo campos vacíos/);
  assert.match(section, /deja el importe sin completar/);
  assert.ok(section.length < 600, `La explicación de Leer ticket vuelve a ser demasiado larga (${section.length})`);
  assert.doesNotMatch(section, /japonés|coreano|idioma de lectura/i);
});
