/**
 * candidateExtractor.js
 * 
 * Heuristic parser that cleans raw OCR text and extracts likely medicine names / strengths.
 * Filters out batch numbers, dates, prices, licence numbers, manufacturer boilerplate,
 * and regulatory warning text.
 */

// Patterns that identify a line as metadata/boilerplate to be ignored
const BOILERPLATE_PATTERNS = [
  /\b(?:b\.?\s*no|batch(?:\s*no)?|lot(?:\s*no)?|b\/n)\b/i,
  /\b(?:mfg(?:\.?\s*date)?|mfd|date\s*of\s*mfg)\b/i,
  /\b(?:exp(?:\.?\s*date)?|expiry(?:\s*date)?|use\s*before)\b/i,
  /\b(?:m\.?r\.?p|maximum\s*retail\s*price|incl(?:usive)?\s*of\s*all\s*taxes|rs\.?|₹)\b/i,
  /\b(?:lic(?:ence)?\.?\s*no|mfg\.?\s*lic|dl\s*no)\b/i,
  /\b(?:scheduled?\s*[hgh1x]\b|prescription\s*drug|schedule\s*h1)\b/i,
  /\b(?:caution|warning|not\s*to\s*be\s*sold|without\s*the\s*prescription)\b/i,
  /\b(?:dosage|as\s*directed\s*by|keep\s*out\s*of\s*reach|store\s*in|store\s*below|protect\s*from)\b/i,
  /\b(?:each\s*(?:uncoated|film\s*coated|sugar\s*coated)?\s*tablet\s*contains)\b/i,
  /\b(?:each\s*capsule\s*contains|excipients\s*q\.?s|colour|color)\b/i,
  /\b(?:manufactured\s*(?:in\s*india\s*)?by|marketed\s*by|mfg\s*by|mkt\s*by|mfg|mkt)\b/i,
  /\b(?:pvt\.?\s*ltd|laboratories|labs?|pharmaceuticals|healthcare|remedies|pharma|limited|corp|inc)\b/i,
  /\b(?:regd\.?\s*off|at:|plot\s*no|industrial\s*area|village|dist)\b/i,
  /\b(?:essai|assay|lot|batch|b\.?no|lic|licence|ref|code)\b/i,
  /\b(?:rd\s*emai|email|phone|tel|fax|website|www\.)\b/i,
  /\b(?:shutt[ea]rstock|alamy|getty|istock|dreamstime|stock\s*photo|\.com|\.org|\.in|\.net)\b/i, // Watermarks and URLs
  /\b[A-Za-z]\d{3,}\b/i, // batch codes like W952, B102
  /\b\d{3,}[A-Za-z]\b/i,
  /^\s*[\d\s\W]+\s*$/, // Only symbols or lone digits
];

const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'not', 'are', 'was', 'per', 'net', 'strip', 'pack']);

/**
 * Checks whether an extracted line is fragmented OCR noise (e.g. 'te Ih', 'il THe -', 'rFe E f- 1')
 */
function isNoisyFragment(text) {
  const words = text
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return true;

  // If text has no vowels, it's unreadable OCR noise (e.g. "CY", "rFe f")
  if (!/[aeiouy]/i.test(text)) return true;

  // Single letter words count
  const singleLetters = words.filter((w) => w.length === 1 && !/^\d+$/.test(w));
  if (words.length > 1 && (singleLetters.length / words.length) >= 0.33) {
    return true; // e.g. "rFe E f- 1"
  }

  // If every word is 2 letters or less, it is OCR fragmentation noise (e.g. "te Ih")
  if (words.every((w) => w.length <= 2)) return true;

  // Filter out stop words and require at least one substantive word with length >= 3
  const meaningful = words.filter((w) => w.length >= 3 && !STOPWORDS.has(w.toLowerCase()));
  if (meaningful.length === 0) return true;

  return false;
}

// Inline noise removals (e.g. strip trailing IP, BP, USP, Tab, Cap)
const PHARMACOPEIA_REGEX = /\b(i\.?p\.?|b\.?p\.?|u\.?s\.?p\.?)\b/gi;
const FORM_CLEANUP_REGEX = /\b(tablets?|capsules?|syrup|inj(?:ection)?|tabs?|caps?)\b/gi;
const DATE_FORMAT_REGEX = /\b(?:\d{1,2}[\/\.-]\d{2,4}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\.-]*\d{2,4})\b/gi;

/**
 * Extracts candidate medicine names from raw OCR string.
 * @param {string} rawText - Full raw OCR output
 * @returns {Array<string>} List of candidate medicine names
 */
export function extractCandidates(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  const lines = rawText.split(/\r?\n/);
  const candidates = [];
  const seen = new Set();

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.length < 3) continue;

    // 1. Check if line is boilerplate metadata
    const isBoilerplate = BOILERPLATE_PATTERNS.some((pat) => pat.test(trimmed));
    if (isBoilerplate) {
      continue;
    }

    // 2. Clean up dates and inline codes
    let cleaned = trimmed
      .replace(DATE_FORMAT_REGEX, ' ')
      .replace(PHARMACOPEIA_REGEX, ' ')
      .replace(/[\u2018\u2019\u201C\u201D"®™]/g, '')
      .replace(/[^a-zA-Z0-9\s\+\-\/\.]/g, ' ')
      .replace(/^[\s\+\-\/\.\,]+|[\s\+\-\/\.\,]+$/g, '') // Strip leading/trailing punctuation and hyphens
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned || cleaned.length < 3) continue;

    // Discard fragmented noise (e.g. "te Ih", "il THe -", "rFe E f- 1")
    if (isNoisyFragment(cleaned)) {
      continue;
    }

    // Check again after cleanup for empty/numeric-only lines
    if (/^\d+$/.test(cleaned) || cleaned.length < 3) {
      continue;
    }

    // Normalize casing for candidate checking
    const normalizedKey = cleaned.toLowerCase();
    if (!seen.has(normalizedKey)) {
      seen.add(normalizedKey);
      candidates.push(cleaned);
    }

    // Also extract clean brand name without "Tablets" or dosage form if present
    const withoutForm = cleaned.replace(FORM_CLEANUP_REGEX, '').replace(/\s+/g, ' ').trim();
    if (withoutForm && withoutForm.length >= 3 && withoutForm !== cleaned) {
      const formKey = withoutForm.toLowerCase();
      if (!seen.has(formKey) && !/^\d+$/.test(withoutForm)) {
        seen.add(formKey);
        candidates.push(withoutForm);
      }
    }
  }

  return candidates;
}
