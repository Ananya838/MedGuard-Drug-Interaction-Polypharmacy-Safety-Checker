import { describe, it, expect } from 'vitest';
import { extractCandidates } from '../candidateExtractor.js';
import { matchCandidates } from '../fuzzyMatcher.js';
import {
  calculateTargetDimensions,
  toGrayscale,
  boostContrast,
  adaptiveThreshold,
  estimateSkewAngle
} from '../imagePreprocessor.js';

describe('OCR Candidate Extractor', () => {
  it('extracts brand names while ignoring batch, dates, price, and regulatory warnings', () => {
    const rawOcrText = `
DOLO 650 TABLETS
Each uncoated tablet contains:
Paracetamol IP 650 mg
B.No. DL-90214
Mfg. Date: 03/2024
Exp. Date: 02/2027
M.R.P. Rs. 34.50 (Incl. of all taxes)
Mfg. Lic. No. M/742/2016
SCHEDULE H PRESCRIPTION DRUG - CAUTION
Not to be sold by retail without the prescription of a Registered Medical Practitioner.
Dosage: As directed by the physician.
Storage: Store in a cool, dry place.
Manufactured in India by:
MICRO LABS LIMITED
92, Sipcot, Hosur - 635 126
`;

    const candidates = extractCandidates(rawOcrText);
    expect(candidates).toContain('DOLO 650 TABLETS');
    expect(candidates).toContain('DOLO 650');
    expect(candidates).toContain('Paracetamol 650 mg');

    // Ensure all boilerplate lines were eliminated
    for (const c of candidates) {
      expect(c).not.toMatch(/B\.No/i);
      expect(c).not.toMatch(/Mfg\. Date/i);
      expect(c).not.toMatch(/Exp\. Date/i);
      expect(c).not.toMatch(/M\.R\.P/i);
      expect(c).not.toMatch(/SCHEDULE H/i);
      expect(c).not.toMatch(/Micro Labs/i);
      expect(c).not.toMatch(/Manufactured in/i);
    }
  });

  it('handles empty or noisy text gracefully', () => {
    expect(extractCandidates('')).toEqual([]);
    expect(extractCandidates(null)).toEqual([]);
    expect(extractCandidates('--- === ... 12345')).toEqual([]);
  });

  it('filters out fragmented OCR noise, batch codes, and watermarks (essai W952 A, te Ih, il THe -, shutterstock.com 2424259641)', () => {
    const noisyText = `
    essai W952 A
    te Ih
    il THe -
    shutterstock.com 2424259641
    TELMA 40
    `;
    const candidates = extractCandidates(noisyText);
    expect(candidates).toContain('TELMA 40');
    expect(candidates).not.toContain('essai W952 A');
    expect(candidates).not.toContain('te Ih');
    expect(candidates).not.toContain('il THe -');
    expect(candidates).not.toContain('shutterstock.com 2424259641');
  });
});

describe('OCR Fuzzy Matcher (Fuse.js)', () => {
  const knownNames = [
    'Dolo 650',
    'Telma 40',
    'Warf 5',
    'Ecosprin 75',
    'Glycomet 500',
    'Combiflam',
    'Thyronorm 50',
    'Paracetamol'
  ];

  it('assigns status "matched" for high-confidence exact/near matches', () => {
    const candidates = ['DOLO 650', 'Ecosprin 75mg'];
    const results = matchCandidates(candidates, knownNames);

    const dolo = results.find((r) => r.matchedName === 'Dolo 650');
    expect(dolo).toBeDefined();
    expect(dolo.status).toBe('matched');
    expect(dolo.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('assigns status "check_this" for medium-confidence matches', () => {
    // "TELMIKND 40" is a slight typo/variation of "Telma 40"
    const candidates = ['TELMIKND 40'];
    const results = matchCandidates(candidates, knownNames);

    expect(results.length).toBeGreaterThan(0);
    const telma = results[0];
    expect(telma.status).toBe('check_this');
    expect(telma.confidence).toBeGreaterThanOrEqual(0.45);
  });

  it('matches heavily distorted OCR strings like Pataceiamgr to Paracetamol', () => {
    const candidates = ['Pataceiamgr'];
    const results = matchCandidates(candidates, knownNames);

    expect(results.length).toBeGreaterThan(0);
    const paracetamol = results[0];
    expect(paracetamol.matchedName).toBe('Paracetamol');
    expect(paracetamol.status).toBe('check_this');
    expect(paracetamol.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('assigns status "unrecognized" and NEVER silently drops unknown pills (Rule #5)', () => {
    const candidates = ['UNKNOWN PILL FOIL X99'];
    const results = matchCandidates(candidates, knownNames);

    expect(results.length).toBe(1);
    expect(results[0].status).toBe('unrecognized');
    expect(results[0].matchedName).toBeNull();
    expect(results[0].rawText).toBe('UNKNOWN PILL FOIL X99');
  });
});

describe('Image Preprocessor Algorithms', () => {
  it('calculateTargetDimensions scales images wider than 1200px', () => {
    const scaled = calculateTargetDimensions(2400, 1600, 1200);
    expect(scaled.width).toBe(1200);
    expect(scaled.height).toBe(800);

    const small = calculateTargetDimensions(800, 600, 1200);
    expect(small.width).toBe(800);
    expect(small.height).toBe(600);
  });

  it('toGrayscale converts RGB to luminance', () => {
    // RGBA: [255, 0, 0, 255] (Pure Red) -> 0.299 * 255 = ~76
    const data = new Uint8ClampedArray([255, 0, 0, 255]);
    toGrayscale(data);
    expect(data[0]).toBe(76);
    expect(data[1]).toBe(76);
    expect(data[2]).toBe(76);
    expect(data[3]).toBe(255);
  });

  it('boostContrast stretches dynamic range', () => {
    // Narrow range 100 to 150
    const data = new Uint8ClampedArray([
      100, 100, 100, 255,
      125, 125, 125, 255,
      150, 150, 150, 255
    ]);
    boostContrast(data);
    // After stretching, lowest approaches 0 and highest approaches 255
    expect(data[0]).toBeLessThanOrEqual(5);
    expect(data[8]).toBeGreaterThanOrEqual(250);
  });

  it('adaptiveThreshold separates dark text from bright background', () => {
    // 3x3 pixel grid: dark center pixel (text), white background
    const width = 3;
    const height = 3;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 240;
      data[i + 1] = 240;
      data[i + 2] = 240;
      data[i + 3] = 255;
    }
    // Set center pixel to dark (40)
    const centerIdx = (1 * 3 + 1) * 4;
    data[centerIdx] = 40;
    data[centerIdx + 1] = 40;
    data[centerIdx + 2] = 40;

    adaptiveThreshold(data, width, height, 3, 5);

    // Center pixel should be binarized to 0 (black/ink)
    expect(data[centerIdx]).toBe(0);
    // Background pixels should be 255 (white)
    expect(data[0]).toBe(255);
  });

  it('estimateSkewAngle detects horizontal angle', () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    for (const y of [30, 50, 70]) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 0;
      }
    }
    const angle = estimateSkewAngle(data, width, height, 1);
    expect(Math.abs(angle)).toBeLessThanOrEqual(1);
  });
});
