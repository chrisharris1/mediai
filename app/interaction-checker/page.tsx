'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MedicineScanner from '@/components/MedicineScanner';
import AnimatedBackground from '@/components/AnimatedBackground';
import { 
  AlertTriangle, 
  ArrowLeft,
  Pill,
  Shield,
  XCircle,
  CheckCircle,
  Info,
  Activity,
  AlertCircle,
  Scan,
  ChevronRight,
  User,
  Heart,
  Brain,
  Stethoscope,
  FlaskConical,
  Clock,
  FileText,
  Bell,
  Eye,
  Search,
  Database,
  Activity as ActivityIcon,
  BarChart3,
  TestTube,
  Beaker
} from 'lucide-react';

interface ProfileData {
  age: number;
  weight?: number;
  gender: string;
  current_medications: Array<string | { name: string; added_at: string; updated_at: string }>;
  allergies: Array<string | { name: string; added_at: string; updated_at: string }>;
  chronic_conditions: string[];
}

interface InteractionResult {
  medicine: string;
  severity: 'safe' | 'minor' | 'moderate' | 'severe';
  interactions: string[];
  side_effects: string[];
  recommendations: string[];
}

export default function InteractionChecker() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [newMedicine, setNewMedicine] = useState('');
  const [results, setResults] = useState<InteractionResult | null>(null);
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
        if (data.profile) {
          setProfile(data.profile);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkInteraction = async () => {
    if (!newMedicine.trim()) {
      alert('Please enter a medicine name');
      return;
    }

    if (!profile || !profile.current_medications || profile.current_medications.length === 0) {
      alert('Please add your current medications in your health profile first');
      return;
    }

    setChecking(true);

    try {
      const res = await fetch('/api/interaction-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine: newMedicine,
          profile: profile
        })
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.result);
        
        // Auto-scroll to results after a short delay
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }, 300);
      } else {
        const error = await res.json();
        alert('Error: ' + error.message);
      }
    } catch (error) {
      console.error('Error checking interaction:', error);
      alert('Error checking interaction. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'safe': return { 
        bg: 'bg-linear-to-br from-emerald-500 to-green-600',
        cardBg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        icon: CheckCircle,
        lightBg: 'bg-emerald-500/5'
      };
      case 'minor': return { 
        bg: 'bg-linear-to-br from-yellow-400 to-amber-500',
        cardBg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        icon: AlertCircle,
        lightBg: 'bg-yellow-500/5'
      };
      case 'moderate': return { 
        bg: 'bg-linear-to-br from-orange-500 to-amber-600',
        cardBg: 'bg-orange-500/10',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        icon: AlertTriangle,
        lightBg: 'bg-orange-500/5'
      };
      case 'severe': return { 
        bg: 'bg-linear-to-br from-red-500 to-rose-600',
        cardBg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/30',
        icon: XCircle,
        lightBg: 'bg-red-500/5'
      };
      default: return { 
        bg: 'bg-linear-to-br from-gray-500 to-gray-700',
        cardBg: 'bg-gray-500/10',
        text: 'text-gray-400',
        border: 'border-gray-500/30',
        icon: Shield,
        lightBg: 'bg-gray-500/5'
      };
    }
  };

  const getSeverityLevel = (severity: string) => {
    switch (severity) {
      case 'safe': return { 
        level: 'SAFE', 
        description: 'No significant interactions detected. Can be taken with current medications.' 
      };
      case 'minor': return { 
        level: 'MINOR RISK', 
        description: 'Potential mild interactions. Monitor for side effects.' 
      };
      case 'moderate': return { 
        level: 'MODERATE RISK', 
        description: 'Consult healthcare provider before taking.' 
      };
      case 'severe': return { 
        level: 'SEVERE RISK', 
        description: 'Avoid combination. Significant risk of adverse reactions.' 
      };
      default: return { 
        level: 'UNKNOWN', 
        description: 'Consult your doctor for professional advice.' 
      };
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading Interaction Checker...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-4">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-linear-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Profile Required</h2>
          <p className="text-gray-400 mb-8">
            Complete your health profile to use the drug interaction checker.
          </p>
          <button
            onClick={() => router.push('/profile')}
            className="w-full py-3 bg-linear-to-br from-indigo-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all font-medium shadow-lg hover:shadow-xl"
          >
            Complete Health Profile
          </button>
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
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-12 h-12 bg-linear-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl font-bold bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent truncate">
                    Drug Interaction Checker
                  </h1>
                  <p className="text-sm text-gray-400">AI-Powered Safety Analysis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Overview */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            <User className="w-6 h-6 text-blue-400" />
            Patient Health Profile
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Patient Demographics Card */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-purple-400">Patient Info</p>
                  <p className="text-sm text-gray-400">Demographics</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Age:</span>
                  <span className="text-white font-semibold">{profile.age || 'Not set'} years</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Weight:</span>
                  <span className="text-white font-semibold">{profile.weight || 'Not set'} kg</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Gender:</span>
                  <span className="text-white font-semibold capitalize">{profile.gender || 'Not set'}</span>
                </div>
              </div>
              {(!profile.age || !profile.weight) && (
                <button
                  onClick={() => router.push('/profile')}
                  className="mt-4 w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 text-sm transition-all"
                >
                  Update Profile
                </button>
              )}
            </div>

            {/* Medications Card */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Pill className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-400">{profile.current_medications?.length || 0}</p>
                  <p className="text-sm text-gray-400">Current Medications</p>
                </div>
              </div>
              <div className="space-y-2">
                {profile.current_medications?.slice(0, 3).map((med, idx) => {
                  const medName = typeof med === 'string' ? med : med.name;
                  return (
                    <div key={idx} className="text-sm text-gray-300 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span className="truncate">{medName}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Allergies Card */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-red-500/30 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-linear-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-400">{profile.allergies?.length || 0}</p>
                  <p className="text-sm text-gray-400">Known Allergies</p>
                </div>
              </div>
              <div className="space-y-2">
                {profile.allergies?.slice(0, 3).map((allergy, idx) => {
                  const allergyName = typeof allergy === 'string' ? allergy : allergy.name;
                  return (
                    <div key={idx} className="text-sm text-gray-300 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      <span className="truncate">{allergyName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chronic Conditions Row */}
          {profile.chronic_conditions && profile.chronic_conditions.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-orange-500/30 transition-all mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-linear-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ActivityIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-orange-400">{profile.chronic_conditions.length} Chronic Condition{profile.chronic_conditions.length > 1 ? 's' : ''}</p>
                  <p className="text-sm text-gray-400">Medical history affects drug interactions</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {profile.chronic_conditions.map((condition, idx) => (
                  <div key={idx} className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-sm text-orange-300">
                    {condition}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Interaction Checker Section */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden mb-8">
          <div className="px-6 py-4 bg-linear-to-r from-blue-900/20 to-purple-900/20 border-b border-white/10">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Beaker className="w-5 h-5 text-blue-400" />
              Drug Interaction Analysis
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
                    className="w-full py-4 border-2 border-dashed border-white/20 rounded-xl hover:border-blue-500/50 transition-colors text-gray-400 hover:text-white flex items-center justify-center gap-2"
                  >
                    <Scan className="w-5 h-5" />
                    {showScanner ? 'Hide Scanner' : 'Open Medicine Scanner'}
                  </button>
                  
                  {showScanner && (
                    <div className="mt-4">
                      <MedicineScanner 
                        onMedicineExtracted={(name) => {
                          setNewMedicine(name);
                          setShowScanner(false);
                        }} 
                      />
                    </div>
                  )}
                </div>

                {/* Manual Input Section */}
                <div>
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-green-400" />
                    Or Search Medicine Manually
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={newMedicine}
                      onChange={(e) => setNewMedicine(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && checkInteraction()}
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
                      placeholder="Enter medicine name (e.g., Ibuprofen 200mg)"
                    />
                    <button
                      onClick={checkInteraction}
                      disabled={checking}
                      className="w-full sm:w-auto px-6 py-3 bg-linear-to-br from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {checking ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Analyzing...
                        </div>
                      ) : 'Check Safety'}
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
                      <span className="text-gray-300">Cross-references with database</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-blue-400">2</span>
                      </div>
                      <span className="text-gray-300">Checks pharmacological interactions</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-blue-400">3</span>
                      </div>
                      <span className="text-gray-300">Validates against patient allergies</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-blue-400">4</span>
                      </div>
                      <span className="text-gray-300">Generates evidence-based recommendations</span>
                    </li>
                  </ul>
                </div>

                <div className="border border-emerald-500/20 bg-emerald-900/10 rounded-xl p-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    Safety Information
                  </h4>
                  <p className="text-sm text-gray-300">
                    This tool provides AI-powered analysis for informational purposes. Always consult with a healthcare professional before making medication decisions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div ref={resultsRef} className="animate-fade-in">
            {/* Results Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                <FlaskConical className="w-6 h-6 text-blue-400" />
                Analysis Results
              </h2>
              <p className="text-gray-400">AI safety assessment for <span className="font-semibold text-white">{results.medicine}</span></p>
            </div>

            {/* Severity Banner */}
            <div className={`rounded-2xl shadow-2xl overflow-hidden mb-8 ${getSeverityColor(results.severity).bg} text-white`}>
              <div className="p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 min-w-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg shrink-0">
                      {(() => {
                        const Icon = getSeverityColor(results.severity).icon;
                        return <Icon className="w-10 h-10" />;
                      })()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm opacity-90 tracking-wider">INTERACTION RISK LEVEL</p>
                      <h3 className="text-2xl sm:text-4xl font-bold mt-2 wrap-break-word">{getSeverityLevel(results.severity).level}</h3>
                      <p className="mt-4 opacity-90">{getSeverityLevel(results.severity).description}</p>
                    </div>
                  </div>
                  <div className="text-left lg:text-right min-w-0">
                    <div className="text-xl sm:text-2xl font-bold wrap-break-word">{results.medicine}</div>
                    <p className="text-sm opacity-80 mt-1">Medicine Analyzed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Results Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Interactions Panel */}
              {results.interactions.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                    <h4 className="text-lg font-bold">Potential Interactions</h4>
                  </div>
                  <div className="space-y-4">
                    {results.interactions.map((interaction, index) => (
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
              {results.side_effects.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Bell className="w-6 h-6 text-blue-400" />
                    <h4 className="text-lg font-bold">Possible Side Effects</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {results.side_effects.map((effect, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-gray-300">{effect}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recommendations Panel */}
            {results.recommendations.length > 0 && (
              <div className="bg-linear-to-br from-emerald-900/10 to-green-900/10 backdrop-blur-sm rounded-2xl border border-emerald-500/20 p-8 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-6 h-6 text-emerald-400" />
                  <h4 className="text-lg font-bold">Medical Recommendations</h4>
                </div>
                <div className="space-y-4">
                  {results.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                      <p className="text-gray-300">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Important Notice */}
            <div className="bg-linear-to-br from-amber-900/10 to-orange-900/10 backdrop-blur-sm border border-amber-500/20 rounded-2xl p-6 mb-8">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <h4 className="font-semibold text-amber-400 mb-2">Important Medical Disclaimer</h4>
                  <p className="text-sm text-gray-300">
                    This AI analysis is for informational purposes only and does not constitute medical advice. 
                    Always consult with a licensed healthcare provider before making any decisions about your medications. 
                    In case of emergency, call your local emergency services immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  setResults(null);
                  setNewMedicine('');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-medium"
              >
                Check Another Medicine
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full sm:w-auto px-6 py-3 bg-linear-to-br from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all font-medium shadow-lg"
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
