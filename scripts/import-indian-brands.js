import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to parse CSV line handling quotes
export function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map((col) => col.replace(/^"(.*)"$/, '$1').trim());
}

/**
 * Parses composition string like "Pantoprazole (40mg) + Domperidone (30mg)"
 * or "Paracetamol 650mg + Caffeine 30mg"
 */
export function parseComposition(compStr) {
  if (!compStr) return [];
  const parts = compStr.split(/\+|\/|;/).map((p) => p.trim());
  const ingredients = [];

  for (const part of parts) {
    const match = part.match(/^([a-zA-Z\s\-]+?)(?:\s*\(|\s+)(\d+(?:\.\d+)?)\s*(?:mg|mcg|g)?(?:\)|$)/i);
    if (match) {
      const name = match[1].trim().toLowerCase();
      const strength = parseFloat(match[2]);
      ingredients.push({ name, strengthMg: isNaN(strength) ? 0 : strength });
    } else {
      const cleanName = part.replace(/[\d\(\)mg\.\s]/gi, '').trim().toLowerCase();
      if (cleanName.length > 2) {
        ingredients.push({ name: cleanName, strengthMg: 0 });
      }
    }
  }
  return ingredients;
}

/**
 * Imports one or more Indian Brand CSV files.
 * Reads header row, validates required columns, maps drug names via ingredient_synonyms,
 * links brand ingredients, and returns matched, merged, and skipped counts.
 *
 * @param {Array<string>} filePaths
 * @param {Object} [options]
 * @param {Object} [options.client] - Optional pre-connected pg Client or mock
 * @param {string} [options.connectionString]
 * @returns {Promise<{ totalMatched: number, totalMerged: number, totalSkipped: number, fileSummaries: Array<Object> }>}
 */
export async function importIndianBrands(filePaths, options = {}) {
  const connectionString = options.connectionString || process.env.DATABASE_URL || process.env.MIGRATION_DATABASE_URL;

  if (!options.client && !connectionString) {
    throw new Error('Neither DATABASE_URL nor MIGRATION_DATABASE_URL is set in environment.');
  }

  const client = options.client || new Client({ connectionString });
  const shouldClose = !options.client;
  if (shouldClose) {
    await client.connect();
  }

  try {
    const { rows: ingRows } = await client.query('SELECT id, lower(name) AS name FROM ingredients');
    const { rows: synRows } = await client.query('SELECT ingredient_id, lower(synonym) AS synonym FROM ingredient_synonyms');

    const synonymMap = new Map();
    for (const r of ingRows) {
      synonymMap.set(r.name, r.id);
    }
    for (const r of synRows) {
      synonymMap.set(r.synonym, r.ingredient_id);
    }

    let totalMatched = 0;
    let totalMerged = 0;
    let totalSkipped = 0;
    const fileSummaries = [];

    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist at path: ${filePath}`);
      }

      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

      let headerIndices = null;
      let lineNumber = 0;
      let fileMatched = 0;
      let fileMerged = 0;
      let fileSkipped = 0;

      for await (const rawLine of rl) {
        lineNumber++;
        const line = rawLine.trim();
        if (!line) continue;

        if (!headerIndices) {
          const headers = parseCsvLine(line);
          const brandIdx = headers.findIndex((h) => /^(brand[_ ]?name|medicine[_ ]?name|name)$/i.test(h));
          const compIdx = headers.findIndex((h) => /^(composition|ingredients|salt|salts)$/i.test(h));
          const mfgIdx = headers.findIndex((h) => /^(manufacturer|mfg|company)$/i.test(h));
          const formIdx = headers.findIndex((h) => /^(form|dosage_form|type)$/i.test(h));

          const missing = [];
          if (brandIdx === -1) missing.push('brand_name');
          if (compIdx === -1) missing.push('composition');

          if (missing.length > 0) {
            throw new Error(
              `Header validation failed in '${path.basename(filePath)}'. Missing required column(s): ${missing.join(', ')}. ` +
              `Expected headers must contain: brand_name, composition. Found: [${headers.join(', ')}]`
            );
          }

          headerIndices = { brandIdx, compIdx, mfgIdx, formIdx };
          continue;
        }

        const cols = parseCsvLine(line);
        const brandName = cols[headerIndices.brandIdx]?.trim();
        const rawComp = cols[headerIndices.compIdx]?.trim();
        const manufacturer = headerIndices.mfgIdx !== -1 ? cols[headerIndices.mfgIdx]?.trim() : 'Unknown';
        const form = headerIndices.formIdx !== -1 ? cols[headerIndices.formIdx]?.trim() : 'tablet';

        if (!brandName || !rawComp) {
          fileSkipped++;
          continue;
        }

        const parsedIngredients = parseComposition(rawComp);
        if (parsedIngredients.length === 0) {
          fileSkipped++;
          continue;
        }

        const resolvedPairs = [];
        let allResolved = true;

        for (const item of parsedIngredients) {
          const ingId = synonymMap.get(item.name);
          if (!ingId) {
            allResolved = false;
            break;
          }
          resolvedPairs.push({ ingredientId: ingId, strengthMg: item.strengthMg });
        }

        if (!allResolved || resolvedPairs.length === 0) {
          fileSkipped++;
          continue;
        }

        const brandRes = await client.query(
          `INSERT INTO brands (brand_name, manufacturer, form, strength_raw)
           VALUES ($1, $2, $3, $4)
           RETURNING id, (xmax = 0) AS is_inserted`,
          [brandName, manufacturer, form, rawComp]
        );

        const brandId = brandRes.rows[0].id;
        const isInserted = brandRes.rows[0].is_inserted;

        for (const pair of resolvedPairs) {
          await client.query(
            `INSERT INTO brand_ingredients (brand_id, ingredient_id, strength_mg)
             VALUES ($1, $2, $3)
             ON CONFLICT (brand_id, ingredient_id) DO UPDATE SET strength_mg = EXCLUDED.strength_mg`,
            [brandId, pair.ingredientId, pair.strengthMg]
          );
        }

        if (isInserted) {
          fileMatched++;
        } else {
          fileMerged++;
        }
      }

      fileSummaries.push({
        file: path.basename(filePath),
        matched: fileMatched,
        merged: fileMerged,
        skipped: fileSkipped
      });

      totalMatched += fileMatched;
      totalMerged += fileMerged;
      totalSkipped += fileSkipped;
    }

    return { totalMatched, totalMerged, totalSkipped, fileSummaries };
  } finally {
    if (shouldClose) {
      await client.end();
    }
  }
}

// CLI entrypoint
if (process.argv[1] && process.argv[1].endsWith('import-indian-brands.js')) {
  const inputFiles = process.argv.slice(2);
  const filesToProcess = inputFiles.length > 0
    ? inputFiles
    : fs.existsSync(path.join(__dirname, 'data'))
      ? fs.readdirSync(path.join(__dirname, 'data'))
          .filter((f) => /brand.*\.csv$/i.test(f))
          .map((f) => path.join(__dirname, 'data', f))
      : [];

  if (filesToProcess.length === 0) {
    console.log('No input files specified. Provide file paths as arguments, or place brand_*.csv files in scripts/data/.');
    console.log('Usage: node scripts/import-indian-brands.js scripts/data/sample_indian_medicines.csv');
    process.exit(0);
  }

  importIndianBrands(filesToProcess)
    .then((result) => {
      console.log('\n================ Indian Brands Import Complete ================');
      for (const s of result.fileSummaries) {
        console.log(`File: ${s.file}`);
        console.log(`  - Matched: ${s.matched}`);
        console.log(`  - Merged:  ${s.merged}`);
        console.log(`  - Skipped: ${s.skipped}`);
      }
      console.log(`Total Matched & Inserted: ${result.totalMatched}`);
      console.log(`Total Merged & Updated:   ${result.totalMerged}`);
      console.log(`Total Skipped:            ${result.totalSkipped}`);
      console.log('===============================================================\n');
    })
    .catch((err) => {
      console.error('Indian Brands Import Failed:', err.message);
      process.exit(1);
    });
}
