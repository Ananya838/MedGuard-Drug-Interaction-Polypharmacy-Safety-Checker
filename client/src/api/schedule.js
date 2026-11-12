import { mockDailySchedule } from '../mocks/schedule.mock.js';

let scheduleData = JSON.parse(JSON.stringify(mockDailySchedule));

export async function getDailySchedule() {
  await new Promise((res) => setTimeout(res, 80));
  return JSON.parse(JSON.stringify(scheduleData));
}

export async function markDoseTaken(slotId, medicineId) {
  await new Promise((res) => setTimeout(res, 60));
  for (const slot of scheduleData) {
    if (slot.id === slotId) {
      const med = slot.medicines.find((m) => m.id === medicineId);
      if (med) {
        med.status = med.status === 'taken' ? 'pending' : 'taken';
        if (med.status === 'taken') {
          const now = new Date();
          med.takenAt = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
          delete med.takenAt;
        }
        return { success: true, medicine: med };
      }
    }
  }
  return { success: false };
}

