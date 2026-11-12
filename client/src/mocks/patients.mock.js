export const mockPatients = [
  {
    id: "pat-001",
    name: "Ramesh Sharma",
    dob: "1952-04-12",
    age: 74,
    gender: "male",
    bloodGroup: "B+",
    phone: "+91 98765 43210",
    emergencyContact: {
      name: "Sunita Sharma (Daughter)",
      phone: "+91 98111 22233"
    },
    primaryDoctor: {
      name: "Consultant Physician",
      clinic: "Senior Health Clinic, Delhi"
    },
    conditions: [
      { code: "I10", label: "Essential Hypertension" },
      { code: "E11", label: "Type 2 Diabetes Mellitus" },
      { code: "I25", label: "Chronic Ischemic Heart Disease" }
    ],
    allergies: [
      { id: "alg-001", name: "Sulfa Antibiotics", type: "drug_class" }
    ],
    medicines: [
      {
        id: "pm-101",
        brandId: 15,
        brandName: "Warf 5",
        genericName: "Warfarin Sodium (5mg)",
        form: "Tablet",
        strength: "5 mg",
        dosage: "1 tablet daily",
        timing: ["Night"],
        instructions: "Take at bedtime with water",
        prescribedDate: "2026-08-15"
      },
      {
        id: "pm-102",
        brandId: 14,
        brandName: "Ecosprin 75",
        genericName: "Aspirin (75mg)",
        form: "Capsule",
        strength: "75 mg",
        dosage: "1 capsule daily",
        timing: ["Morning"],
        instructions: "After breakfast",
        prescribedDate: "2026-07-10"
      },
      {
        id: "pm-103",
        brandId: 8,
        brandName: "Telma 40",
        genericName: "Telmisartan (40mg)",
        form: "Tablet",
        strength: "40 mg",
        dosage: "1 tablet daily",
        timing: ["Morning"],
        instructions: "After breakfast",
        prescribedDate: "2026-05-20"
      },
      {
        id: "pm-104",
        brandId: 24,
        brandName: "Glycomet 500",
        genericName: "Metformin Hydrochloride (500mg)",
        form: "Tablet",
        strength: "500 mg",
        dosage: "1 tablet twice daily",
        timing: ["Morning", "Night"],
        instructions: "With meals",
        prescribedDate: "2026-04-12"
      },
      {
        id: "pm-105",
        brandId: 1,
        brandName: "Dolo 650",
        genericName: "Paracetamol (650mg)",
        form: "Tablet",
        strength: "650 mg",
        dosage: "1 tablet as needed (SOS)",
        timing: ["Afternoon"],
        instructions: "For headache or mild pain",
        isPrn: true,
        prescribedDate: "2026-09-01"
      }
    ]
  },
  {
    id: "pat-002",
    name: "Asha Sharma",
    dob: "1955-08-22",
    age: 71,
    gender: "female",
    bloodGroup: "O+",
    phone: "+91 98765 43211",
    emergencyContact: {
      name: "Sunita Sharma (Daughter)",
      phone: "+91 98111 22233"
    },
    primaryDoctor: {
      name: "General Practitioner",
      clinic: "Community Medical Center"
    },
    conditions: [
      { code: "M19", label: "Osteoarthritis" },
      { code: "E03", label: "Hypothyroidism" }
    ],
    allergies: [
      { id: "alg-002", name: "Penicillin", type: "drug_class" }
    ],
    medicines: [
      {
        id: "pm-201",
        brandId: "brand-thyronorm-50",
        brandName: "Thyronorm 50",
        genericName: "Levothyroxine Sodium (50mcg)",
        form: "Tablet",
        strength: "50 mcg",
        dosage: "1 tablet daily",
        timing: ["Morning"],
        instructions: "Empty stomach early morning",
        prescribedDate: "2026-01-15"
      },
      {
        id: "pm-202",
        brandId: "brand-calcium-500",
        brandName: "Shelcal 500",
        genericName: "Calcium + Vitamin D3",
        form: "Tablet",
        strength: "500 mg",
        dosage: "1 tablet daily",
        timing: ["Afternoon"],
        instructions: "After lunch",
        prescribedDate: "2026-03-10"
      }
    ]
  }
];

