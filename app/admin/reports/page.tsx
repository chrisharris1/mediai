'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  ChevronDown,
  Mail,
} from 'lucide-react';

interface Report {
  _id: string;
  doctorName: string;
  doctorEmail: string;
  medicineName: string;
  issueType: string;
  issueTitle: string;
  issueDescription: string;
  suggestedCorrection?: string;
  evidenceSource?: string;
  urgencyLevel: string;
  affectsPatientSafety: boolean;
  status: string;
  adminNotes?: string;
  actionTaken?: string;
  submittedAt: string;
  reviewedAt?: string;
}

interface Statistics {
  byStatus: Array<{ _id: string; count: number }>;
  byUrgency: Array<{ _id: string; count: number }>;
  safetyConcerns: number;
}

export default function AdminReportsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState(false);

  // Review form state
  const [reviewForm, setReviewForm] = useState({
    status: '',
    adminNotes: '',
    actionTaken: '',
  });

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    } else if (sessionStatus === 'authenticated') {
      fetchReports();
    }
  }, [sessionStatus, filterStatus]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const url = filterStatus === 'all'
        ? '/api/reports/admin'
        : `/api/reports/admin?status=${filterStatus}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setReports(data.data.reports);
        setStatistics(data.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedReport || !reviewForm.status) return;

    try {
      setUpdating(true);
      const response = await fetch('/api/reports/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReport._id,
          ...reviewForm,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh reports
        await fetchReports();
        setSelectedReport(null);
        setReviewForm({ status: '', adminNotes: '', actionTaken: '' });
      }
    } catch (error) {
      console.error('Error updating report:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      under_review: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      resolved: 'bg-green-500/10 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/10 text-red-400 border-red-500/30',
    };
    const icons = {
      pending: <Clock className="w-4 h-4" />,
      under_review: <FileText className="w-4 h-4" />,
      resolved: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />,
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      low: 'text-green-400',
      medium: 'text-blue-400',
      high: 'text-orange-400',
      critical: 'text-red-400',
    };
    return colors[urgency as keyof typeof colors] || 'text-gray-400';
  };

  const filteredReports = reports.filter(report =>
    report.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.issueTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Medicine Reports</h1>
          <p className="text-slate-400">Review and manage doctor-submitted medicine issues</p>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {statistics.byStatus.map(stat => (
              <div key={stat._id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">{stat._id.replace('_', ' ').toUpperCase()}</span>
                  {getStatusBadge(stat._id)}
                </div>
                <div className="text-3xl font-bold text-white">{stat.count}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by medicine, doctor, or issue..."
                className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-12 pr-10 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none sm:min-w-[200px]"
              >
                <option value="all">All Reports</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No reports found</p>
            </div>
          ) : (
            filteredReports.map(report => (
              <div
                key={report._id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{report.medicineName}</h3>
                      {report.affectsPatientSafety && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          Safety Concern
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 font-medium mb-1">{report.issueTitle}</p>
                    <p className="text-slate-400 text-sm line-clamp-2">{report.issueDescription}</p>
                  </div>
                  <div className="ml-4">
                    {getStatusBadge(report.status)}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-slate-400">
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Dr. {report.doctorName}
                  </span>
                  <span className={`font-medium ${getUrgencyColor(report.urgencyLevel)}`}>
                    {report.urgencyLevel.toUpperCase()} Priority
                  </span>
                  <span>
                    {new Date(report.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-linear-to-r from-blue-600 to-purple-600 p-6 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-white">Review Report</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
              >
                <XCircle className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Report Details */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400">Medicine</label>
                  <p className="text-xl font-bold text-white">{selectedReport.medicineName}</p>
                </div>

                <div>
                  <label className="text-sm text-slate-400">Issue Type</label>
                  <p className="text-white">{selectedReport.issueType.replace('_', ' ')}</p>
                </div>

                <div>
                  <label className="text-sm text-slate-400">Issue Title</label>
                  <p className="text-white font-medium">{selectedReport.issueTitle}</p>
                </div>

                <div>
                  <label className="text-sm text-slate-400">Description</label>
                  <p className="text-white">{selectedReport.issueDescription}</p>
                </div>

                {selectedReport.suggestedCorrection && (
                  <div>
                    <label className="text-sm text-slate-400">Suggested Correction</label>
                    <p className="text-green-400">{selectedReport.suggestedCorrection}</p>
                  </div>
                )}

                {selectedReport.evidenceSource && (
                  <div>
                    <label className="text-sm text-slate-400">Evidence Source</label>
                    <p className="text-white">{selectedReport.evidenceSource}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  <div>
                    <label className="text-sm text-slate-400">Submitted By</label>
                    <p className="text-white">Dr. {selectedReport.doctorName}</p>
                    <p className="text-slate-400 text-sm">{selectedReport.doctorEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Urgency</label>
                    <p className={`font-medium ${getUrgencyColor(selectedReport.urgencyLevel)}`}>
                      {selectedReport.urgencyLevel.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Review Form */}
              <div className="border-t border-slate-700 pt-6 space-y-4">
                <h3 className="text-lg font-bold text-white">Admin Review</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Update Status
                  </label>
                  <select
                    value={reviewForm.status}
                    onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select status...</option>
                    <option value="under_review">Under Review</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    value={reviewForm.adminNotes}
                    onChange={(e) => setReviewForm({ ...reviewForm, adminNotes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Add notes for the doctor..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Action Taken
                  </label>
                  <textarea
                    value={reviewForm.actionTaken}
                    onChange={(e) => setReviewForm({ ...reviewForm, actionTaken: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="e.g., Updated database, Retrained AI model..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReviewSubmit}
                    disabled={!reviewForm.status || updating}
                    className="flex-1 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : 'Submit Review'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
