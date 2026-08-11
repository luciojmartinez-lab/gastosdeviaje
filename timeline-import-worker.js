importScripts('./timeline-import.js?v=700v249');

self.addEventListener('message', async event => {
  const payload = event.data || {};
  try {
    if (!payload.file) throw new Error('Selecciona el archivo Cronología.json exportado por Google Maps.');
    self.postMessage({ type: 'status', message: 'Leyendo la exportación de Google Maps…' });
    const text = await payload.file.text();
    self.postMessage({ type: 'status', message: 'Analizando los días del viaje…' });
    const data = JSON.parse(text);
    const result = self.GoogleTimelineImport.importTrip(data, payload.trip || {});
    self.postMessage({ type: 'complete', result });
  } catch (error) {
    const syntax = error instanceof SyntaxError
      ? 'El archivo no contiene un JSON válido de la Cronología de Google Maps.'
      : error && error.message || String(error);
    self.postMessage({ type: 'error', message: syntax });
  }
});
