import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL || process.env.MIGRATION_DATABASE_URL;

if (!connectionString) {
  console.error('Error: Neither DATABASE_URL nor MIGRATION_DATABASE_URL is set.');
  process.exit(1);
}

// Single shared source of truth for the 33 starter pairs
const STARTER_PAIRS_FILE = path.join(__dirname, '../server/engine/tests/starter-pairs.json');

async function runSeed() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('Beginning database seeding with MedGuard sample data...');
    await client.query('BEGIN');

    const seedsDir = path.join(__dirname, '../db/seeds');

    // 1. Seed Ingredients, Synonyms, Classes, and Dose Limits
    const ingredientsRaw = JSON.parse(fs.readFileSync(path.join(seedsDir, 'sample_ingredients.json'), 'utf8'));
    const ingredientIdMap = new Map(); // name -> id
    const classIdMap = new Map(); // name -> id

    for (const ing of ingredientsRaw.ingredients) {
      const lowerName = ing.name.toLowerCase().trim();
      const ingRes = await client.query(
        `INSERT INTO ingredients (name, rxcui)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET rxcui = EXCLUDED.rxcui
         RETURNING id`,
        [lowerName, ing.rxcui || null]
      );
      const ingredientId = ingRes.rows[0].id;
      ingredientIdMap.set(lowerName, ingredientId);

      // Synonyms
      if (Array.isArray(ing.synonyms)) {
        for (const syn of ing.synonyms) {
          const lowerSyn = syn.toLowerCase().trim();
          await client.query(
            `INSERT INTO ingredient_synonyms (ingredient_id, synonym)
             VALUES ($1, $2)
             ON CONFLICT (synonym) DO NOTHING`,
            [ingredientId, lowerSyn]
          );
        }
      }

      // Classes
      if (Array.isArray(ing.classes)) {
        for (const clsName of ing.classes) {
          let classId = classIdMap.get(clsName);
          if (!classId) {
            const clsRes = await client.query(
              `INSERT INTO drug_classes (name)
               VALUES ($1)
               ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
               RETURNING id`,
              [clsName]
            );
            classId = clsRes.rows[0].id;
            classIdMap.set(clsName, classId);
          }
          await client.query(
            `INSERT INTO ingredient_drug_classes (ingredient_id, drug_class_id)
             VALUES ($1, $2)
             ON CONFLICT (ingredient_id, drug_class_id) DO NOTHING`,
            [ingredientId, classId]
          );
        }
      }

      // Dose Limits (Ensuring source = 'MedGuard sample data (not clinically verified)')
      if (Array.isArray(ing.doseLimits)) {
        for (const limit of ing.doseLimits) {
          await client.query(
            `INSERT INTO dose_limits (ingredient_id, age_min, age_max, max_daily_dose_mg, rationale, source)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              ingredientId,
              limit.ageMin ?? 0,
              limit.ageMax ?? 150,
              limit.maxDailyDoseMg,
              limit.rationale || null,
              limit.source || ingredientsRaw.source || 'MedGuard sample data (not clinically verified)'
            ]
          );
        }
      }
    }
    console.log(`[SEEDED] ${ingredientIdMap.size} ingredients and related classes/synonyms/limits.`);

    // Helper: resolve ingredient name or synonym to ID
    async function resolveIngredientId(rawName) {
      if (!rawName) return null;
      const lower = rawName.toLowerCase().trim();
      if (ingredientIdMap.has(lower)) {
        return ingredientIdMap.get(lower);
      }
      const res = await client.query(
        `SELECT ingredient_id FROM ingredient_synonyms WHERE lower(synonym) = $1`,
        [lower]
      );
      if (res.rows.length > 0) {
        ingredientIdMap.set(lower, res.rows[0].ingredient_id);
        return res.rows[0].ingredient_id;
      }
      return null;
    }

    // 2. Seed Brands and Brand Ingredients
    const brandsRaw = JSON.parse(fs.readFileSync(path.join(seedsDir, 'sample_indian_brands.json'), 'utf8'));
    let brandCount = 0;
    for (const b of brandsRaw.brands) {
      const brandRes = await client.query(
        `INSERT INTO brands (brand_name, manufacturer, form, strength_raw)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [b.brandName, b.manufacturer, b.form, b.strengthRaw]
      );
      const brandId = brandRes.rows[0].id;
      brandCount++;

      for (const item of b.ingredients) {
        const ingId = await resolveIngredientId(item.name);
        if (!ingId) {
          console.warn(`Warning: Could not resolve ingredient '${item.name}' for brand '${b.brandName}'.`);
          continue;
        }
        await client.query(
          `INSERT INTO brand_ingredients (brand_id, ingredient_id, strength_mg)
           VALUES ($1, $2, $3)
           ON CONFLICT (brand_id, ingredient_id) DO UPDATE SET strength_mg = EXCLUDED.strength_mg`,
          [brandId, ingId, item.strengthMg]
        );
      }
    }
    console.log(`[SEEDED] ${brandCount} commercial brands and formulation mappings.`);

    // 3. Seed Interactions from server/engine/tests/starter-pairs.json (Unified source file)
    console.log(`Reading starter interactions from: ${path.relative(process.cwd(), STARTER_PAIRS_FILE)}`);
    const starterPairsRaw = JSON.parse(fs.readFileSync(STARTER_PAIRS_FILE, 'utf8'));
    const sourceLabel = starterPairsRaw.source || 'MedGuard sample data (not clinically verified)';

    let interactionCount = 0;
    let skippedCount = 0;

    for (const inter of starterPairsRaw.pairs) {
      const idA = await resolveIngredientId(inter.ingredientA);
      const idB = await resolveIngredientId(inter.ingredientB);

      if (!idA || !idB || idA === idB) {
        console.error(`[UNRESOLVED PAIR] Could not resolve '${inter.ingredientA}' (id: ${idA}) or '${inter.ingredientB}' (id: ${idB})`);
        skippedCount++;
        continue;
      }

      const [canonA, canonB] = idA < idB ? [idA, idB] : [idB, idA];

      await client.query(
        `INSERT INTO interactions (ingredient_a, ingredient_b, severity, summary, explanation, source)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE
         SET severity = EXCLUDED.severity, summary = EXCLUDED.summary, explanation = EXCLUDED.explanation, source = EXCLUDED.source`,
        [canonA, canonB, inter.severity, inter.summary, inter.explanation || inter.mechanism, sourceLabel]
      );
      interactionCount++;
    }

    console.log(`[SEEDED] ${interactionCount} canonical pairwise interactions (${skippedCount} skipped).`);

    if (skippedCount > 0) {
      throw new Error(`Seeding failed: ${skippedCount} starter interaction pairs could not be resolved in ingredients catalog!`);
    }

    // 4. Seed Safety Rules (Beers, Timing, Contraindications, Food)
    const rulesRaw = JSON.parse(fs.readFileSync(path.join(seedsDir, 'sample_safety_rules.json'), 'utf8'));
    const ruleSource = rulesRaw.source || 'MedGuard sample data (not clinically verified)';

    // Beers
    if (Array.isArray(rulesRaw.beersRules)) {
      for (const rule of rulesRaw.beersRules) {
        const ingId = await resolveIngredientId(rule.ingredient);
        if (ingId) {
          await client.query(
            `INSERT INTO beers_rules (ingredient_id, rationale, recommendation, severity, source)
             VALUES ($1, $2, $3, $4, $5)`,
            [ingId, rule.rationale, rule.recommendation, rule.severity || 'major', rule.source || ruleSource]
          );
        }
      }
    }

    // Timing Rules (canonical A < B)
    if (Array.isArray(rulesRaw.timingRules)) {
      for (const tr of rulesRaw.timingRules) {
        const idA = await resolveIngredientId(tr.ingredientA);
        const idB = await resolveIngredientId(tr.ingredientB);
        if (idA && idB && idA !== idB) {
          const [canonA, canonB] = idA < idB ? [idA, idB] : [idB, idA];
          await client.query(
            `INSERT INTO timing_rules (ingredient_a, ingredient_b, min_gap_hours, severity, advice, source)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (ingredient_a, ingredient_b) DO UPDATE
             SET min_gap_hours = EXCLUDED.min_gap_hours, advice = EXCLUDED.advice, source = EXCLUDED.source`,
            [canonA, canonB, tr.minGapHours, tr.severity || 'moderate', tr.advice, tr.source || ruleSource]
          );
        }
      }
    }

    // Contraindications
    if (Array.isArray(rulesRaw.contraindications)) {
      for (const ci of rulesRaw.contraindications) {
        const ingId = await resolveIngredientId(ci.ingredient);
        if (ingId) {
          await client.query(
            `INSERT INTO contraindications (ingredient_id, condition_code, severity, description, source)
             VALUES ($1, $2, $3, $4, $5)`,
            [ingId, ci.conditionCode.toUpperCase(), ci.severity, ci.description, ci.source || ruleSource]
          );
        }
      }
    }

    // Food
    if (Array.isArray(rulesRaw.foodInteractions)) {
      for (const fi of rulesRaw.foodInteractions) {
        const ingId = await resolveIngredientId(fi.ingredient);
        if (ingId) {
          await client.query(
            `INSERT INTO food_interactions (ingredient_id, item, severity, description, source)
             VALUES ($1, $2, $3, $4, $5)`,
            [ingId, fi.item.toLowerCase(), fi.severity, fi.description, fi.source || ruleSource]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('Seeding completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
    throw err;
  } finally {
    await client.end();
  }
}

runSeed().catch((err) => {
  console.error(err);
  process.exit(1);
});
