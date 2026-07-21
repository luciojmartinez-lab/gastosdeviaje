const OPEN_CV_URL = './vendor/opencv/4.10.0/opencv.js';

let openCvPromise = null;
let processingModulePromise = null;

function loadOpenCv() {
  if (openCvPromise) return openCvPromise;
  openCvPromise = new Promise((resolve, reject) => {
    try {
      importScripts(OPEN_CV_URL);
      self.postMessage({ type: 'progress', status: 'Biblioteca de imagen cargada' });
      const cvModule = self.cv;
      if (cvModule?.Mat) {
        resolve({ cv: cvModule });
        return;
      }
      if (!cvModule) throw new Error('OpenCV no está disponible en el trabajador.');
      if (typeof cvModule.then === 'function') {
        cvModule.then(() => {}, reject);
        self.postMessage({ type: 'progress', status: 'Iniciando el analizador' });
      }
      cvModule.onRuntimeInitialized = () => {
        resolve({ cv: cvModule });
      };
      cvModule.onAbort = reason => reject(new Error(String(reason || 'OpenCV no se pudo iniciar.')));
    } catch (error) {
      reject(error);
    }
  });
  return openCvPromise;
}

self.addEventListener('message', async event => {
  try {
    self.postMessage({ type: 'progress', status: 'Preparando el analizador del ticket' });
    const { cv } = await loadOpenCv();
    self.postMessage({ type: 'progress', status: 'Analizador preparado' });
    processingModulePromise ||= import('./ticket-image-processing.js?v=700v202');
    const processing = await processingModulePromise;
    self.postMessage({ type: 'progress', status: 'Enderezando y mejorando el ticket' });
    const result = processing.processReceiptPixels(cv, {
      width: event.data.width,
      height: event.data.height,
      data: new Uint8ClampedArray(event.data.buffer)
    });
    const enhancedBuffer = result.enhanced.buffer;
    const binaryBuffer = result.binary.buffer;
    self.postMessage({
      type: 'result',
      width: result.width,
      height: result.height,
      documentDetected: result.documentDetected,
      corners: result.corners,
      enhancedBuffer,
      binaryBuffer
    }, [enhancedBuffer, binaryBuffer]);
  } catch (error) {
    self.postMessage({ error: error?.message || String(error) });
  }
});
