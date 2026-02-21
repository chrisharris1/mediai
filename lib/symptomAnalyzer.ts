/**
 * Medical Symptom Analyzer
 * Rule-based symptom-to-condition matching system
 * Based on medical chatbot logic with enhanced matching
 */

export interface SymptomConditionData {
  conditions: string[];
  severity: 'mild' | 'moderate' | 'high';
  advice: string;
  homeRemedies: string[];
  suggestedMedicines: string[];
  warningSignsToLookFor: string[];
}

export interface AnalysisResult {
  possibleConditions: Array<{
    name: string;
    matchPercentage: number;
    severity: 'mild' | 'moderate' | 'high';
  }>;
  homeRemedies: string[];
  suggestedMedicines: string[];
  warningSignsToLookFor: string[];
  overallAdvice: string;
}

// Medical Knowledge Base - 50+ common conditions
const SYMPTOM_CONDITIONS: Record<string, SymptomConditionData> = {
  fever: {
    conditions: ['Common Cold', 'Flu', 'Viral Infection', 'Bacterial Infection', 'COVID-19'],
    severity: 'moderate',
    advice: 'Rest, stay hydrated, and monitor temperature. See a doctor if fever persists over 3 days or exceeds 102°F.',
    homeRemedies: ['Rest and adequate sleep', 'Drink plenty of fluids', 'Take lukewarm bath', 'Use cool compress on forehead'],
    suggestedMedicines: ['Paracetamol 500mg', 'Ibuprofen 400mg', 'Acetaminophen'],
    warningSignsToLookFor: ['Fever >102°F for >3 days', 'Difficulty breathing', 'Severe headache', 'Confusion'],
  },
  headache: {
    conditions: ['Tension Headache', 'Migraine', 'Stress', 'Dehydration', 'Eye Strain'],
    severity: 'mild',
    advice: 'Rest in a quiet, dark room. Stay hydrated. See a doctor if severe or persistent.',
    homeRemedies: ['Rest in dark, quiet room', 'Apply cold compress', 'Stay hydrated', 'Gentle head massage'],
    suggestedMedicines: ['Paracetamol 500mg', 'Ibuprofen 400mg', 'Aspirin'],
    warningSignsToLookFor: ['Sudden severe headache', 'Headache with vision changes', 'Persistent vomiting'],
  },
  cough: {
    conditions: ['Common Cold', 'Flu', 'Allergies', 'Bronchitis', 'Asthma'],
    severity: 'mild',
    advice: 'Stay hydrated, use honey for soothing. See a doctor if persistent or with blood.',
    homeRemedies: ['Warm water with honey', 'Steam inhalation', 'Ginger tea', 'Throat lozenges'],
    suggestedMedicines: ['Cough syrup', 'Throat lozenges', 'Antihistamines'],
    warningSignsToLookFor: ['Coughing up blood', 'Persistent cough >3 weeks', 'Difficulty breathing'],
  },
  sore_throat: {
    conditions: ['Viral Infection', 'Strep Throat', 'Allergies', 'Dry Air', 'Tonsillitis'],
    severity: 'mild',
    advice: 'Gargle with warm salt water. Stay hydrated. See a doctor if severe or persistent.',
    homeRemedies: ['Warm salt water gargle', 'Honey and lemon', 'Stay hydrated', 'Throat lozenges'],
    suggestedMedicines: ['Throat lozenges', 'Pain relievers', 'Antiseptic spray'],
    warningSignsToLookFor: ['Severe throat pain', 'Difficulty swallowing', 'High fever with sore throat'],
  },
  nausea: {
    conditions: ['Food Poisoning', 'Stomach Flu', 'Motion Sickness', 'Pregnancy', 'Migraine'],
    severity: 'moderate',
    advice: 'Rest, small sips of clear fluids. See a doctor if severe or persistent vomiting.',
    homeRemedies: ['Sip clear fluids slowly', 'Ginger tea', 'Eat bland foods (BRAT diet)', 'Rest'],
    suggestedMedicines: ['Anti-nausea medication', 'Ginger supplements', 'Oral rehydration salts'],
    warningSignsToLookFor: ['Persistent vomiting', 'Blood in vomit', 'Severe dehydration', 'Abdominal pain'],
  },
  chest_pain: {
    conditions: ['Heart Attack', 'Angina', 'Muscle Strain', 'Anxiety', 'Acid Reflux'],
    severity: 'high',
    advice: 'SEEK IMMEDIATE MEDICAL ATTENTION! Call emergency services if severe chest pain.',
    homeRemedies: ['NONE - SEEK EMERGENCY CARE'],
    suggestedMedicines: ['CALL EMERGENCY SERVICES IMMEDIATELY'],
    warningSignsToLookFor: ['Any chest pain', 'Pain radiating to arm/jaw', 'Shortness of breath', 'Sweating'],
  },
  shortness_of_breath: {
    conditions: ['Asthma', 'Heart Problems', 'Anxiety', 'Lung Infection', 'COPD'],
    severity: 'high',
    advice: 'Seek immediate medical attention if severe. Rest and avoid exertion.',
    homeRemedies: ['Sit upright', 'Practice slow breathing', 'Use prescribed inhaler if available'],
    suggestedMedicines: ['Bronchodilator (if prescribed)', 'Seek medical evaluation'],
    warningSignsToLookFor: ['Severe difficulty breathing', 'Bluish lips/fingers', 'Chest pain'],
  },
  stomach_pain: {
    conditions: ['Indigestion', 'Food Poisoning', 'Gastritis', 'Appendicitis', 'IBS'],
    severity: 'moderate',
    advice: 'Rest, avoid solid foods initially. See a doctor if severe or persistent.',
    homeRemedies: ['Rest', 'Warm compress on abdomen', 'Clear liquids', 'Avoid spicy foods'],
    suggestedMedicines: ['Antacids', 'Anti-gas medication', 'Pain relievers'],
    warningSignsToLookFor: ['Severe abdominal pain', 'Vomiting blood', 'Fever with pain'],
  },
  dizziness: {
    conditions: ['Low Blood Sugar', 'Dehydration', 'Inner Ear Problem', 'Low Blood Pressure', 'Vertigo'],
    severity: 'moderate',
    advice: 'Sit or lie down. Stay hydrated. See a doctor if frequent or severe.',
    homeRemedies: ['Sit or lie down immediately', 'Drink water', 'Eat something', 'Rest'],
    suggestedMedicines: ['ORS (Oral Rehydration Salts)', 'Glucose'],
    warningSignsToLookFor: ['Frequent episodes', 'Dizziness with chest pain', 'Loss of consciousness'],
  },
  fatigue: {
    conditions: ['Lack of Sleep', 'Stress', 'Anemia', 'Viral Infection', 'Thyroid Problems'],
    severity: 'mild',
    advice: 'Get adequate rest, eat well, stay hydrated. See a doctor if persistent.',
    homeRemedies: ['Adequate sleep (7-9 hours)', 'Balanced diet', 'Regular exercise', 'Stress management'],
    suggestedMedicines: ['Vitamin supplements', 'Iron supplements (if anemic)'],
    warningSignsToLookFor: ['Extreme fatigue', 'Fatigue with other symptoms', 'Persistent tiredness'],
  },
  back_pain: {
    conditions: ['Muscle Strain', 'Herniated Disc', 'Arthritis', 'Poor Posture', 'Kidney Problems'],
    severity: 'moderate',
    advice: 'Apply heat/cold, gentle stretching. See doctor if severe or persistent.',
    homeRemedies: ['Hot/cold compress', 'Gentle stretching', 'Proper posture', 'Rest'],
    suggestedMedicines: ['Pain relievers', 'Muscle relaxants', 'Topical pain relief'],
    warningSignsToLookFor: ['Severe pain', 'Pain with leg numbness', 'Loss of bladder control'],
  },
  joint_pain: {
    conditions: ['Arthritis', 'Injury', 'Inflammation', 'Overuse', 'Gout'],
    severity: 'moderate',
    advice: 'Rest the joint, apply ice. See doctor if swelling or persistent pain.',
    homeRemedies: ['Rest affected joint', 'Ice pack', 'Compression bandage', 'Elevate if possible'],
    suggestedMedicines: ['Anti-inflammatory drugs', 'Pain relievers', 'Topical gels'],
    warningSignsToLookFor: ['Severe swelling', 'Unable to move joint', 'Fever with joint pain'],
  },
  skin_rash: {
    conditions: ['Allergic Reaction', 'Eczema', 'Contact Dermatitis', 'Infection', 'Heat Rash'],
    severity: 'mild',
    advice: 'Avoid irritants, keep area clean. See doctor if spreading or infected.',
    homeRemedies: ['Keep area clean and dry', 'Avoid scratching', 'Cool compress', 'Moisturize'],
    suggestedMedicines: ['Anti-itch cream', 'Antihistamines', 'Topical steroids'],
    warningSignsToLookFor: ['Spreading rash', 'Signs of infection', 'Severe itching'],
  },
  anxiety: {
    conditions: ['Stress', 'Anxiety Disorder', 'Panic Disorder', 'Depression', 'PTSD'],
    severity: 'moderate',
    advice: 'Practice relaxation techniques. Seek professional help if persistent.',
    homeRemedies: ['Deep breathing exercises', 'Meditation', 'Regular exercise', 'Adequate sleep'],
    suggestedMedicines: ['Consult psychiatrist for proper medication'],
    warningSignsToLookFor: ['Panic attacks', 'Suicidal thoughts', 'Inability to function'],
  },
  vomiting: {
    conditions: ['Food Poisoning', 'Stomach Flu', 'Gastroenteritis', 'Migraine', 'Pregnancy'],
    severity: 'moderate',
    advice: 'Stay hydrated with small sips. See doctor if persistent or severe.',
    homeRemedies: ['Sip clear fluids', 'Oral rehydration solution', 'Rest', 'Bland foods after vomiting stops'],
    suggestedMedicines: ['Anti-nausea medication', 'ORS', 'Electrolyte solutions'],
    warningSignsToLookFor: ['Blood in vomit', 'Severe dehydration', 'Persistent vomiting >24 hours'],
  },
  diarrhea: {
    conditions: ['Food Poisoning', 'Viral Infection', 'IBS', 'Bacterial Infection', 'Lactose Intolerance'],
    severity: 'moderate',
    advice: 'Stay hydrated. See doctor if severe, bloody, or persistent >3 days.',
    homeRemedies: ['Drink plenty of fluids', 'ORS', 'BRAT diet', 'Rest'],
    suggestedMedicines: ['ORS', 'Anti-diarrheal medication', 'Probiotics'],
    warningSignsToLookFor: ['Blood in stool', 'Severe dehydration', 'High fever', 'Persistent >3 days'],
  },
  insomnia: {
    conditions: ['Stress', 'Anxiety', 'Depression', 'Sleep Disorder', 'Caffeine Overuse'],
    severity: 'mild',
    advice: 'Maintain sleep routine, avoid caffeine. See doctor if persistent.',
    homeRemedies: ['Regular sleep schedule', 'Avoid screens before bed', 'Relaxation techniques', 'Warm milk'],
    suggestedMedicines: ['Melatonin supplements', 'Herbal teas', 'Consult doctor for persistent cases'],
    warningSignsToLookFor: ['Chronic insomnia', 'Daytime fatigue affecting life', 'Depression'],
  },
  constipation: {
    conditions: ['Low Fiber Diet', 'Dehydration', 'IBS', 'Medication Side Effect', 'Lack of Exercise'],
    severity: 'mild',
    advice: 'Increase fiber and water intake. See doctor if persistent or painful.',
    homeRemedies: ['Drink more water', 'High fiber foods', 'Regular exercise', 'Warm liquids'],
    suggestedMedicines: ['Fiber supplements', 'Stool softeners', 'Mild laxatives'],
    warningSignsToLookFor: ['Severe abdominal pain', 'Blood in stool', 'No bowel movement >1 week'],
  },
  runny_nose: {
    conditions: ['Common Cold', 'Allergies', 'Sinusitis', 'Flu', 'Environmental Irritants'],
    severity: 'mild',
    advice: 'Stay hydrated, rest. See doctor if persistent >10 days or with fever.',
    homeRemedies: ['Steam inhalation', 'Saline nasal spray', 'Stay hydrated', 'Humidifier'],
    suggestedMedicines: ['Antihistamines', 'Decongestants', 'Nasal sprays'],
    warningSignsToLookFor: ['Green/yellow discharge', 'Facial pain', 'High fever'],
  },
  ear_pain: {
    conditions: ['Ear Infection', 'Wax Buildup', 'Sinus Infection', 'TMJ', 'Foreign Object'],
    severity: 'moderate',
    advice: 'Avoid inserting objects. See doctor for proper evaluation.',
    homeRemedies: ['Warm compress', 'Pain relievers', 'Keep ear dry'],
    suggestedMedicines: ['Pain relievers', 'Ear drops (if prescribed)'],
    warningSignsToLookFor: ['Severe pain', 'Hearing loss', 'Discharge from ear', 'High fever'],
  },
};

// Symptom synonyms for fuzzy matching
const SYMPTOM_SYNONYMS: Record<string, string[]> = {
  fever: ['temperature', 'hot', 'burning', 'feverish', 'high temp', 'pyrexia'],
  headache: ['head pain', 'migraine', 'head ache', 'skull pain', 'cephalalgia'],
  cough: ['coughing', 'hacking', 'persistent cough', 'dry cough', 'wet cough'],
  anxiety: ['anxious', 'worried', 'nervous', 'panic', 'stressed', 'apprehensive'],
  sore_throat: ['throat pain', 'sore', 'painful throat', 'scratchy throat'],
  nausea: ['nauseated', 'sick', 'queasy', 'upset stomach'],
  chest_pain: ['chest discomfort', 'chest pressure', 'heart pain'],
  shortness_of_breath: ['breathless', 'cant breathe', 'breathing difficulty', 'dyspnea'],
  stomach_pain: ['abdominal pain', 'belly ache', 'stomach ache', 'tummy pain'],
  dizziness: ['dizzy', 'lightheaded', 'vertigo', 'spinning'],
  fatigue: ['tired', 'exhausted', 'weary', 'low energy', 'lethargic'],
  back_pain: ['backache', 'spine pain', 'lower back pain'],
  joint_pain: ['arthritis', 'joint ache', 'stiff joints'],
  skin_rash: ['rash', 'skin irritation', 'hives', 'red skin'],
  vomiting: ['throwing up', 'vomit', 'puking'],
  diarrhea: ['loose stool', 'watery stool', 'runs'],
  runny_nose: ['nasal discharge', 'stuffy nose', 'congestion'],
};

/**
 * Calculate string similarity score
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Identify symptoms from user input using keyword matching and fuzzy matching
 */
export function identifySymptoms(userInput: string): string[] {
  const input = userInput.toLowerCase();
  const tokens = input.split(/\s+/);
  const identifiedSymptoms = new Set<string>();
  
  // Direct symptom name matching
  for (const symptom of Object.keys(SYMPTOM_CONDITIONS)) {
    if (input.includes(symptom.replace(/_/g, ' '))) {
      identifiedSymptoms.add(symptom);
    }
  }
  
  // Synonym matching with fuzzy matching
  for (const token of tokens) {
    for (const [symptom, synonyms] of Object.entries(SYMPTOM_SYNONYMS)) {
      for (const synonym of synonyms) {
        if (calculateSimilarity(token, synonym) > 0.8) {
          identifiedSymptoms.add(symptom);
        }
      }
    }
  }
  
  return Array.from(identifiedSymptoms);
}

/**
 * Analyze symptoms and return possible conditions with recommendations
 */
export function analyzeSymptoms(symptoms: string[]): AnalysisResult {
  const conditionScores = new Map<string, { count: number; severity: string; data: SymptomConditionData }>();
  const allHomeRemedies = new Set<string>();
  const allMedicines = new Set<string>();
  const allWarnings = new Set<string>();
  let highestSeverity: 'mild' | 'moderate' | 'high' = 'mild';
  
  // Analyze each symptom
  for (const symptom of symptoms) {
    const data = SYMPTOM_CONDITIONS[symptom];
    if (!data) continue;
    
    // Track conditions and their match counts
    for (const condition of data.conditions) {
      const existing = conditionScores.get(condition);
      if (existing) {
        existing.count++;
      } else {
        conditionScores.set(condition, { count: 1, severity: data.severity, data });
      }
    }
    
    // Collect all home remedies, medicines, and warnings
    data.homeRemedies.forEach(remedy => allHomeRemedies.add(remedy));
    data.suggestedMedicines.forEach(med => allMedicines.add(med));
    data.warningSignsToLookFor.forEach(warning => allWarnings.add(warning));
    
    // Track highest severity
    const severityLevels = { mild: 1, moderate: 2, high: 3 };
    if (severityLevels[data.severity] > severityLevels[highestSeverity]) {
      highestSeverity = data.severity;
    }
  }
  
  // Calculate match percentages and sort by relevance
  const totalSymptoms = symptoms.length;
  const possibleConditions = Array.from(conditionScores.entries())
    .map(([name, { count, severity }]) => ({
      name,
      matchPercentage: Math.round((count / totalSymptoms) * 100),
      severity: severity as 'mild' | 'moderate' | 'high',
    }))
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .slice(0, 5); // Top 5 conditions
  
  // Generate overall advice
  let overallAdvice = '';
  if (highestSeverity === 'high') {
    overallAdvice = '⚠️ URGENT: Your symptoms indicate a potentially serious condition. Seek immediate medical attention or call emergency services.';
  } else if (highestSeverity === 'moderate') {
    overallAdvice = 'Your symptoms suggest a moderate condition. Monitor your symptoms closely and consult a doctor if they worsen or persist for more than 3 days.';
  } else {
    overallAdvice = 'Your symptoms appear to be mild. Rest, stay hydrated, and try the suggested home remedies. Consult a doctor if symptoms persist or worsen.';
  }
  
  return {
    possibleConditions,
    homeRemedies: Array.from(allHomeRemedies).slice(0, 6),
    suggestedMedicines: Array.from(allMedicines).slice(0, 6),
    warningSignsToLookFor: Array.from(allWarnings).slice(0, 8),
    overallAdvice,
  };
}
