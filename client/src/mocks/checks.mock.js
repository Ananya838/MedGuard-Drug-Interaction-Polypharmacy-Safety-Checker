export const mockSafetyCheckResult = {
  checkId: "chk-9821-del",
  patient: {
    id: "pat-001",
    name: "Ramesh Sharma",
    age: 74,
    gender: "male"
  },
  timestamp: "2026-11-07T08:00:00.000Z",
  source: "MedGuard sample data (not clinically verified)",
  disclaimer: "MedGuard is a screening aid and does not replace a doctor or pharmacist. Consult a qualified healthcare professional before altering any medication regimen.",
  summary: {
    majorCount: 1,
    moderateCount: 1,
    minorCount: 0,
    noKnownInteractionsCount: 3,
    totalPairsChecked: 6
  },
  findings: [
    {
      id: "fnd-001",
      type: "drug_drug",
      severity: "major",
      drugs: ["Warfarin Sodium", "Aspirin"],
      title: "Concurrent Anticoagulant and Antiplatelet Therapy",
      explanation: "Combining warfarin (an anticoagulant) and aspirin (an antiplatelet agent) substantially elevates the risk of severe gastrointestinal and internal bleeding due to synergistic inhibition of blood clotting pathways.",
      action: "Contact the prescribing doctor or pharmacist before administering these medicines together.",
      evidence: "MedGuard sample data (not clinically verified)"
    },
    {
      id: "fnd-002",
      type: "beers_criteria",
      severity: "moderate",
      drugs: ["Warfarin Sodium"],
      title: "High Bleeding Risk in Geriatric Patients (>65 years)",
      explanation: "Anticoagulants in older adults (age 74) require meticulous INR monitoring and renal function evaluation due to heightened vulnerability to hemorrhage and fall-related trauma.",
      action: "Discuss these medicines with your doctor at the next visit or contact your pharmacist.",
      evidence: "MedGuard sample data (not clinically verified)"
    }
  ],
  checkedPairsNoInteraction: [
    { drugA: "Telmisartan", drugB: "Metformin", message: "No known interaction found in our data." },
    { drugA: "Telmisartan", drugB: "Aspirin", message: "No known interaction found in our data." },
    { drugA: "Metformin", drugB: "Aspirin", message: "No known interaction found in our data." }
  ],
  doseTracking: [
    {
      ingredient: "Paracetamol",
      currentDailyMg: 650,
      maxDailyMg: 2000,
      unit: "mg",
      note: "Standard geriatric maximum ceiling is 2,000 mg/day"
    },
    {
      ingredient: "Metformin",
      currentDailyMg: 1000,
      maxDailyMg: 2000,
      unit: "mg",
      note: "Standard adult limit is 2,000 mg/day"
    }
  ],
  unrecognized: ["UNKNOWN PILL XYZ"]
};

