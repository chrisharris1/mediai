'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AnimatedBackground from '@/components/AnimatedBackground';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Loader,
  Video,
  Phone,
  MessageSquare,
  Stethoscope,
  AlertCircle,
  Plus
} from 'lucide-react';

interface Consultation {
  _id: string;
  patient_name: string;
  doctor_name?: string;
  medicine_name?: string;
  concern_type: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'rescheduled';
  created_at: string;
  preferred_datetime?: string;
  scheduled_time?: string;
  reschedule_reason?: string;
  rescheduled_by?: string;
  rescheduled_at?: string;
  requires_patient_confirmation?: boolean;
  meeting_link?: string;
  doctor_notes?: string;
  patient_requested_changes?: boolean;
  previous_scheduled_time?: string;
}

export default function ConsultationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed' | 'rescheduled'>('all');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [editingConsultation, setEditingConsultation] = useState<Consultation | null>(null);
  const [editForm, setEditForm] = useState({
    medicine_name: '',
    concern_type: '',
    description: '',
    preferred_datetime: ''
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleConfirmReschedule = async (consultationId: string) => {
    setConfirmingId(consultationId);
    try {
      const res = await fetch('/api/patient/confirm-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultation_id: consultationId })
      });

      if (res.ok) {
        // Refresh consultations
        await fetchConsultations();
        alert('Consultation confirmed successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to confirm consultation');
      }
    } catch (error) {
      console.error('Error confirming consultation:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRequestNewTime = (consultationId: string) => {
    const consultation = consultations.find(c => c._id === consultationId);
    if (consultation) {
      setEditingConsultation(consultation);
      setEditForm({
        medicine_name: consultation.medicine_name || '',
        concern_type: consultation.concern_type || '',
        description: consultation.description || '',
        preferred_datetime: consultation.preferred_datetime 
          ? new Date(consultation.preferred_datetime).toISOString().slice(0, 16)
          : ''
      });
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConsultation) return;

    setSubmittingEdit(true);
    try {
      const response = await fetch('/api/consultations/edit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultation_id: editingConsultation._id,
          ...editForm
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Your updated consultation request has been sent to the doctor for review.');
        setEditingConsultation(null);
        fetchConsultations();
      } else {
        alert(data.error || 'Failed to update consultation');
      }
    } catch (error) {
      console.error('Error updating consultation:', error);
      alert('Failed to update consultation. Please try again.');
    } finally {
      setSubmittingEdit(false);
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
        setConfirmDelete(null);
        alert('Consultation deleted successfully');
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchConsultations();
    }
  }, [status, router]);

  const fetchConsultations = async () => {
    try {
      const res = await fetch('/api/consultations/my-consultations');
      if (res.ok) {
        const data = await res.json();
        setConsultations(data.consultations || []);
      }
    } catch (error) {
      console.error('Error fetching consultations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'accepted': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'rescheduled': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'rescheduled': return <Calendar className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filteredConsultations = consultations.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading consultations...</p>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl font-bold bg-linear-to-br from-blue-400 to-cyan-400 bg-clip-text text-transparent truncate">
                    My Consultations
                  </h1>
                  <p className="text-sm text-gray-400">View and manage your medical consultations</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => router.push('/consultations/new')}
              className="w-full sm:w-auto px-6 py-3 bg-linear-to-br from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Request Consultation
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="mb-8">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {['all', 'pending', 'accepted', 'completed', 'rescheduled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                  filter === status
                    ? 'bg-linear-to-br from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} 
                {status === 'all' && ` (${consultations.length})`}
                {status !== 'all' && ` (${consultations.filter(c => c.status === status).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-400">{consultations.length}</p>
                <p className="text-sm text-gray-400">Total Requests</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-yellow-400">
                  {consultations.filter(c => c.status === 'pending').length}
                </p>
                <p className="text-sm text-gray-400">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-400">
                  {consultations.filter(c => c.status === 'rescheduled').length}
                </p>
                <p className="text-sm text-gray-400">Rescheduled</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-400">
                  {consultations.filter(c => c.status === 'accepted').length}
                </p>
                <p className="text-sm text-gray-400">Accepted</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-400">
                  {consultations.filter(c => c.status === 'completed').length}
                </p>
                <p className="text-sm text-gray-400">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Consultations List */}
        {filteredConsultations.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-linear-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">No Consultations Found</h3>
            <p className="text-gray-400 mb-6">
              {filter === 'all' 
                ? "You haven't requested any consultations yet." 
                : `No ${filter} consultations at the moment.`}
            </p>
            <button
              onClick={() => router.push('/consultations/new')}
              className="px-6 py-3 bg-linear-to-br from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all font-medium shadow-lg inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Request Your First Consultation
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredConsultations.map((consultation) => (
              <div
                key={consultation._id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        {consultation.doctor_name || 'Awaiting Doctor Assignment'}
                      </h3>
                      <p className="text-sm text-gray-400 mb-2">
                        Concern: {consultation.concern_type.replace('_', ' ').toUpperCase()}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(consultation.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(consultation.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${getStatusColor(consultation.status)}`}>
                    {getStatusIcon(consultation.status)}
                    <span className="font-medium capitalize">{consultation.status}</span>
                  </div>
                </div>

                <div className="bg-black/20 rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-300">{consultation.description}</p>
                </div>

                {consultation.doctor_notes && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold text-blue-400 mb-2">Doctor's Notes:</p>
                    <p className="text-sm text-gray-300">{consultation.doctor_notes}</p>
                  </div>
                )}

                {consultation.status === 'pending' && consultation.patient_requested_changes && consultation.previous_scheduled_time && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-5 h-5 text-blue-400" />
                      <p className="text-sm font-semibold text-blue-400">Counter-Proposal Submitted</p>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">
                      You requested a different time. Waiting for doctor's response...
                    </p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Doctor's Previous Suggestion: </span>
                        <span className="text-white font-medium">
                          {new Date(consultation.previous_scheduled_time).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Your Preferred Time: </span>
                        <span className="text-blue-400 font-medium">
                          {new Date(consultation.preferred_datetime!).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      The doctor will either accept your time or suggest another alternative.
                    </p>
                  </div>
                )}

                {consultation.status === 'rescheduled' && consultation.scheduled_time && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-3 mb-4">
                      <Calendar className="w-5 h-5 text-orange-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-orange-400 mb-2">Doctor Suggested New Time:</p>
                        <p className="text-lg font-bold text-white mb-1">
                          {new Date(consultation.scheduled_time).toLocaleString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                        {consultation.reschedule_reason && (
                          <p className="text-sm text-gray-400 mt-2">
                            <span className="font-semibold">Reason:</span> {consultation.reschedule_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {consultation.requires_patient_confirmation && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleConfirmReschedule(consultation._id)}
                          disabled={confirmingId === consultation._id}
                          className="flex-1 px-4 py-3 bg-linear-to-br from-green-600 to-emerald-600 text-white rounded-xl hover:opacity-90 transition-all font-medium text-center flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {confirmingId === consultation._id ? (
                            <>
                              <Loader className="w-5 h-5 animate-spin" />
                              Confirming...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              Accept New Time
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRequestNewTime(consultation._id)}
                          className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all font-medium text-center flex items-center justify-center gap-2"
                        >
                          <Clock className="w-5 h-5" />
                          Request Different Time
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {consultation.status === 'accepted' && consultation.meeting_link && (
                  <div className="flex gap-3">
                    <a
                      href={consultation.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-3 bg-linear-to-br from-green-600 to-emerald-600 text-white rounded-xl hover:opacity-90 transition-all font-medium text-center flex items-center justify-center gap-2"
                    >
                      <Video className="w-5 h-5" />
                      Join Video Call
                    </a>
                    <button
                      className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                      <MessageSquare className="w-5 h-5" />
                      Message
                    </button>
                  </div>
                )}

                {consultation.status === 'pending' && (
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <Loader className="w-4 h-4 animate-spin" />
                    Waiting for doctor to review your request...
                  </div>
                )}

                {consultation.status === 'rejected' && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <p className="text-sm text-red-400">
                      This consultation request was not accepted. You can request a new consultation with another doctor.
                    </p>
                  </div>
                )}

                {consultation.status === 'completed' && (
                  <div className="border-t border-white/10 pt-4 mt-4">
                    <button
                      onClick={() => handleDeleteConsultation(consultation._id)}
                      disabled={deletingId === consultation._id}
                      className={`w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                        confirmDelete === consultation._id
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {deletingId === consultation._id ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Deleting...
                        </>
                      ) : confirmDelete === consultation._id ? (
                        'Click Again to Confirm Delete'
                      ) : (
                        <>
                          <XCircle className="w-5 h-5" />
                          Delete Consultation Record
                        </>
                      )}
                    </button>
                    {confirmDelete === consultation._id && (
                      <p className="text-xs text-red-400 text-center mt-2">
                        This action cannot be undone. The consultation record will be permanently deleted.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Consultation Modal */}
      {editingConsultation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-linear-to-br from-gray-900 to-black border border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Request Different Time</h2>
                <button
                  onClick={() => setEditingConsultation(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
                <p className="text-sm text-orange-300 mb-2">
                  <strong>Doctor's Suggested Time:</strong>
                </p>
                <p className="text-white font-semibold">
                  {new Date(editingConsultation.scheduled_time!).toLocaleString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
                {editingConsultation.reschedule_reason && (
                  <p className="text-sm text-gray-400 mt-2">
                    Reason: {editingConsultation.reschedule_reason}
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmitEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Medicine Name
                  </label>
                  <input
                    type="text"
                    value={editForm.medicine_name}
                    onChange={(e) => setEditForm({ ...editForm, medicine_name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Concern Type
                  </label>
                  <select
                    value={editForm.concern_type}
                    onChange={(e) => setEditForm({ ...editForm, concern_type: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select concern type</option>
                    <option value="Side Effects">Side Effects</option>
                    <option value="Dosage">Dosage</option>
                    <option value="Interactions">Interactions</option>
                    <option value="Alternative Medicine">Alternative Medicine</option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Preferred Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.preferred_datetime}
                    onChange={(e) => setEditForm({ ...editForm, preferred_datetime: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingConsultation(null)}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all font-medium"
                    disabled={submittingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-linear-to-br from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all font-semibold flex items-center justify-center gap-2"
                    disabled={submittingEdit}
                  >
                    {submittingEdit ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Submit Updated Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
