/**
 * client/src/ocr/index.js
 * 
 * Clean, single public API for on-device medicine packaging OCR.
 * Exposes: scanStrip(imageFile, knownNames, onProgress)
 * 
 * Complies with safety rules:
 * - Images are processed strictly on-device, never uploaded, stored, or logged.
 * - Caller supplies knownNames; no internal API calls or network requests.
 * - Unrecognized items are explicitly returned and never dropped silently.
 */

import { preprocessCanvas } from './imagePreprocessor.js';
import { recognizeTextInWorker } from './ocrWorker.js';
import { extractCandidates } from './candidateExtractor.js';
import { matchCandidates } from './fuzzyMatcher.js';

/**
 * Loads a File or Blob into an HTMLImageElement for canvas processing.
 */
function loadImageElement(fileOrBlob) {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      // Node.js or non-browser environment
      return resolve(null);
    }

    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for on-device pre-processing."));
    };

    img.src = url;
  });
}

/**
 * Scans a medicine strip image on-device and returns matched / unrecognized medicines.
 * 
 * @param {File|Blob|string} imageFile - The photo of the strip taken or selected on-device
 * @param {Array<string|object>} knownNames - List of medicine names passed in by caller
 * @param {function} [onProgress] - Optional progress notification callback (0 to 100)
 * @returns {Promise<Array<{ rawText: string, matchedName: string|null, confidence: number, status: string }>>}
 */
export async function scanStrip(imageFile, knownNames = [], onProgress) {
  if (!imageFile) {
    throw new Error("scanStrip requires an image file or blob input.");
  }

  let sourceToRecognize = imageFile;

  // 1. In browser environments with DOM, run canvas pre-processing
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      let imgElement;
      if (imageFile instanceof HTMLImageElement || imageFile instanceof HTMLCanvasElement) {
        imgElement = imageFile;
      } else if (imageFile instanceof Blob) {
        imgElement = await loadImageElement(imageFile);
      }

      if (imgElement) {
        sourceToRecognize = preprocessCanvas(imgElement);
      }
    } catch (preprocessErr) {
      // Graceful fallback to original image if canvas manipulation fails
      sourceToRecognize = imageFile;
    }
  }

  // 2. Perform OCR in dedicated background Web Worker
  const { text: rawText } = await recognizeTextInWorker(sourceToRecognize, onProgress);

  // 3. Extract candidate medicine names (filtering batch, date, price, licence noise)
  const candidates = extractCandidates(rawText);

  // 4. Fuzzy match against caller-provided knownNames
  const results = matchCandidates(candidates, knownNames);

  return results;
}

export { preprocessCanvas } from './imagePreprocessor.js';
export { extractCandidates } from './candidateExtractor.js';
export { matchCandidates } from './fuzzyMatcher.js';
export { terminateOcrWorker } from './ocrWorker.js';

