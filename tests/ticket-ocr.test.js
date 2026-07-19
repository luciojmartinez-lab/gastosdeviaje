import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  detectTicketDocumentType,
  extractTicketDate,
  extractTicketFields,
  extractTicketMerchant,
  extractTicketTime,
  extractTicketTotal,
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
});

test('la ayuda explica la lectura diferenciada y conservadora', () => {
  const help = readFileSync(new URL('../ayuda.html', import.meta.url), 'utf8');
  assert.match(help, /Distingue un ticket comercial de una copia o justificante de pago con tarjeta/);
  assert.match(help, /no considera «Importe» cuando es el encabezado de una tabla de productos/);
  assert.match(help, /Pendiente de cobro/);
  assert.match(help, /conserva el importe del formulario sin sustituirlo/);
});
