/**
 * imagePreprocessor.js
 * 
 * Pre-processes medicine strip images to maximize OCR accuracy:
 * 1. Resize: downscales to max width 1200px (preserves aspect ratio, reduces memory & CPU)
 * 2. Grayscale: standard luminance conversion (0.299R + 0.587G + 0.114B)
 * 3. Contrast boost: dynamic range stretching / histogram scaling
 * 4. Adaptive thresholding: separates ink text from reflective blister foil & glare
 * 5. Deskew: horizontal projection variance alignment within ±15 degrees
 */

/**
 * Downscales dimensions if width exceeds maxWidth.
 */
export function calculateTargetDimensions(width, height, maxWidth = 1200) {
  if (width <= maxWidth) {
    return { width, height };
  }
  const ratio = maxWidth / width;
  return {
    width: maxWidth,
    height: Math.round(height * ratio)
  };
}

/**
 * Converts RGBA pixel data to grayscale in-place.
 * @param {Uint8ClampedArray|Uint8Array} data - RGBA buffer
 */
export function toGrayscale(data) {
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
}

/**
 * Boosts contrast using histogram stretching (5th to 95th percentile).
 * @param {Uint8ClampedArray|Uint8Array} data - RGBA grayscale buffer
 */
export function boostContrast(data) {
  // 1. Build histogram
  const histogram = new Array(256).fill(0);
  const totalPixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]]++;
  }

  // 2. Find 2nd and 98th percentile values
  const lowCutoff = totalPixels * 0.02;
  const highCutoff = totalPixels * 0.98;

  let minVal = 0;
  let count = 0;
  for (let i = 0; i < 256; i++) {
    count += histogram[i];
    if (count >= lowCutoff) {
      minVal = i;
      break;
    }
  }

  let maxVal = 255;
  count = 0;
  for (let i = 255; i >= 0; i--) {
    count += histogram[i];
    if (count >= totalPixels - highCutoff) {
      maxVal = i;
      break;
    }
  }

  if (maxVal <= minVal) return;

  const range = maxVal - minVal;

  // 3. Stretch luminance values
  for (let i = 0; i < data.length; i += 4) {
    const val = data[i];
    const stretched = Math.min(255, Math.max(0, Math.round(((val - minVal) * 255) / range)));
    data[i] = stretched;
    data[i + 1] = stretched;
    data[i + 2] = stretched;
  }
}

/**
 * Applies local adaptive thresholding (integral image window).
 * Effective for eliminating blister foil glare & reflections.
 */
export function adaptiveThreshold(data, width, height, windowSize = 25, C = 7) {
  const S = Math.floor(windowSize / 2);
  const integral = new Float64Array(width * height);

  // 1. Compute integral image of luminance
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      sum += data[idx];
      if (y === 0) {
        integral[y * width + x] = sum;
      } else {
        integral[y * width + x] = integral[(y - 1) * width + x] + sum;
      }
    }
  }

  // 2. Threshold each pixel based on local window mean
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - S);
      const x2 = Math.min(width - 1, x + S);
      const y1 = Math.max(0, y - S);
      const y2 = Math.min(height - 1, y + S);

      const count = (x2 - x1 + 1) * (y2 - y1 + 1);

      let sum = integral[y2 * width + x2];
      if (x1 > 0) sum -= integral[y2 * width + (x1 - 1)];
      if (y1 > 0) sum -= integral[(y1 - 1) * width + x2];
      if (x1 > 0 && y1 > 0) sum += integral[(y1 - 1) * width + (x1 - 1)];

      const mean = sum / count;
      const idx = (y * width + x) * 4;
      const pixelVal = data[idx];

      // Binarize: text is typically darker than local background
      const binarized = pixelVal < (mean - C) ? 0 : 255;
      data[idx] = binarized;
      data[idx + 1] = binarized;
      data[idx + 2] = binarized;
    }
  }
}

/**
 * Estimates skew angle using horizontal projection profile variance across angles -15..+15 deg.
 */
export function estimateSkewAngle(data, width, height, step = 2) {
  let maxVariance = -1;
  let bestAngle = 0;

  // Subsample step to keep calculation fast
  const sampleStep = Math.max(1, Math.floor(height / 200));

  for (let angle = -14; angle <= 14; angle += step) {
    const rad = (angle * Math.PI) / 180;
    const tan = Math.tan(rad);

    const rowSums = new Float32Array(height);
    let rowCounts = new Uint32Array(height);

    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += 4) {
        const shiftedY = Math.round(y + (x - width / 2) * tan);
        if (shiftedY >= 0 && shiftedY < height) {
          const idx = (y * width + x) * 4;
          // Dark pixels (text) count toward projection sum
          if (data[idx] < 128) {
            rowSums[shiftedY]++;
          }
          rowCounts[shiftedY]++;
        }
      }
    }

    // Calculate variance of projection profile
    let mean = 0;
    let n = 0;
    for (let y = 0; y < height; y++) {
      if (rowCounts[y] > 0) {
        mean += rowSums[y];
        n++;
      }
    }
    if (n === 0) continue;
    mean /= n;

    let variance = 0;
    for (let y = 0; y < height; y++) {
      if (rowCounts[y] > 0) {
        const diff = rowSums[y] - mean;
        variance += diff * diff;
      }
    }

    if (variance > maxVariance) {
      maxVariance = variance;
      bestAngle = angle;
    }
  }

  return bestAngle;
}

/**
 * Pre-processes an image element or canvas in the browser.
 * @param {HTMLImageElement|HTMLCanvasElement} sourceImage
 * @returns {HTMLCanvasElement} Pre-processed canvas ready for OCR
 */
export function preprocessCanvas(sourceImage) {
  const { width: srcW, height: srcH } = sourceImage;
  const { width, height } = calculateTargetDimensions(srcW, srcH, 1200);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // 1. Resize draw
  ctx.drawImage(sourceImage, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 2. Grayscale
  toGrayscale(data);

  // 3. Contrast boost
  boostContrast(data);

  // 4. Adaptive threshold
  adaptiveThreshold(data, width, height, 25, 7);

  // 5. Deskew detection & rotation
  const skewAngle = estimateSkewAngle(data, width, height);
  ctx.putImageData(imgData, 0, 0);

  if (Math.abs(skewAngle) >= 1) {
    const rotatedCanvas = document.createElement('canvas');
    rotatedCanvas.width = width;
    rotatedCanvas.height = height;
    const rotCtx = rotatedCanvas.getContext('2d');

    rotCtx.translate(width / 2, height / 2);
    rotCtx.rotate((-skewAngle * Math.PI) / 180);
    rotCtx.drawImage(canvas, -width / 2, -height / 2);
    return rotatedCanvas;
  }

  return canvas;
}

