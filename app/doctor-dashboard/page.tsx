'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';
import { 
  DollarSign, 
  Users, 
  Clock, 
  CheckCircle, 
  FileText,
  TrendingUp,
  Calendar,
  Loader2,
  Stethoscope,
  HeartPulse,
  MessageSquare,
  Filter,
  ChevronRight,
  Award,
  Bell,
  Search,
  Eye,
  Send,
  RefreshCw,
  Settings,
  LogOut,
  X,
  Lock,
  Brain
} from 'lucide-react';

interface Consultation {
  _id: string;
  patient_name: string;
  patient_email: string;
  medicine_name: string;
  concern_type: string;
  description: string;
  status: 'pending' | 'in_review' | 'completed' | 'cancelled' | 'rescheduled' | 'accepted';
  consultation_fee: number;
  created_at: string;
  preferred_datetime?: string;
  scheduled_time?: string;
  reschedule_reason?: string;
  rescheduled_by?: string;
  rescheduled_at?: string;
  requires_patient_confirmation?: boolean;
  awaiting_doctor_link?: boolean;
  meeting_link?: string;
  doctor_response?: string;
  responded_at?: string;
  share_health_data?: boolean;
  patient_requested_changes?: boolean;
  previous_scheduled_time?: string;
  edit_count?: number;
  last_edited_at?: string;
  patient_health_data?: {
    profile: {
      age?: number;
      gender?: string;
      blood_type?: string;
      height?: string;
      weight?: string;
      phone?: string;
      allergies?: (string | { name: string; [key: string]: any })[];
      chronic_conditions?: (string | { name: string; [key: string]: any })[];
      current_medications?: (string | { name: string; [key: string]: any })[];
      past_medical_history?: string;
      family_medical_history?: string;
    };
    emergency_contact?: {
      name?: string;
      phone?: string;
    };
    medicine_tracker: Array<{
      medicine_name: string;
      dosage: string;
      frequency: string;
      adherence_rate?: number;
      start_date?: string;
      status?: string;
    }>;
    consultation_history?: Array<{
      date: string;
      doctor_name: string;
      concern_type: string;
      medicine_name: string;
      status: string;
    }>;
  };
}

interface Stats {
  total_consultations: number;
  pending_consultations: number;
  completed_consultations: number;
  total_earnings: number;
  this_month_earnings: number;
}

interface DoctorProfile {
  profileImage?: string;
  specialization?: string;
}

export default function DoctorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>({});
  const [stats, setStats] = useState<Stats>({
    total_consultations: 0,
    pending_consultations: 0,
    completed_consultations: 0,
    total_earnings: 0,
    this_month_earnings: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_review' | 'completed' | 'rescheduled' | 'upcoming'>('pending');
  const [refreshing, setRefreshing] = useState(false);
  
  // Action button states
  const [showActionModal, setShowActionModal] = useState<'accept' | 'cancel' | 'postpone' | null>(null);
  const [meetingLink, setMeetingLink] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/login');
      return;
    }

    // Check if user is a doctor
    const userRole = (session.user as any).role;
    if (userRole !== 'doctor') {
      router.push('/dashboard');
      return;
    }

    fetchDashboardData();
  }, [session, status, router]);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      const [consultationsRes, statsRes, profileRes] = await Promise.all([
        fetch('/api/doctor/consultations'),
        fetch('/api/doctor/stats'),
        fetch('/api/profile')
      ]);

      if (consultationsRes.ok) {
        const data = await consultationsRes.json();
        setConsultations(data.consultations || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || stats);
      }

      if (profileRes.ok) {
        const data = await profileRes.json();
        if (data.user) {
          setDoctorProfile({
            profileImage: data.user.profileImage,
            specialization: data.user.specialization
          });
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleViewDetails = (consultation: Consultation) => {
    console.log('🔍 View Details Debug - Consultation ID:', consultation._id);
    console.log('🔍 View Details Debug - share_health_data:', consultation.share_health_data);
    console.log('🔍 View Details Debug - patient_health_data exists:', !!consultation.patient_health_data);
    if (consultation.patient_health_data) {
      console.log('🔍 View Details Debug - medicine_tracker exists:', !!consultation.patient_health_data.medicine_tracker);
      console.log('🔍 View Details Debug - medicine_tracker length:', consultation.patient_health_data.medicine_tracker?.length || 0);
      if (consultation.patient_health_data.medicine_tracker) {
        console.log('🔍 View Details Debug - medicine_tracker data:', consultation.patient_health_data.medicine_tracker);
      }
    }
    
    setSelectedConsultation(consultation);
    setResponseText(consultation.doctor_response || '');
  };

  const handleStatusUpdate = async (consultationId: string, newStatus: 'in_review' | 'completed') => {
    try {
      const res = await fetch('/api/doctor/update-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId, status: newStatus })
      });

      if (res.ok) {
        fetchDashboardData();
        if (selectedConsultation?._id === consultationId) {
          setSelectedConsultation({ ...selectedConsultation, status: newStatus });
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteConsultation = async (consultationId: string) => {
    if (!confirmDelete || confirmDelete !== consultationId) {
      setConfirmDelete(consultationId);
      return;
    }

    setDeletingId(consultationId);
    try {
      const res = await fetch('/api/consultations/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultation_id: consultationId }),
      });

      const data = await res.json();

      if (res.ok) {
        setConsultations(prev => prev.filter(c => c._id !== consultationId));
        setSelectedConsultation(null);
        setConfirmDelete(null);
        alert('Consultation deleted successfully');
        fetchDashboardData();
      } else {
        alert(data.error || 'Failed to delete consultation');
      }
    } catch (error) {
      console.error('Error deleting consultation:', error);
      alert('Failed to delete consultation');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedConsultation || !responseText.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/doctor/respond-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: selectedConsultation._id,
          response: responseText,
          status: 'completed'
        })
      });

      if (res.ok) {
        alert('Response submitted successfully!');
        setSelectedConsultation(null);
        setResponseText('');
        fetchDashboardData();
      } else {
        alert('Failed to submit response');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Error submitting response');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptConsultation = async () => {
    if (!selectedConsultation || !meetingLink.trim() || !scheduledTime) {
      alert('Please provide meeting link and scheduled time');
      return;
    }

    setActionSubmitting(true);
    try {
      const res = await fetch('/api/doctor/accept-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultation_id: selectedConsultation._id,
          meeting_link: meetingLink,
          scheduled_time: new Date(scheduledTime).toISOString(),
          doctor_notes: actionReason
        })
      });

      if (res.ok) {
        alert('Consultation accepted and patient notified!');
        setShowActionModal(null);
        setMeetingLink('');
        setScheduledTime('');
        setActionReason('');
        setSelectedConsultation(null);
        fetchDashboardData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to accept consultation');
      }
    } catch (error) {
      console.error('Error accepting consultation:', error);
      alert('Error accepting consultation');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleCancelConsultation = async () => {
    if (!selectedConsultation || !actionReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setActionSubmitting(true);
    try {
      const res = await fetch('/api/doctor/cancel-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultation_id: selectedConsultation._id,
          reason: actionReason
        })
      });

      if (res.ok) {
        alert('Consultation cancelled and patient notified');
        setShowActionModal(null);
        setActionReason('');
        setSelectedConsultation(null);
        fetchDashboardData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel consultation');
      }
    } catch (error) {
      console.error('Error cancelling consultation:', error);
      alert('Error cancelling consultation');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handlePostponeConsultation = async () => {
    if (!selectedConsultation || !scheduledTime || !actionReason.trim()) {
      alert('Please provide new time and reason');
      return;
    }

    setActionSubmitting(true);
    try {
      const res = await fetch('/api/doctor/postpone-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultation_id: selectedConsultation._id,
          new_scheduled_time: new Date(scheduledTime).toISOString(),
          reason: actionReason
        })
      });

      if (res.ok) {
        alert('Reschedule request sent to patient');
        setShowActionModal(null);
        setScheduledTime('');
        setActionReason('');
        setSelectedConsultation(null);
        fetchDashboardData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to postpone consultation');
      }
    } catch (error) {
      console.error('Error postponing consultation:', error);
      alert('Error postponing consultation');
    } finally {
      setActionSubmitting(false);
    }
  };

  const filteredConsultations = consultations.filter(c => {
    if (filter === 'upcoming') {
      return c.status === 'accepted' && c.scheduled_time && new Date(c.scheduled_time) > new Date();
    }
    return filter === 'all' || c.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-linear-to-br from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/30';
      case 'rescheduled': return 'bg-linear-to-br from-orange-500/20 to-yellow-500/10 text-orange-400 border border-orange-500/30';
      case 'in_review': return 'bg-linear-to-br from-blue-500/20 to-cyan-500/10 text-blue-400 border border-blue-500/30';
      case 'accepted': return 'bg-linear-to-br from-green-500/20 to-emerald-500/10 text-green-400 border border-green-500/30';
      case 'completed': return 'bg-linear-to-br from-emerald-500/20 to-green-500/10 text-emerald-400 border border-emerald-500/30';
      case 'cancelled': return 'bg-linear-to-br from-gray-500/20 to-gray-700/10 text-gray-400 border border-gray-500/30';
      default: return 'bg-linear-to-br from-gray-500/20 to-gray-700/10 text-gray-400 border border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.05)_0%,transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.05)_0%,transparent_50%)]"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* Logo & Brand */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black/30 backdrop-blur-sm rounded-xl flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/20 shrink-0">
                <img 
                  src="/Mediailogo.png" 
                  alt="MediAI Logo" 
                  className="w-10 h-10 sm:w-14 sm:h-14 object-contain"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold bg-linear-to-br from-emerald-400 to-green-400 bg-clip-text text-transparent truncate">
                  Doctor Portal
                </h1>
                <p className="hidden sm:block text-xs text-gray-400">MediAI Professional</p>
              </div>
            </div>

            {/* Search & Controls */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={async () => await fetchDashboardData()}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh Dashboard"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                title="Return to Login"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
              
              {/* Notification Bell */}
              <NotificationBell />
              
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden lg:block text-right">
                  <p className="text-sm font-medium">Dr. {session?.user?.name}</p>
                  <p className="text-xs text-gray-400">{doctorProfile.specialization || 'Verified Doctor'}</p>
                </div>
                {doctorProfile.profileImage ? (
                  <img
                    src={doctorProfile.profileImage}
                    alt="Doctor Profile"
                    className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/50"
                  />
                ) : (
                  <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
                    <div className="text-lg font-bold">DR</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="mb-8">
          <div className="bg-linear-to-br from-emerald-500/10 via-green-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6">
            <h2 className="text-3xl font-bold mb-2">
              Welcome back, <span className="bg-linear-to-br from-emerald-400 to-green-400 bg-clip-text text-transparent">Dr. {session?.user?.name}</span> 👨‍⚕️
            </h2>
            <p className="text-gray-300">
              Manage your medical consultations and provide expert advice to patients
            </p>
          </div>
        </div>

        {/* Stats Overview - Only using real data from stats API */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {[
            { 
              icon: Users, 
              value: stats.total_consultations, 
              label: 'Total Consultations',
              color: 'from-blue-500 to-cyan-500',
            },
            { 
              icon: Clock, 
              value: stats.pending_consultations, 
              label: 'Pending Reviews',
              color: 'from-amber-500 to-orange-500',
            },
            { 
              icon: CheckCircle, 
              value: stats.completed_consultations, 
              label: 'Completed',
              color: 'from-emerald-500 to-green-500',
            },
            { 
              icon: DollarSign, 
              value: `₹${stats.total_earnings.toLocaleString()}`, 
              label: 'Total Earnings',
              color: 'from-purple-500 to-pink-500',
            },
            { 
              icon: TrendingUp, 
              value: `₹${stats.this_month_earnings.toLocaleString()}`, 
              label: 'This Month',
              color: 'from-indigo-500 to-blue-500',
            },
          ].map((stat, index) => (
            <div 
              key={index}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-linear-to-br ${stat.color} shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Consultations List */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
              {/* Header with Filters */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    Patient Consultations
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <select 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="bg-transparent border-none outline-none text-sm text-white"
                      >
                        <option value="all" className="bg-gray-900">All Consultations</option>
                        <option value="pending" className="bg-gray-900">Pending</option>
                        <option value="rescheduled" className="bg-gray-900">Rescheduled</option>
                        <option value="in_review" className="bg-gray-900">In Review</option>
                        <option value="completed" className="bg-gray-900">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1">
                  {[
                    { id: 'all', label: 'All', count: consultations.length },
                    { id: 'pending', label: 'Pending', count: consultations.filter(c => c.status === 'pending').length },
                    { id: 'upcoming', label: 'Upcoming', count: consultations.filter(c => c.status === 'accepted' && c.scheduled_time && new Date(c.scheduled_time) > new Date()).length },
                    { id: 'rescheduled', label: 'Rescheduled', count: consultations.filter(c => c.status === 'rescheduled').length },
                    { id: 'in_review', label: 'In Review', count: consultations.filter(c => c.status === 'in_review').length },
                    { id: 'completed', label: 'Completed', count: consultations.filter(c => c.status === 'completed').length },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setFilter(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === tab.id
                          ? 'bg-linear-to-br from-blue-500 to-purple-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tab.label}
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        filter === tab.id ? 'bg-white/20' : 'bg-white/5'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Consultations List */}
              <div className="p-6">
                {filteredConsultations.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4 opacity-50" />
                    <p className="text-gray-400 text-lg mb-2">No consultations found</p>
                    <p className="text-gray-500 text-sm">When patients request consultations, they'll appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredConsultations.map((consultation) => (
                      <div
                        key={consultation._id}
                        className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group"
                        onClick={() => handleViewDetails(consultation)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-linear-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                                <HeartPulse className="w-5 h-5 text-blue-400" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-lg">{consultation.patient_name}</h4>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <span>{consultation.patient_email}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(consultation.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <p className="text-sm text-gray-300 mb-1">
                                <span className="font-medium text-gray-400">Medicine:</span> {consultation.medicine_name}
                              </p>
                              <p className="text-sm text-gray-300">
                                <span className="font-medium text-gray-400">Concern:</span> {consultation.concern_type}
                              </p>
                            </div>

                            <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                              {consultation.description}
                            </p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(consultation.status)}`}>
                                  {consultation.status.replace('_', ' ')}
                                </span>
                                <span className="text-sm text-emerald-400 font-medium">
                                  ₹{consultation.consultation_fee}
                                </span>
                              </div>
                              <div className="flex items-center text-blue-400 text-sm">
                                View Details
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Doctor Tools */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-400" />
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={() => fetchDashboardData()}
                  className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-linear-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-sm">Refresh Dashboard</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                </button>
                
                <button 
                  onClick={() => router.push('/doctor-register?edit=true')}
                  className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-linear-to-br from-emerald-500/20 to-green-500/20 rounded-lg flex items-center justify-center">
                      <Settings className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-sm">Profile Settings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-400" />
                </button>
                
                <button 
                  onClick={() => router.push('/doctor/ai-tools')}
                  className="w-full flex items-center justify-between p-3 bg-linear-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:bg-purple-500/20 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-linear-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                      <Brain className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-sm font-medium">AI Medical Tools</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-400" />
                </button>
              </div>
            </div>

            {/* Earnings Overview */}
            <div className="bg-linear-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Earnings Summary</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">This Month</p>
                  <p className="text-2xl font-bold">₹{stats.this_month_earnings.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Average per Consultation</p>
                  <p className="text-xl font-semibold">
                    ₹{stats.total_consultations > 0 ? Math.round(stats.total_earnings / stats.total_consultations) : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Consultation Detail Modal */}
      {selectedConsultation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-linear-to-br from-gray-900 to-black border border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-linear-to-br from-emerald-500/10 to-green-500/10 border-b border-white/10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Consultation Details</h2>
                  <p className="text-sm text-gray-400">Review and respond to patient</p>
                </div>
                <button
                  onClick={() => setSelectedConsultation(null)}
                  className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Patient Info */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-blue-400" />
                  Patient Information
                </h3>
                <div className="space-y-4">
                  {/* Preferred Appointment Date & Time */}
                  {selectedConsultation.preferred_datetime && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-xs text-blue-400 mb-1 flex items-center gap-1">
                        <span>📅</span> Patient's Preferred Appointment Time
                      </p>
                      <p className="font-semibold text-lg">
                        {new Date(selectedConsultation.preferred_datetime).toLocaleString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                    </div>
                  )}
                  
                  {/* Request Submitted On */}
                  <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Request Submitted On</p>
                    <p className="font-medium text-sm">
                      {new Date(selectedConsultation.created_at).toLocaleString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Name</p>
                      <p className="font-medium">{selectedConsultation.patient_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <p className="font-medium">{selectedConsultation.patient_email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Consultation Fee</p>
                      <p className="font-medium text-emerald-400">₹{selectedConsultation.consultation_fee}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Status</p>
                      <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium ${
                        selectedConsultation.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        selectedConsultation.status === 'in_review' ? 'bg-blue-500/20 text-blue-400' :
                        selectedConsultation.status === 'rescheduled' ? 'bg-orange-500/20 text-orange-400' :
                        selectedConsultation.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {selectedConsultation.status}
                      </span>
                    </div>
                  </div>
                  
                  {/* Show Scheduled Time if exists */}
                  {selectedConsultation.scheduled_time && (
                    <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                      <p className="text-xs text-orange-400 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Scheduled Appointment Time
                      </p>
                      <p className="font-semibold text-lg">
                        {new Date(selectedConsultation.scheduled_time).toLocaleString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                      {selectedConsultation.status === 'rescheduled' && selectedConsultation.requires_patient_confirmation && (
                        <p className="text-xs text-orange-300 mt-2">
                          ⏳ Waiting for patient confirmation...
                        </p>
                      )}
                      {selectedConsultation.status === 'rescheduled' && !selectedConsultation.requires_patient_confirmation && (
                        <p className="text-xs text-green-300 mt-2">
                          ✓ Patient has confirmed this time
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Medical Details */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-400" />
                  Medical Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Medicine Name</p>
                    <p className="font-medium">{selectedConsultation.medicine_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Concern Type</p>
                    <p className="font-medium">{selectedConsultation.concern_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Description</p>
                    <p className="text-gray-300 whitespace-pre-wrap">{selectedConsultation.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Current Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedConsultation.status)}`}>
                      {selectedConsultation.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Patient Health Data Section */}
              {selectedConsultation.share_health_data && selectedConsultation.patient_health_data ? (
                <div className="bg-linear-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <HeartPulse className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold text-lg">Patient Health Profile</h3>
                    <span className="ml-auto px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">Shared</span>
                  </div>
                  
                  {/* Profile Info */}
                  {selectedConsultation.patient_health_data.profile && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">Profile Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedConsultation.patient_health_data.profile.age && (
                          <div>
                            <p className="text-xs text-gray-400">Age</p>
                            <p className="text-sm font-medium">{selectedConsultation.patient_health_data.profile.age} years</p>
                          </div>
                        )}
                        {selectedConsultation.patient_health_data.profile.gender && (
                          <div>
                            <p className="text-xs text-gray-400">Gender</p>
                            <p className="text-sm font-medium capitalize">{selectedConsultation.patient_health_data.profile.gender}</p>
                          </div>
                        )}
                        {selectedConsultation.patient_health_data.profile.blood_type && (
                          <div>
                            <p className="text-xs text-gray-400">Blood Type</p>
                            <p className="text-sm font-medium">{selectedConsultation.patient_health_data.profile.blood_type}</p>
                          </div>
                        )}
                        {selectedConsultation.patient_health_data.profile.height && (
                          <div>
                            <p className="text-xs text-gray-400">Height</p>
                            <p className="text-sm font-medium">{selectedConsultation.patient_health_data.profile.height}</p>
                          </div>
                        )}
                        {selectedConsultation.patient_health_data.profile.weight && (
                          <div>
                            <p className="text-xs text-gray-400">Weight</p>
                            <p className="text-sm font-medium">{selectedConsultation.patient_health_data.profile.weight}</p>
                          </div>
                        )}
                        {selectedConsultation.patient_health_data.profile.phone && (
                          <div>
                            <p className="text-xs text-gray-400">Phone</p>
                            <p className="text-sm font-medium">{selectedConsultation.patient_health_data.profile.phone}</p>
                          </div>
                        )}
                      </div>
                      
                      {selectedConsultation.patient_health_data.profile.allergies && selectedConsultation.patient_health_data.profile.allergies.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-2">Known Allergies</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedConsultation.patient_health_data.profile.allergies.map((allergy, idx) => (
                              <span key={idx} className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
                                {typeof allergy === 'string' ? allergy : allergy?.name || String(allergy)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedConsultation.patient_health_data.profile.chronic_conditions && selectedConsultation.patient_health_data.profile.chronic_conditions.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-2">Chronic Conditions</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedConsultation.patient_health_data.profile.chronic_conditions.map((condition, idx) => (
                              <span key={idx} className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30">
                                {typeof condition === 'string' ? condition : condition?.name || String(condition)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedConsultation.patient_health_data.profile.current_medications && selectedConsultation.patient_health_data.profile.current_medications.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-2">Current Medications (Profile)</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedConsultation.patient_health_data.profile.current_medications.map((med, idx) => (
                              <span key={idx} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                                {typeof med === 'string' ? med : med?.name || String(med)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedConsultation.patient_health_data.profile.past_medical_history && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-2">Past Medical History</p>
                          <p className="text-sm text-gray-300 bg-black/30 rounded-lg p-3 whitespace-pre-wrap">{selectedConsultation.patient_health_data.profile.past_medical_history}</p>
                        </div>
                      )}

                      {selectedConsultation.patient_health_data.profile.family_medical_history && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-2">Family Medical History</p>
                          <p className="text-sm text-gray-300 bg-black/30 rounded-lg p-3 whitespace-pre-wrap">{selectedConsultation.patient_health_data.profile.family_medical_history}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Emergency Contact */}
                  {selectedConsultation.patient_health_data.emergency_contact && (selectedConsultation.patient_health_data.emergency_contact.name || selectedConsultation.patient_health_data.emergency_contact.phone) && (
                    <div className="bg-white/5 border border-red-500/30 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-red-400 mb-3">Emergency Contact</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedConsultation.patient_health_data.emergency_contact.name && (
                          <div>
                            <p className="text-xs text-gray-400">Name</p>
                            <p className="text-sm font-medium">{selectedConsultation.patient_health_data.emergency_contact.name}</p>
                          </div>
                        )}
                        {selectedConsultation.patient_health_data.emergency_contact.phone && (
                          <div>
                            <p className="text-xs text-gray-400">Phone</p>
                            <p className="text-sm font-medium">{selectedConsultation.patient_health_data.emergency_contact.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Medicine Tracker */}
                  {selectedConsultation.patient_health_data.medicine_tracker && selectedConsultation.patient_health_data.medicine_tracker.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">Medicine Tracker Records</h4>
                      <div className="space-y-3">
                        {selectedConsultation.patient_health_data.medicine_tracker.map((med, idx) => (
                          <div key={idx} className="bg-black/30 rounded-lg p-4">
                            <div className="flex items-start gap-4">
                              {/* Adherence Donut Chart */}
                              {med.adherence_rate !== undefined && (
                                <div className="flex-shrink-0">
                                  <div className="relative w-16 h-16">
                                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                                      {/* Background circle */}
                                      <path
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.1)"
                                        strokeWidth="3"
                                      />
                                      {/* Progress circle */}
                                      <path
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke={med.adherence_rate >= 80 ? '#10b981' : med.adherence_rate >= 50 ? '#eab308' : '#ef4444'}
                                        strokeWidth="3"
                                        strokeDasharray={`${med.adherence_rate}, 100`}
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                    {/* Center percentage */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className={`text-xs font-bold ${
                                        med.adherence_rate >= 80 ? 'text-emerald-400' :
                                        med.adherence_rate >= 50 ? 'text-yellow-400' :
                                        'text-red-400'
                                      }`}>
                                        {med.adherence_rate}%
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-center text-gray-400 mt-1">Adherence</p>
                                </div>
                              )}
                              
                              {/* Medicine Details */}
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{med.medicine_name}</p>
                                    <p className="text-xs text-gray-400 mt-1">{med.dosage} • {med.frequency}</p>
                                    {med.start_date && (
                                      <p className="text-xs text-gray-500 mt-1">Started: {new Date(med.start_date).toLocaleDateString()}</p>
                                    )}
                                  </div>
                                  {med.status && (
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      med.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                      med.status === 'completed' ? 'bg-gray-500/20 text-gray-400' :
                                      'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                      {med.status}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Adherence Bar (additional visual) */}
                                {med.adherence_rate !== undefined && (
                                  <div className="mt-3">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                      <span className="text-gray-400">Adherence Rate</span>
                                      <span className={`font-semibold ${
                                        med.adherence_rate >= 80 ? 'text-emerald-400' :
                                        med.adherence_rate >= 50 ? 'text-yellow-400' :
                                        'text-red-400'
                                      }`}>
                                        {med.adherence_rate >= 80 ? 'Excellent' :
                                         med.adherence_rate >= 50 ? 'Fair' : 'Poor'}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-700/30 rounded-full h-2 overflow-hidden">
                                      <div
                                        className={`h-2 rounded-full transition-all ${
                                          med.adherence_rate >= 80 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                                          med.adherence_rate >= 50 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' :
                                          'bg-gradient-to-r from-red-500 to-pink-400'
                                        }`}
                                        style={{ width: `${med.adherence_rate}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Consultation History */}
                  {selectedConsultation.patient_health_data.consultation_history && selectedConsultation.patient_health_data.consultation_history.length > 0 && (
                    <div className="bg-white/5 border border-purple-500/30 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-purple-400 mb-3">Past Consultation History</h4>
                      <div className="space-y-2">
                        {selectedConsultation.patient_health_data.consultation_history.map((consultation, idx) => (
                          <div key={idx} className="bg-black/30 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{consultation.medicine_name}</p>
                                <p className="text-xs text-gray-400 mt-1">{consultation.concern_type}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Dr. {consultation.doctor_name} • {new Date(consultation.date).toLocaleDateString()}
                                </p>
                              </div>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                consultation.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                consultation.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {consultation.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-500/10 border border-gray-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Lock className="w-4 h-4" />
                    <p className="text-sm">Patient has not shared additional health details</p>
                  </div>
                </div>
              )}

              {/* Quick Action Buttons */}
              {selectedConsultation.status === 'pending' && (
                <div className="bg-linear-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
                  {/* Show if patient requested changes after reschedule */}
                  {selectedConsultation.patient_requested_changes && selectedConsultation.previous_scheduled_time && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
                      <p className="text-sm text-orange-300 mb-2">
                        <strong>⚠️ Patient Counter-Proposal</strong>
                      </p>
                      <p className="text-xs text-gray-300 mb-2">
                        The patient has requested a different time than your suggestion.
                      </p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-400">Your Previous Suggestion:</p>
                          <p className="text-sm font-semibold text-white">
                            {new Date(selectedConsultation.previous_scheduled_time).toLocaleString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Patient's Preferred Time:</p>
                          <p className="text-sm font-semibold text-blue-400">
                            {new Date(selectedConsultation.preferred_datetime!).toLocaleString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                        You can accept their preferred time or suggest another alternative.
                      </p>
                    </div>
                  )}
                  
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-400" />
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setShowActionModal('accept')}
                      className="px-4 py-3 bg-linear-to-br from-emerald-500 to-green-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Accept
                    </button>
                    <button
                      onClick={() => setShowActionModal('postpone')}
                      className="px-4 py-3 bg-linear-to-br from-blue-500 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Clock className="w-4 h-4" />
                      Postpone
                    </button>
                    <button
                      onClick={() => setShowActionModal('cancel')}
                      className="px-4 py-3 bg-linear-to-br from-red-500 to-pink-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-pink-700 transition-all flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Rescheduled & Confirmed - Awaiting Doctor's Meeting Link */}
              {selectedConsultation.status === 'rescheduled' && !selectedConsultation.requires_patient_confirmation && selectedConsultation.awaiting_doctor_link && (
                <div className="bg-linear-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <h3 className="font-semibold text-lg text-green-400">Patient Confirmed Appointment</h3>
                  </div>
                  <p className="text-sm text-gray-300 mb-4">
                    The patient has accepted your rescheduled time. Please provide the meeting link to finalize the consultation.
                  </p>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-400 mb-1">Confirmed Appointment Time</p>
                    <p className="font-semibold text-white">
                      {new Date(selectedConsultation.scheduled_time!).toLocaleString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setScheduledTime(selectedConsultation.scheduled_time?.slice(0, 16) || '');
                      setShowActionModal('accept');
                    }}
                    className="w-full px-4 py-3 bg-linear-to-br from-emerald-500 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Accept & Provide Meeting Link
                  </button>
                </div>
              )}

              {/* Rescheduled & Accepted - Ready for Consultation */}
              {selectedConsultation.status === 'rescheduled' && !selectedConsultation.requires_patient_confirmation && !selectedConsultation.awaiting_doctor_link && selectedConsultation.meeting_link && (
                <div className="bg-linear-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold text-lg text-blue-400">Consultation Accepted & Ready</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Scheduled Time</p>
                      <p className="font-semibold text-white">
                        {new Date(selectedConsultation.scheduled_time!).toLocaleString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Meeting Link</p>
                      <a href={selectedConsultation.meeting_link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 break-all">
                        {selectedConsultation.meeting_link}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Response Section */}
              {selectedConsultation.status !== 'completed' ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-400" />
                    Your Medical Response
                  </h3>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[150px]"
                    placeholder="Provide your professional medical advice, recommendations, dosage instructions, side effect warnings, and any additional notes..."
                  />
                  
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <button
                      onClick={handleSubmitResponse}
                      disabled={!responseText.trim() || submitting}
                      className="flex-1 bg-linear-to-br from-emerald-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit Response & Complete
                        </>
                      )}
                    </button>
                    {selectedConsultation.status === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate(selectedConsultation._id, 'in_review')}
                        className="px-6 py-3 bg-linear-to-br from-blue-500 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-700 transition-all"
                      >
                        Start Review
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-linear-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Your Response (Submitted)
                  </h3>
                  <p className="text-gray-300 whitespace-pre-wrap mb-3">{selectedConsultation.doctor_response}</p>
                  {selectedConsultation.responded_at && (
                    <p className="text-sm text-emerald-400 mb-4">
                      Responded on: {new Date(selectedConsultation.responded_at).toLocaleString()}
                    </p>
                  )}
                  
                  {selectedConsultation.status === 'completed' && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <button
                        onClick={() => handleDeleteConsultation(selectedConsultation._id)}
                        disabled={deletingId === selectedConsultation._id}
                        className={`w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                          confirmDelete === selectedConsultation._id
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {deletingId === selectedConsultation._id ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Deleting...
                          </>
                        ) : confirmDelete === selectedConsultation._id ? (
                          'Click Again to Confirm Delete'
                        ) : (
                          <>
                            <X className="w-5 h-5" />
                            Delete Consultation
                          </>
                        )}
                      </button>
                      {confirmDelete === selectedConsultation._id && (
                        <p className="text-xs text-red-400 text-center mt-2">
                          This action cannot be undone. The consultation record will be permanently deleted.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Modal (Accept/Cancel/Postpone) */}
      {showActionModal && selectedConsultation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-linear-to-br from-gray-900 to-black border border-white/20 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">
                {showActionModal === 'accept' && 'Accept Consultation'}
                {showActionModal === 'cancel' && 'Cancel Consultation'}
                {showActionModal === 'postpone' && 'Postpone Consultation'}
              </h3>
              <button
                onClick={() => {
                  setShowActionModal(null);
                  setMeetingLink('');
                  setScheduledTime('');
                  setActionReason('');
                }}
                className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Accept Form */}
              {showActionModal === 'accept' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Meeting Link <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="url"
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Scheduled Time <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Any additional notes for the patient..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-white placeholder-gray-400 min-h-[100px]"
                    />
                  </div>
                  <button
                    onClick={handleAcceptConsultation}
                    disabled={actionSubmitting}
                    className="w-full bg-linear-to-br from-emerald-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {actionSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Accept & Notify Patient
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Cancel Form */}
              {showActionModal === 'cancel' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Cancellation Reason <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Please provide a reason for cancellation..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-white placeholder-gray-400 min-h-[120px]"
                    />
                  </div>
                  <button
                    onClick={handleCancelConsultation}
                    disabled={actionSubmitting}
                    className="w-full bg-linear-to-br from-red-500 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-red-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {actionSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <X className="w-5 h-5" />
                        Confirm Cancellation
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Postpone Form */}
              {showActionModal === 'postpone' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      New Scheduled Time <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Reason for Rescheduling <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Please explain why you need to reschedule..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-white placeholder-gray-400 min-h-[100px]"
                    />
                  </div>
                  <button
                    onClick={handlePostponeConsultation}
                    disabled={actionSubmitting}
                    className="w-full bg-linear-to-br from-blue-500 to-cyan-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {actionSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending Request...
                      </>
                    ) : (
                      <>
                        <Clock className="w-5 h-5" />
                        Request Reschedule
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
