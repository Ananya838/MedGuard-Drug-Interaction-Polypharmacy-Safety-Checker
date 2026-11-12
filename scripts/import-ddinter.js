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
 * Imports one or more DDInter CSV files.
 * Reads header row, validates required columns, maps drug names via ingredient_synonyms,
 * canonicalizes integer IDs (A < B), and returns matched, merged, and skipped counts.
 *
 * @param {Array<string>} filePaths
 * @param {Object} [options]
 * @param {Object} [options.client] - Optional pre-connected pg Client or mock
 * @param {string} [options.connectionString]
 * @returns {Promise<{ totalMatched: number, totalMerged: number, totalSkipped: number, fileSummaries: Array<Object> }>}
 */
export async function importDdinterFiles(filePaths, options = {}) {
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
          const drugAIdx = headers.findIndex((h) => /^drug[_ ]?a$/i.test(h));
          const drugBIdx = headers.findIndex((h) => /^drug[_ ]?b$/i.test(h));
          const levelIdx = headers.findIndex((h) => /^level$/i.test(h));
          const descIdx = headers.findIndex((h) => /^(description|summary|effect)$/i.test(h));

          const missing = [];
          if (drugAIdx === -1) missing.push('Drug_A');
          if (drugBIdx === -1) missing.push('Drug_B');
          if (levelIdx === -1) missing.push('Level');

          if (missing.length > 0) {
            throw new Error(
              `Header validation failed in '${path.basename(filePath)}'. Missing required column(s): ${missing.join(', ')}. ` +
              `Expected headers must contain: Drug_A, Drug_B, Level. Found: [${headers.join(', ')}]`
            );
          }

          headerIndices = { drugAIdx, drugBIdx, levelIdx, descIdx };
          continue;
        }

        const cols = parseCsvLine(line);
        const rawDrugA = cols[headerIndices.drugAIdx]?.toLowerCase().trim();
        const rawDrugB = cols[headerIndices.drugBIdx]?.toLowerCase().trim();
        const rawLevel = cols[headerIndices.levelIdx]?.toLowerCase().trim();
        const description = (headerIndices.descIdx !== -1 ? cols[headerIndices.descIdx] : '') ||
          `Interaction between ${rawDrugA} and ${rawDrugB}.`;

        if (!rawDrugA || !rawDrugB || !rawLevel) {
          fileSkipped++;
          continue;
        }

        const idA = synonymMap.get(rawDrugA);
        const idB = synonymMap.get(rawDrugB);

        if (!idA || !idB || idA === idB) {
          fileSkipped++;
          continue;
        }

        // Canonical integer order: A < B
        const [canonA, canonB] = idA < idB ? [idA, idB] : [idB, idA];
        let severity = 'moderate';
        if (rawLevel.includes('major') || rawLevel.includes('severe') || rawLevel.includes('critical')) {
          severity = 'major';
        } else if (rawLevel.includes('minor') || rawLevel.includes('mild')) {
          severity = 'minor';
        }

        const summary = `${rawDrugA.charAt(0).toUpperCase() + rawDrugA.slice(1)} and ${rawDrugB.charAt(0).toUpperCase() + rawDrugB.slice(1)} interaction.`;

        const res = await client.query(
          `INSERT INTO interactions (ingredient_a, ingredient_b, severity, summary, explanation, source)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE
           SET severity = EXCLUDED.severity, explanation = EXCLUDED.explanation, source = EXCLUDED.source
           RETURNING (xmax = 0) AS is_inserted`,
          [canonA, canonB, severity, summary, description, 'DDInter v2.0']
        );

        if (res.rows && res.rows.length > 0 && res.rows[0].is_inserted) {
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
if (process.argv[1] && process.argv[1].endsWith('import-ddinter.js')) {
  const inputFiles = process.argv.slice(2);
  const filesToProcess = inputFiles.length > 0
    ? inputFiles
    : fs.existsSync(path.join(__dirname, 'data'))
      ? fs.readdirSync(path.join(__dirname, 'data'))
          .filter((f) => /ddinter.*\.csv$/i.test(f))
          .map((f) => path.join(__dirname, 'data', f))
      : [];

  if (filesToProcess.length === 0) {
    console.log('No input files specified. Provide file paths as arguments, or place ddinter_*.csv files in scripts/data/.');
    console.log('Usage: node scripts/import-ddinter.js scripts/data/ddinter_sample.csv');
    process.exit(0);
  }

  importDdinterFiles(filesToProcess)
    .then((result) => {
      console.log('\n================ DDInter Import Complete ================');
      for (const s of result.fileSummaries) {
        console.log(`File: ${s.file}`);
        console.log(`  - Matched: ${s.matched}`);
        console.log(`  - Merged:  ${s.merged}`);
        console.log(`  - Skipped: ${s.skipped}`);
      }
      console.log(`Total Matched & Inserted: ${result.totalMatched}`);
      console.log(`Total Merged & Updated:   ${result.totalMerged}`);
      console.log(`Total Skipped:            ${result.totalSkipped}`);
      console.log('=========================================================\n');
    })
    .catch((err) => {
      console.error('DDInter Import Failed:', err.message);
      process.exit(1);
    });
}
