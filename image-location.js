function validCoordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function jpegExifOffset(view) {
  if (view.byteLength < 12 || view.getUint16(0, false) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = view.getUint8(offset + 1);
    if (marker === 0xda || marker === 0xd9) break;
    const length = view.getUint16(offset + 2, false);
    if (length < 2 || offset + 2 + length > view.byteLength) break;
    if (marker === 0xe1 && length >= 8) {
      const signature = String.fromCharCode(
        view.getUint8(offset + 4), view.getUint8(offset + 5),
        view.getUint8(offset + 6), view.getUint8(offset + 7)
      );
      if (signature === 'Exif' && view.getUint16(offset + 8, false) === 0) return offset + 10;
    }
    offset += 2 + length;
  }
  return null;
}

function readExifGps(view, tiffOffset) {
  if (tiffOffset == null || tiffOffset + 8 > view.byteLength) return null;
  const byteOrder = view.getUint16(tiffOffset, false);
  const littleEndian = byteOrder === 0x4949;
  if (!littleEndian && byteOrder !== 0x4d4d) return null;
  const safeUint16 = offset => offset >= 0 && offset + 2 <= view.byteLength
    ? view.getUint16(offset, littleEndian)
    : null;
  const safeUint32 = offset => offset >= 0 && offset + 4 <= view.byteLength
    ? view.getUint32(offset, littleEndian)
    : null;
  if (safeUint16(tiffOffset + 2) !== 42) return null;
  const firstIfdPointer = safeUint32(tiffOffset + 4);
  if (firstIfdPointer == null) return null;

  const typeSizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
  const entriesAt = relativeOffset => {
    const start = tiffOffset + Number(relativeOffset || 0);
    const count = safeUint16(start);
    if (count == null || count > 512) return [];
    const entries = [];
    for (let index = 0; index < count; index += 1) {
      const offset = start + 2 + index * 12;
      if (offset + 12 > view.byteLength) break;
      const tag = safeUint16(offset);
      const type = safeUint16(offset + 2);
      const valueCount = safeUint32(offset + 4);
      const byteLength = (typeSizes[type] || 0) * Number(valueCount || 0);
      const pointer = byteLength > 4 ? safeUint32(offset + 8) : null;
      const dataOffset = byteLength > 4 ? tiffOffset + Number(pointer || 0) : offset + 8;
      entries.push({ tag, type, count: Number(valueCount || 0), dataOffset, byteLength });
    }
    return entries;
  };

  const firstIfd = entriesAt(firstIfdPointer);
  const gpsPointerEntry = firstIfd.find(entry => entry.tag === 0x8825);
  if (!gpsPointerEntry) return null;
  const gpsPointer = safeUint32(gpsPointerEntry.dataOffset);
  if (gpsPointer == null) return null;
  const gpsEntries = entriesAt(gpsPointer);
  const gpsEntry = tag => gpsEntries.find(entry => entry.tag === tag);
  const asciiValue = entry => {
    if (!entry || entry.type !== 2 || entry.dataOffset + entry.count > view.byteLength) return '';
    let value = '';
    for (let index = 0; index < entry.count; index += 1) {
      const char = view.getUint8(entry.dataOffset + index);
      if (!char) break;
      value += String.fromCharCode(char);
    }
    return value.trim().toUpperCase();
  };
  const rationals = entry => {
    if (!entry || entry.type !== 5 || entry.count < 3 || entry.dataOffset + entry.count * 8 > view.byteLength) return [];
    const values = [];
    for (let index = 0; index < entry.count; index += 1) {
      const numerator = safeUint32(entry.dataOffset + index * 8);
      const denominator = safeUint32(entry.dataOffset + index * 8 + 4);
      if (numerator == null || !denominator) return [];
      values.push(numerator / denominator);
    }
    return values;
  };
  const degrees = values => values.length >= 3 ? values[0] + values[1] / 60 + values[2] / 3600 : null;
  const latitudeValues = rationals(gpsEntry(0x0002));
  const longitudeValues = rationals(gpsEntry(0x0004));
  let latitude = degrees(latitudeValues);
  let longitude = degrees(longitudeValues);
  if (latitude == null || longitude == null) return null;
  if (asciiValue(gpsEntry(0x0001)) === 'S') latitude *= -1;
  if (asciiValue(gpsEntry(0x0003)) === 'W') longitude *= -1;
  latitude = validCoordinate(latitude, -90, 90);
  longitude = validCoordinate(longitude, -180, 180);
  return latitude == null || longitude == null ? null : { latitude, longitude };
}

function normalizedExifDateTime(value) {
  const match = String(value || '').trim().match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2})(?::\d{2})?/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day) ||
    date.getHours() !== Number(hour) ||
    date.getMinutes() !== Number(minute)
  ) return null;
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

function readExifDateTime(view, tiffOffset) {
  if (tiffOffset == null || tiffOffset + 8 > view.byteLength) return null;
  const byteOrder = view.getUint16(tiffOffset, false);
  const littleEndian = byteOrder === 0x4949;
  if (!littleEndian && byteOrder !== 0x4d4d) return null;
  const safeUint16 = offset => offset >= 0 && offset + 2 <= view.byteLength
    ? view.getUint16(offset, littleEndian)
    : null;
  const safeUint32 = offset => offset >= 0 && offset + 4 <= view.byteLength
    ? view.getUint32(offset, littleEndian)
    : null;
  if (safeUint16(tiffOffset + 2) !== 42) return null;
  const firstIfdPointer = safeUint32(tiffOffset + 4);
  if (firstIfdPointer == null) return null;
  const typeSizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
  const entriesAt = relativeOffset => {
    const start = tiffOffset + Number(relativeOffset || 0);
    const count = safeUint16(start);
    if (count == null || count > 512) return [];
    const entries = [];
    for (let index = 0; index < count; index += 1) {
      const offset = start + 2 + index * 12;
      if (offset + 12 > view.byteLength) break;
      const tag = safeUint16(offset);
      const type = safeUint16(offset + 2);
      const valueCount = safeUint32(offset + 4);
      const byteLength = (typeSizes[type] || 0) * Number(valueCount || 0);
      const pointer = byteLength > 4 ? safeUint32(offset + 8) : null;
      if (byteLength > 4 && pointer == null) continue;
      const dataOffset = byteLength > 4 ? tiffOffset + pointer : offset + 8;
      entries.push({ tag, type, count: Number(valueCount || 0), dataOffset });
    }
    return entries;
  };
  const asciiValue = entry => {
    if (!entry || entry.type !== 2 || entry.count < 1 || entry.dataOffset + entry.count > view.byteLength) return '';
    let value = '';
    for (let index = 0; index < entry.count; index += 1) {
      const char = view.getUint8(entry.dataOffset + index);
      if (!char) break;
      value += String.fromCharCode(char);
    }
    return value.trim();
  };

  const firstIfd = entriesAt(firstIfdPointer);
  const exifPointerEntry = firstIfd.find(entry => entry.tag === 0x8769);
  const exifPointer = exifPointerEntry ? safeUint32(exifPointerEntry.dataOffset) : null;
  const exifIfd = exifPointer == null ? [] : entriesAt(exifPointer);
  const preferred = exifIfd.find(entry => entry.tag === 0x9003)
    || exifIfd.find(entry => entry.tag === 0x9004)
    || firstIfd.find(entry => entry.tag === 0x0132);
  return normalizedExifDateTime(asciiValue(preferred));
}

export function extractImageGpsFromArrayBuffer(buffer) {
  try {
    const view = buffer instanceof DataView ? buffer : new DataView(buffer);
    return readExifGps(view, jpegExifOffset(view));
  } catch {
    return null;
  }
}

export function extractImageDateTimeFromArrayBuffer(buffer) {
  try {
    const view = buffer instanceof DataView ? buffer : new DataView(buffer);
    return readExifDateTime(view, jpegExifOffset(view));
  } catch {
    return null;
  }
}

export async function extractImageGps(file) {
  if (!file || typeof file.arrayBuffer !== 'function') return null;
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();
  if (type && !/jpe?g/.test(type) && !/\.jpe?g$/.test(name)) return null;
  try {
    return extractImageGpsFromArrayBuffer(await file.arrayBuffer());
  } catch {
    return null;
  }
}

export async function extractImageDateTime(file) {
  if (!file || typeof file.arrayBuffer !== 'function') return null;
  const type = String(file.type || '').toLowerCase();
  const name = String(file.name || '').toLowerCase();
  if (type && !/jpe?g/.test(type) && !/\.jpe?g$/.test(name)) return null;
  try {
    return extractImageDateTimeFromArrayBuffer(await file.arrayBuffer());
  } catch {
    return null;
  }
}

function coordinateRationals(value) {
  const absolute = Math.abs(Number(value));
  const degrees = Math.floor(absolute);
  const minutesValue = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesValue);
  const secondsDenominator = 10_000_000;
  const secondsNumerator = Math.round((minutesValue - minutes) * 60 * secondsDenominator);
  return [
    [degrees, 1],
    [minutes, 1],
    [secondsNumerator, secondsDenominator]
  ];
}

function gpsExifSegment(latitude, longitude) {
  const tiff = new Uint8Array(140);
  const view = new DataView(tiff.buffer);
  const littleEndian = true;
  view.setUint16(0, 0x4949, false);
  view.setUint16(2, 42, littleEndian);
  view.setUint32(4, 8, littleEndian);

  view.setUint16(8, 1, littleEndian);
  view.setUint16(10, 0x8825, littleEndian);
  view.setUint16(12, 4, littleEndian);
  view.setUint32(14, 1, littleEndian);
  view.setUint32(18, 26, littleEndian);
  view.setUint32(22, 0, littleEndian);

  const gpsIfdOffset = 26;
  view.setUint16(gpsIfdOffset, 5, littleEndian);
  const writeEntry = (index, tag, type, count, value) => {
    const offset = gpsIfdOffset + 2 + index * 12;
    view.setUint16(offset, tag, littleEndian);
    view.setUint16(offset + 2, type, littleEndian);
    view.setUint32(offset + 4, count, littleEndian);
    if (Array.isArray(value)) tiff.set(value, offset + 8);
    else view.setUint32(offset + 8, value, littleEndian);
  };
  writeEntry(0, 0x0000, 1, 4, [2, 3, 0, 0]);
  writeEntry(1, 0x0001, 2, 2, [latitude < 0 ? 0x53 : 0x4e, 0, 0, 0]);
  writeEntry(2, 0x0002, 5, 3, 92);
  writeEntry(3, 0x0003, 2, 2, [longitude < 0 ? 0x57 : 0x45, 0, 0, 0]);
  writeEntry(4, 0x0004, 5, 3, 116);
  view.setUint32(gpsIfdOffset + 2 + 5 * 12, 0, littleEndian);

  const writeRationals = (offset, values) => values.forEach(([numerator, denominator], index) => {
    view.setUint32(offset + index * 8, numerator, littleEndian);
    view.setUint32(offset + index * 8 + 4, denominator, littleEndian);
  });
  writeRationals(92, coordinateRationals(latitude));
  writeRationals(116, coordinateRationals(longitude));

  const payload = new Uint8Array(6 + tiff.length);
  payload.set([0x45, 0x78, 0x69, 0x66, 0, 0], 0);
  payload.set(tiff, 6);
  const segment = new Uint8Array(payload.length + 4);
  segment.set([0xff, 0xe1], 0);
  new DataView(segment.buffer).setUint16(2, payload.length + 2, false);
  segment.set(payload, 4);
  return segment;
}

export function embedGpsInJpegBytes(source, latitude, longitude) {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source || 0);
  const validLatitude = validCoordinate(latitude, -90, 90);
  const validLongitude = validCoordinate(longitude, -180, 180);
  if (validLatitude == null || validLongitude == null || bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return bytes;
  }
  const exif = gpsExifSegment(validLatitude, validLongitude);
  const output = new Uint8Array(bytes.length + exif.length);
  output.set(bytes.subarray(0, 2), 0);
  output.set(exif, 2);
  output.set(bytes.subarray(2), 2 + exif.length);
  return output;
}

export async function embedGpsInJpegBlob(blob, latitude, longitude) {
  if (!blob || typeof blob.arrayBuffer !== 'function') return blob;
  const bytes = embedGpsInJpegBytes(await blob.arrayBuffer(), latitude, longitude);
  return new Blob([bytes], { type: blob.type || 'image/jpeg' });
}
