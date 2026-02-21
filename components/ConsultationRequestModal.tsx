'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Stethoscope, Loader2, ArrowLeft, Calendar, Clock, Shield, FileText, Lock, CheckCircle, Eye } from 'lucide-react';
import DoctorInfoModal from './DoctorInfoModal';

interface Doctor {
  _id: string;
  name: string;
  email: string;
  specialization: string;
  experience: number;
  consultation_fee: number;
}

interface ConsultationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicineName?: string;
  patientName: string;
}

export default function ConsultationRequestModal({
  isOpen,
  onClose,
  medicineName = '',
  patientName
}: ConsultationRequestModalProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('auto');
  const [concernType, setConcernType] = useState('');
  const [description, setDescription] = useState('');
  const [medicine, setMedicine] = useState(medicineName);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shareHealthData, setShareHealthData] = useState(true); // New: Privacy checkbox
  const [currentStep, setCurrentStep] = useState(1); // Step 1: Form, Step 2: Doctor Selection
  const [preferredDateTime, setPreferredDateTime] = useState(''); // New: Preferred date/time
  const [viewingDoctorEmail, setViewingDoctorEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDoctors();
      setMedicine(medicineName);
    }
  }, [isOpen, medicineName]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/consultations/available-doctors');
      if (res.ok) {
        const data = await res.json();
        setDoctors(data.doctors || []);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!medicine || !concernType || !description) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/consultations/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_name: medicine,
          concern_type: concernType,
          description,
          patient_name: patientName,
          preferred_doctor_email: selectedDoctor === 'auto' ? undefined : selectedDoctor,
          share_health_data: shareHealthData, // Include privacy preference
          preferred_datetime: preferredDateTime || undefined, // Include preferred date/time
          auto_assign: selectedDoctor === 'auto'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setConcernType('');
          setDescription('');
          setMedicine('');
          setSelectedDoctor('auto');
          setShareHealthData(true);
        }, 3000);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to submit consultation request');
      }
    } catch (error) {
      console.error('Error submitting consultation:', error);
      alert('Error submitting consultation request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gray-900 border border-emerald-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Request Submitted!</h3>
          <p className="text-gray-300">A doctor will review your case and respond soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-white">Request Doctor Consultation</h2>
              <p className="text-sm text-gray-400">Get professional medical advice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Patient Info */}
          <div className="bg-linear-to-br from-blue-900/20 to-indigo-900/20 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Patient</p>
                <p className="font-semibold text-white">{patientName}</p>
              </div>
            </div>
          </div>

          {/* Medicine Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Medicine Name *
              </div>
            </label>
            <input
              type="text"
              value={medicine}
              onChange={(e) => setMedicine(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              placeholder="Enter medicine name"
              required
            />
          </div>

          {/* Concern Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Concern Type *
            </label>
            <select
              value={concernType}
              onChange={(e) => setConcernType(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="" className="bg-gray-900">Select concern type</option>
              <option value="Drug Interactions" className="bg-gray-900">Drug Interactions</option>
              <option value="Side Effects" className="bg-gray-900">Side Effects</option>
              <option value="Dosage Question" className="bg-gray-900">Dosage Question</option>
              <option value="Allergy Concerns" className="bg-gray-900">Allergy Concerns</option>
              <option value="Pregnancy/Breastfeeding" className="bg-gray-900">Pregnancy/Breastfeeding</option>
              <option value="Alternative Medicines" className="bg-gray-900">Alternative Medicines</option>
              <option value="Other" className="bg-gray-900">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Describe Your Concern *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              placeholder="Please provide detailed information about your concern..."
              required
            />
          </div>

          {/* Preferred Date/Time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Preferred Meeting Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={preferredDateTime}
              onChange={(e) => setPreferredDateTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Suggest a preferred meeting time. The doctor will consider this when scheduling.
            </p>
          </div>

          {/* Doctor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select Doctor (Optional)
            </label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : doctors.length === 0 ? (
              <p className="text-gray-400 text-sm">No doctors available. We'll assign one for you.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {/* Auto-assign Option */}
                <div
                  onClick={() => setSelectedDoctor('auto')}
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedDoctor === 'auto'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 hover:border-blue-500/50 hover:bg-white/5'
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
                    className={`border rounded-xl p-4 transition-all ${
                      selectedDoctor === doctor.email
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-gray-700 hover:border-emerald-500/50 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => setSelectedDoctor(doctor.email)}
                      >
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
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <div className="text-emerald-400 font-bold text-lg">
                            ₹{doctor.consultation_fee}
                          </div>
                          <p className="text-xs text-gray-400">Consultation</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingDoctorEmail(doctor.email);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs rounded-lg transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy Checkbox - Share Health Data */}
          <div className="bg-linear-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="share_health_data"
                checked={shareHealthData}
                onChange={(e) => setShareHealthData(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="share_health_data" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-white">Share My Health Details with Doctor</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Allow the doctor to access your complete health profile, medicine tracker records, and medical history for better diagnosis. 
                  <span className="text-blue-400 font-medium"> Highly recommended for accurate consultation.</span>
                </p>
                {shareHealthData && (
                  <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-xs text-green-300 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      The doctor will receive: Profile details, current medications, adherence reports, and medical conditions
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Next Steps Info */}
          <div className="bg-linear-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/20 rounded-xl p-4">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              What happens next?
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0"></div>
                <span className="text-sm text-gray-300">Your request will be sent to a qualified doctor</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0"></div>
                <span className="text-sm text-gray-300">Doctor will review your case within 24-48 hours</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0"></div>
                <span className="text-sm text-gray-300">You'll receive a detailed professional response</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0"></div>
                <span className="text-sm text-gray-300">Consultation fee: ₹500-2000 (based on doctor)</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-linear-to-br from-blue-600 to-indigo-700 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Doctor Info Modal */}
      {viewingDoctorEmail && (
        <DoctorInfoModal
          isOpen={!!viewingDoctorEmail}
          onClose={() => setViewingDoctorEmail(null)}
          doctorEmail={viewingDoctorEmail}
        />
      )}
    </div>
  );
}