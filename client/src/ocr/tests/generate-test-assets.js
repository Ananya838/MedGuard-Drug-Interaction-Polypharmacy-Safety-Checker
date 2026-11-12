/**
 * generate-test-assets.js
 * 
 * Generates synthetic benchmark medicine strip images in /test-assets/synthetic/ with labels.json.
 * Labeled explicitly as "synthetic" benchmark data (never "realistic").
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = path.resolve(__dirname, '../../../../test-assets/synthetic');

// 5x7 Font definitions
const FONT = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  'A': [0x7E, 0x11, 0x11, 0x11, 0x7E],
  'B': [0x7F, 0x49, 0x49, 0x49, 0x36],
  'C': [0x3E, 0x41, 0x41, 0x41, 0x22],
  'D': [0x7F, 0x41, 0x41, 0x41, 0x3E],
  'E': [0x7F, 0x49, 0x49, 0x49, 0x41],
  'F': [0x7F, 0x09, 0x09, 0x09, 0x01],
  'G': [0x3E, 0x41, 0x49, 0x49, 0x7A],
  'H': [0x7F, 0x08, 0x08, 0x08, 0x7F],
  'I': [0x00, 0x41, 0x7F, 0x41, 0x00],
  'J': [0x20, 0x40, 0x41, 0x3F, 0x01],
  'K': [0x7F, 0x08, 0x14, 0x22, 0x41],
  'L': [0x7F, 0x40, 0x40, 0x40, 0x40],
  'M': [0x7F, 0x02, 0x0C, 0x02, 0x7F],
  'N': [0x7F, 0x04, 0x08, 0x10, 0x7F],
  'O': [0x3E, 0x41, 0x41, 0x41, 0x3E],
  'P': [0x7F, 0x09, 0x09, 0x09, 0x06],
  'Q': [0x3E, 0x41, 0x51, 0x21, 0x5E],
  'R': [0x7F, 0x09, 0x19, 0x29, 0x46],
  'S': [0x46, 0x49, 0x49, 0x49, 0x31],
  'T': [0x01, 0x01, 0x7F, 0x01, 0x01],
  'U': [0x3F, 0x40, 0x40, 0x40, 0x3F],
  'V': [0x1F, 0x20, 0x40, 0x20, 0x1F],
  'W': [0x7F, 0x20, 0x18, 0x20, 0x7F],
  'X': [0x63, 0x14, 0x08, 0x14, 0x63],
  'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
  'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
  '0': [0x3E, 0x41, 0x41, 0x41, 0x3E],
  '1': [0x00, 0x42, 0x7F, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4B, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7F, 0x10],
  '5': [0x2F, 0x49, 0x49, 0x49, 0x31],
  '6': [0x3E, 0x49, 0x49, 0x49, 0x32],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1E],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  '/': [0x20, 0x10, 0x08, 0x04, 0x02]
};

function createBmpBuffer(width, height) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const buf = Buffer.alloc(54 + rowSize * height, 255);

  buf.write('BM', 0);
  buf.writeUInt32LE(54 + rowSize * height, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(rowSize * height, 34);

  return { buf, width, height, rowSize };
}

function setPixel(bmp, x, y, r, g, b) {
  if (x < 0 || x >= bmp.width || y < 0 || y >= bmp.height) return;
  const bmpY = bmp.height - 1 - y;
  const offset = 54 + bmpY * bmp.rowSize + x * 3;
  bmp.buf[offset] = b;
  bmp.buf[offset + 1] = g;
  bmp.buf[offset + 2] = r;
}

function drawText(bmp, text, startX, startY, scale = 4, color = [0, 0, 0], angleDeg = 0) {
  const charW = 5, charH = 7, spacing = 1;
  const str = text.toUpperCase();
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  let curX = 0;
  for (const ch of str) {
    const glyph = FONT[ch] || FONT[' '];
    for (let col = 0; col < charW; col++) {
      const colBits = glyph[col];
      for (let row = 0; row < charH; row++) {
        if ((colBits >> row) & 1) {
          for (let sx = 0; sx < scale; sx++) {
            for (let sy = 0; sy < scale; sy++) {
              const lx = curX + col * scale + sx;
              const ly = row * scale + sy;

              const rx = Math.round(lx * cos - ly * sin);
              const ry = Math.round(lx * sin + ly * cos);

              setPixel(bmp, startX + rx, startY + ry, color[0], color[1], color[2]);
            }
          }
        }
      }
    }
    curX += (charW + spacing) * scale;
  }
}

function applyFoilGlare(bmp, x1, y1, x2, y2) {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      setPixel(bmp, x, y, 255, 255, 255);
    }
  }
}

function applyNoise(bmp, density = 0.05) {
  for (let y = 0; y < bmp.height; y++) {
    for (let x = 0; x < bmp.width; x++) {
      if (Math.random() < density) {
        const c = Math.random() < 0.5 ? 0 : 255;
        setPixel(bmp, x, y, c, c, c);
      }
    }
  }
}

const TEST_DEFINITIONS = [
  // Clean synthetic images
  { id: 'synthetic_strip_01_dolo650_clean.bmp', expected: 'Dolo 650', text: 'DOLO 650', scale: 5, category: 'synthetic_clean' },
  { id: 'synthetic_strip_02_telma40_clean.bmp', expected: 'Telma 40', text: 'TELMA 40', scale: 5, category: 'synthetic_clean' },
  { id: 'synthetic_strip_03_warf5_clean.bmp', expected: 'Warf 5', text: 'WARF 5', scale: 5, category: 'synthetic_clean' },
  { id: 'synthetic_strip_04_ecosprin75_clean.bmp', expected: 'Ecosprin 75', text: 'ECOSPRIN 75', scale: 5, category: 'synthetic_clean' },
  { id: 'synthetic_strip_05_glycomet500_clean.bmp', expected: 'Glycomet 500', text: 'GLYCOMET 500', scale: 5, category: 'synthetic_clean' },
  { id: 'synthetic_strip_06_combiflam_clean.bmp', expected: 'Combiflam', text: 'COMBIFLAM', scale: 5, category: 'synthetic_clean' },
  { id: 'synthetic_strip_07_pantocid40_clean.bmp', expected: 'Pantocid 40', text: 'PANTOCID 40', scale: 5, category: 'synthetic_clean' },
  { id: 'synthetic_strip_08_atorva20_clean.bmp', expected: 'Atorva 20', text: 'ATORVA 20', scale: 5, category: 'synthetic_clean' },
  { id: 'synthetic_strip_09_thyronorm50_clean.bmp', expected: 'Thyronorm 50', text: 'THYRONORM 50', scale: 5, category: 'synthetic_clean' },
  { id: 'synthetic_strip_10_shelcal500_clean.bmp', expected: 'Shelcal 500', text: 'SHELCAL 500', scale: 5, category: 'synthetic_clean' },
  { id: 'synthetic_strip_11_augmentin625_clean.bmp', expected: 'Augmentin 625 Duo', text: 'AUGMENTIN 625', scale: 4, category: 'synthetic_clean' },

  // Synthetic Glare / Blister reflections
  { id: 'synthetic_strip_12_dolo650_glare.bmp', expected: 'Dolo 650', text: 'DOLO 650', scale: 5, category: 'synthetic_glare', glare: true },
  { id: 'synthetic_strip_13_pantocid40_glare.bmp', expected: 'Pantocid 40', text: 'PANTOCID 40', scale: 5, category: 'synthetic_glare', glare: true },
  { id: 'synthetic_strip_14_shelcal500_glare.bmp', expected: 'Shelcal 500', text: 'SHELCAL 500', scale: 5, category: 'synthetic_glare', glare: true },

  // Synthetic Low Contrast
  { id: 'synthetic_strip_15_telma40_lowcontrast.bmp', expected: 'Telma 40', text: 'TELMA 40', scale: 5, category: 'synthetic_low_contrast', color: [160, 160, 160] },
  { id: 'synthetic_strip_16_thyronorm50_lowcontrast.bmp', expected: 'Thyronorm 50', text: 'THYRONORM 50', scale: 5, category: 'synthetic_low_contrast', color: [175, 175, 175] },
  { id: 'synthetic_strip_17_ecosprin75_lowcontrast.bmp', expected: 'Ecosprin 75', text: 'ECOSPRIN 75', scale: 5, category: 'synthetic_low_contrast', color: [165, 165, 165] },

  // Synthetic Skewed / Rotated Angle
  { id: 'synthetic_strip_18_warf5_skewed.bmp', expected: 'Warf 5', text: 'WARF 5', scale: 5, category: 'synthetic_skewed', angle: 8 },
  { id: 'synthetic_strip_19_atorva20_skewed.bmp', expected: 'Atorva 20', text: 'ATORVA 20', scale: 5, category: 'synthetic_skewed', angle: -7 },
  { id: 'synthetic_strip_20_glycomet500_skewed.bmp', expected: 'Glycomet 500', text: 'GLYCOMET 500', scale: 4, category: 'synthetic_skewed', angle: 10 },

  // Synthetic Noise & Small Font
  { id: 'synthetic_strip_21_combiflam_smallfont.bmp', expected: 'Combiflam', text: 'COMBIFLAM', scale: 2, category: 'synthetic_small_font' },
  { id: 'synthetic_strip_22_glycomet500_noise.bmp', expected: 'Glycomet 500', text: 'GLYCOMET 500', scale: 4, category: 'synthetic_noise', noise: true },

  // Synthetic Unrecognized Strip
  { id: 'synthetic_strip_23_unknown_zyzomycin.bmp', expected: null, text: 'ZYZOMYCIN 250', scale: 4, category: 'synthetic_unrecognized' }
];

export function generateAssets() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  // Clean out any old files in synthetic dir
  for (const f of fs.readdirSync(ASSETS_DIR)) {
    fs.unlinkSync(path.join(ASSETS_DIR, f));
  }

  const labels = [];

  for (const def of TEST_DEFINITIONS) {
    const width = 500;
    const height = 150;
    const bmp = createBmpBuffer(width, height);

    const color = def.color || [0, 0, 0];
    const angle = def.angle || 0;
    const startY = angle !== 0 ? 55 : 45;

    drawText(bmp, def.text, 30, startY, def.scale, color, angle);
    drawText(bmp, 'B.NO. 8921 EXP. 08/2026', 30, 115, 2, [100, 100, 100], angle);

    if (def.glare) {
      applyFoilGlare(bmp, 80, 40, 130, 85);
    }
    if (def.noise) {
      applyNoise(bmp, 0.04);
    }

    const filePath = path.join(ASSETS_DIR, def.id);
    fs.writeFileSync(filePath, bmp.buf);

    labels.push({
      file: def.id,
      expectedName: def.expected,
      category: def.category
    });
  }

  const labelsPath = path.join(ASSETS_DIR, 'labels.json');
  fs.writeFileSync(labelsPath, JSON.stringify(labels, null, 2));

  console.log(`Generated ${TEST_DEFINITIONS.length} synthetic test assets in ${ASSETS_DIR}`);
}

generateAssets();
