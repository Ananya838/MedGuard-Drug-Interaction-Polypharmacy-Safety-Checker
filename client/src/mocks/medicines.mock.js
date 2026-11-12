export const mockBrandsDatabase = [
  {
    id: "brand-warf-5",
    name: "Warf 5",
    manufacturer: "Cipla Ltd",
    form: "Tablet",
    ingredients: [
      { name: "warfarin", strengthMg: 5 }
    ]
  },
  {
    id: "brand-ecosprin-75",
    name: "Ecosprin 75",
    manufacturer: "USV Ltd",
    form: "Capsule",
    ingredients: [
      { name: "aspirin", strengthMg: 75 }
    ]
  },
  {
    id: "brand-telma-40",
    name: "Telma 40",
    manufacturer: "Glenmark Pharmaceuticals",
    form: "Tablet",
    ingredients: [
      { name: "telmisartan", strengthMg: 40 }
    ]
  },
  {
    id: "brand-glycomet-500",
    name: "Glycomet 500",
    manufacturer: "USV Ltd",
    form: "Tablet",
    ingredients: [
      { name: "metformin", strengthMg: 500 }
    ]
  },
  {
    id: "brand-dolo-650",
    name: "Dolo 650",
    manufacturer: "Micro Labs Ltd",
    form: "Tablet",
    ingredients: [
      { name: "paracetamol", strengthMg: 650 }
    ]
  },
  {
    id: "brand-combiflam",
    name: "Combiflam",
    manufacturer: "Sanofi India Ltd",
    form: "Tablet",
    ingredients: [
      { name: "ibuprofen", strengthMg: 400 },
      { name: "paracetamol", strengthMg: 325 }
    ]
  },
  {
    id: "brand-atorva-20",
    name: "Atorva 20",
    manufacturer: "Zydus Cadila",
    form: "Tablet",
    ingredients: [
      { name: "atorvastatin", strengthMg: 20 }
    ]
  },
  {
    id: "brand-pantocid-40",
    name: "Pantocid 40",
    manufacturer: "Sun Pharma",
    form: "Tablet",
    ingredients: [
      { name: "pantoprazole", strengthMg: 40 }
    ]
  },
  {
    id: "brand-augmentin-625",
    name: "Augmentin 625 Duo",
    manufacturer: "GlaxoSmithKline",
    form: "Tablet",
    ingredients: [
      { name: "amoxicillin", strengthMg: 500 },
      { name: "clavulanic acid", strengthMg: 125 }
    ]
  },
  {
    id: "brand-thyronorm-50",
    name: "Thyronorm 50",
    manufacturer: "Abbott India Ltd",
    form: "Tablet",
    ingredients: [
      { name: "levothyroxine", strengthMg: 0.05 }
    ]
  },
  {
    id: "brand-calcium-500",
    name: "Shelcal 500",
    manufacturer: "Torrent Pharma",
    form: "Tablet",
    ingredients: [
      { name: "calcium", strengthMg: 500 },
      { name: "vitamin d3", strengthMg: 0.006 }
    ]
  }
];

export const mockOcrExtractResults = {
  extractedText: "WARFARIN SODIUM IP 5MG ... WARF 5 ... CIPLA ... ECOSPRIN 75 ... UNKNOWN PILL XYZ",
  confirmedBrands: [
    {
      id: "brand-warf-5",
      name: "Warf 5",
      dosage: "1 tablet daily",
      frequency: "Once daily",
      timing: "Night",
      source: "OCR Strip Detection"
    },
    {
      id: "brand-ecosprin-75",
      name: "Ecosprin 75",
      dosage: "1 capsule daily",
      frequency: "Once daily",
      timing: "Morning",
      source: "OCR Strip Detection"
    }
  ],
  unrecognized: ["UNKNOWN PILL XYZ"]
};

