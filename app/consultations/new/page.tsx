'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronLeft, FileText, Check, Calendar, Clock, Shield, Stethoscope, Loader2 } from 'lucide-react';
import AnimatedBackground from '@/components/AnimatedBackground';

interface Doctor {
  _id: string;
  name: string;
  email: string;
  specialization: string;
  experience: number;
  consultation_fee: number;
}

export default function NewConsultationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const attachReport = searchParams.get('attachReport') === 'true';
  const doctorId = searchParams.get('doctorId');
  
  const [formData, setFormData] = useState({
    medicine_name: '',
    concern_type: 'side_effects',
    description: '',
    attach_medicine_report: attachReport,
    preferred_datetime: '',
    preferred_doctor_email: 'auto',
  });
  const [submitting, setSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchDoctors();
    }
  }, [status, router]);

  useEffect(() => {
    // Pre-select doctor if doctorId is provided in URL
    if (doctorId && doctors.length > 0) {
      const selectedDoctor = doctors.find(d => d._id === doctorId);
      if (selectedDoctor) {
        setFormData(prev => ({ ...prev, preferred_doctor_email: selectedDoctor.email }));
      }
    }
  }, [doctorId, doctors]);

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const res = await fetch('/api/consultations/available-doctors');
      if (res.ok) {
        const data = await res.json();
        setDoctors(data.doctors || []);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/consultations/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_name: formData.medicine_name,
          concern_type: formData.concern_type,
          description: formData.description,
          share_health_data: formData.attach_medicine_report,
          patient_name: session?.user?.name || '',
          preferred_datetime: formData.preferred_datetime || undefined,
          preferred_doctor_email: formData.preferred_doctor_email === 'auto' ? undefined : formData.preferred_doctor_email,
          auto_assign: formData.preferred_doctor_email === 'auto',
        }),
      });

      if (res.ok) {
        alert('Consultation request submitted successfully!');
        router.push('/dashboard');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to submit consultation');
      }
    } catch (error) {
      console.error('Error submitting consultation:', error);
      alert('Error submitting consultation');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden">
      <AnimatedBackground />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Request Doctor Consultation</h1>
              <p className="text-sm text-gray-400">Get professional medical advice</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Medicine Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Medicine Name (Optional)
              </label>
              <input
                type="text"
                value={formData.medicine_name}
                onChange={(e) => setFormData(prev => ({ ...prev, medicine_name: e.target.value }))}
                placeholder="e.g., Aspirin"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
              />
            </div>

            {/* Concern Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type of Concern
              </label>
              <select
                value={formData.concern_type}
                onChange={(e) => setFormData(prev => ({ ...prev, concern_type: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              >
                <option value="side_effects">Side Effects</option>
                <option value="dosage">Dosage Question</option>
                <option value="interaction">Drug Interaction</option>
                <option value="alternative">Alternative Medicine</option>
                <option value="general">General Consultation</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Describe Your Concern
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Please describe your concern in detail..."
                rows={6}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 resize-none"
              />
            </div>

            {/* Share Health Details */}
            <div 
              onClick={() => setFormData(prev => ({ ...prev, attach_medicine_report: !prev.attach_medicine_report }))}
              className={`border rounded-xl p-5 cursor-pointer transition-all ${
                formData.attach_medicine_report
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-white/10 hover:border-green-500/30 hover:bg-white/5'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  formData.attach_medicine_report
                    ? 'bg-linear-to-br from-green-500 to-emerald-600'
                    : 'bg-white/5'
                }`}>
                  {formData.attach_medicine_report ? (
                    <Check className="w-6 h-6 text-white" />
                  ) : (
                    <Shield className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-white">Share My Health Details with Doctor</h4>
                    {formData.attach_medicine_report && (
                      <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded-md text-xs text-green-400 font-medium">
                        Enabled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Allow the doctor to access your complete health profile, medicine tracker records, and medical history for better diagnosis. Highly recommended for accurate consultation.
                  </p>
                </div>
              </div>
            </div>

            {/* Preferred Meeting Time */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Preferred Meeting Time (Optional)
                </div>
              </label>
              <input
                type="datetime-local"
                value={formData.preferred_datetime}
                onChange={(e) => setFormData(prev => ({ ...prev, preferred_datetime: e.target.value }))}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                placeholder="dd-mm-yyyy --:--"
              />
              <p className="text-xs text-gray-400 mt-2">
                Suggest a preferred meeting time. The doctor will consider this when scheduling.
              </p>
            </div>

            {/* Doctor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  Select Doctor (Optional)
                </div>
              </label>
              {loadingDoctors ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : doctors.length === 0 ? (
                <p className="text-gray-400 text-sm">No doctors available. We'll assign one for you.</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {/* Auto-assign Option */}
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, preferred_doctor_email: 'auto' }))}
                    className={`border rounded-xl p-4 cursor-pointer transition-all ${
                      formData.preferred_doctor_email === 'auto'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 hover:border-blue-500/50 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">Auto-assign (Recommended)</p>
                        <p className="text-sm text-gray-400">We'll match you with the best specialist for your concern</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Doctor List */}
                  {doctors.map((doctor) => (
                    <div
                      key={doctor._id}
                      onClick={() => setFormData(prev => ({ ...prev, preferred_doctor_email: doctor.email }))}
                      className={`border rounded-xl p-4 cursor-pointer transition-all ${
                        formData.preferred_doctor_email === doctor.email
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-white/10 hover:border-emerald-500/50 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                              <Stethoscope className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{doctor.name}</h3>
                              <p className="text-sm text-gray-400">{doctor.specialization}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 ml-12">
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Calendar className="w-3 h-3" />
                              {doctor.experience} years
                            </div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-emerald-400 font-bold text-lg">
                            ₹{doctor.consultation_fee}
                          </div>
                          <p className="text-xs text-gray-400">Consultation</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attach Report Checkbox */}
            {!attachReport && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.attach_medicine_report}
                  onChange={(e) => setFormData(prev => ({ ...prev, attach_medicine_report: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-600 bg-white/5 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm text-gray-300">
                  Attach my medicine adherence report to this consultation
                </label>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center gap-4 pt-6">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
