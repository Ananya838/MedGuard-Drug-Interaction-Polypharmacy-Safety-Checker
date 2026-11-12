import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { app } from '../app.js';
import { setPool } from '../config.js';
import { signAccessToken } from '../auth/jwt.js';

describe('Patient & Medicine Management Endpoints (/api/patients)', () => {
  let server;
  let baseUrl;
  let caregiver1Token;
  let caregiver2Token;

  const CAREGIVER_1 = 'caregiver-uuid-1';
  const CAREGIVER_2 = 'caregiver-uuid-2';

  let mockPatients = [];
  let mockPatientMedicines = [];

  const mockDbPool = {
    // Transaction wrapper for withUserTransaction
    async connect() {
      return {
        query: mockDbPool.query,
        release: () => {},
      };
    },

    async query(sql, params = []) {
      const lowerSql = sql.toLowerCase().trim();

      // Transaction control
      if (lowerSql === 'begin' || lowerSql === 'commit' || lowerSql === 'rollback') {
        return { rows: [] };
      }
      if (lowerSql.startsWith('set local app.current_user_id')) {
        return { rows: [] };
      }

      // 1. SELECT patients accessible by caregiver
      if (lowerSql.includes('from patients') && lowerSql.includes('where caregiver_id = $1 or id in')) {
        const userId = params[0];
        const accessible = mockPatients.filter((p) => p.caregiver_id === userId);
        return { rows: accessible };
      }

      // 2. INSERT INTO patients
      if (lowerSql.startsWith('insert into patients')) {
        const newPatient = {
          id: crypto.randomUUID(),
          caregiver_id: params[0],
          name: params[1],
          dob: params[2],
          weight_kg: params[3],
          weightKg: params[3],
          allergies: JSON.parse(params[4]),
          conditions: JSON.parse(params[5]),
          created_at: new Date(),
          updated_at: new Date(),
        };
        mockPatients.push(newPatient);
        return { rows: [newPatient] };
      }

      // 3. SELECT single patient by ID and caregiver
      if (lowerSql.includes('from patients') && lowerSql.includes('where id = $1 and (caregiver_id = $2 or')) {
        const [patientId, userId] = params;
        const found = mockPatients.filter(
          (p) => p.id === patientId && p.caregiver_id === userId
        );
        return { rows: found };
      }

      // 4. Check ownership: SELECT id FROM patients WHERE id = $1 AND caregiver_id = $2
      if (lowerSql.startsWith('select') && lowerSql.includes('from patients') && lowerSql.includes('where id = $1 and caregiver_id = $2')) {
        const [patientId, userId] = params;
        const found = mockPatients.filter(
          (p) => p.id === patientId && p.caregiver_id === userId
        );
        return { rows: found };
      }

      // 5. UPDATE patients
      if (lowerSql.startsWith('update patients')) {
        const [name, dob, weight, allergies, conditions, patientId, userId] = params;
        const patient = mockPatients.find(
          (p) => p.id === patientId && p.caregiver_id === userId
        );
        if (patient) {
          if (name) patient.name = name;
          if (dob) patient.dob = dob;
          if (weight !== null) {
            patient.weight_kg = weight;
            patient.weightKg = weight;
          }
          if (allergies) patient.allergies = JSON.parse(allergies);
          if (conditions) patient.conditions = JSON.parse(conditions);
          patient.updated_at = new Date();
          return { rows: [patient] };
        }
        return { rows: [] };
      }

      // 6. DELETE FROM patients
      if (lowerSql.startsWith('delete from patients where id = $1 and caregiver_id = $2')) {
        const [patientId, userId] = params;
        const index = mockPatients.findIndex(
          (p) => p.id === patientId && p.caregiver_id === userId
        );
        if (index !== -1) {
          mockPatients.splice(index, 1);
          mockPatientMedicines = mockPatientMedicines.filter((pm) => pm.patient_id !== patientId);
          return { rows: [{ id: patientId }] };
        }
        return { rows: [] };
      }

      // 7. SELECT active patient medicines
      if (lowerSql.includes('from patient_medicines pm') && lowerSql.includes('where pm.patient_id = $1 and pm.active = true')) {
        const patientId = params[0];
        const meds = mockPatientMedicines.filter(
          (pm) => pm.patient_id === patientId && pm.active === true
        );
        return { rows: meds };
      }

      // 8. INSERT INTO patient_medicines
      if (lowerSql.startsWith('insert into patient_medicines')) {
        const newMed = {
          id: crypto.randomUUID(),
          patient_id: params[0],
          brand_id: params[1],
          custom_name: params[2],
          dose_amount: params[3],
          dose_unit: params[4],
          doses_per_day: params[5],
          is_prn: params[6],
          frequency_text: params[7],
          timing_schedule: JSON.parse(params[8]),
          active: true,
          created_at: new Date(),
        };
        mockPatientMedicines.push(newMed);
        return { rows: [newMed] };
      }

      // 9. DELETE FROM patient_medicines
      if (lowerSql.startsWith('delete from patient_medicines pm')) {
        const [medId, patientId, userId] = params;
        const patient = mockPatients.find(
          (p) => p.id === patientId && p.caregiver_id === userId
        );
        if (patient) {
          const index = mockPatientMedicines.findIndex(
            (pm) => pm.id === medId && pm.patient_id === patientId
          );
          if (index !== -1) {
            mockPatientMedicines.splice(index, 1);
            return { rows: [{ id: medId }] };
          }
        }
        return { rows: [] };
      }

      return { rows: [] };
    },
  };

  before(async () => {
    setPool(mockDbPool);
    caregiver1Token = signAccessToken({ id: CAREGIVER_1, email: 'c1@example.com', name: 'Caregiver One' });
    caregiver2Token = signAccessToken({ id: CAREGIVER_2, email: 'c2@example.com', name: 'Caregiver Two' });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    mockPatients = [];
    mockPatientMedicines = [];
  });

  test('POST /api/patients: creates patient profile for authenticated caregiver', async () => {
    const res = await fetch(`${baseUrl}/api/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caregiver1Token}`,
      },
      body: JSON.stringify({
        name: 'Ramesh Sharma',
        dob: '1954-04-12',
        weightKg: 68.5,
        allergies: [{ type: 'ingredient', id: 11 }],
        conditions: ['CKD', 'HYPERTENSION'],
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.patient.name, 'Ramesh Sharma');
    assert.equal(body.data.patient.weightKg, 68.5);
    assert.equal(mockPatients.length, 1);
    assert.equal(mockPatients[0].caregiver_id, CAREGIVER_1);
  });

  test('GET /api/patients: returns only patients belonging to logged-in caregiver', async () => {
    mockPatients.push(
      { id: 'p1', caregiver_id: CAREGIVER_1, name: 'Patient One', dob: '1950-01-01', allergies: [], conditions: [] },
      { id: 'p2', caregiver_id: CAREGIVER_2, name: 'Patient Two', dob: '1955-01-01', allergies: [], conditions: [] }
    );

    const res = await fetch(`${baseUrl}/api/patients`, {
      headers: { Authorization: `Bearer ${caregiver1Token}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].id, 'p1');
    assert.equal(body.data[0].name, 'Patient One');
  });

  test('GET /api/patients/:id: denies access to another caregiver\'s patient (404/Forbidden boundary)', async () => {
    mockPatients.push({
      id: 'foreign-patient-id',
      caregiver_id: CAREGIVER_2,
      name: 'Private Patient',
      dob: '1948-06-15',
      allergies: [],
      conditions: [],
    });

    // Caregiver 1 tries to access Caregiver 2's patient
    const res = await fetch(`${baseUrl}/api/patients/foreign-patient-id`, {
      headers: { Authorization: `Bearer ${caregiver1Token}` },
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error.code, 'NOT_FOUND');
  });

  test('PUT /api/patients/:id: updates patient details', async () => {
    mockPatients.push({
      id: 'patient-to-update',
      caregiver_id: CAREGIVER_1,
      name: 'Ramesh Sharma',
      dob: '1954-04-12',
      weight_kg: 68.5,
      allergies: [],
      conditions: [],
    });

    const res = await fetch(`${baseUrl}/api/patients/patient-to-update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caregiver1Token}`,
      },
      body: JSON.stringify({ weightKg: 70.0 }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.patient.weightKg, 70.0);
  });

  test('DELETE /api/patients/:id: deletes patient and cascades active medicines', async () => {
    mockPatients.push({
      id: 'patient-to-delete',
      caregiver_id: CAREGIVER_1,
      name: 'Delete Target',
      dob: '1950-01-01',
      allergies: [],
      conditions: [],
    });
    mockPatientMedicines.push({
      id: 'med-target',
      patient_id: 'patient-to-delete',
      brand_id: 104,
      active: true,
    });

    const res = await fetch(`${baseUrl}/api/patients/patient-to-delete`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${caregiver1Token}` },
    });

    assert.equal(res.status, 200);
    assert.equal(mockPatients.length, 0);
    assert.equal(mockPatientMedicines.length, 0);
  });

  test('POST & GET & DELETE /api/patients/:id/medicines: manages active regimen', async () => {
    mockPatients.push({
      id: 'patient-med-test',
      caregiver_id: CAREGIVER_1,
      name: 'Ramesh Sharma',
      dob: '1954-04-12',
      allergies: [],
      conditions: [],
    });

    // 1. Add medicine
    const addRes = await fetch(`${baseUrl}/api/patients/patient-med-test/medicines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caregiver1Token}`,
      },
      body: JSON.stringify({
        brandId: 104,
        doseAmount: 1,
        doseUnit: 'tablet',
        dosesPerDay: 3,
        isPrn: false,
        frequencyText: 'Three times daily with meals',
      }),
    });

    assert.equal(addRes.status, 201);
    const addBody = await addRes.json();
    assert.equal(addBody.success, true);
    const medId = addBody.data.medicine.id;

    // 2. List medicines
    const listRes = await fetch(`${baseUrl}/api/patients/patient-med-test/medicines`, {
      headers: { Authorization: `Bearer ${caregiver1Token}` },
    });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.data.length, 1);
    assert.equal(listBody.data[0].id, medId);

    // 3. Delete medicine
    const delRes = await fetch(`${baseUrl}/api/patients/patient-med-test/medicines/${medId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${caregiver1Token}` },
    });
    assert.equal(delRes.status, 200);
    assert.equal(mockPatientMedicines.length, 0);
  });

  test('GET /api/patients/:id/report.pdf: streams doctor-ready clinical PDF report', async () => {
    mockPatients.push({
      id: 'pdf-patient',
      caregiver_id: CAREGIVER_1,
      name: 'Ramesh Sharma',
      dob: '1954-04-12',
      weight_kg: 70.0,
      allergies: [{ type: 'ingredient', id: 11 }],
      conditions: ['CKD'],
    });

    const res = await fetch(`${baseUrl}/api/patients/pdf-patient/report.pdf`, {
      headers: { Authorization: `Bearer ${caregiver1Token}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');

    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 500, 'PDF buffer should be generated and non-empty');
    // PDF Magic bytes: %PDF-
    const header = Buffer.from(buffer.slice(0, 5)).toString('utf8');
    assert.ok(header.startsWith('%PDF-'), 'Must be a valid PDF document');
  });
});
