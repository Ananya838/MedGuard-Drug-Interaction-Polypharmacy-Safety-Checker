import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function setupDemo() {
  await client.connect();
  console.log('Connecting to PostgreSQL to configure Demo Profiles...');

  // 1. Find alexa's user account
  const userRes = await client.query("SELECT id, name, email FROM users WHERE email = 'alex@example.com'");
  if (userRes.rows.length === 0) {
    console.error('alex@example.com not found!');
    await client.end();
    return;
  }
  const alexaId = userRes.rows[0].id;
  console.log(`Found Caregiver: ${userRes.rows[0].name} (${alexaId})`);

  await client.query('BEGIN');

  // 2. Setup Ram (Profile 1) with Vozet 5 (Levocetirizine 5mg)
  const ramRes = await client.query("SELECT id FROM patients WHERE name ILIKE '%ram%' AND caregiver_id = $1", [alexaId]);
  let ramId;
  if (ramRes.rows.length > 0) {
    ramId = ramRes.rows[0].id;
    console.log(`Found Ram: ${ramId}`);
  } else {
    const newRam = await client.query(
      `INSERT INTO patients (caregiver_id, name, dob, weight_kg, allergies, conditions)
       VALUES ($1, 'Ram', '1952-05-15', 70.0,
               '[{"name": "Sulfa Drugs", "type": "drug_class"}]'::jsonb,
               '[{"code": "I10", "label": "Hypertension"}, {"code": "E11", "label": "Type 2 Diabetes"}]'::jsonb)
       RETURNING id`,
      [alexaId]
    );
    ramId = newRam.rows[0].id;
    console.log(`Created Ram: ${ramId}`);
  }

  // Ensure Ram has Vozet 5 (Brand ID 278)
  await client.query("DELETE FROM patient_medicines WHERE patient_id = $1", [ramId]);
  await client.query(
    `INSERT INTO patient_medicines (
       patient_id, brand_id, custom_name, dose_amount, dose_unit, doses_per_day,
       is_prn, frequency_text, timing_schedule
     )
     VALUES ($1, 278, 'Vozet 5', 1, 'tablet', 1, false, 'Take once daily after breakfast', '["Morning"]'::jsonb)`,
    [ramId]
  );
  console.log('Added Vozet 5 to Ram regimen.');

  // 3. Setup Savitri Devi (Profile 2 - The Showcase Demo Profile)
  // Check if Savitri Devi already exists
  const savitriRes = await client.query("SELECT id FROM patients WHERE name ILIKE '%savitri%' AND caregiver_id = $1", [alexaId]);
  let savitriId;
  if (savitriRes.rows.length > 0) {
    savitriId = savitriRes.rows[0].id;
    console.log(`Found existing Savitri Devi: ${savitriId}`);
    await client.query("DELETE FROM patient_medicines WHERE patient_id = $1", [savitriId]);
  } else {
    const newSavitri = await client.query(
      `INSERT INTO patients (caregiver_id, name, dob, weight_kg, allergies, conditions)
       VALUES ($1, 'Savitri Devi', '1955-08-15', 64.5,
               '[{"name": "Aspirin & NSAIDs", "type": "drug_class"}]'::jsonb,
               '[{"code": "I10", "label": "Essential Hypertension"}, {"code": "E11", "label": "Type 2 Diabetes"}, {"code": "M17", "label": "Osteoarthritis"}]'::jsonb)
       RETURNING id`,
      [alexaId]
    );
    savitriId = newSavitri.rows[0].id;
    console.log(`Created Savitri Devi: ${savitriId}`);
  }

  // Add Savitri Devi's 3 stable prescription medicines:
  // 1. Telma 40 (Brand ID 8) - Morning
  await client.query(
    `INSERT INTO patient_medicines (
       patient_id, brand_id, custom_name, dose_amount, dose_unit, doses_per_day,
       is_prn, frequency_text, timing_schedule
     )
     VALUES ($1, 8, 'Telma 40', 1, 'tablet', 1, false, 'Take after breakfast with water', '["Morning"]'::jsonb)`,
    [savitriId]
  );

  // 2. Cipcal 500 (Brand ID 303) - Afternoon
  await client.query(
    `INSERT INTO patient_medicines (
       patient_id, brand_id, custom_name, dose_amount, dose_unit, doses_per_day,
       is_prn, frequency_text, timing_schedule
     )
     VALUES ($1, 303, 'Cipcal 500', 1, 'tablet', 1, false, 'Take after lunch with water', '["Afternoon"]'::jsonb)`,
    [savitriId]
  );

  // 3. Glycomet 500 (Brand ID 24) - Evening
  await client.query(
    `INSERT INTO patient_medicines (
       patient_id, brand_id, custom_name, dose_amount, dose_unit, doses_per_day,
       is_prn, frequency_text, timing_schedule
     )
     VALUES ($1, 24, 'Glycomet 500', 1, 'tablet', 1, false, 'Take with dinner', '["Evening"]'::jsonb)`,
    [savitriId]
  );

  console.log('Added Telma 40, Cipcal 500, and Glycomet 500 to Savitri Devi regimen.');

  await client.query('COMMIT');
  console.log('\n✅ Demo setup completed successfully!');
  await client.end();
}

setupDemo().catch(async (err) => {
  console.error('Demo setup failed:', err);
  await client.query('ROLLBACK');
  await client.end();
  process.exit(1);
});

