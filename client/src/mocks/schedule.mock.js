export const mockDailySchedule = [
  {
    id: "sch-01",
    timeSlot: "Morning",
    timeWindow: "8:00 AM - 10:00 AM",
    medicines: [
      {
        id: "m-01",
        name: "Ecosprin 75",
        generic: "Aspirin 75mg",
        dose: "1 capsule",
        instruction: "Take after breakfast with water",
        status: "taken",
        takenAt: "08:35 AM",
        patientName: "Ramesh Sharma"
      },
      {
        id: "m-02",
        name: "Telma 40",
        generic: "Telmisartan 40mg",
        dose: "1 tablet",
        instruction: "Take after breakfast with water",
        status: "taken",
        takenAt: "08:35 AM",
        patientName: "Ramesh Sharma"
      },
      {
        id: "m-03",
        name: "Thyronorm 50",
        generic: "Levothyroxine 50mcg",
        dose: "1 tablet",
        instruction: "Empty stomach first thing in morning",
        status: "taken",
        takenAt: "06:45 AM",
        patientName: "Asha Sharma"
      }
    ]
  },
  {
    id: "sch-02",
    timeSlot: "Afternoon",
    timeWindow: "1:00 PM - 2:00 PM",
    medicines: [
      {
        id: "m-04",
        name: "Shelcal 500",
        generic: "Calcium 500mg + Vit D3",
        dose: "1 tablet",
        instruction: "Take with or right after lunch",
        status: "pending",
        patientName: "Asha Sharma"
      }
    ]
  },
  {
    id: "sch-03",
    timeSlot: "Evening",
    timeWindow: "7:00 PM - 8:00 PM",
    medicines: [
      {
        id: "m-05",
        name: "Glycomet 500",
        generic: "Metformin 500mg",
        dose: "1 tablet",
        instruction: "Take during dinner",
        status: "pending",
        patientName: "Ramesh Sharma"
      }
    ]
  },
  {
    id: "sch-04",
    timeSlot: "Bedtime",
    timeWindow: "9:30 PM - 10:30 PM",
    medicines: [
      {
        id: "m-06",
        name: "Warf 5",
        generic: "Warfarin 5mg",
        dose: "1 tablet",
        instruction: "Take strictly before sleeping with warm water",
        status: "pending",
        patientName: "Ramesh Sharma"
      }
    ]
  }
];

