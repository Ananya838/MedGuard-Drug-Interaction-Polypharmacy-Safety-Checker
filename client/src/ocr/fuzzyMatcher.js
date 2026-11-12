/**
 * fuzzyMatcher.js
 * 
 * Uses Fuse.js to match extracted candidate strings against a caller-provided knownNames list.
 * Assigns deterministic status:
 * - "matched" for high confidence (Fuse score <= 0.25)
 * - "check_this" for medium confidence (Fuse score 0.25 - 0.55)
 * - "unrecognized" for low/no match (never dropped silently)
 */

import Fuse from 'fuse.js';

const FUSE_OPTIONS = {
  includeScore: true,
  threshold: 0.52,
  minMatchCharLength: 2,
  ignoreLocation: true,
  keys: ['name']
};

/**
 * Matches candidates against a list of known medicine names.
 * @param {Array<string>} candidates - Extracted candidate strings from OCR
 * @param {Array<string|object>} knownNames - List of known medicine names passed by caller
 * @returns {Array<{ rawText: string, matchedName: string|null, confidence: number, status: string }>}
 */
export function matchCandidates(candidates, knownNames = []) {
  if (!candidates || candidates.length === 0) {
    return [];
  }

  // Normalize knownNames to uniform objects for Fuse
  const normalizedList = knownNames.map((item) => {
    if (typeof item === 'string') {
      return { name: item, original: item };
    }
    return {
      name: item.name || item.brandName || String(item),
      original: item.name || item.brandName || String(item)
    };
  });

  const fuse = new Fuse(normalizedList, FUSE_OPTIONS);
  const results = [];
  const matchedSeen = new Map(); // matchedName -> index in results

  for (const rawCandidate of candidates) {
    if (!rawCandidate || rawCandidate.trim().length === 0) continue;

    const trimmed = rawCandidate.trim();
    const searchResults = fuse.search(trimmed);

    if (searchResults.length > 0) {
      const best = searchResults[0];
      const score = best.score ?? 1; // 0 is perfect match, 1 is total mismatch
      const confidence = Math.round((1 - score) * 100) / 100;
      const matchedName = best.item.original;

      let status = 'unrecognized';
      if (score <= 0.25) {
        status = 'matched';
      } else if (score <= 0.55) {
        status = 'check_this';
      }

      const matchItem = {
        rawText: trimmed,
        matchedName: status === 'unrecognized' ? null : matchedName,
        confidence: status === 'unrecognized' ? 0 : confidence,
        status
      };

      // If matched or check_this, avoid duplicate results for the same target medicine unless higher confidence
      if (status !== 'unrecognized') {
        const existingIdx = matchedSeen.get(matchedName);
        if (existingIdx !== undefined) {
          if (confidence > results[existingIdx].confidence) {
            results[existingIdx] = matchItem;
          }
          continue;
        } else {
          matchedSeen.set(matchedName, results.length);
        }
      }

      results.push(matchItem);
    } else {
      // Rule #5: Show uncertainty. Never drop an unrecognized candidate silently.
      results.push({
        rawText: trimmed,
        matchedName: null,
        confidence: 0,
        status: 'unrecognized'
      });
    }
  }

  return results;
}
