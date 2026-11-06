(function(root) {
  const text = value => String(value ?? '').replace(/<[^>]*>/g, '').replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, n) => { const c = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n); return c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : ''; }).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, v => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '})[v]).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  function safeUrl(value, hosts, prefix) {
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.port && hosts.includes(u.hostname) && u.pathname.startsWith(prefix) ? u.href : ''; } catch { return ''; }
  }
  function license(value, url) {
    const name = text(value);
    let uri = '';
    try {
      const u = new URL(url);
      if (['http:','https:'].includes(u.protocol) && u.hostname === 'creativecommons.org' && !u.username && !u.password && !u.port && !u.search && !u.hash) {
        uri = 'https://creativecommons.org'+u.pathname.replace(/\/(?:deed|legalcode)(?:\.[a-z_-]+)?\/?$/i, '/');
      }
    } catch { /* Solo se canonizan enlaces oficiales reconocidos. */ }
    const cc = uri.match(/^https:\/\/creativecommons\.org\/licenses\/(by|by-sa)\/(1\.0|2\.0|2\.5|3\.0|4\.0)\/?$/);
    if (cc && name.toUpperCase() === `CC ${cc[1].toUpperCase()} ${cc[2]}`) return {license:name, licenseUrl:`https://creativecommons.org/licenses/${cc[1]}/${cc[2]}/`};
    if (/^https:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0\/?$/.test(uri) && /^CC0(?: 1\.0)?$/i.test(name)) return {license:'CC0 1.0', licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/'};
    if (/^https:\/\/creativecommons\.org\/publicdomain\/mark\/1\.0\/?$/.test(uri) && /^(Public domain|Dominio público)$/i.test(name)) return {license:'Public domain', licenseUrl:uri};
    return null;
  }
  function normalize(value) {
    if (!value || typeof value !== 'object') return null;
    const rights = license(value.license, value.licenseUrl), title = text(value.title), author = text(value.author), credit = text(value.credit);
    const url = safeUrl(value.url, ['upload.wikimedia.org','thumb.wikimedia.org'], '/wikipedia/commons/');
    const sourceUrl = safeUrl(value.sourceUrl, ['commons.wikimedia.org'], '/wiki/File:');
    if (!rights || !title || title.length > 500 || author.length > 2000 || credit.length > 3000 || !url || !sourceUrl || (/^CC BY/i.test(rights.license) && !author)) return null;
    const result = {title, author, credit, url, sourceUrl, ...rights};
    if (typeof value.data === 'string' && value.data.length <= 450000 && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value.data)) result.data = value.data;
    return result;
  }
  function fromCommons(page) {
    const info = page?.imageinfo?.[0], meta = info?.extmetadata;
    if (!info || !meta || !['image/jpeg','image/png','image/webp'].includes(info.mime) || text(meta.Restrictions?.value)) return null;
    if (!(info.thumbwidth > 0 && info.thumbheight > 0 && info.thumbwidth <= 1600 && info.thumbheight <= 1600)) return null;
    return normalize({title: page.title, author: meta.Artist?.value, credit: meta.Attribution?.value || meta.Credit?.value, url: info.thumburl, sourceUrl: info.descriptionurl, license: meta.LicenseShortName?.value, licenseUrl: meta.LicenseUrl?.value});
  }
  function searchTerms(query) {
    const dictionary = {plaza:'square',mercado:'market',isla:'',catedral:'cathedral',ayuntamiento:'city hall',iglesia:'church',parque:'park',museo:'museum',puente:'bridge',castillo:'castle',palacio:'palace',playa:'beach',torre:'tower',jardin:'garden',jardines:'gardens',biblioteca:'library'};
    const seen = new Set();
    return text(query).split(/\s+/).flatMap(word => {
      const key = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (seen.has(key) || ['de','del','la','las','el','los'].includes(key)) return [];
      seen.add(key); return key in dictionary ? dictionary[key] ? [dictionary[key]] : [] : [word];
    }).join(' ');
  }
  async function search(query, {signal, fetchImpl = root.fetch, onProgress = () => {}} = {}) {
    const q = text(query);
    if (!q || q.length > 200) throw new Error('Escribe el lugar y la ciudad (máximo 200 caracteres).');
    const queries = [...new Set([q, searchTerms(q)].filter(Boolean))];
    for (const [attempt, phrase] of queries.entries()) {
    onProgress({phase:'search', attempt:attempt+1, query:phrase});
    const params = new URLSearchParams({action:'query', format:'json', formatversion:'2', origin:'*', maxlag:'5', generator:'search', gsrsearch:phrase+' filetype:bitmap', gsrnamespace:'6', gsrlimit:'6', prop:'imageinfo', iiprop:'url|size|mime|extmetadata', iiurlwidth:'800', iiurlheight:'600'});
    const response = await fetchImpl('https://commons.wikimedia.org/w/api.php?'+params, {signal, credentials:'omit', referrerPolicy:'no-referrer'});
    if (!response.ok) throw new Error('Wikimedia no está disponible. Puedes probar más tarde.');
    const result = await response.json();
    if (result.error) throw new Error('Wikimedia está ocupado. Prueba más tarde.');
    const photos = (result.query?.pages || []).sort((a,b) => (a.index || 0)-(b.index || 0)).map(fromCommons).filter(Boolean).slice(0, 4);
    if (photos.length) return photos;
    }
    return [];
  }
  async function download(value, {signal, fetchImpl = root.fetch, onProgress = () => {}} = {}) {
    const photo = normalize(value);
    if (!photo) throw new Error('La foto no tiene una licencia de reutilización admitida.');
    const response = await fetchImpl(photo.url, {signal, credentials:'omit', referrerPolicy:'no-referrer', redirect:'error'});
    if (!response.ok || !/^image\/(jpeg|png|webp)(?:;|$)/i.test(response.headers.get('content-type') || '') || Number(response.headers.get('content-length')) > 1500000) throw new Error('No se pudo descargar una copia reducida de la foto.');
    const total = Number(response.headers.get('content-length')) || null;
    onProgress({phase:'download', loaded:0, total});
    if (!response.body?.getReader) { const blob = await response.blob(); if (blob.size > 1500000) throw new Error('La foto es demasiado grande.'); onProgress({phase:'download',loaded:blob.size,total:blob.size}); return blob; }
    const reader = response.body.getReader(), chunks = []; let size = 0;
    try { while (true) { const {done, value} = await reader.read(); if (done) break; size += value.byteLength; if (size > 1500000) throw new Error('La foto es demasiado grande.'); chunks.push(value); onProgress({phase:'download',loaded:size,total}); } }
    catch (error) { await reader.cancel().catch(() => {}); throw error; }
    onProgress({phase:'download',loaded:size,total:size});
    return new Blob(chunks, {type:response.headers.get('content-type')});
  }
  function credits(value) {
    const photo = normalize(value);
    return photo ? [photo.title, `Autor: ${photo.author || 'No indicado (dominio público)'}`, photo.credit ? `Crédito: ${photo.credit}` : '', `${photo.license} · ${photo.licenseUrl}`, `Fuente: ${photo.sourceUrl}`, 'Copia reducida, sin recorte.'].filter(Boolean) : [];
  }
  root.TourismPhotos = {normalize, fromCommons, search, download, credits};
})(globalThis);
