'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Plus, X, Activity, Pill, AlertTriangle, Heart, Clock, User, Stethoscope, Thermometer, Brain, ChevronRight, CheckCircle } from 'lucide-react';
import AnimatedBackground from '@/components/AnimatedBackground';

interface SymptomFormData {
  symptoms: string[];
  duration: string;
  medications: string[];
  homeRemedies: string[];
  patientInfo: {
    age: number;
    gender: string;
    chronicConditions: string[];
    allergies: string[];
  };
}

export default function SymptomCheckerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SymptomFormData>({
    symptoms: [],
    duration: '',
    medications: [],
    homeRemedies: [],
    patientInfo: {
      age: 0,
      gender: '',
      chronicConditions: [],
      allergies: [],
    },
  });

  const [symptomInput, setSymptomInput] = useState('');
  const [medicationInput, setMedicationInput] = useState('');
  const [remedyInput, setRemedyInput] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [activeTab, setActiveTab] = useState('symptoms');
  const [showSymptomGuide, setShowSymptomGuide] = useState(false);
  const symptomInputRef = useRef<HTMLInputElement>(null);

  // Common suggestions for each category
  const symptomSuggestions = [
    'Fever', 'Headache', 'Cough', 'Sore throat', 'Runny nose',
    'Fatigue', 'Body ache', 'Nausea', 'Dizziness', 'Shortness of breath',
    'Chest pain', 'Abdominal pain', 'Rash', 'Joint pain', 'Back pain'
  ];

  const medicationSuggestions = [
    'Paracetamol', 'Ibuprofen', 'Aspirin', 'Cetirizine', 'Omeprazole',
    'Atorvastatin', 'Metformin', 'Losartan', 'Amlodipine', 'Levothyroxine'
  ];

  const remedySuggestions = [
    'Hot water steam', 'Honey tea', 'Salt water gargle', 'Ginger tea',
    'Turmeric milk', 'Rest', 'Hydration', 'Warm compress', 'Cold compress'
  ];

  const conditionSuggestions = [
    'Diabetes', 'Hypertension', 'Asthma', 'Arthritis', 'Heart disease',
    'Thyroid disorder', 'Kidney disease', 'Liver disease', 'COPD'
  ];

  const allergySuggestions = [
    'Pollen', 'Dust', 'Penicillin', 'Peanuts', 'Shellfish',
    'Eggs', 'Milk', 'Soy', 'Wheat', 'Latex'
  ];

  // Improved add function with auto-suggest
  const addItem = (category: 'symptoms' | 'medications' | 'homeRemedies' | 'chronicConditions' | 'allergies', value: string) => {
    if (!value.trim()) return;
    
    switch(category) {
      case 'symptoms':
        if (!formData.symptoms.includes(value.trim())) {
          setFormData(prev => ({
            ...prev,
            symptoms: [...prev.symptoms, value.trim()]
          }));
        }
        setSymptomInput('');
        break;
      case 'medications':
        if (!formData.medications.includes(value.trim())) {
          setFormData(prev => ({
            ...prev,
            medications: [...prev.medications, value.trim()]
          }));
        }
        setMedicationInput('');
        break;
      case 'homeRemedies':
        if (!formData.homeRemedies.includes(value.trim())) {
          setFormData(prev => ({
            ...prev,
            homeRemedies: [...prev.homeRemedies, value.trim()]
          }));
        }
        setRemedyInput('');
        break;
      case 'chronicConditions':
        if (!formData.patientInfo.chronicConditions.includes(value.trim())) {
          setFormData(prev => ({
            ...prev,
            patientInfo: {
              ...prev.patientInfo,
              chronicConditions: [...prev.patientInfo.chronicConditions, value.trim()]
            }
          }));
        }
        setConditionInput('');
        break;
      case 'allergies':
        if (!formData.patientInfo.allergies.includes(value.trim())) {
          setFormData(prev => ({
            ...prev,
            patientInfo: {
              ...prev.patientInfo,
              allergies: [...prev.patientInfo.allergies, value.trim()]
            }
          }));
        }
        setAllergyInput('');
        break;
    }
  };

  const removeItem = (category: 'symptoms' | 'medications' | 'homeRemedies' | 'chronicConditions' | 'allergies', index: number) => {
    switch(category) {
      case 'symptoms':
        setFormData(prev => ({
          ...prev,
          symptoms: prev.symptoms.filter((_, i) => i !== index)
        }));
        break;
      case 'medications':
        setFormData(prev => ({
          ...prev,
          medications: prev.medications.filter((_, i) => i !== index)
        }));
        break;
      case 'homeRemedies':
        setFormData(prev => ({
          ...prev,
          homeRemedies: prev.homeRemedies.filter((_, i) => i !== index)
        }));
        break;
      case 'chronicConditions':
        setFormData(prev => ({
          ...prev,
          patientInfo: {
            ...prev.patientInfo,
            chronicConditions: prev.patientInfo.chronicConditions.filter((_, i) => i !== index)
          }
        }));
        break;
      case 'allergies':
        setFormData(prev => ({
          ...prev,
          patientInfo: {
            ...prev.patientInfo,
            allergies: prev.patientInfo.allergies.filter((_, i) => i !== index)
          }
        }));
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.symptoms.length === 0) {
      alert('Please enter at least one symptom');
      return;
    }

    setLoading(true);
    try {
      // First, fetch user health profile
      const profileResponse = await fetch('/api/profile');
      const profileData = await profileResponse.json();

      // Prepare data with profile information
      const analysisData = {
        symptoms: formData.symptoms,
        duration: formData.duration,
        medications: formData.medications,
        homeRemedies: formData.homeRemedies,
        profile: {
          age: profileData.profile?.age || formData.patientInfo.age || 30,
          weight: profileData.profile?.weight || 70,
          gender: profileData.profile?.gender || formData.patientInfo.gender || 'unknown',
          chronic_conditions: profileData.profile?.chronic_conditions || formData.patientInfo.chronicConditions || [],
          allergies: profileData.profile?.allergies || formData.patientInfo.allergies || [],
          current_medications: profileData.profile?.current_medications || formData.medications || []
        }
      };

      const response = await fetch('/api/symptoms/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('symptomAnalysis', JSON.stringify(data.analysis));
        localStorage.setItem('symptomReportId', data.reportId);
        router.push('/symptom-checker/report');
      } else {
        alert('Error: ' + (data.error || 'Analysis failed'));
      }
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      alert('Failed to analyze symptoms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-focus input when tab changes
  useEffect(() => {
    if (activeTab === 'symptoms' && symptomInputRef.current) {
      symptomInputRef.current.focus();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden">
      <AnimatedBackground />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-linear-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    AI Symptom Checker
                  </h1>
                  <p className="text-sm text-gray-400">Get personalized health insights</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              AI Analysis Ready
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {['Symptoms', 'Duration', 'Medications', 'Remedies', 'Info'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                index === 0 
                  ? 'bg-linear-to-br from-purple-600 to-pink-600 text-white'
                  : 'bg-white/10 text-gray-400'
              }`}>
                {index + 1}
              </div>
              <div className="ml-2">
                <p className="text-sm font-medium">{step}</p>
                <p className="text-xs text-gray-400">Step {index + 1}</p>
              </div>
              {index < 4 && (
                <div className="w-12 h-0.5 bg-white/10 mx-2"></div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Tabs */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
              {/* Tab Navigation */}
              <div className="flex border-b border-white/10">
                {[
                  { id: 'symptoms', label: 'Symptoms', icon: Activity, required: true },
                  { id: 'duration', label: 'Duration', icon: Clock },
                  { id: 'medications', label: 'Medications', icon: Pill },
                  { id: 'remedies', label: 'Remedies', icon: Thermometer },
                  { id: 'info', label: 'Your Info', icon: User },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-linear-to-br from-purple-500/20 to-pink-500/20 text-white border-b-2 border-purple-500'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 justify-center">
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      {tab.required && <span className="text-red-400">*</span>}
                    </div>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Symptoms Tab */}
                {activeTab === 'symptoms' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">What symptoms are you experiencing?</h3>
                      <p className="text-gray-400 mb-4">Add all your symptoms for accurate analysis</p>
                      
                      {/* Quick Suggestions */}
                      <div className="mb-6">
                        <p className="text-sm text-gray-400 mb-2">Common symptoms:</p>
                        <div className="flex flex-wrap gap-2">
                          {symptomSuggestions.map((symptom) => (
                            <button
                              key={symptom}
                              type="button"
                              onClick={() => addItem('symptoms', symptom)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                            >
                              {symptom}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Input with improved UX */}
                      <div className="relative mb-4">
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              ref={symptomInputRef}
                              type="text"
                              value={symptomInput}
                              onChange={(e) => setSymptomInput(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addItem('symptoms', symptomInput)}
                              placeholder="Type a symptom and press Enter or click +"
                              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => addItem('symptoms', symptomInput)}
                            className="px-4 bg-linear-to-br from-purple-600 to-pink-600 text-white rounded-xl hover:opacity-90 transition-opacity"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Added Symptoms */}
                      {formData.symptoms.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-400 mb-2">Added symptoms ({formData.symptoms.length}):</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {formData.symptoms.map((symptom, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-linear-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl group"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-linear-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                                    <span className="text-xs font-bold">{index + 1}</span>
                                  </div>
                                  <span className="font-medium">{symptom}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeItem('symptoms', index)}
                                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity p-1"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-6 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => router.push('/dashboard')}
                        className="px-6 py-3 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl transition-colors font-medium"
                      >
                        Back to Dashboard
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('duration')}
                        disabled={formData.symptoms.length === 0}
                        className="px-6 py-3 bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        Next: Duration <ChevronRight className="inline ml-2 w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Duration Tab */}
                {activeTab === 'duration' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">How long have you had these symptoms?</h3>
                      <p className="text-gray-400 mb-6">This helps determine urgency</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {['Less than 24 hours', '1-3 days', '4-7 days', 'More than a week'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setFormData({...formData, duration: option})}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              formData.duration === option
                                ? 'border-emerald-500 bg-linear-to-br from-emerald-500/10 to-green-500/10 text-white'
                                : 'border-white/10 hover:border-emerald-500/50 hover:bg-white/5 text-gray-300 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{option}</span>
                              {formData.duration === option && (
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between pt-6 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setActiveTab('symptoms')}
                        className="px-6 py-3 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl transition-colors font-medium"
                      >
                        ← Back to Symptoms
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('medications')}
                        className="px-6 py-3 bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
                      >
                        Next: Medications <ChevronRight className="inline ml-2 w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Medications Tab */}
                {activeTab === 'medications' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Current Medications</h3>
                      <p className="text-gray-400 mb-4">For better drug interaction analysis (optional)</p>
                      
                      <div className="mb-6">
                        <p className="text-sm text-gray-400 mb-2">Common medications:</p>
                        <div className="flex flex-wrap gap-2">
                          {medicationSuggestions.map((med) => (
                            <button
                              key={med}
                              type="button"
                              onClick={() => addItem('medications', med)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                            >
                              {med}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="relative mb-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={medicationInput}
                            onChange={(e) => setMedicationInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addItem('medications', medicationInput)}
                            placeholder="Type medication name"
                            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                          />
                          <button
                            type="button"
                            onClick={() => addItem('medications', medicationInput)}
                            className="px-4 bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-xl hover:opacity-90 transition-opacity"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {formData.medications.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {formData.medications.map((med, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-linear-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl group"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-linear-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                                  <Pill className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-medium">{med}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItem('medications', index)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between pt-6 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setActiveTab('duration')}
                        className="px-6 py-3 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl transition-colors font-medium"
                      >
                        ← Back to Duration
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('remedies')}
                        className="px-6 py-3 bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
                      >
                        Next: Remedies <ChevronRight className="inline ml-2 w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Remedies Tab */}
                {activeTab === 'remedies' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Home Remedies Tried</h3>
                      <p className="text-gray-400 mb-4">For comprehensive advice (optional)</p>
                      
                      <div className="mb-6">
                        <p className="text-sm text-gray-400 mb-2">Common remedies:</p>
                        <div className="flex flex-wrap gap-2">
                          {remedySuggestions.map((remedy) => (
                            <button
                              key={remedy}
                              type="button"
                              onClick={() => addItem('homeRemedies', remedy)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                            >
                              {remedy}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="relative mb-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={remedyInput}
                            onChange={(e) => setRemedyInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addItem('homeRemedies', remedyInput)}
                            placeholder="Type remedy name"
                            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder-gray-400"
                          />
                          <button
                            type="button"
                            onClick={() => addItem('homeRemedies', remedyInput)}
                            className="px-4 bg-linear-to-br from-amber-600 to-orange-600 text-white rounded-xl hover:opacity-90 transition-opacity"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {formData.homeRemedies.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {formData.homeRemedies.map((remedy, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-linear-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl group"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-linear-to-br from-amber-600 to-orange-600 rounded-lg flex items-center justify-center">
                                  <Thermometer className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-medium">{remedy}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItem('homeRemedies', index)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between pt-6 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setActiveTab('medications')}
                        className="px-6 py-3 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl transition-colors font-medium"
                      >
                        ← Back to Medications
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('info')}
                        className="px-6 py-3 bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
                      >
                        Next: Your Info <ChevronRight className="inline ml-2 w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Info Tab */}
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Your Information</h3>
                      <p className="text-gray-400 mb-6">For personalized analysis (optional)</p>
                      
                      {/* Chronic Conditions */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Chronic Conditions (optional)</label>
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-2">
                            {conditionSuggestions.map((condition) => (
                              <button
                                key={condition}
                                type="button"
                                onClick={() => addItem('chronicConditions', condition)}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                              >
                                {condition}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={conditionInput}
                            onChange={(e) => setConditionInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addItem('chronicConditions', conditionInput)}
                            placeholder="Add condition"
                            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
                          />
                          <button
                            type="button"
                            onClick={() => addItem('chronicConditions', conditionInput)}
                            className="px-4 bg-linear-to-br from-indigo-600 to-purple-700 text-white rounded-xl hover:opacity-90 transition-opacity"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                        {formData.patientInfo.chronicConditions.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                            {formData.patientInfo.chronicConditions.map((condition, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-linear-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl group"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-linear-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Heart className="w-4 h-4 text-white" />
                                  </div>
                                  <span className="font-medium">{condition}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeItem('chronicConditions', index)}
                                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity p-1"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Allergies */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Allergies (optional)</label>
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-2">
                            {allergySuggestions.map((allergy) => (
                              <button
                                key={allergy}
                                type="button"
                                onClick={() => addItem('allergies', allergy)}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                              >
                                {allergy}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={allergyInput}
                            onChange={(e) => setAllergyInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addItem('allergies', allergyInput)}
                            placeholder="Add allergy"
                            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400"
                          />
                          <button
                            type="button"
                            onClick={() => addItem('allergies', allergyInput)}
                            className="px-4 bg-linear-to-br from-red-600 to-rose-700 text-white rounded-xl hover:opacity-90 transition-opacity"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                        {formData.patientInfo.allergies.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                            {formData.patientInfo.allergies.map((allergy, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-linear-to-br from-red-500/10 to-rose-500/10 border border-red-500/20 rounded-xl group"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-linear-to-br from-red-600 to-rose-600 rounded-lg flex items-center justify-center">
                                    <AlertTriangle className="w-4 h-4 text-white" />
                                  </div>
                                  <span className="font-medium">{allergy}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeItem('allergies', index)}
                                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity p-1"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submit Section */}
                    <div className="pt-6 border-t border-white/10">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 text-gray-400">
                          <div className={`w-3 h-3 rounded-full ${formData.symptoms.length > 0 ? 'bg-emerald-500' : 'bg-gray-500'}`}></div>
                          <span>Symptoms: {formData.symptoms.length} added</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('remedies')}
                          className="px-4 py-2 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl transition-colors text-sm font-medium"
                        >
                          ← Back to Remedies
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => router.push('/dashboard')}
                          className="px-6 py-4 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl transition-colors font-medium"
                        >
                          Cancel & Return to Dashboard
                        </button>
                        <button
                          type="submit"
                          onClick={handleSubmit}
                          disabled={loading || formData.symptoms.length === 0}
                          className="px-6 py-4 bg-linear-to-br from-purple-600 to-pink-600 text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              Analyzing Symptoms...
                            </span>
                          ) : (
                            'Get AI Diagnosis →'
                          )}
                        </button>
                      </div>
                      
                      {formData.symptoms.length === 0 && (
                        <p className="text-sm text-red-400 text-center mt-4">
                          * Please add at least one symptom to continue
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Summary & Help */}
          <div className="space-y-6">
            {/* Current Status Card */}
            <div className="bg-linear-to-br from-gray-900/20 to-gray-800/20 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Current Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Symptoms</span>
                  <span className={`font-medium ${formData.symptoms.length > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {formData.symptoms.length} added
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Duration</span>
                  <span className={`font-medium ${formData.duration ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {formData.duration || 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Medications</span>
                  <span className="font-medium text-gray-300">{formData.medications.length} added</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Remedies</span>
                  <span className="font-medium text-gray-300">{formData.homeRemedies.length} added</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Personal Info</span>
                  <span className={`font-medium ${formData.patientInfo.age > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {formData.patientInfo.age > 0 ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Tips Card */}
            <div className="bg-linear-to-br from-blue-900/20 to-indigo-900/20 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Quick Tips
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></div>
                  <span className="text-sm text-gray-300">Be specific about symptom details</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></div>
                  <span className="text-sm text-gray-300">Include all medications for safety</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></div>
                  <span className="text-sm text-gray-300">Duration helps determine urgency</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></div>
                  <span className="text-sm text-gray-300">AI analysis is for guidance only</span>
                </li>
              </ul>
            </div>

            {/* Emergency Notice */}
            <div className="bg-linear-to-br from-red-900/20 to-rose-900/20 backdrop-blur-sm border border-red-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">⚠️ Emergency Notice</h3>
              <p className="text-sm text-gray-300">
                If you're experiencing severe symptoms like chest pain, difficulty breathing, or sudden weakness, seek immediate medical attention or call emergency services.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
