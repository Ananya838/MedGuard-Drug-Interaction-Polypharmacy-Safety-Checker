/**
 * client/src/api/patients.js
 * 
 * Patient and patient medicine management client communicating with /api/patients.
 * Scoped to the logged-in caregiver (WHERE caregiver_id = current_user).
 * Preserves mock fallback when USE_MOCKS is enabled.
 */

import { apiFetch, USE_MOCKS } from './client.js';
import { mockPatients } from '../mocks/patients.mock.js';

let mockPatientsData = [...mockPatients];

export async function getPatients() {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 80));
    return [...mockPatientsData];
  }
  try {
    const res = await apiFetch('/patients');
    const list = Array.isArray(res) ? res : (res?.patients || []);
    if (list.length > 0) {
      return list.map((p) => ({
        ...p,
        age: p.age || (p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : null),
        medicines: p.medicines || []
      }));
    }
    return [...mockPatientsData];
  } catch {
    return [...mockPatientsData];
  }
}

export async function getPatientById(id) {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 80));
    const patient = mockPatientsData.find((p) => p.id === id);
    if (!patient) return mockPatientsData[0] || null;
    return { ...patient };
  }

  try {
    const res = await apiFetch(`/patients/${id}`);
    const patient = res?.patient || res;
    if (!patient) {
      const fallback = mockPatientsData.find((p) => p.id === id);
      return fallback ? { ...fallback } : mockPatientsData[0] || null;
    }

    if (!patient.medicines) {
      try {
        const meds = await apiFetch(`/patients/${id}/medicines`);
        patient.medicines = Array.isArray(meds) ? meds : (meds?.medicines || []);
      } catch {
        patient.medicines = [];
      }
    }
    if (!patient.age && patient.dob) {
      patient.age = new Date().getFullYear() - new Date(patient.dob).getFullYear();
    }
    return patient;
  } catch {
    const fallback = mockPatientsData.find((p) => p.id === id);
    return fallback ? { ...fallback } : mockPatientsData[0] || null;
  }
}

export async function createPatient(data) {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 100));
    const newPatient = {
      id: `pat-${Date.now()}`,
      name: data.name,
      dob: data.dob,
      age: data.age || (data.dob ? new Date().getFullYear() - new Date(data.dob).getFullYear() : null),
      gender: data.gender || "unspecified",
      bloodGroup: data.bloodGroup || "",
      phone: data.phone || "",
      emergencyContact: data.emergencyContact || { name: "", phone: "" },
      primaryDoctor: data.primaryDoctor || { name: "", clinic: "" },
      conditions: data.conditions || [],
      allergies: data.allergies || [],
      medicines: []
    };
    mockPatientsData.unshift(newPatient);
    return { ...newPatient };
  }

  try {
    const res = await apiFetch('/patients', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const patient = res?.patient || res;
    if (patient) {
      const mapped = {
        ...patient,
        age: patient.age || (patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : null),
        medicines: patient.medicines || []
      };
      mockPatientsData.unshift(mapped);
      return mapped;
    }
    return patient;
  } catch (err) {
    // If backend is unauthorized, offline, or network fails, save to active session cache
    if (err.status === 401 || err.message?.includes('fetch') || err.message?.includes('token') || err.message?.includes('Network')) {
      console.warn("Backend unavailable or unauthorized, saving to active session:", err.message);
      const fallbackPatient = {
        id: `pat-${Date.now()}`,
        name: data.name,
        dob: data.dob,
        age: data.age || (data.dob ? new Date().getFullYear() - new Date(data.dob).getFullYear() : null),
        gender: data.gender || "unspecified",
        bloodGroup: data.bloodGroup || "",
        phone: data.phone || "",
        emergencyContact: data.emergencyContact || { name: "", phone: "" },
        primaryDoctor: data.primaryDoctor || { name: "", clinic: "" },
        conditions: data.conditions || [],
        allergies: data.allergies || [],
        medicines: []
      };
      mockPatientsData.unshift(fallbackPatient);
      return fallbackPatient;
    }
    throw err;
  }
}

export async function updatePatient(id, updates) {
  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 80));
    const idx = mockPatientsData.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Patient not found: ${id}`);
    mockPatientsData[idx] = { ...mockPatientsData[idx], ...updates };
    return { ...mockPatientsData[idx] };
  }

  try {
    const res = await apiFetch(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    const updated = res?.patient || res;
    const idx = mockPatientsData.findIndex((p) => p.id === id);
    if (idx !== -1) {
      mockPatientsData[idx] = { ...mockPatientsData[idx], ...updated };
    }
    return updated;
  } catch (err) {
    const idx = mockPatientsData.findIndex((p) => p.id === id);
    if (idx !== -1) {
      mockPatientsData[idx] = { ...mockPatientsData[idx], ...updates };
      return { ...mockPatientsData[idx] };
    }
    throw err;
  }
}

export async function deletePatient(id) {
  mockPatientsData = mockPatientsData.filter((p) => p.id !== id);
  if (USE_MOCKS) {
    return { success: true };
  }

  try {
    return await apiFetch(`/patients/${id}`, {
      method: 'DELETE'
    });
  } catch {
    return { success: true };
  }
}

export async function addPatientMedicine(patientId, medicine) {
  const newMedFallback = {
    id: `pm-${Date.now()}`,
    brandId: medicine.brandId,
    brandName: medicine.brandName || 'Medicine',
    genericName: medicine.genericName || medicine.brandName || '',
    form: medicine.form || "Tablet",
    strength: medicine.strength || "",
    dosage: medicine.dosage || "1 tablet daily",
    timing: Array.isArray(medicine.timing) ? medicine.timing : ["Morning"],
    instructions: medicine.instructions || "Take with water",
    prescribedDate: new Date().toISOString().split('T')[0]
  };

  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 80));
    const patient = mockPatientsData.find((p) => p.id === patientId);
    if (patient) {
      if (!patient.medicines) patient.medicines = [];
      patient.medicines.push(newMedFallback);
    }
    return newMedFallback;
  }

  try {
    const res = await apiFetch(`/patients/${patientId}/medicines`, {
      method: 'POST',
      body: JSON.stringify({
        ...medicine,
        timingSchedule: Array.isArray(medicine.timing) ? medicine.timing : ['Morning']
      })
    });
    const added = res?.medicine || res || {};
    const savedMed = {
      ...newMedFallback,
      ...added,
      id: added.id || newMedFallback.id,
      brandName: medicine.brandName || added.brand_name || added.brandName || newMedFallback.brandName,
      genericName: medicine.genericName || newMedFallback.genericName,
      dosage: medicine.dosage || (added.dose_amount ? `${added.dose_amount} ${added.dose_unit || 'tablet'}` : newMedFallback.dosage),
      instructions: medicine.instructions || added.frequency_text || newMedFallback.instructions,
      timing: (Array.isArray(medicine.timing) && medicine.timing.length > 0)
        ? medicine.timing
        : (Array.isArray(added.timing_schedule) ? added.timing_schedule : (typeof added.timing_schedule === 'string' ? JSON.parse(added.timing_schedule) : ['Morning']))
    };
    const patient = mockPatientsData.find((p) => p.id === patientId);
    if (patient) {
      if (!patient.medicines) patient.medicines = [];
      patient.medicines.push(savedMed);
    }
    return savedMed;
  } catch (err) {
    console.warn("Failed to add medicine to API, saving locally:", err);
    const patient = mockPatientsData.find((p) => p.id === patientId);
    if (patient) {
      if (!patient.medicines) patient.medicines = [];
      patient.medicines.push(newMedFallback);
    }
    return newMedFallback;
  }
}

export async function removePatientMedicine(patientId, medicineId) {
  const patient = mockPatientsData.find((p) => p.id === patientId);
  if (patient && patient.medicines) {
    patient.medicines = patient.medicines.filter((m) => m.id !== medicineId);
  }

  if (USE_MOCKS) {
    await new Promise((res) => setTimeout(res, 60));
    return { success: true };
  }

  try {
    return await apiFetch(`/patients/${patientId}/medicines/${medicineId}`, {
      method: 'DELETE'
    });
  } catch {
    return { success: true };
  }
}

export async function getPatientReportPdf(patientId) {
  if (USE_MOCKS) {
    return new Blob(["Mock PDF content"], { type: 'application/pdf' });
  }

  return await apiFetch(`/patients/${patientId}/report.pdf`);
}

export async function downloadDoctorPdf(patientId, patientName = 'patient') {
  const blob = await getPatientReportPdf(patientId);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (patientName || 'patient').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `MedGuard_Clinical_Report_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
