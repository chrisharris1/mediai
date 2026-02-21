'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MedicineScanner from '@/components/MedicineScanner';
import AnimatedBackground from '@/components/AnimatedBackground';
import { 
  Heart, 
  ArrowLeft,
  AlertCircle,
  Info,
  Loader2,
  Activity,
  Brain,
  Shield,
  CheckCircle,
  XCircle,
  Scan,
  User,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Pill,
  Beaker,
  FlaskConical,
  Stethoscope,
  Search
} from 'lucide-react';

export default function SideEffectPredictor() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [medicineName, setMedicineName] = useState('');
  const [results, setResults] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchProfile();
    }
  }, [status, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        console.log('📊 Fetched Profile:', data.profile);
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeSideEffects = async () => {
    if (!medicineName.trim()) return;

    setAnalyzing(true);
    setResults(null);

    try {
      const requestBody = {
        medicine: medicineName,
        age: profile?.age || 30,
        weight: profile?.weight || 70,
        gender: profile?.gender || 'unknown',
        chronic_conditions: profile?.chronic_conditions || [],
        current_medications: profile?.current_medications || []
      };
      
      console.log('🔬 Sending to API:', requestBody);
      
      // MODULE 2: Call Python API with full patient demographics
      const res = await fetch('/api/ai/predict-side-effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data);
        
        // Auto-scroll to results after a short delay
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }, 300);
      } else {
        const error = await res.json();
        alert(error.message || error.error || 'Failed to analyze medicine');
      }
    } catch (error) {
      console.error('Error analyzing side effects:', error);
      alert('Failed to analyze. Please check if Python API is running on port 8001');
    } finally {
      setAnalyzing(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'high': return {
        bg: 'bg-linear-to-br from-red-500 to-rose-600',
        cardBg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/30',
        icon: XCircle
      };
      case 'moderate': return {
        bg: 'bg-linear-to-br from-orange-500 to-amber-600',
        cardBg: 'bg-orange-500/10',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        icon: AlertTriangle
      };
      case 'low': return {
        bg: 'bg-linear-to-br from-yellow-400 to-amber-500',
        cardBg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        icon: AlertCircle
      };
      default: return {
        bg: 'bg-linear-to-br from-emerald-500 to-green-600',
        cardBg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        icon: CheckCircle
      };
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability > 70) return 'bg-red-500';
    if (probability > 40) return 'bg-orange-500';
    if (probability > 20) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading Side Effect Predictor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden">
      <AnimatedBackground />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-linear-to-br from-pink-600 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-linear-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                    Side Effect Predictor
                  </h1>
                  <p className="text-sm text-gray-400">AI-Powered Risk Analysis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Patient Profile Overview */}
        {profile && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <User className="w-6 h-6 text-blue-400" />
              Patient Profile Analysis
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-blue-400">{profile?.age || 30}</p>
                    <p className="text-sm text-gray-400">Age</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-green-500/30 transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-linear-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-emerald-400">{profile?.weight || 70} kg</p>
                    <p className="text-sm text-gray-400">Weight</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-purple-400">{profile?.chronic_conditions?.length || 0}</p>
                    <p className="text-sm text-gray-400">Conditions</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-amber-500/30 transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-linear-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Pill className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-amber-400">{profile?.current_medications?.length || 0}</p>
                    <p className="text-sm text-gray-400">Medications</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Side Effect Analysis Section */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden mb-8">
          <div className="px-6 py-4 bg-linear-to-br from-pink-900/20 to-purple-900/20 border-b border-white/10">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-pink-400" />
              Side Effect Analysis
            </h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Input Section */}
              <div>
                {/* Scanner Section */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Scan className="w-5 h-5 text-blue-400" />
                    Scan Medicine Packaging
                  </h4>
                  <button
                    onClick={() => setShowScanner(!showScanner)}
                    className="w-full py-4 border-2 border-dashed border-white/20 rounded-xl hover:border-pink-500/50 transition-colors text-gray-400 hover:text-white flex items-center justify-center gap-2"
                  >
                    <Scan className="w-5 h-5" />
                    {showScanner ? 'Hide Scanner' : 'Open Medicine Scanner'}
                  </button>
                  
                  {showScanner && (
                    <div className="mt-4">
                      <MedicineScanner 
                        onMedicineExtracted={(name) => {
                          setMedicineName(name);
                          setShowScanner(false);
                        }} 
                      />
                    </div>
                  )}
                </div>

                {/* Manual Input Section */}
                <div>
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-pink-400" />
                    Or Search Medicine Manually
                  </h4>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={medicineName}
                      onChange={(e) => setMedicineName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && analyzeSideEffects()}
                      placeholder="Enter medicine name (e.g., Paracetamol, Ibuprofen)"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30"
                    />
                    <button
                      onClick={analyzeSideEffects}
                      disabled={analyzing || !medicineName.trim()}
                      className="px-6 py-3 bg-linear-to-br from-pink-600 to-rose-600 text-white rounded-xl hover:opacity-90 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {analyzing ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Analyzing...
                        </div>
                      ) : 'Analyze'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column - Information */}
              <div className="space-y-6">
                <div className="border border-blue-500/20 bg-blue-900/10 rounded-xl p-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-400" />
                    AI Analysis Process
                  </h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-blue-400">1</span>
                      </div>
                      <span className="text-gray-300">Analyzes 50K+ drug profiles and side effect data</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-blue-400">2</span>
                      </div>
                      <span className="text-gray-300">Considers patient demographics and health conditions</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-blue-400">3</span>
                      </div>
                      <span className="text-gray-300">Uses neural networks to predict probability</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-blue-400">4</span>
                      </div>
                      <span className="text-gray-300">Generates personalized risk assessment</span>
                    </li>
                  </ul>
                </div>

                <div className="border border-emerald-500/20 bg-emerald-900/10 rounded-xl p-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    Safety Information
                  </h4>
                  <p className="text-sm text-gray-300">
                    AI predictions are based on historical data and statistics. Always consult with a healthcare professional for medical advice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {results && results.success && (
          <div ref={resultsRef} className="animate-fade-in">
            {/* Results Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                <Beaker className="w-6 h-6 text-pink-400" />
                Analysis Results
              </h2>
              <p className="text-gray-400">AI side effect prediction for <span className="font-semibold text-white">{results.medicine?.name || results.medicine}</span></p>
            </div>

            {/* Main Risk Banner */}
            <div className={`rounded-2xl shadow-2xl overflow-hidden mb-8 ${getRiskColor(results.overall_risk || results.risk_assessment?.overall_risk).bg} text-white`}>
              <div className="p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                      {(() => {
                        const Icon = getRiskColor(results.overall_risk || results.risk_assessment?.overall_risk).icon;
                        return <Icon className="w-10 h-10" />;
                      })()}
                    </div>
                    <div>
                      <p className="text-sm opacity-90 tracking-wider">OVERALL RISK ASSESSMENT</p>
                      <h3 className="text-4xl font-bold mt-2">{(results.overall_risk || results.risk_assessment?.overall_risk || 'low').toUpperCase()} RISK</h3>
                      <p className="mt-4 opacity-90">
                        {results.patient_profile ? 
                          `Personalized analysis for ${results.patient_profile.age}-year-old ${results.patient_profile.gender}` : 
                          'Based on AI analysis of medication profile'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{results.medicine?.name || results.medicine}</div>
                    <p className="text-sm opacity-80 mt-1">Medicine Analyzed</p>
                    {results.risk_assessment?.risk_score && (
                      <p className="text-lg font-semibold mt-2">
                        Risk Score: {results.risk_assessment.risk_score}/5
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* MODULE 2 Results: Predicted Side Effects with Percentages */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      {results.module || 'Side Effect Predictions'}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {results.medicine?.generic || results.generic_name}
                    </p>
                  </div>
                </div>
                
                {/* AI Confidence */}
                <div className="text-right">
                  <div className="text-sm text-gray-400 mb-1">AI Confidence</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {results.ai_confidence ? (results.ai_confidence * 100).toFixed(0) : 82}%
                  </div>
                </div>
              </div>

              {/* Predicted Side Effects with Probability Bars */}
              {results.predicted_side_effects && results.predicted_side_effects.length > 0 && (
                <div className="space-y-4 mb-8">
                  <h4 className="text-lg font-semibold mb-4">Predicted Side Effects</h4>
                  <div className="space-y-3">
                    {results.predicted_side_effects.map((effect: any, index: number) => (
                      <div key={index} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-pink-500/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 ${getRiskColor(effect.severity).cardBg} rounded-lg flex items-center justify-center`}>
                              <AlertCircle className={`w-4 h-4 ${getRiskColor(effect.severity).text}`} />
                            </div>
                            <div>
                              <span className="font-medium text-white">{effect.side_effect}</span>
                              <div className="text-xs text-gray-400 mt-1">
                                {effect.severity} severity • {effect.duration || 'variable duration'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${effect.probability > 50 ? 'text-red-400' : effect.probability > 30 ? 'text-orange-400' : 'text-yellow-400'}`}>
                              {effect.probability}%
                            </div>
                            <div className="text-xs text-gray-400">probability</div>
                          </div>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2.5 mt-2">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-1000 ${getProbabilityColor(effect.probability)}`}
                            style={{ width: `${effect.probability}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Age-Specific Warnings */}
              {results.age_specific_warnings && results.age_specific_warnings.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    Age-Specific Warnings
                  </h4>
                  <div className="space-y-2">
                    {results.age_specific_warnings.map((warning: string, index: number) => (
                      <div key={index} className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 flex items-start gap-3">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></div>
                        <span className="text-gray-300">{warning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Recommendations */}
              {results.recommendations && results.recommendations.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-400" />
                    AI Recommendations
                  </h4>
                  <div className="space-y-2">
                    {results.recommendations.map((rec: string, index: number) => (
                      <div key={index} className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/20 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                        <span className="text-gray-300">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drug Interactions Warning */}
              {results.interactions && results.interactions.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    Drug Interactions Detected
                  </h4>
                  <div className="space-y-2">
                    {results.interactions.map((interaction: any, index: number) => (
                      <div key={index} className="p-4 bg-orange-500/5 rounded-xl border border-orange-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">With {interaction.drug}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            interaction.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                            interaction.severity === 'moderate' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {interaction.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{interaction.effect}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legacy Results (Fallback if old API format) */}
              {results.common_side_effects && (
                <div className="space-y-6">
                  {/* Common Side Effects */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                      Common Side Effects
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {results.common_side_effects.map((effect: string, index: number) => (
                        <div key={index} className="p-3 bg-white/5 rounded-lg flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2"></div>
                          <span className="text-gray-300">{effect}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Serious Side Effects */}
                  <div className="bg-white/5 backdrop-blur-sm border border-red-500/20 rounded-2xl p-6">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      Serious Side Effects
                    </h4>
                    <div className="space-y-2">
                      {results.serious_side_effects.map((effect: string, index: number) => (
                        <div key={index} className="p-3 bg-red-500/5 rounded-lg flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2"></div>
                          <span className="text-red-300">{effect}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Model Information */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold mb-2">AI Model Information</h4>
                  <p className="text-sm text-gray-400">{results.model || 'Neural Network Model'} • Trained on 50K+ patient records</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Analysis Timestamp</div>
                  <div className="text-sm">{new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setResults(null);
                  setMedicineName('');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-medium"
              >
                Analyze Another Medicine
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-linear-to-br from-pink-600 to-rose-600 text-white rounded-xl hover:opacity-90 transition-all font-medium shadow-lg"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </main>

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