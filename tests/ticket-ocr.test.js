import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  correctTicketMerchantFromKnown,
  detectTicketDocumentType,
  extractTicketDate,
  extractTicketFields,
  extractTicketMerchant,
  extractTicketTime,
  extractTicketTotal,
  findFirstTextBand,
  findReceiptBounds,
  parseTicketAmount
} from '../ticket-ocr.js';

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
});

test('elige Total o Importe y no confunde IVA ni base imponible', () => {
  assert.equal(extractTicketTotal(shopReceipt), 7.1);
  assert.equal(extractTicketTotal(cardCopy), 7.1);
  assert.equal(extractTicketTotal('BASE IMPONIBLE 10,00\nIVA 21% 2,10\nTOTAL\n12,10 EUR'), 12.1);
  assert.equal(extractTicketTotal('IMPORTE IVA: 2,10\nT0TAL A PAGAR 12,10 EUR'), 12.1);
  assert.equal(extractTicketTotal('BASE IMPONIBLE 10,00\nIVA 21% 2,10\nEFECTIVO 12,10'), null);
  assert.equal(extractTicketTotal(milleniumReceiptOcr), 8.3);
  assert.equal(extractTicketTotal('UNID DESCRIPCION PRECIO IMPORTE\n1,000 CANA CLARA 2,80 2,80'), null);
  assert.equal(extractTicketTotal('IMPORTE\n2,80 2,80'), null);
  assert.equal(extractTicketTotal('PENDIENTE DE COBRO 8,30'), 8.3);
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

test('activa lecturas de rescate separadas para cabecera y total', () => {
  const ocr = readFileSync(new URL('../ticket-ocr.js', import.meta.url), 'utf8');
  assert.match(ocr, /Revisando la cabecera/);
  assert.match(ocr, /Revisando el total/);
  assert.match(ocr, /Leyendo el título/);
  assert.match(ocr, /OCR_PSM_SINGLE_LINE/);
  assert.match(ocr, /titleConfidence >= 50/);
  assert.match(ocr, /merchant: titleMerchant \|\| fields\.merchant \|\| headerFields\.merchant/);
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

test('al editar un gasto el OCR conserva los datos existentes y su clasificación', () => {
  const app = readFileSync(new URL('../app.bundle.js', import.meta.url), 'utf8');
  assert.match(app, /prefix === 'edit-gasto' && current/);
  assert.match(app, /suggestTicketCategory\('', fields\.merchant\)/);
  assert.doesNotMatch(app, /suggestTicketCategory\(result\.text, fields\.merchant\)/);
  assert.match(app, /Se conservaron sin cambios/);
  assert.match(app, /ticketDateAlignedToTrip/);
  assert.match(app, /fecha \(año ajustado al viaje\)/);
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
});

test('la ayuda explica la lectura diferenciada y conservadora', () => {
  const help = readFileSync(new URL('../ayuda.html', import.meta.url), 'utf8');
  assert.match(help, /Distingue un ticket comercial de una copia o justificante de pago con tarjeta/);
  assert.match(help, /no considera «Importe» cuando es el encabezado de una tabla de productos/);
  assert.match(help, /Pendiente de cobro/);
  assert.match(help, /Detecta el papel dentro de la fotografía, recorta el fondo/);
  assert.match(help, /primera banda real de texto/);
  assert.match(help, /modo de una sola línea/);
  assert.match(help, /Solo acepta esa lectura aislada cuando alcanza una confianza suficiente/);
  assert.match(help, /etiquetas como Fecha u Hora/);
  assert.match(help, /estructura habitual anterior a TEL\/NIF/);
  assert.match(help, /establecimiento ya corregido en gastos anteriores/);
  assert.match(help, /utiliza el año de ese viaje/);
  assert.match(help, /conserva el importe del formulario sin sustituirlo/);
  assert.match(help, /propone <strong>Comida<\/strong>/);
  assert.match(help, /si no existe, la deja vacía/);
});
