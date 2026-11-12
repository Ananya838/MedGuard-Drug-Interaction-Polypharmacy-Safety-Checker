export default {
  // Navigation
  nav: {
    suiteTitle: "MedGuard",
    suiteSubtitle: "Caregiver Suite",
    home: "Home",
    patients: "Patients",
    scanStrips: "Scan Strips",
    schedule: "Schedule",
    settings: "Settings",
    engineReady: "AI Engine Ready",
    engineSubtitle: "On-device Indian Rx",
    elderHelpline: "Elder Helpline",
    helplineNumber: "14567"
  },

  // Top Bar
  topBar: {
    searchPlaceholder: "Search elder names or medicines...",
    languageLabel: "English",
    enlargeText: "Enlarge Text Size",
    sosButton: "SOS 108/112",
    primaryCaregiver: "Primary Caregiver"
  },

  // Common
  common: {
    back: "Back",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirm: "Confirm",
    loading: "Loading...",
    search: "Search",
    years: "yrs",
    age: "Age",
    gender: "Gender",
    bloodGroup: "Blood Group",
    phone: "Phone",
    emergencyContact: "Emergency Contact",
    noKnownInteractions: "No known interaction found in our data.",
    disclaimer: "MedGuard is a screening aid and does not replace a doctor or pharmacist. Consult a qualified healthcare professional before starting, stopping, or altering any medication."
  },

  // Severity labels
  severity: {
    major: "Major Conflict",
    moderate: "Moderate Conflict",
    minor: "Minor Precaution",
    none: "No Known Interaction"
  },

  // Fixed Caregiver Action Templates (Human written - Safety Rule #9)
  actions: {
    major: "Contact the prescribing doctor or pharmacist before administering these medicines together.",
    moderate: "Discuss these medicines with your doctor at the next visit or contact your pharmacist.",
    minor: "Monitor for side effects as advised by your healthcare provider.",
    none: "Administer as directed by the prescribing doctor or pharmacist."
  },

  // Home Dashboard
  dashboard: {
    welcome: "Good morning, Sunita",
    subtitle: "Polypharmacy safety monitor for your family elders.",
    activeElders: "Active Elders",
    monitoredMeds: "Monitored Meds",
    activeRisks: "Active Conflicts",
    todaySchedule: "Doses Today",
    quickActions: "Quick Actions",
    scanNewStrip: "Scan Medicine Strip",
    scanSubtitle: "Extract & verify medicines from packaging photos",
    addElder: "Add Elder Profile",
    addElderSubtitle: "Record age, allergies, and existing conditions",
    runSafetyCheck: "Run Safety Check",
    runSafetyCheckSubtitle: "Check cross-drug interactions & dose limits",
    monitoredEldersTitle: "Monitored Family Elders",
    recentSafetyAlerts: "Recent Safety Alerts",
    viewDetails: "View Details",
    viewReport: "View Report",
    noAlertsFound: "No high-risk conflicts detected for your family members."
  },

  // Patient Detail
  patient: {
    allergies: "Documented Allergies",
    conditions: "Chronic Conditions",
    currentMedicines: "Current Medicines",
    addMedicine: "Add Medicine",
    runCheck: "Run Safety Check",
    emergencyCard: "Emergency Medical Card",
    noAllergies: "No documented allergies",
    noConditions: "No documented conditions",
    noMedicines: "No active medicines recorded",
    prescribedBy: "Prescribed By",
    timing: "Timing",
    dose: "Dose",
    statusActive: "Active",
    addPatientTitle: "Add New Elder Profile",
    editPatientTitle: "Edit Elder Profile"
  },

  // Confirm Medicines Screen
  confirmScreen: {
    title: "Confirm Scanned Medicines",
    subtitle: "Review detected medicines before running the safety check.",
    extractedLabel: "Extracted Brand / Text",
    matchedDrug: "Matched Brand & Ingredients",
    dosage: "Dose & Frequency",
    timing: "Timing",
    actionConfirm: "Confirm & Check Interactions",
    actionAddManual: "Add Missing Medicine",
    unrecognizedAlertTitle: "Unrecognized Items Found",
    unrecognizedAlertText: "The following items could not be matched with our database. They will not be evaluated for drug interactions.",
    removePill: "Remove"
  },

  // Safety Report Screen
  report: {
    title: "Polypharmacy Safety Report",
    subtitle: "Comprehensive screening for drug interactions, dose limits, and geriatric precautions.",
    printPdf: "Doctor Report (PDF)",
    readAloud: "Read Aloud",
    majorRisksCount: "Major Risk(s)",
    discussCount: "Moderate Conflict(s)",
    minorCount: "Minor Precaution(s)",
    safePairsCount: "No Known Interactions",
    findingsHeader: "Clinical Safety Findings",
    drugsInvolved: "Medicines Involved",
    clinicalSummary: "Clinical Impact",
    caregiverAdvice: "Caregiver Action Required",
    doseLimitsHeader: "Daily Cumulative Dose Tracking",
    maxDailyLimit: "Max daily safe ceiling",
    currentDailyIntake: "Current calculated daily intake",
    beersNoticeHeader: "Geriatric Precaution (Beers Criteria)",
    beersNoticeText: "Certain medications carry heightened risks in older adults, such as increased risk of falls, sedation, or confusion.",
    doctorDiscussionPoints: "Questions to Ask Your Doctor",
    screeningNotice: "Screening Aid Only"
  },

  // Schedule Screen
  scheduleScreen: {
    title: "Daily Medication Schedule",
    subtitle: "Track daily doses across morning, afternoon, evening, and bedtime.",
    morning: "Morning (8:00 AM - 10:00 AM)",
    afternoon: "Afternoon (1:00 PM - 2:00 PM)",
    evening: "Evening (7:00 PM - 8:00 PM)",
    bedtime: "Night / Bedtime (9:30 PM - 10:30 PM)",
    takeWithFood: "Take with or after meals",
    takeEmptyStomach: "Take on an empty stomach",
    markTaken: "Mark as Taken",
    markedTaken: "Taken",
    missed: "Pending"
  },

  // Caregiver Settings Screen
  settingsScreen: {
    title: "Caregiver & App Settings",
    subtitle: "Manage preferences, accessibility options, and data privacy.",
    profileSection: "Caregiver Profile",
    accessibilitySection: "Accessibility Options",
    privacySection: "Privacy & Data Storage",
    privacyText: "MedGuard processes medicine package images strictly on your device. No photos or prescription images are uploaded to the cloud or saved without your explicit action.",
    largeTextToggle: "Large Text Mode (1.2x scale for presbyopia)",
    languagePreference: "Preferred Language",
    logout: "Log Out",
    deleteAccount: "Delete Account & All Data"
  },

  // Scan Strips Screen
  scanScreen: {
    title: "Scan Medicine Packaging",
    subtitle: "Take a photo or upload packaging images to automatically identify medicines.",
    privacyBannerHeader: "Your photos stay on this device",
    privacyBannerText: "Packaging photos are processed locally on your phone or computer. Images are never uploaded to a cloud server or shared.",
    dragDropText: "Drag and drop medicine strip photos here, or click to browse",
    selectElder: "Assign scan to elder:",
    webcamCapture: "Use Camera",
    startOcr: "Extract Medicines",
    analyzingImage: "Extracting medicine text on-device..."
  },

  // Emergency Card Screen
  emergencyCardScreen: {
    title: "Emergency Medical Card",
    subtitle: "Keep this card accessible in case of medical emergencies or hospitalization.",
    printCard: "Print Card",
    criticalAllergies: "Severe Allergies",
    chronicConditions: "Diagnosed Conditions",
    activeMedications: "Current Medication Regimen",
    primaryPhysician: "Primary Doctor",
    emergencyContacts: "Emergency Contact Numbers"
  }
};

