'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, Send, FileText, User, Shield, Info, Clock, MessageSquare, ChevronRight } from 'lucide-react';

interface ComplaintFormProps {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
}

export default function ComplaintForm({ userId, userName, userEmail, userPhone }: ComplaintFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Array<{id: string, name: string}>>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [formData, setFormData] = useState({
    doctorId: '',
    doctorName: '',
    issueType: 'Unprofessional Behavior',
    description: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchMyDoctors();
    }
  }, [isOpen]);

  const fetchMyDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const response = await fetch('/api/consultations/my-consultations');
      if (response.ok) {
        const data = await response.json();
        // Extract unique doctors from accepted or completed consultations
        const uniqueDoctors = Array.from(
          new Map(
            data.consultations
              .filter((c: any) => 
                c.doctor_id && 
                c.doctor_name && 
                (c.status === 'accepted' || c.status === 'completed')
              )
              .map((c: any) => [c.doctor_id, { id: c.doctor_id, name: c.doctor_name }])
          ).values()
        ) as Array<{id: string; name: string}>;
        setDoctors(uniqueDoctors);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const issueTypes = [
    { value: 'Unprofessional Behavior', icon: '👨‍⚕️', description: 'Rude, unethical, or inappropriate conduct' },
    { value: 'Incorrect Diagnosis', icon: '🩺', description: 'Wrong or inaccurate medical diagnosis' },
    { value: 'Payment Issue', icon: '💰', description: 'Problems with billing or payments' },
    { value: 'No Response', icon: '⏱️', description: 'Doctor not responding to messages' },
    { value: 'Privacy Violation', icon: '🔒', description: 'Breach of patient confidentiality' },
    { value: 'Prescription Issue', icon: '💊', description: 'Problems with prescriptions or medications' },
    { value: 'Other', icon: '📝', description: 'Any other concern not listed' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.description.length < 50) {
      alert('Description must be at least 50 characters');
      return;
    }

    if (formData.description.length > 2000) {
      alert('Description must not exceed 2000 characters');
      return;
    }

    if (!formData.doctorId || !formData.doctorName) {
      alert('Please enter doctor information');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/user/submit-complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userName,
          userEmail,
          userPhone: userPhone || '',
          doctorId: formData.doctorId,
          doctorName: formData.doctorName,
          issueType: formData.issueType,
          description: formData.description,
          evidenceUrls: [], // Can add file upload later
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Complaint submitted successfully! Your complaint ID is: ${data.complaint.complaintId}`);
        setIsOpen(false);
        setFormData({
          doctorId: '',
          doctorName: '',
          issueType: 'Unprofessional Behavior',
          description: '',
        });
      } else {
        alert(data.error || 'Failed to submit complaint');
      }
    } catch (error) {
      console.error('Error submitting complaint:', error);
      alert('Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-linear-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg text-xs font-medium shadow-lg shadow-red-500/30 hover:shadow-red-500/40 transition-all duration-300 hover:scale-[1.02]"
          title="Report Doctor Issue"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Report Issue
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-linear-to-br from-gray-900 to-black border border-white/20 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
            {/* Modal Header */}
            <div className="sticky top-0 bg-linear-to-br from-red-500/10 to-red-600/10 border-b border-white/10 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Report Medical Professional</h2>
                    <p className="text-sm text-gray-400">Submit a formal complaint against a doctor</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* User Info */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-linear-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{userName}</h3>
                  <p className="text-sm text-gray-400">{userEmail}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Patient ID</p>
                  <p className="text-sm font-mono">{userId.slice(0, 8)}...</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Doctor Information */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-linear-to-br from-red-500/20 to-red-600/20 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-red-400" />
                  </div>
                  Select Doctor
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Doctor You Consulted With *
                  </label>
                  {loadingDoctors ? (
                    <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400">
                      Loading your doctors...
                    </div>
                  ) : doctors.length === 0 ? (
                    <div className="w-full px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm">
                      <p className="font-medium mb-1">No Consultations Found</p>
                      <p className="text-xs text-amber-200">You need to have at least one consultation with a doctor before filing a complaint.</p>
                    </div>
                  ) : (
                    <select
                      value={formData.doctorId}
                      onChange={(e) => {
                        const selectedDoctor = doctors.find(d => d.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          doctorId: e.target.value,
                          doctorName: selectedDoctor?.name || ''
                        });
                      }}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white transition-all"
                      required
                    >
                      <option value="" className="bg-gray-900">Select a doctor</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id} className="bg-gray-900">
                          Dr. {doctor.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Select from doctors you've consulted with</p>
                </div>
              </div>

              {/* Issue Type */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-linear-to-br from-amber-500/20 to-orange-500/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-amber-400" />
                  </div>
                  Type of Concern
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {issueTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, issueType: type.value })}
                      className={`p-4 rounded-xl text-left transition-all ${
                        formData.issueType === type.value
                          ? 'bg-linear-to-br from-red-500/20 to-red-600/20 border border-red-500/30'
                          : 'bg-white/5 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{type.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium">{type.value}</p>
                          <p className="text-xs text-gray-400 mt-1">{type.description}</p>
                        </div>
                        {formData.issueType === type.value && (
                          <div className="w-6 h-6 bg-linear-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                            <ChevronRight className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-linear-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                  </div>
                  Detailed Description
                </h3>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-300">
                      Please provide detailed information about the issue *
                    </label>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      formData.description.length >= 50 && formData.description.length <= 2000
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {formData.description.length}/2000 characters
                    </div>
                  </div>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the incident in detail. Include dates, times, what was said/done, and any relevant context..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-500 min-h-[150px] transition-all resize-none"
                    required
                    minLength={50}
                    maxLength={2000}
                  />
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${
                        formData.description.length >= 50 
                          ? 'bg-emerald-500 animate-pulse' 
                          : 'bg-red-500'
                      }`} />
                      <span className={`${
                        formData.description.length >= 50 
                          ? 'text-emerald-400' 
                          : 'text-red-400'
                      }`}>
                        Min. 50 characters
                      </span>
                    </div>
                    {formData.description.length > 0 && formData.description.length < 50 && (
                      <p className="text-sm text-red-400">
                        Need {50 - formData.description.length} more characters
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Important Information */}
              <div className="bg-linear-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-300 mb-2">Important Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <span className="text-amber-200">Your complaint will be reviewed within <strong>24-48 hours</strong></span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Send className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <span className="text-amber-200">You will receive updates via <strong>email and SMS</strong></span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <span className="text-amber-200">False complaints may result in <strong>account suspension</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium transition-all hover:border-white/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || formData.description.length < 50}
                  className="flex-1 px-6 py-4 bg-linear-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/30 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Submitting Report...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Submit Formal Complaint</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-in-up {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .animate-slide-in-up {
          animation: slide-in-up 0.4s ease-out;
        }
      `}</style>
    </>
  );
}
