import { Router } from 'express';
import { getPool } from '../config.js';
import { authenticate } from '../middleware/authenticate.js';

export const medicineRouter = Router();

// Protect all medicine catalog endpoints with JWT authentication
medicineRouter.use(authenticate);

// In-memory caches to cut database network latency
const searchCache = new Map();
const normalizeCache = new Map();
const rxNormCache = new Map();
const MAX_CACHE_SIZE = 500;

function setInCache(map, key, val) {
  if (map.size >= MAX_CACHE_SIZE) {
    const firstKey = map.keys().next().value;
    map.delete(firstKey);
  }
  map.set(key, val);
}

/**
 * Query RxNorm approximateTerm API as a fallback to resolve generic or international terms.
 * Returns null if network fails, times out, or term is unknown.
 */
async function queryRxNorm(term) {
  if (!term || typeof term !== 'string' || term.trim().length < 3) return null;
  // In test environment without explicit network flag, skip gracefully
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_RXNORM_NETWORK) {
    return null;
  }

  const clean = term.replace(/[^a-zA-Z0-9\s-]/g, ' ').trim();
  if (!/^[a-zA-Z\s]{3,35}$/.test(clean)) return null;

  const cacheKey = clean.toLowerCase();
  if (rxNormCache.has(cacheKey)) {
    return rxNormCache.get(cacheKey);
  }

  try {
    const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(clean)}&maxEntries=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(800) });
    if (!res.ok) {
      setInCache(rxNormCache, cacheKey, null);
      return null;
    }
    const data = await res.json();
    const candidates = data?.approximateGroup?.candidate;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      setInCache(rxNormCache, cacheKey, null);
      return null;
    }
    const top = candidates[0];
    const candidateObj = {
      rxcui: top.rxcui,
      name: top.name || clean,
    };
    setInCache(rxNormCache, cacheKey, candidateObj);
    return candidateObj;
  } catch {
    setInCache(rxNormCache, cacheKey, null);
    return null;
  }
}

/**
 * GET /api/medicines/search?q={query}
 * Autocomplete search for brand names and formulations in the local catalog.
 */
medicineRouter.get('/search', async (req, res, next) => {
  try {
    const q = req.query.q;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query parameter "q" must be at least 2 characters long.',
        },
      });
    }

    const cleanQ = q.trim().toLowerCase();
    if (searchCache.has(cleanQ)) {
      return res.status(200).json({
        success: true,
        data: searchCache.get(cleanQ),
      });
    }

    const pool = getPool();
    const searchPattern = `%${cleanQ}%`;

    const result = await pool.query(
      `SELECT b.id, b.brand_name AS name, b.manufacturer, b.strength_raw AS strength, b.form,
              COALESCE(
                json_agg(
                  json_build_object('id', i.id, 'name', i.name, 'strengthMg', bi.strength_mg)
                ) FILTER (WHERE i.id IS NOT NULL),
                '[]'::json
              ) AS ingredients
       FROM brands b
       LEFT JOIN brand_ingredients bi ON b.id = bi.brand_id
       LEFT JOIN ingredients i ON bi.ingredient_id = i.id
       WHERE b.id IN (
         SELECT b2.id FROM brands b2
         LEFT JOIN brand_ingredients bi2 ON b2.id = bi2.brand_id
         LEFT JOIN ingredients i2 ON bi2.ingredient_id = i2.id
         WHERE b2.brand_name ILIKE $1 OR i2.name ILIKE $1
         LIMIT 20
       )
       GROUP BY b.id, b.brand_name, b.manufacturer, b.strength_raw, b.form
       ORDER BY b.brand_name ASC`,
      [searchPattern]
    );

    setInCache(searchCache, cleanQ, result.rows);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/medicines/normalize
 * Resolves messy raw brand names or OCR strings to catalog brand entries and their ingredients.
 * Uses local Indian brand catalog first, then active ingredient lookup, then RxNorm API fallback.
 * Processes queries in parallel for low latency.
 * Unrecognized items are explicitly captured in 'unresolved' and never silently dropped.
 */
medicineRouter.post('/normalize', async (req, res, next) => {
  try {
    const { queries } = req.body || {};

    if (!Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body must contain a non-empty "queries" array.',
        },
      });
    }

    const pool = getPool();

    const results = await Promise.all(
      queries.map(async (rawQuery) => {
        if (!rawQuery || typeof rawQuery !== 'string' || rawQuery.trim().length === 0) {
          return null;
        }

        const cleanQuery = rawQuery.trim();
        const cacheKey = cleanQuery.toLowerCase();
        if (normalizeCache.has(cacheKey)) {
          return normalizeCache.get(cacheKey);
        }

        // 1. Direct or ILIKE match in commercial brands catalog
        let brandRes = await pool.query(
          `SELECT b.id, b.brand_name, b.manufacturer, b.form, b.strength_raw
           FROM brands b
           WHERE lower(b.brand_name) = lower($1) OR b.brand_name ILIKE $2
           ORDER BY length(b.brand_name) ASC
           LIMIT 1`,
          [cleanQuery, `%${cleanQuery}%`]
        );

        // 2. Generic name or active ingredient match in local catalog
        if (brandRes.rows.length === 0) {
          const ingMatch = await pool.query(
            `SELECT b.id, b.brand_name, b.manufacturer, b.form, b.strength_raw
             FROM ingredients i
             LEFT JOIN ingredient_synonyms s ON s.ingredient_id = i.id
             JOIN brand_ingredients bi ON bi.ingredient_id = i.id
             JOIN brands b ON b.id = bi.brand_id
             WHERE lower(i.name) = lower($1) OR lower(s.synonym) = lower($1)
                OR i.name ILIKE $2 OR s.synonym ILIKE $2
             ORDER BY length(b.brand_name) ASC
             LIMIT 1`,
            [cleanQuery, `%${cleanQuery}%`]
          );
          if (ingMatch.rows.length > 0) {
            brandRes = ingMatch;
          }
        }

        // 3. Normalized stem and trigram fuzzy matching for OCR typos
        const stem = cleanQuery
          .replace(/\b(?:tablets?|capsules?|syrup|inj(?:ection)?|tabs?|caps?|mg|mcg|gm)\b/gi, '')
          .replace(/\d+/g, '')
          .replace(/^[\s\+\-\/\.\,]+|[\s\+\-\/\.\,]+$/g, '')
          .trim();

        if (brandRes.rows.length === 0 && stem.length >= 3 && stem.toLowerCase() !== cleanQuery.toLowerCase()) {
          const stemMatch = await pool.query(
            `SELECT b.id, b.brand_name, b.manufacturer, b.form, b.strength_raw
             FROM brands b
             WHERE lower(b.brand_name) = lower($1) OR b.brand_name ILIKE $2
             ORDER BY length(b.brand_name) ASC
             LIMIT 1`,
            [stem, `%${stem}%`]
          );
          if (stemMatch.rows.length > 0) {
            brandRes = stemMatch;
          } else {
            const ingStemMatch = await pool.query(
              `SELECT b.id, b.brand_name, b.manufacturer, b.form, b.strength_raw
               FROM ingredients i
               LEFT JOIN ingredient_synonyms s ON s.ingredient_id = i.id
               JOIN brand_ingredients bi ON bi.ingredient_id = i.id
               JOIN brands b ON b.id = bi.brand_id
               WHERE lower(i.name) = lower($1) OR lower(s.synonym) = lower($1)
                  OR i.name ILIKE $2 OR s.synonym ILIKE $2
               ORDER BY length(b.brand_name) ASC
               LIMIT 1`,
              [stem, `%${stem}%`]
            );
            if (ingStemMatch.rows.length > 0) {
              brandRes = ingStemMatch;
            }
          }
        }

        // Trigram fuzzy similarity check if still unresolved
        if (brandRes.rows.length === 0 && (cleanQuery.length >= 3 || stem.length >= 3)) {
          const queryTerm = stem.length >= 3 ? stem : cleanQuery;
          const fuzzyMatch = await pool.query(
            `SELECT b.id, b.brand_name, b.manufacturer, b.form, b.strength_raw,
                    GREATEST(
                      similarity(lower(b.brand_name), lower($1)),
                      similarity(lower(i.name), lower($1)),
                      coalesce(similarity(lower(s.synonym), lower($1)), 0)
                    ) AS sim_score
             FROM brands b
             JOIN brand_ingredients bi ON bi.brand_id = b.id
             JOIN ingredients i ON i.id = bi.ingredient_id
             LEFT JOIN ingredient_synonyms s ON s.ingredient_id = i.id
             WHERE similarity(lower(b.brand_name), lower($1)) >= 0.28
                OR similarity(lower(i.name), lower($1)) >= 0.28
                OR similarity(lower(s.synonym), lower($1)) >= 0.28
             ORDER BY sim_score DESC
             LIMIT 1`,
            [queryTerm]
          );
          if (fuzzyMatch.rows.length > 0) {
            brandRes = fuzzyMatch;
          }
        }

        // 4. Fallback: Public RxNorm REST API (PRD FR-8)
        if (brandRes.rows.length === 0) {
          const rxNormCandidate = await queryRxNorm(cleanQuery);
          if (rxNormCandidate) {
            const candName = rxNormCandidate.name.toLowerCase();
            const rxRes = await pool.query(
              `SELECT b.id, b.brand_name, b.manufacturer, b.form, b.strength_raw
               FROM ingredients i
               LEFT JOIN ingredient_synonyms s ON s.ingredient_id = i.id
               JOIN brand_ingredients bi ON bi.ingredient_id = i.id
               JOIN brands b ON b.id = bi.brand_id
               WHERE lower(i.name) = lower($1) OR lower(s.synonym) = lower($1)
                  OR i.name ILIKE $2 OR s.synonym ILIKE $2
                  OR i.rxcui = $3
               ORDER BY length(b.brand_name) ASC
               LIMIT 1`,
              [candName, `%${candName}%`, String(rxNormCandidate.rxcui)]
            );
            if (rxRes.rows.length > 0) {
              brandRes = rxRes;
            }
          }
        }

        let itemResult = null;
        if (brandRes.rows.length > 0) {
          const brand = brandRes.rows[0];
          const ingRes = await pool.query(
            `SELECT i.id, i.name, bi.strength_mg AS "strengthMg"
             FROM brand_ingredients bi
             JOIN ingredients i ON bi.ingredient_id = i.id
             WHERE bi.brand_id = $1`,
            [brand.id]
          );

          itemResult = {
            resolved: true,
            data: {
              query: rawQuery,
              brandId: brand.id,
              brandName: brand.brand_name,
              form: brand.form,
              manufacturer: brand.manufacturer,
              ingredients: ingRes.rows.map((r) => ({
                id: r.id,
                name: r.name,
                strengthMg: Number(r.strengthMg) || 0,
              })),
            },
          };
        } else {
          itemResult = {
            resolved: false,
            data: {
              query: rawQuery,
              reason: 'Not found in local brand catalog',
            },
          };
        }

        setInCache(normalizeCache, cacheKey, itemResult);
        return itemResult;
      })
    );

    const resolved = [];
    const unresolved = [];

    for (const r of results) {
      if (!r) continue;
      if (r.resolved) {
        resolved.push(r.data);
      } else {
        unresolved.push(r.data);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        resolved,
        unresolved,
      },
    });
  } catch (err) {
    next(err);
  }
});
