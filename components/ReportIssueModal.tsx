'use client';

import { useState } from 'react';
import { X, AlertTriangle, FileText, Send } from 'lucide-react';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicineName?: string;
  drugBankId?: string;
}

export default function ReportIssueModal({
  isOpen,
  onClose,
  medicineName: initialMedicine = '',
  drugBankId = '',
}: ReportIssueModalProps) {
  const [formData, setFormData] = useState({
    medicineName: initialMedicine,
    drugBankId: drugBankId,
    issueType: 'incorrect_side_effect',
    issueTitle: '',
    issueDescription: '',
    suggestedCorrection: '',
    evidenceSource: '',
    urgencyLevel: 'medium',
    affectsPatientSafety: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setFormData({
            medicineName: '',
            drugBankId: '',
            issueType: 'incorrect_side_effect',
            issueTitle: '',
            issueDescription: '',
            suggestedCorrection: '',
            evidenceSource: '',
            urgencyLevel: 'medium',
            affectsPatientSafety: false,
          });
        }, 2000);
      } else {
        setError(data.message || 'Failed to submit report');
      }
    } catch (err: any) {
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-linear-to-r from-blue-600 to-purple-600 p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Report Medicine Issue</h2>
              <p className="text-blue-100 text-sm">Help us maintain accurate medical data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="m-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">✓</span>
              </div>
              <div>
                <p className="text-green-400 font-medium">Report Submitted Successfully!</p>
                <p className="text-green-300 text-sm">Our team will review it shortly.</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="m-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Medicine Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Medicine Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="medicineName"
              value={formData.medicineName}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Aspirin, Metformin"
              required
            />
          </div>

          {/* Issue Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Issue Type <span className="text-red-400">*</span>
            </label>
            <select
              name="issueType"
              value={formData.issueType}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="incorrect_side_effect">Incorrect Side Effect</option>
              <option value="missing_interaction">Missing Drug Interaction</option>
              <option value="wrong_dosage">Wrong Dosage Information</option>
              <option value="incorrect_contraindication">Incorrect Contraindication</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Issue Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Issue Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="issueTitle"
              value={formData.issueTitle}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief summary of the issue"
              maxLength={200}
              required
            />
          </div>

          {/* Issue Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Detailed Description <span className="text-red-400">*</span>
            </label>
            <textarea
              name="issueDescription"
              value={formData.issueDescription}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Provide detailed information about the issue..."
              maxLength={2000}
              required
            />
            <p className="text-xs text-slate-500 mt-1">{formData.issueDescription.length}/2000 characters</p>
          </div>

          {/* Suggested Correction */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Suggested Correction (Optional)
            </label>
            <textarea
              name="suggestedCorrection"
              value={formData.suggestedCorrection}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="What should the correct information be?"
              maxLength={1000}
            />
          </div>

          {/* Evidence Source */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Evidence/Source (Optional)
            </label>
            <input
              type="text"
              name="evidenceSource"
              value={formData.evidenceSource}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Clinical study, FDA database, Personal clinical experience"
              maxLength={500}
            />
          </div>

          {/* Urgency Level */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Urgency Level
            </label>
            <select
              name="urgencyLevel"
              value={formData.urgencyLevel}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low - Minor correction needed</option>
              <option value="medium">Medium - Should be reviewed</option>
              <option value="high">High - Important issue</option>
              <option value="critical">Critical - Urgent attention needed</option>
            </select>
          </div>

          {/* Patient Safety Checkbox */}
          <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
            <input
              type="checkbox"
              name="affectsPatientSafety"
              checked={formData.affectsPatientSafety}
              onChange={handleChange}
              className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800/50 text-red-600 focus:ring-red-500"
            />
            <div>
              <label className="text-sm font-medium text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                This issue may affect patient safety
              </label>
              <p className="text-xs text-slate-400 mt-1">
                Check this if the incorrect information could lead to patient harm
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
