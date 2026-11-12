import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve('server/.env') });
dotenv.config();

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL || process.env.MIGRATION_DATABASE_URL;

if (!connectionString) {
  console.error('Error: Neither DATABASE_URL nor MIGRATION_DATABASE_URL is set.');
  process.exit(1);
}

async function runExpansion() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('Expanding MedGuard Indian Brand and Ingredient Catalog...');
    await client.query('BEGIN');

    // Load existing ingredients & synonyms
    const { rows: ingRows } = await client.query('SELECT id, lower(name) AS name FROM ingredients');
    const { rows: synRows } = await client.query('SELECT ingredient_id, lower(synonym) AS synonym FROM ingredient_synonyms');

    const ingredientMap = new Map();
    for (const r of ingRows) {
      ingredientMap.set(r.name, r.id);
    }
    for (const r of synRows) {
      ingredientMap.set(r.synonym, r.ingredient_id);
    }

    // Helper: get or create ingredient
    async function ensureIngredient(name) {
      const lower = name.toLowerCase().trim();
      if (ingredientMap.has(lower)) {
        return ingredientMap.get(lower);
      }
      const insRes = await client.query(
        `INSERT INTO ingredients (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [lower]
      );
      const newId = insRes.rows[0].id;
      ingredientMap.set(lower, newId);
      return newId;
    }

    // Read expanded brand list
    const catalogPath = path.join(__dirname, '../db/seeds/expanded_indian_brands.json');
    const data = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

    let addedBrands = 0;
    let addedMappings = 0;

    for (const b of data.brands) {
      // Check if brand already exists
      const existRes = await client.query(
        'SELECT id FROM brands WHERE lower(brand_name) = lower($1)',
        [b.brandName.trim()]
      );

      let brandId;
      if (existRes.rows.length > 0) {
        brandId = existRes.rows[0].id;
      } else {
        const brandIns = await client.query(
          `INSERT INTO brands (brand_name, manufacturer, form, strength_raw)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [b.brandName.trim(), b.manufacturer || 'Unknown', b.form || 'tablet', b.strengthRaw || '']
        );
        brandId = brandIns.rows[0].id;
        addedBrands++;
      }

      // Link ingredients
      if (Array.isArray(b.ingredients)) {
        for (const ing of b.ingredients) {
          const ingId = await ensureIngredient(ing.name);
          const mapExist = await client.query(
            'SELECT 1 FROM brand_ingredients WHERE brand_id = $1 AND ingredient_id = $2',
            [brandId, ingId]
          );
          if (mapExist.rows.length === 0) {
            await client.query(
              `INSERT INTO brand_ingredients (brand_id, ingredient_id, strength_mg)
               VALUES ($1, $2, $3)`,
              [brandId, ingId, Number(ing.strengthMg) || 0]
            );
            addedMappings++;
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log(`[CATALOG EXPANSION SUCCESS] Added ${addedBrands} new brands and ${addedMappings} formulation mappings.`);

    // Summary count
    const totalBrands = await client.query('SELECT count(*) FROM brands');
    const totalIngredients = await client.query('SELECT count(*) FROM ingredients');
    const totalMappings = await client.query('SELECT count(*) FROM brand_ingredients');

    console.log('==============================================');
    console.log(`TOTAL COMMERCIAL BRANDS NOW IN DATABASE: ${totalBrands.rows[0].count}`);
    console.log(`TOTAL ACTIVE INGREDIENTS NOW IN DATABASE: ${totalIngredients.rows[0].count}`);
    console.log(`TOTAL FORMULATION MAPPINGS NOW: ${totalMappings.rows[0].count}`);
    console.log('==============================================');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Expansion failed:', err);
    throw err;
  } finally {
    await client.end();
  }
}

runExpansion().catch(() => process.exit(1));

