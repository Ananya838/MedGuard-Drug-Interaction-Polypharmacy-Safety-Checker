export default {
  // Navigation
  nav: {
    suiteTitle: "मेडगार्ड",
    suiteSubtitle: "केयरगिवर सूट",
    home: "होम",
    patients: "बुजुर्ग सदस्य",
    scanStrips: "दवा स्ट्रिप स्कैन",
    schedule: "दवा समय सारणी",
    settings: "सेटिंग्स",
    engineReady: "एआई इंजन तैयार",
    engineSubtitle: "डिवाइस पर स्थानीय जांच",
    elderHelpline: "एल्डर हेल्पलाइन",
    helplineNumber: "14567"
  },

  // Top Bar
  topBar: {
    searchPlaceholder: "बुजुर्ग या दवा का नाम खोजें...",
    languageLabel: "हिन्दी",
    enlargeText: "बड़ा फ़ॉन्ट आकार",
    sosButton: "आपातकालीन 108/112",
    primaryCaregiver: "मुख्य देखभालकर्ता"
  },

  // Common
  common: {
    back: "वापस",
    save: "सुरक्षित करें",
    cancel: "रद्द करें",
    delete: "हटाएं",
    confirm: "पुष्टि करें",
    loading: "लोड हो रहा है...",
    search: "खोजें",
    years: "वर्ष",
    age: "उम्र",
    gender: "लिंग",
    bloodGroup: "रक्त समूह",
    phone: "फ़ोन",
    emergencyContact: "आपातकालीन संपर्क",
    noKnownInteractions: "हमारे डेटा में कोई ज्ञात परस्पर क्रिया नहीं मिली।",
    disclaimer: "मेडगार्ड केवल एक स्क्रीनिंग सहायता है और यह डॉक्टर या फार्मासिस्ट का स्थान नहीं लेता है। किसी भी दवा को शुरू करने, रोकने या बदलने से पहले हमेशा योग्य डॉक्टर से परामर्श लें।"
  },

  // Severity labels
  severity: {
    major: "गंभीर परस्पर विरोध",
    moderate: "मध्यम परस्पर विरोध",
    minor: "सामान्य सावधानी",
    none: "कोई ज्ञात परस्पर क्रिया नहीं"
  },

  // Fixed Caregiver Action Templates (Human written - Safety Rule #9)
  actions: {
    major: "इन दवाओं को एक साथ देने से पहले तुरंत अपने डॉक्टर या फार्मासिस्ट से संपर्क करें।",
    moderate: "अगली मुलाकात पर अपने डॉक्टर से इन दवाओं के बारे में चर्चा करें या फार्मासिस्ट से सलाह लें।",
    minor: "स्वास्थ्य सेवा प्रदाता की सलाह के अनुसार किसी भी दुष्प्रभाव पर नजर रखें।",
    none: "डॉक्टर या फार्मासिस्ट के निर्देशानुसार दवाएं दें।"
  },

  // Home Dashboard
  dashboard: {
    welcome: "नमस्ते, सुनीता",
    subtitle: "आपके परिवार के बुजुर्गों के लिए दवा सुरक्षा और परस्पर क्रिया मॉनिटर।",
    activeElders: "सक्रिय बुजुर्ग",
    monitoredMeds: "कुल दवाएं",
    activeRisks: "सक्रिय जोखिम",
    todaySchedule: "आज की खुराकें",
    quickActions: "त्वरित कार्य",
    scanNewStrip: "दवा का पत्ता स्कैन करें",
    scanSubtitle: "पैकेजिंग फोटो से दवाओं की पहचान और सत्यापन करें",
    addElder: "बुजुर्ग प्रोफ़ाइल जोड़ें",
    addElderSubtitle: "उम्र, एलर्जी और पुरानी बीमारियों का विवरण दर्ज करें",
    runSafetyCheck: "सुरक्षा जांच चलाएं",
    runSafetyCheckSubtitle: "दवाओं के परस्पर प्रभाव और दैनिक खुराक की जांच करें",
    monitoredEldersTitle: "निगरानी वाले परिवार के बुजुर्ग",
    recentSafetyAlerts: "हाल की सुरक्षा चेतावनियां",
    viewDetails: "विवरण देखें",
    viewReport: "रिपोर्ट देखें",
    noAlertsFound: "परिवार के सदस्यों के लिए कोई उच्च-जोखिम परस्पर विरोध नहीं मिला।"
  },

  // Patient Detail
  patient: {
    allergies: "एलर्जी विवरण",
    conditions: "पुरानी बीमारियां",
    currentMedicines: "वर्तमान दवाएं",
    addMedicine: "दवा जोड़ें",
    runCheck: "सुरक्षा जांच चलाएं",
    emergencyCard: "आपातकालीन चिकित्सा कार्ड",
    noAllergies: "कोई दर्ज एलर्जी नहीं",
    noConditions: "कोई दर्ज पुरानी बीमारी नहीं",
    noMedicines: "कोई सक्रिय दवा दर्ज नहीं है",
    prescribedBy: "परामर्शदाता डॉक्टर",
    timing: "समय",
    dose: "खुराक",
    statusActive: "सक्रिय",
    addPatientTitle: "नई बुजुर्ग प्रोफ़ाइल जोड़ें",
    editPatientTitle: "बुजुर्ग प्रोफ़ाइल संपादित करें"
  },

  // Confirm Medicines Screen
  confirmScreen: {
    title: "स्कैन की गई दवाओं की पुष्टि करें",
    subtitle: "सुरक्षा जांच चलाने से पहले पहचानी गई दवाओं की समीक्षा करें।",
    extractedLabel: "स्कैन किया गया ब्रांड / नाम",
    matchedDrug: "पहचाना गया ब्रांड और सामग्री",
    dosage: "खुराक और आवृत्ति",
    timing: "समय",
    actionConfirm: "पुष्टि करें और सुरक्षा जांचें",
    actionAddManual: "छूटी हुई दवा जोड़ें",
    unrecognizedAlertTitle: "पहचान न हो सकने वाली वस्तुएं",
    unrecognizedAlertText: "निम्नलिखित दवाओं का हमारे डेटाबेस से मिलान नहीं हो सका। इनकी सुरक्षा जांच नहीं की जाएगी।",
    removePill: "हटाएं"
  },

  // Safety Report Screen
  report: {
    title: "दवा सुरक्षा रिपोर्ट",
    subtitle: "दवाओं की परस्पर क्रिया, अधिकतम खुराक और बुजुर्गों के लिए विशेष सावधानियों की जांच।",
    printPdf: "डॉक्टर रिपोर्ट (प्रिंट)",
    readAloud: "बोलकर सुनाएं",
    majorRisksCount: "गंभीर जोखिम",
    discussCount: "मध्यम परस्पर विरोध",
    minorCount: "सामान्य सावधानी",
    safePairsCount: "कोई ज्ञात परस्पर क्रिया नहीं",
    findingsHeader: "दवा सुरक्षा निष्कर्ष",
    drugsInvolved: "शामिल दवाएं",
    clinicalSummary: "चिकित्सीय प्रभाव",
    caregiverAdvice: "देखभालकर्ता के लिए आवश्यक कदम",
    doseLimitsHeader: "दैनिक संचयी खुराक निगरानी",
    maxDailyLimit: "अधिकतम अनुशंसित दैनिक सीमा",
    currentDailyIntake: "वर्तमान अनुमानित दैनिक मात्रा",
    beersNoticeHeader: "बुजुर्गों के लिए विशेष सावधानी (बीयर्स मानदंड)",
    beersNoticeText: "कुछ दवाएं बुजुर्गों में गिरने, अत्यधिक सुस्ती या भ्रम का खतरा बढ़ा सकती हैं।",
    doctorDiscussionPoints: "डॉक्टर से पूछने योग्य प्रश्न",
    screeningNotice: "केवल स्क्रीनिंग सहायता"
  },

  // Schedule Screen
  scheduleScreen: {
    title: "दैनिक दवा समय सारणी",
    subtitle: "सुबह, दोपहर, शाम और रात की खुराक का समय पर ध्यान रखें।",
    morning: "सुबह (8:00 AM - 10:00 AM)",
    afternoon: "दोपहर (1:00 PM - 2:00 PM)",
    evening: "शाम (7:00 PM - 8:00 PM)",
    bedtime: "रात / सोने से पहले (9:30 PM - 10:30 PM)",
    takeWithFood: "भोजन के साथ या बाद में लें",
    takeEmptyStomach: "खाली पेट लें",
    markTaken: "ली गई चिन्हित करें",
    markedTaken: "ली गई",
    missed: "लंबित"
  },

  // Caregiver Settings Screen
  settingsScreen: {
    title: "देखभालकर्ता और ऐप सेटिंग्स",
    subtitle: "प्राथमिकताएं, सुगमता विकल्प और डेटा गोपनीयता प्रबंधित करें।",
    profileSection: "देखभालकर्ता प्रोफ़ाइल",
    accessibilitySection: "सुगमता विकल्प",
    privacySection: "डेटा गोपनीयता",
    privacyText: "मेडगार्ड दवा के पत्ते की तस्वीरों को केवल आपके डिवाइस पर प्रोसेस करता है। कोई भी तस्वीर क्लाउड पर अपलोड नहीं की जाती है।",
    largeTextToggle: "बड़ा फ़ॉन्ट मोड (बुजुर्गों और पढ़ने में आसानी के लिए 1.2x आकार)",
    languagePreference: "पसंदीदा भाषा",
    logout: "लॉग आउट करें",
    deleteAccount: "खाता और डेटा हटाएं"
  },

  // Scan Strips Screen
  scanScreen: {
    title: "दवा का पत्ता स्कैन करें",
    subtitle: "दवाओं की स्वचालित पहचान के लिए फोटो खींचें या पैकेजिंग की तस्वीर अपलोड करें।",
    privacyBannerHeader: "आपकी तस्वीरें इस डिवाइस पर ही रहती हैं",
    privacyBannerText: "दवा की तस्वीरें स्थानीय रूप से आपके फोन या कंप्यूटर पर प्रोसेस की जाती हैं। तस्वीरें कभी किसी सर्वर पर नहीं भेजी जातीं।",
    dragDropText: "दवा के पत्ते की तस्वीर यहां खींच कर लाएं या ब्राउज़ करने के लिए क्लिक करें",
    selectElder: "किस बुजुर्ग के लिए स्कैन कर रहे हैं:",
    webcamCapture: "कैमरे का उपयोग करें",
    startOcr: "दवाएं पहचानें",
    analyzingImage: "डिवाइस पर दवा का पाठ पहचाना जा रहा है..."
  },

  // Emergency Card Screen
  emergencyCardScreen: {
    title: "आपातकालीन चिकित्सा कार्ड",
    subtitle: "आपातकालीन स्थिति या अस्पताल में भर्ती होने पर इस कार्ड को तुरंत दिखाएं।",
    printCard: "कार्ड प्रिंट करें",
    criticalAllergies: "गंभीर एलर्जी",
    chronicConditions: "पुरानी बीमारियां",
    activeMedications: "वर्तमान दवाएं",
    primaryPhysician: "मुख्य चिकित्सक",
    emergencyContacts: "आपातकालीन संपर्क नंबर"
  }
};

