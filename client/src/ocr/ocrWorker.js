/**
 * ocrWorker.js
 * 
 * Manages Tesseract.js running in a background Web Worker so the browser UI never freezes.
 * Fully offline: self-hosts language data (eng.traineddata.gz), worker, and WebAssembly core
 * inside /public/tesseract/ so zero external network requests are made.
 */

import { createWorker } from 'tesseract.js';

let workerInstance = null;
let isInitializing = false;
let initPromise = null;

/**
 * Returns options configuring Tesseract to use only self-hosted local files.
 */
function getSelfHostedOptions(onProgress) {
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  if (isBrowser) {
    // In browser: all assets are served locally by Vite from /public/tesseract/
    const baseUrl = window.location.origin;
    return {
      workerPath: `${baseUrl}/tesseract/worker.min.js`,
      corePath: `${baseUrl}/tesseract/tesseract-core-simd-lstm.wasm.js`,
      langPath: `${baseUrl}/tesseract`,
      gzip: true,
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      }
    };
  }

  // Node.js environment (for tests and evaluation)
  return {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    }
  };
}

/**
 * Initializes and caches the self-hosted Tesseract.js worker in background.
 */
export async function getOcrWorker(onProgress) {
  if (workerInstance) {
    return workerInstance;
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      const options = getSelfHostedOptions(onProgress);
      const worker = await createWorker('eng', 1, options);
      workerInstance = worker;
      return worker;
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

/**
 * Recognizes text from an image or canvas source inside the Web Worker.
 * @param {string|HTMLCanvasElement|Blob|File|Buffer} imageSource
 * @param {function} [onProgress] - Optional progress callback (0 - 100)
 * @returns {Promise<{ text: string, confidence: number }>}
 */
export async function recognizeTextInWorker(imageSource, onProgress) {
  const worker = await getOcrWorker(onProgress);
  const result = await worker.recognize(imageSource);
  return {
    text: result.data.text || '',
    confidence: result.data.confidence || 0
  };
}

/**
 * Terminates the worker when unmounting or cleaning up.
 */
export async function terminateOcrWorker() {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
  }
}
