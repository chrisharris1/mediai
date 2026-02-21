'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Share2, Printer, AlertTriangle, Stethoscope, Pill, Home, Activity, Shield, Brain, Heart, Clock, AlertCircle, CheckCircle, ExternalLink, FileText } from 'lucide-react';

interface SymptomDetail {
  input: string;
  canonical: string;
  medical_name: string;
  category: string;
  confidence: number;
  is_emergency: boolean;
}

interface PossibleCondition {
  name: string;
  confidence: number;
  severity: 'mild' | 'moderate' | 'high';
  description?: string;
}

interface Recommendations {
  immediate_actions?: string[];
  home_remedies?: string[];
  suggested_medicines?: string[];
  warning_signs?: string[];
}

interface PatientProfile {
  age: number;
  weight: number;
  gender: string;
  chronic_conditions?: string[];
  current_medications?: string[];
  risk_factors?: string[];
  age_weight_factor?: number;
}

interface Analysis {
  // New AI format
  overall_risk?: 'emergency' | 'high_risk' | 'moderate_risk' | 'low_risk';
  risk_score?: number;
  urgency?: 'immediate' | 'within_24h' | 'within_week' | 'monitor';
  emergency_detected?: boolean;
  symptom_analysis?: {
    validated_symptoms: SymptomDetail[];
    total_symptoms: number;
    emergency_symptoms: string[];
  };
  possible_conditions?: PossibleCondition[];
  recommendations?: Recommendations;
  overall_advice?: string;
  patient_profile?: PatientProfile;
  medicine_warnings?: string[];
  
  // Old format (fallback)
  possibleConditions?: Array<{
    name: string;
    matchPercentage: number;
    severity: 'mild' | 'moderate' | 'high';
  }>;
  homeRemedies?: string[];
  suggestedMedicines?: string[];
  warningSignsToLookFor?: string[];
  overallAdvice?: string;
}

export default function SymptomReportPage() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedAnalysis = localStorage.getItem('symptomAnalysis');
    if (storedAnalysis) {
      setAnalysis(JSON.parse(storedAnalysis));
    } else {
      router.push('/symptom-checker');
    }
    setLoading(false);
  }, [router]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'emergency':
      case 'high_risk':
        return 'bg-red-100 border-red-300 text-red-900';
      case 'moderate_risk':
        return 'bg-yellow-100 border-yellow-300 text-yellow-900';
      case 'low_risk':
        return 'bg-green-100 border-green-300 text-green-900';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-900';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'emergency': return '🚨';
      case 'high_risk': return '⚠️';
      case 'moderate_risk': return '⚡';
      case 'low_risk': return '✅';
      default: return 'ℹ️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'from-red-900/20 to-rose-900/10',
          border: 'border-red-500/30',
          text: 'text-red-400',
          icon: '🔴',
          gradient: 'from-red-600 to-rose-700'
        };
      case 'moderate':
        return {
          bg: 'from-yellow-900/20 to-amber-900/10',
          border: 'border-yellow-500/30',
          text: 'text-yellow-400',
          icon: '🟡',
          gradient: 'from-yellow-600 to-amber-700'
        };
      case 'mild':
        return {
          bg: 'from-emerald-900/20 to-green-900/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          icon: '🟢',
          gradient: 'from-emerald-600 to-green-700'
        };
      default:
        return {
          bg: 'from-gray-900/20 to-slate-900/10',
          border: 'border-gray-500/30',
          text: 'text-gray-400',
          icon: '⚪',
          gradient: 'from-gray-600 to-slate-700'
        };
    }
  };

  // Check if using new AI format
  const isNewFormat = analysis?.overall_risk !== undefined;
  const conditions = isNewFormat ? analysis?.possible_conditions : analysis?.possibleConditions;
  const homeRemedies = isNewFormat ? analysis?.recommendations?.home_remedies : analysis?.homeRemedies;
  const suggestedMedicines = isNewFormat ? analysis?.recommendations?.suggested_medicines : analysis?.suggestedMedicines;
  const warningSignsToLookFor = isNewFormat ? analysis?.recommendations?.warning_signs : analysis?.warningSignsToLookFor;
  const overallAdvice = isNewFormat ? analysis?.overall_advice : analysis?.overallAdvice;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MediAI Symptom Report',
          text: 'Check out my symptom analysis from MediAI',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Sharing cancelled');
      }
    } else {
      // Fallback: Copy to clipboard
      const text = `MediAI Symptom Report\n${window.location.href}`;
      await navigator.clipboard.writeText(text);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-300 text-lg">Loading your report...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-300">No report data available</p>
          <button
            onClick={() => router.push('/symptom-checker')}
            className="mt-4 px-6 py-2 bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Start Symptom Check
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/symptom-checker')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-linear-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Symptom Analysis Report
                  </h1>
                  <p className="text-sm text-gray-400">AI-powered health insights</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-linear-to-br from-indigo-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Report Header Info */}
        <div className="bg-linear-to-br from-gray-900/20 to-gray-800/20 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Report Generated</span>
              </div>
              <p className="text-lg font-medium">
                {new Date().toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">
                  {conditions?.length || 0}
                </div>
                <div className="text-xs text-gray-400">Conditions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {suggestedMedicines?.length || 0}
                </div>
                <div className="text-xs text-gray-400">Medications</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {homeRemedies?.length || 0}
                </div>
                <div className="text-xs text-gray-400">Remedies</div>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Banner - New AI Format */}
        {isNewFormat && analysis.emergency_detected && (
          <div className="mb-6 bg-linear-to-br from-red-600 to-red-700 text-white rounded-2xl shadow-2xl p-6 animate-pulse border-2 border-red-400">
            <div className="flex items-center gap-4">
              <div className="text-6xl">🚨</div>
              <div>
                <h2 className="text-2xl font-bold mb-2">EMERGENCY ALERT</h2>
                <p className="text-xl mb-3">CALL EMERGENCY SERVICES (911/112) IMMEDIATELY</p>
                <p className="text-lg">Emergency symptoms detected: {analysis.symptom_analysis?.emergency_symptoms.join(', ')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Risk Score Card - New AI Format */}
        {isNewFormat && analysis.overall_risk && (
          <div className={`rounded-2xl shadow-xl p-6 mb-6 border-2 ${getRiskColor(analysis.overall_risk)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-6xl">{getRiskIcon(analysis.overall_risk)}</div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">
                    Risk Level: {analysis.overall_risk.toUpperCase().replace('_', ' ')}
                  </h2>
                  <p className="text-lg">Risk Score: {analysis.risk_score}/100</p>
                  <p className="text-sm opacity-75">Urgency: {analysis.urgency?.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold">{analysis.risk_score}</div>
                <div className="text-sm">out of 100</div>
              </div>
            </div>
          </div>
        )}

        {/* Patient Profile Card - New AI Format */}
        {isNewFormat && analysis.patient_profile && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              👤 Patient Profile
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                <div className="text-sm text-purple-300 font-semibold">Age</div>
                <div className="text-2xl font-bold text-white">{analysis.patient_profile.age} years</div>
              </div>
              <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <div className="text-sm text-blue-300 font-semibold">Weight</div>
                <div className="text-2xl font-bold text-white">{analysis.patient_profile.weight} kg</div>
              </div>
              <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                <div className="text-sm text-green-300 font-semibold">Gender</div>
                <div className="text-2xl font-bold text-white capitalize">{analysis.patient_profile.gender}</div>
              </div>
            </div>
            
            {/* Risk Factors */}
            {analysis.patient_profile.risk_factors && analysis.patient_profile.risk_factors.length > 0 && (
              <div className="mt-4 p-4 bg-orange-500/20 border-2 border-orange-500/30 rounded-lg">
                <h3 className="font-semibold text-orange-300 mb-2">⚠️ Risk Factors:</h3>
                <ul className="space-y-1">
                  {analysis.patient_profile.risk_factors.map((factor, index) => (
                    <li key={index} className="text-orange-200">{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Chronic Conditions */}
            {analysis.patient_profile.chronic_conditions && analysis.patient_profile.chronic_conditions.length > 0 && (
              <div className="mt-4 p-4 bg-red-500/20 border-2 border-red-500/30 rounded-lg">
                <h3 className="font-semibold text-red-300 mb-2">🏥 Chronic Conditions:</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.patient_profile.chronic_conditions.map((condition, index) => (
                    <span key={index} className="px-3 py-1 bg-red-600/30 text-red-200 rounded-full text-sm capitalize">
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Validated Symptoms - New AI Format */}
        {isNewFormat && analysis.symptom_analysis && analysis.symptom_analysis.validated_symptoms && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              🔍 Analyzed Symptoms ({analysis.symptom_analysis.total_symptoms})
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {analysis.symptom_analysis.validated_symptoms.map((symptom, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border-2 ${
                    symptom.is_emergency 
                      ? 'bg-red-500/20 border-red-500/40' 
                      : 'bg-blue-500/20 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">
                        {symptom.is_emergency && '🚨 '}{symptom.medical_name}
                      </div>
                      <div className="text-sm text-gray-300 capitalize">Category: {symptom.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">{symptom.confidence}%</div>
                      <div className="text-xs text-gray-400">match</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medicine Warnings - New AI Format */}
        {isNewFormat && analysis.medicine_warnings && analysis.medicine_warnings.length > 0 && (
          <div className="bg-orange-500/20 border-2 border-orange-500/40 rounded-2xl p-6 mb-6">
            <h2 className="text-2xl font-semibold text-orange-300 mb-4 flex items-center gap-2">
              ⚠️ Medicine Interaction Warnings
            </h2>
            <ul className="space-y-2">
              {analysis.medicine_warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-3 p-3 bg-black/30 rounded-lg">
                  <span className="text-orange-400 font-bold">!</span>
                  <span className="text-orange-200">{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Overall Assessment Card */}
        <div className="bg-linear-to-br from-blue-900/20 to-indigo-900/20 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-linear-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shrink-0">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Overall Assessment</h2>
              <p className="text-gray-300 leading-relaxed">{overallAdvice}</p>
            </div>
          </div>
        </div>

        {/* Possible Conditions */}
        {conditions && conditions.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-linear-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Possible Conditions</h2>
                <p className="text-sm text-gray-400">Based on your symptom analysis</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {conditions.map((condition: any, index: number) => {
                const matchPercentage = isNewFormat ? condition.confidence : condition.matchPercentage;
                const severity = getSeverityColor(condition.severity);
                return (
                  <div
                    key={index}
                    className={`bg-linear-to-br ${severity.bg} ${severity.border} border rounded-2xl p-5 transition-all hover:scale-[1.02]`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-2xl">{severity.icon}</div>
                          <div>
                            <h3 className="text-lg font-bold text-white">
                              {index + 1}. {condition.name}
                            </h3>
                            {isNewFormat && condition.description && (
                              <p className="text-sm text-gray-300 mt-1 opacity-75">{condition.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${severity.text} bg-white/10`}>
                                {condition.severity.charAt(0).toUpperCase() + condition.severity.slice(1)} Severity
                              </span>
                              <span className="text-xs text-gray-400">
                                • Match probability
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="flex items-center gap-2">
                          <div className="relative w-16 h-16">
                            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                              <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="8"
                                className="text-white/10"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="8"
                                strokeDasharray={`${2 * Math.PI * 45}`}
                                strokeDashoffset={`${2 * Math.PI * 45 * (1 - matchPercentage / 100)}`}
                                className={severity.text}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-lg font-bold text-white">{matchPercentage}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        {((homeRemedies && homeRemedies.length > 0) || (suggestedMedicines && suggestedMedicines.length > 0)) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">{/* Home Remedies */}
            {homeRemedies && homeRemedies.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-linear-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Home Remedies</h2>
                    <p className="text-sm text-gray-400">Natural treatments you can try</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {homeRemedies.map((remedy: string, index: number) => (
                    <div
                      key={index}
                      className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl hover:border-emerald-500/40 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="font-medium text-gray-300">{remedy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Medicines */}
            {suggestedMedicines && suggestedMedicines.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-linear-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Pill className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Suggested Medicines</h2>
                    <p className="text-sm text-gray-400">Consult doctor before taking</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {suggestedMedicines.map((medicine: string, index: number) => (
                    <div
                      key={index}
                      className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl hover:border-blue-500/40 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                          <span className="text-xs font-bold text-blue-400">{index + 1}</span>
                        </div>
                        <span className="font-medium text-gray-300">{medicine}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {isNewFormat && (
                  <p className="text-sm text-gray-400 mt-4">
                    ⚠️ Consult a doctor before taking any medication
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Warning Signs */}
        {warningSignsToLookFor && warningSignsToLookFor.length > 0 && (
          <div className="bg-linear-to-r from-red-900/20 to-rose-900/10 backdrop-blur-sm border border-red-500/20 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-linear-to-r from-red-500 to-rose-600 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Warning Signs</h2>
                <p className="text-sm text-gray-400">Seek medical attention if you experience these</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {warningSignsToLookFor.map((sign: string, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl hover:border-red-500/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 shrink-0"></div>
                    <span className="text-gray-300">{sign}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/doctors"
            className="p-6 bg-linear-to-r from-emerald-600 to-green-700 text-white rounded-2xl hover:opacity-90 transition-opacity text-center group"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-2">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-lg">Book Doctor Consultation</span>
              <span className="text-sm text-emerald-200">Get professional medical advice</span>
            </div>
          </Link>
          
          <Link
            href="/symptom-checker"
            className="p-6 bg-white/10 backdrop-blur-sm border border-white/10 text-white rounded-2xl hover:bg-white/20 transition-colors text-center group"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-2">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-lg">Check Symptoms Again</span>
              <span className="text-sm text-gray-300">Start new symptom analysis</span>
            </div>
          </Link>
          
          <Link
            href="/dashboard"
            className="p-6 bg-linear-to-br from-blue-600 to-indigo-700 text-white rounded-2xl hover:opacity-90 transition-opacity text-center group"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-2">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-lg">Go to Dashboard</span>
              <span className="text-sm text-blue-200">View all health metrics</span>
            </div>
          </Link>
        </div>

        {/* Disclaimer */}
        <div className="bg-linear-to-br from-yellow-900/20 to-amber-900/10 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-linear-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Medical Disclaimer</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                This AI analysis provides general health information based on symptom patterns. It is{' '}
                <strong className="text-yellow-300">NOT a substitute for professional medical advice, diagnosis, or treatment</strong>.
                Always seek the advice of your physician or qualified healthcare provider with any questions
                regarding a medical condition. Never disregard professional medical advice or delay seeking it
                because of something you have read here.
              </p>
              <div className="flex items-center gap-2 mt-3 text-xs text-yellow-400">
                <AlertCircle className="w-3 h-3" />
                <span>For informational purposes only</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}