import pg from 'pg';
import http from 'http';
import dotenv from 'dotenv';
import { signAccessToken } from '../server/auth/jwt.js';
import { app } from '../server/app.js';
import { setPool, closePool } from '../server/config.js';

dotenv.config();

const realPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
setPool(realPool);

async function runBenchmark() {
  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  // Create real JWT for alexa
  const userRes = await realPool.query("SELECT id, name, email, language FROM users WHERE email = 'alex@example.com'");
  const alexa = userRes.rows[0];
  const token = signAccessToken({
    id: alexa.id,
    email: alexa.email,
    name: alexa.name,
    language: alexa.language || 'en'
  });

  console.log('=== MedGuard API Latency & Performance Benchmark ===\n');

  async function measure(name, fn) {
    const start = performance.now();
    const res = await fn();
    const duration = (performance.now() - start).toFixed(2);
    console.log(`⏱️  ${name.padEnd(48)} : ${duration.padStart(8)} ms | Status: ${res.status}`);
    return res;
  }

  // 1. Medicine Search (Uncached)
  await measure('GET /api/medicines/search?q=telma (1st query)', () =>
    fetch(`${baseUrl}/medicines/search?q=telma`, { headers: { Authorization: `Bearer ${token}` } })
  );

  // 2. Medicine Search (Cached)
  await measure('GET /api/medicines/search?q=telma (In-Memory Cached)', () =>
    fetch(`${baseUrl}/medicines/search?q=telma`, { headers: { Authorization: `Bearer ${token}` } })
  );

  // 3. Normalization (Parallel + Caching)
  await measure('POST /api/medicines/normalize (3 Brand Items)', () =>
    fetch(`${baseUrl}/medicines/normalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ queries: ['Telma 40', 'Glycomet 500', 'Shelcal 250'] })
    })
  );

  // 4. Patients List
  await measure('GET /api/patients (Elder List with Meds)', () =>
    fetch(`${baseUrl}/patients`, { headers: { Authorization: `Bearer ${token}` } })
  );

  // 5. Patient Detail with embedded medicines (Single query)
  const savitriRes = await realPool.query("SELECT id FROM patients WHERE name ILIKE '%savitri%'");
  const savitriId = savitriRes.rows[0].id;
  await measure(`GET /api/patients/:id (Embedded Regimen)`, () =>
    fetch(`${baseUrl}/patients/${savitriId}`, { headers: { Authorization: `Bearer ${token}` } })
  );

  // 6. Deterministic Safety Check (/api/check)
  await measure('POST /api/check (Savitri Devi Polypharmacy Check)', () =>
    fetch(`${baseUrl}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        patientId: savitriId,
        confirmedMedicines: [{ brandId: 8 }, { brandId: 24 }, { brandId: 303 }]
      })
    })
  );

  // 7. Doctor PDF Generation
  await measure('GET /api/patients/:id/report.pdf (Stream PDF)', () =>
    fetch(`${baseUrl}/patients/${savitriId}/report.pdf`, { headers: { Authorization: `Bearer ${token}` } })
  );

  console.log('\n✅ All benchmarks completed!');
  server.close();
  await closePool();
}

runBenchmark().catch(console.error);
