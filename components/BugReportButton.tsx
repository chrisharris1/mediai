'use client';

import { useState } from 'react';
import { Bug, X, Send, AlertCircle } from 'lucide-react';

export default function BugReportButton() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [issue, setIssue] = useState('');
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (phone.trim().length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!issue.trim()) {
      newErrors.issue = 'Issue description is required';
    } else if (issue.trim().length < 10) {
      newErrors.issue = 'Please describe the issue in at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) {
      setFormError('Please fix the errors below');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          issue: issue.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      // Show success state
      setSuccess(true);
      
      // Reset form
      setName('');
      setPhone('');
      setIssue('');
      setErrors({});

      // Auto-close after 3 seconds
      setTimeout(() => {
        setShowForm(false);
        setSuccess(false);
      }, 3000);

    } catch (err: any) {
      setFormError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setSuccess(false);
    setName('');
    setPhone('');
    setIssue('');
    setErrors({});
    setFormError('');
  };

  return (
    <>
      {/* Floating Bug Report Button */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-1.5 px-2.5 py-1.5 bg-linear-to-r from-red-500 to-orange-500 text-white rounded-lg shadow-lg hover:shadow-red-500/50 hover:scale-105 transition-all duration-300 text-xs font-medium"
        title="Report a Bug"
      >
        <Bug className="w-3.5 h-3.5" />
        Report Bug
      </button>

      {/* Bug Report Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
            {success ? (
              /* Success State */
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Report Submitted!</h3>
                <p className="text-gray-400">
                  Thank you for reporting this issue. Our team has been notified and will review it shortly.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-6 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              /* Form State */
              <>
                {/* Header */}
                <div className="bg-linear-to-r from-red-600 to-orange-600 p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Bug className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Report a Bug</h2>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Form Error */}
                  {formError && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Your Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full px-4 py-3 bg-slate-800/50 border ${errors.name ? 'border-red-500' : 'border-white/10'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                      placeholder="John Doe"
                      disabled={loading}
                    />
                    {errors.name && (
                      <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`w-full px-4 py-3 bg-slate-800/50 border ${errors.phone ? 'border-red-500' : 'border-white/10'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                      placeholder="+1234567890"
                      disabled={loading}
                    />
                    {errors.phone && (
                      <p className="text-red-400 text-sm mt-1">{errors.phone}</p>
                    )}
                  </div>

                  {/* Issue Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Describe the Issue <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      rows={5}
                      className={`w-full px-4 py-3 bg-slate-800/50 border ${errors.issue ? 'border-red-500' : 'border-white/10'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none`}
                      placeholder="Please describe the bug or issue you encountered..."
                      disabled={loading}
                    />
                    {errors.issue && (
                      <p className="text-red-400 text-sm mt-1">{errors.issue}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      Minimum 10 characters
                    </p>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-blue-300 text-sm">
                    <p className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Our team will review your report and get back to you via email or phone.
                      </span>
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-3 bg-linear-to-r from-red-600 to-orange-600 text-white font-semibold rounded-lg hover:from-red-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Submit Report
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
