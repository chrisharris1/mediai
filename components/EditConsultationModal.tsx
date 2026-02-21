'use client';

import { useState } from 'react';
import { X, Edit, Calendar, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface EditConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultation: any;
  onSuccess: () => void;
}

export default function EditConsultationModal({
  isOpen,
  onClose,
  consultation,
  onSuccess
}: EditConsultationModalProps) {
  const [medicine, setMedicine] = useState(consultation?.medicine_name || '');
  const [concernType, setConcernType] = useState(consultation?.concern_type || '');
  const [description, setDescription] = useState(consultation?.description || '');
  const [preferredDateTime, setPreferredDateTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!medicine || !concernType || !description) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/consultations/edit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultation_id: consultation._id,
          medicine_name: medicine,
          concern_type: concernType,
          description,
          preferred_datetime: preferredDateTime || undefined
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(data.error || 'Failed to update consultation');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-linear-to-br from-gray-900 to-black border border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-linear-to-br from-blue-500/10 to-purple-500/10 border-b border-white/10 p-6 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Edit className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Edit Consultation Request</h2>
                <p className="text-sm text-gray-400">Update your consultation details for rescheduling</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mx-6 mt-6 bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-green-400 font-medium">Successfully Updated!</p>
              <p className="text-sm text-gray-300 mt-1">
                Your updated consultation request has been sent to Dr. {consultation?.doctor_name}. 
                You'll receive a notification once the doctor reviews your request.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Doctor Info */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-1">Assigned Doctor</p>
            <p className="text-white font-semibold">{consultation?.doctor_name}</p>
          </div>

          {/* Medicine Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Medicine Name *
            </label>
            <input
              type="text"
              value={medicine}
              onChange={(e) => setMedicine(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              placeholder="e.g., Aspirin, Metformin"
              required
            />
          </div>

          {/* Concern Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type of Concern *
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

          {/* New Preferred Date/Time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Preferred Meeting Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={preferredDateTime}
              onChange={(e) => setPreferredDateTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Suggest a new preferred meeting time for rescheduling
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || success}
              className="flex-1 px-6 py-3 bg-linear-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Updated!
                </>
              ) : (
                <>
                  <Edit className="w-5 h-5" />
                  Update Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
