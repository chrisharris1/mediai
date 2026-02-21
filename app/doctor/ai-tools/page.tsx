'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Brain, 
  Pill, 
  AlertTriangle, 
  Stethoscope, 
  ArrowLeft, 
  Send, 
  Loader2,
  FileText,
  Upload,
  X,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

interface PatientContext {
  age: string;
  weight: string;
  gender: string;
  current_medications: string[];
  allergies: string[];
  chronic_conditions: string[];
}

interface AIResult {
  type: 'interactions' | 'side_effects' | 'symptoms';
  data: any;
  timestamp: Date;
}

export default function DoctorAITools() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Patient Context
  const [patientContext, setPatientContext] = useState<PatientContext>({
    age: '',
    weight: '',
    gender: '',
    current_medications: [],
    allergies: [],
    chronic_conditions: []
  });
  
  // AI Tools State
  const [activeTool, setActiveTool] = useState<'interactions' | 'side_effects' | 'symptoms' | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  
  // Drug Interaction Checker
  const [drugInput, setDrugInput] = useState('');
  
  // Side Effect Predictor
  const [medicineInput, setMedicineInput] = useState('');
  
  // Symptoms Analysis
  const [symptomsInput, setSymptomsInput] = useState('');
  
  // Bug Report Modal
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugReport, setBugReport] = useState({
    issue_type: '',
    description: '',
    expected_result: '',
    actual_result: '',
    screenshots: [] as File[]
  });
  const [submittingBug, setSubmittingBug] = useState(false);
  
  // Add medication to list
  const addMedication = (med: string) => {
    if (med.trim() && !patientContext.current_medications.includes(med.trim())) {
      setPatientContext(prev => ({
        ...prev,
        current_medications: [...prev.current_medications, med.trim()]
      }));
    }
  };
  
  const removeMedication = (index: number) => {
    setPatientContext(prev => ({
      ...prev,
      current_medications: prev.current_medications.filter((_, i) => i !== index)
    }));
  };
  
  const addAllergy = (allergy: string) => {
    if (allergy.trim() && !patientContext.allergies.includes(allergy.trim())) {
      setPatientContext(prev => ({
        ...prev,
        allergies: [...prev.allergies, allergy.trim()]
      }));
    }
  };
  
  const removeAllergy = (index: number) => {
    setPatientContext(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index)
    }));
  };
  
  const addCondition = (condition: string) => {
    if (condition.trim() && !patientContext.chronic_conditions.includes(condition.trim())) {
      setPatientContext(prev => ({
        ...prev,
        chronic_conditions: [...prev.chronic_conditions, condition.trim()]
      }));
    }
  };
  
  const removeCondition = (index: number) => {
    setPatientContext(prev => ({
      ...prev,
      chronic_conditions: prev.chronic_conditions.filter((_, i) => i !== index)
    }));
  };
  
  // Check Drug Interactions
  const checkDrugInteractions = async () => {
    if (!drugInput.trim()) {
      alert('Please enter medicine name(s)');
      return;
    }
    
    // Split by comma and clean up
    const enteredMedicines = drugInput.split(',').map(m => m.trim()).filter(m => m);
    
    // Combine entered medicines with current medications from context
    const allMedicines = [...enteredMedicines, ...patientContext.current_medications];
    
    if (allMedicines.length < 2) {
      alert('Need at least 2 medicines to check interactions. Either:\n• Enter multiple medicines separated by commas (e.g., Warfarin, Aspirin)\n• OR add medicines to "Current Medications" field below');
      return;
    }
    
    console.log('🔍 Drug Interaction Check - Frontend Debug');
    console.log('Entered medicines:', enteredMedicines);
    console.log('Current medications:', patientContext.current_medications);
    console.log('Total medicines to check:', allMedicines);
    
    setLoading(true);
    try {
      const requestBody = {
        medicine: allMedicines[0], // First medicine
        profile: {
          age: parseInt(patientContext.age) || 30,
          weight: parseFloat(patientContext.weight) || 70,
          gender: patientContext.gender || 'male',
          current_medications: allMedicines.slice(1), // Rest of medicines
          allergies: patientContext.allergies,
          chronic_conditions: patientContext.chronic_conditions
        }
      };
      
      console.log('📤 Sending request:', JSON.stringify(requestBody, null, 2));
      
      const res = await fetch('/api/interaction-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const data = await res.json();
      setAiResult({
        type: 'interactions',
        data: data,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error checking interactions:', error);
      alert('Failed to check drug interactions');
    } finally {
      setLoading(false);
    }
  };
  
  // Predict Side Effects
  const predictSideEffects = async () => {
    if (!medicineInput.trim()) {
      alert('Please enter a medicine name');
      return;
    }
    
    // Split by comma and clean up
    const enteredMedicines = medicineInput.split(',').map(m => m.trim()).filter(m => m);
    
    // Combine entered medicines with current medications from context
    const allMedicines = [...enteredMedicines, ...patientContext.current_medications];
    
    console.log('🔍 Side Effects Check - Frontend Debug');
    console.log('Entered medicines:', enteredMedicines);
    console.log('Current medications:', patientContext.current_medications);
    console.log('Total medicines:', allMedicines);
    
    setLoading(true);
    try {
      const res = await fetch('/api/interaction-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine: allMedicines[0],
          profile: {
            age: parseInt(patientContext.age) || 30,
            weight: parseFloat(patientContext.weight) || 70,
            gender: patientContext.gender || 'male',
            current_medications: allMedicines.slice(1),
            allergies: patientContext.allergies,
            chronic_conditions: patientContext.chronic_conditions
          }
        })
      });
      
      const data = await res.json();
      setAiResult({
        type: 'side_effects',
        data: data,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error predicting side effects:', error);
      alert('Failed to predict side effects');
    } finally {
      setLoading(false);
    }
  };
  
  // Analyze Symptoms
  const analyzeSymptoms = async () => {
    if (!symptomsInput.trim()) {
      alert('Please describe symptoms');
      return;
    }
    
    console.log('🔍 Symptoms Analysis - Frontend Debug');
    console.log('Symptoms:', symptomsInput);
    console.log('Context:', patientContext);
    
    setLoading(true);
    try {
      const res = await fetch('/api/symptoms/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: symptomsInput.split(',').map(s => s.trim()).filter(s => s),
          duration: 'recent',
          medications: patientContext.current_medications,
          homeRemedies: [],
          // Manual health data from form
          manualData: {
            age: parseInt(patientContext.age) || 30,
            weight: parseFloat(patientContext.weight) || 70,
            gender: patientContext.gender || 'unknown',
            chronic_conditions: patientContext.chronic_conditions,
            allergies: patientContext.allergies
          }
        })
      });
      
      const data = await res.json();
      setAiResult({
        type: 'symptoms',
        data: data,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      alert('Failed to analyze symptoms');
    } finally {
      setLoading(false);
    }
  };
  
  // Submit Bug Report
  const submitBugReport = async () => {
    if (!bugReport.issue_type || !bugReport.description || !aiResult) {
      alert('Please fill in all required fields');
      return;
    }
    
    setSubmittingBug(true);
    try {
      const formData = new FormData();
      formData.append('tool_type', aiResult.type);
      formData.append('issue_type', bugReport.issue_type);
      formData.append('description', bugReport.description);
      formData.append('expected_result', bugReport.expected_result);
      formData.append('actual_result', bugReport.actual_result);
      formData.append('ai_result', JSON.stringify(aiResult.data));
      formData.append('patient_context', JSON.stringify(patientContext));
      
      bugReport.screenshots.forEach((file, index) => {
        formData.append(`screenshot_${index}`, file);
      });
      
      const res = await fetch('/api/doctor/report-bug', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        alert('Bug report submitted successfully! The admin team will review it.');
        setShowBugReport(false);
        setBugReport({
          issue_type: '',
          description: '',
          expected_result: '',
          actual_result: '',
          screenshots: []
        });
      } else {
        alert('Failed to submit bug report');
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
      alert('Failed to submit bug report');
    } finally {
      setSubmittingBug(false);
    }
  };
  
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setBugReport(prev => ({
        ...prev,
        screenshots: [...prev.screenshots, ...files]
      }));
    }
  };
  
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (!session || (session.user as any).role !== 'doctor') {
    router.push('/login');
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/doctor-dashboard')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">AI Medical Tools</h1>
                <p className="text-sm text-gray-400">Test and validate AI outputs</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Patient Context */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Patient Context (Optional)
              </h2>
              
              <p className="text-xs text-gray-500 mb-4">
                Basic patient info for more accurate analysis. For drug interactions, enter medicines directly in the checker below.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Age</label>
                  <input
                    type="number"
                    value={patientContext.age}
                    onChange={(e) => setPatientContext(prev => ({ ...prev, age: e.target.value }))}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white"
                    placeholder="30"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Weight (kg)</label>
                  <input
                    type="number"
                    value={patientContext.weight}
                    onChange={(e) => setPatientContext(prev => ({ ...prev, weight: e.target.value }))}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white"
                    placeholder="70"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Gender</label>
                  <select
                    value={patientContext.gender}
                    onChange={(e) => setPatientContext(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Current Medications</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm"
                      placeholder="Add medication"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addMedication((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {patientContext.current_medications.map((med, idx) => (
                      <span key={idx} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                        {med}
                        <button onClick={() => removeMedication(idx)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Allergies</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm"
                      placeholder="Add allergy"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addAllergy((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {patientContext.allergies.map((allergy, idx) => (
                      <span key={idx} className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                        {allergy}
                        <button onClick={() => removeAllergy(idx)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Chronic Conditions</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm"
                      placeholder="Add condition"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addCondition((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {patientContext.chronic_conditions.map((condition, idx) => (
                      <span key={idx} className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full flex items-center gap-1">
                        {condition}
                        <button onClick={() => removeCondition(idx)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - AI Tools */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Tool Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTool('interactions')}
                className={`p-6 rounded-2xl border-2 transition-all ${
                  activeTool === 'interactions'
                    ? 'bg-blue-500/10 border-blue-500'
                    : 'bg-white/5 border-white/10 hover:border-blue-500/50'
                }`}
              >
                <Pill className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="font-bold mb-1">Drug Interactions</h3>
                <p className="text-sm text-gray-400">Check medicine compatibility</p>
              </button>
              
              <button
                onClick={() => setActiveTool('side_effects')}
                className={`p-6 rounded-2xl border-2 transition-all ${
                  activeTool === 'side_effects'
                    ? 'bg-orange-500/10 border-orange-500'
                    : 'bg-white/5 border-white/10 hover:border-orange-500/50'
                }`}
              >
                <AlertTriangle className="w-8 h-8 text-orange-400 mb-3" />
                <h3 className="font-bold mb-1">Side Effects</h3>
                <p className="text-sm text-gray-400">Predict adverse reactions</p>
              </button>
              
              <button
                onClick={() => setActiveTool('symptoms')}
                className={`p-6 rounded-2xl border-2 transition-all ${
                  activeTool === 'symptoms'
                    ? 'bg-purple-500/10 border-purple-500'
                    : 'bg-white/5 border-white/10 hover:border-purple-500/50'
                }`}
              >
                <Brain className="w-8 h-8 text-purple-400 mb-3" />
                <h3 className="font-bold mb-1">Symptoms Analysis</h3>
                <p className="text-sm text-gray-400">AI diagnostic suggestions</p>
              </button>
            </div>
            
            {/* Tool Input Area */}
            {activeTool && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                {activeTool === 'interactions' && (
                  <div>
                    <h3 className="text-lg font-bold mb-4">Drug Interaction Checker</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Enter medicine name(s). For multiple medicines, separate with commas OR add to "Current Medications" below.
                    </p>
                    <input
                      type="text"
                      value={drugInput}
                      onChange={(e) => setDrugInput(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white mb-4"
                      placeholder="Enter medicine (e.g., Warfarin) or multiple (Warfarin, Aspirin)"
                    />
                    <button
                      onClick={checkDrugInteractions}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      {loading ? 'Checking...' : 'Check Interactions'}
                    </button>
                  </div>
                )}
                
                {activeTool === 'side_effects' && (
                  <div>
                    <h3 className="text-lg font-bold mb-4">Side Effect Predictor</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Enter medicine name(s). Multiple medicines can be separated by commas OR added to "Current Medications" below.
                    </p>
                    <input
                      type="text"
                      value={medicineInput}
                      onChange={(e) => setMedicineInput(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white mb-4"
                      placeholder="Enter medicine (e.g., Crocin) or multiple (Crocin, Ibuprofen)"
                    />
                    <button
                      onClick={predictSideEffects}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      {loading ? 'Predicting...' : 'Predict Side Effects'}
                    </button>
                  </div>
                )}
                
                {activeTool === 'symptoms' && (
                  <div>
                    <h3 className="text-lg font-bold mb-4">AI Symptoms Analyzer</h3>
                    <p className="text-sm text-gray-400 mb-3">
                      Describe symptoms. Add patient's medications below for more accurate analysis.
                    </p>
                    <textarea
                      value={symptomsInput}
                      onChange={(e) => setSymptomsInput(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white mb-4 h-32"
                      placeholder="Describe patient symptoms (e.g., fever, headache, nausea)..."
                    />
                    <button
                      onClick={analyzeSymptoms}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      {loading ? 'Analyzing...' : 'Analyze Symptoms'}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* AI Results */}
            {aiResult && aiResult.type !== 'symptoms' && aiResult.data.success && aiResult.data.result && (
              <div className="mt-8 space-y-6 animate-fade-in">
                {/* Header with Report Button */}
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Brain className="w-6 h-6 text-blue-400" />
                    AI Analysis Results
                  </h2>
                  <button
                    onClick={() => setShowBugReport(true)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Report Issue
                  </button>
                </div>
                
                {/* Medicine Name */}
                <p className="text-gray-400">
                  Analysis for <span className="font-semibold text-white">{aiResult.data.result.medicine}</span>
                </p>

                {/* Severity Banner */}
                <div className={`rounded-2xl shadow-2xl overflow-hidden ${
                  aiResult.data.result.severity === 'safe' ? 'bg-linear-to-br from-emerald-500 to-green-600' :
                  aiResult.data.result.severity === 'minor' ? 'bg-linear-to-br from-yellow-400 to-amber-500' :
                  aiResult.data.result.severity === 'moderate' ? 'bg-linear-to-br from-orange-500 to-red-500' :
                  'bg-linear-to-br from-red-600 to-rose-700'
                } text-white`}>
                  <div className="p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                          {aiResult.data.result.severity === 'safe' ? <CheckCircle className="w-10 h-10" /> :
                           aiResult.data.result.severity === 'minor' ? <Info className="w-10 h-10" /> :
                           aiResult.data.result.severity === 'moderate' ? <AlertTriangle className="w-10 h-10" /> :
                           <XCircle className="w-10 h-10" />}
                        </div>
                        <div>
                          <p className="text-sm opacity-90 tracking-wider">INTERACTION RISK LEVEL</p>
                          <h3 className="text-4xl font-bold mt-2 uppercase">{aiResult.data.result.severity}</h3>
                          <p className="mt-4 opacity-90">
                            {aiResult.data.result.severity === 'safe' ? 'No significant interactions detected. Generally safe to proceed.' :
                             aiResult.data.result.severity === 'minor' ? 'Minor interactions possible. Monitor patient carefully.' :
                             aiResult.data.result.severity === 'moderate' ? 'Moderate interaction risk. Consult with patient before prescribing.' :
                             'Severe interaction risk. Consider alternative medications.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Results Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Interactions Panel */}
                  {aiResult.data.result.interactions && aiResult.data.result.interactions.length > 0 && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                        <h4 className="text-lg font-bold">Potential Interactions</h4>
                      </div>
                      <div className="space-y-4">
                        {aiResult.data.result.interactions.map((interaction: string, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
                            <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-amber-400">{index + 1}</span>
                            </div>
                            <p className="text-gray-300">{interaction}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Side Effects Panel */}
                  {aiResult.data.result.side_effects && aiResult.data.result.side_effects.length > 0 && (
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <Pill className="w-6 h-6 text-blue-400" />
                        <h4 className="text-lg font-bold">Possible Side Effects</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {aiResult.data.result.side_effects.map((effect: string, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                            <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0"></div>
                            <span className="text-sm text-gray-300">{effect}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommendations Panel */}
                {aiResult.data.result.recommendations && aiResult.data.result.recommendations.length > 0 && (
                  <div className="bg-linear-to-br from-emerald-900/10 to-green-900/10 backdrop-blur-sm rounded-2xl border border-emerald-500/20 p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <FileText className="w-6 h-6 text-emerald-400" />
                      <h4 className="text-lg font-bold">Medical Recommendations</h4>
                    </div>
                    <div className="space-y-4">
                      {aiResult.data.result.recommendations.map((recommendation: string, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                          <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                          <p className="text-gray-300">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="bg-linear-to-br from-amber-900/10 to-orange-900/10 backdrop-blur-sm border border-amber-500/20 rounded-2xl p-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-6 h-6 text-amber-400 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-amber-400 mb-2">AI Analysis Note</h4>
                      <p className="text-sm text-gray-300">
                        This AI-powered analysis is provided as a clinical decision support tool. 
                        Always use professional medical judgment and consider individual patient circumstances when making treatment decisions.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                <p className="text-xs text-gray-400 text-center">
                  Generated: {aiResult.timestamp.toLocaleString()}
                </p>
              </div>
            )}
            
            {/* Error Display */}
            {aiResult && (!aiResult.data.success || (!aiResult.data.result && !aiResult.data.analysis)) && (
              <div className="mt-8 bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <XCircle className="w-6 h-6 text-red-400" />
                  <h3 className="text-lg font-bold text-red-400">Analysis Error</h3>
                </div>
                <p className="text-gray-300 mb-4">
                  {aiResult.data.message || aiResult.data.error || 'An error occurred during analysis. Please try again.'}
                </p>
                <div className="bg-black/30 rounded-lg p-4">
                  <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                    {JSON.stringify(aiResult.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            
            {/* Symptoms Analysis Results */}
            {aiResult && aiResult.type === 'symptoms' && aiResult.data.success && aiResult.data.analysis && (
              <div className="space-y-6">
                {/* Risk Banner */}
                <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90 tracking-wider">URGENCY LEVEL</p>
                      <h3 className="text-4xl font-bold mt-2 uppercase">{aiResult.data.analysis.urgency || 'Unknown'}</h3>
                      <p className="mt-4 opacity-90">
                        {aiResult.data.analysis.emergency_detected 
                          ? '⚠️ Emergency detected. Seek immediate medical attention.' 
                          : 'Non-emergency. Follow recommendations below.'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-90">Risk Score</p>
                      <p className="text-3xl font-bold">{aiResult.data.analysis.risk_score || 0}/100</p>
                    </div>
                  </div>
                </div>

                {/* Possible Conditions */}
                {aiResult.data.analysis.possible_conditions && aiResult.data.analysis.possible_conditions.length > 0 && (
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <FileText className="w-6 h-6 text-blue-400" />
                      <h4 className="text-lg font-bold">Possible Conditions</h4>
                    </div>
                    <div className="space-y-3">
                      {aiResult.data.analysis.possible_conditions.map((condition: any, index: number) => (
                        <div key={index} className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-bold text-blue-300">{condition.condition || condition}</h5>
                              {condition.confidence && (
                                <p className="text-sm text-gray-400 mt-1">Confidence: {condition.confidence}%</p>
                              )}
                            </div>
                          </div>
                          {condition.description && (
                            <p className="text-sm text-gray-300 mt-2">{condition.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {aiResult.data.analysis.recommendations && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Suggested Medicines */}
                    {aiResult.data.analysis.recommendations.suggested_medicines && 
                     aiResult.data.analysis.recommendations.suggested_medicines.length > 0 && (
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                          <Pill className="w-6 h-6 text-green-400" />
                          <h4 className="text-lg font-bold">Suggested Medicines</h4>
                        </div>
                        <div className="space-y-2">
                          {aiResult.data.analysis.recommendations.suggested_medicines.map((med: string, index: number) => (
                            <div key={index} className="flex items-center gap-2 p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                              <div className="w-2 h-2 bg-green-500 rounded-full shrink-0"></div>
                              <span className="text-sm text-gray-300">{med}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Home Remedies */}
                    {aiResult.data.analysis.recommendations.home_remedies && 
                     aiResult.data.analysis.recommendations.home_remedies.length > 0 && (
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                          <CheckCircle className="w-6 h-6 text-emerald-400" />
                          <h4 className="text-lg font-bold">Home Remedies</h4>
                        </div>
                        <div className="space-y-2">
                          {aiResult.data.analysis.recommendations.home_remedies.map((remedy: string, index: number) => (
                            <div key={index} className="flex items-center gap-2 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="text-sm text-gray-300">{remedy}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Medicine Warnings */}
                {aiResult.data.analysis.medicine_warnings && aiResult.data.analysis.medicine_warnings.length > 0 && (
                  <div className="bg-amber-500/10 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="w-6 h-6 text-amber-400" />
                      <h4 className="text-lg font-bold">Medicine Interaction Warnings</h4>
                    </div>
                    <div className="space-y-2">
                      {aiResult.data.analysis.medicine_warnings.map((warning: string, index: number) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-amber-500/5 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                          <span className="text-sm text-gray-300">{warning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overall Advice */}
                {aiResult.data.analysis.overall_advice && (
                  <div className="bg-gradient-to-br from-emerald-900/10 to-green-900/10 backdrop-blur-sm rounded-2xl border border-emerald-500/20 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Info className="w-6 h-6 text-emerald-400" />
                      <h4 className="text-lg font-bold">Medical Advice</h4>
                    </div>
                    <p className="text-gray-300 leading-relaxed">{aiResult.data.analysis.overall_advice}</p>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="bg-gradient-to-br from-amber-900/10 to-orange-900/10 backdrop-blur-sm border border-amber-500/20 rounded-2xl p-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-6 h-6 text-amber-400 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-amber-400 mb-2">AI Analysis Note</h4>
                      <p className="text-sm text-gray-300">
                        This AI-powered symptom analysis is provided as a clinical decision support tool. 
                        Always use professional medical judgment and consider individual patient circumstances when making treatment decisions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Bug Report Modal */}
      {showBugReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                  Report AI Issue
                </h2>
                <button
                  onClick={() => setShowBugReport(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Issue Type *</label>
                <select
                  value={bugReport.issue_type}
                  onChange={(e) => setBugReport(prev => ({ ...prev, issue_type: e.target.value }))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white"
                  required
                >
                  <option value="">Select issue type</option>
                  <option value="wrong_data">Wrong Data</option>
                  <option value="incorrect_analysis">Incorrect Analysis</option>
                  <option value="missing_interaction">Missing Drug Interaction</option>
                  <option value="false_positive">False Positive</option>
                  <option value="missing_side_effect">Missing Side Effect</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Description *</label>
                <textarea
                  value={bugReport.description}
                  onChange={(e) => setBugReport(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white min-h-[100px]"
                  placeholder="Describe the issue in detail..."
                  required
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Expected Result</label>
                <textarea
                  value={bugReport.expected_result}
                  onChange={(e) => setBugReport(prev => ({ ...prev, expected_result: e.target.value }))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white min-h-[80px]"
                  placeholder="What should the AI have shown?"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Actual Result</label>
                <textarea
                  value={bugReport.actual_result}
                  onChange={(e) => setBugReport(prev => ({ ...prev, actual_result: e.target.value }))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white min-h-[80px]"
                  placeholder="What did the AI actually show?"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Screenshots (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleScreenshotUpload}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white"
                />
                {bugReport.screenshots.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {bugReport.screenshots.map((file, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full">
                        {file.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowBugReport(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitBugReport}
                  disabled={submittingBug}
                  className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingBug ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {submittingBug ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
