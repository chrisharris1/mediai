'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Bug, CheckCircle, X, ArrowLeft, AlertCircle, Search, Filter, Calendar, User, Phone, Mail, Clock, ExternalLink, MoreVertical, Send, Download, Eye, FileText, Shield } from 'lucide-react';

interface BugReport {
  _id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  name: string;
  phone: string;
  issue: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export default function BugReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [selectedBugReport, setSelectedBugReport] = useState<BugReport | null>(null);
  const [showBugReportModal, setShowBugReportModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if (session?.user?.role !== 'admin') {
        router.push('/dashboard');
      } else {
        loadBugReports();
      }
    }
  }, [status, session, router]);

  const loadBugReports = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/bug-reports');
      if (res.ok) {
        const data = await res.json();
        setBugReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error loading bug reports:', error);
      setErrorMessage('Failed to load bug reports');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsResolved = async () => {
    if (!selectedBugReport) return;

    try {
      const res = await fetch('/api/admin/bug-reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedBugReport._id,
          resolution_notes: resolutionNotes
        })
      });

      if (res.ok) {
        setSuccessMessage('Bug report marked as resolved! Email sent to user.');
        setTimeout(() => setSuccessMessage(''), 5000);
        setShowBugReportModal(false);
        setSelectedBugReport(null);
        setResolutionNotes('');
        loadBugReports();
      } else {
        const error = await res.json();
        setErrorMessage(error.error || 'Failed to update bug report');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error marking as resolved:', error);
      setErrorMessage('Failed to update bug report');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleDismiss = async (reportId: string) => {
    if (confirm('Are you sure you want to dismiss this bug report?')) {
      try {
        const res = await fetch('/api/admin/bug-reports', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId: reportId,
            status: 'dismissed'
          })
        });
        if (res.ok) {
          setSuccessMessage('Bug report dismissed');
          setTimeout(() => setSuccessMessage(''), 3000);
          loadBugReports();
        }
      } catch (error) {
        console.error('Error dismissing report:', error);
        setErrorMessage('Failed to dismiss report');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    }
  };

  const filteredReports = bugReports.filter(report => {
    if (filterStatus === 'all') return true;
    return report.status === filterStatus;
  }).filter(report => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.user_name.toLowerCase().includes(query) ||
      report.user_email.toLowerCase().includes(query) ||
      report.issue.toLowerCase().includes(query) ||
      report.phone.includes(query) ||
      report._id.toLowerCase().includes(query)
    );
  });

  const pendingCount = bugReports.filter(r => r.status === 'pending').length;
  const resolvedCount = bugReports.filter(r => r.status === 'resolved').length;
  const dismissedCount = bugReports.filter(r => r.status === 'dismissed').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { 
        bg: 'bg-yellow-500/10', 
        text: 'text-yellow-400', 
        border: 'border-yellow-500/20',
        gradient: 'from-yellow-500/20 to-amber-500/10'
      };
      case 'resolved': return { 
        bg: 'bg-green-500/10', 
        text: 'text-green-400', 
        border: 'border-green-500/20',
        gradient: 'from-green-500/20 to-emerald-500/10'
      };
      case 'dismissed': return { 
        bg: 'bg-gray-500/10', 
        text: 'text-gray-400', 
        border: 'border-gray-500/20',
        gradient: 'from-gray-500/20 to-slate-500/10'
      };
      default: return { 
        bg: 'bg-gray-500/10', 
        text: 'text-gray-400', 
        border: 'border-gray-500/20',
        gradient: 'from-gray-500/20 to-slate-500/10'
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-300 text-lg">Loading bug reports...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-linear-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Bug className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-linear-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                    Bug Reports
                  </h1>
                  <p className="text-sm text-gray-400">Manage and resolve system issues</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-indigo-500/30 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-linear-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Reports</p>
                <p className="text-2xl font-bold text-blue-400">{bugReports.length}</p>
              </div>
            </div>
            <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-linear-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: '100%' }}
              ></div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-yellow-500/30 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-linear-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
              </div>
            </div>
            <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-linear-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${(pendingCount / bugReports.length) * 100 || 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-emerald-500/30 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-linear-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Resolved</p>
                <p className="text-2xl font-bold text-emerald-400">{resolvedCount}</p>
              </div>
            </div>
            <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-linear-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${(resolvedCount / bugReports.length) * 100 || 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-gray-500/30 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-linear-to-r from-gray-500 to-slate-600 rounded-xl flex items-center justify-center shadow-lg">
                <X className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Dismissed</p>
                <p className="text-2xl font-bold text-gray-400">{dismissedCount}</p>
              </div>
            </div>
            <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-linear-to-r from-gray-500 to-slate-500 rounded-full transition-all duration-500"
                style={{ width: `${(dismissedCount / bugReports.length) * 100 || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search reports by user, email, issue, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1">
                {(['all', 'pending', 'resolved', 'dismissed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterStatus === status
                        ? status === 'pending' 
                          ? 'bg-linear-to-r from-yellow-500/20 to-orange-500/10 text-yellow-400 border border-yellow-500/20' 
                          : status === 'resolved'
                          ? 'bg-linear-to-r from-green-500/20 to-emerald-500/10 text-green-400 border border-green-500/20'
                          : status === 'dismissed'
                          ? 'bg-linear-to-r from-gray-500/20 to-slate-500/10 text-gray-400 border border-gray-500/20'
                          : 'bg-linear-to-r from-indigo-500/20 to-purple-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                    {status !== 'all' && (
                      <span className="ml-2 text-xs">
                        {status === 'pending' ? pendingCount : status === 'resolved' ? resolvedCount : dismissedCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button className="flex items-center gap-2 px-4 py-3 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity shadow-lg">
                <Filter className="w-4 h-4" />
                Advanced Filters
              </button>
            </div>
          </div>
        </div>

        {/* Bug Reports Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredReports.map((report) => {
            const statusColor = getStatusColor(report.status);
            return (
              <div key={report._id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:border-indigo-500/30 transition-all overflow-hidden group">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full ${statusColor.bg} ${statusColor.text} ${statusColor.border} border text-xs font-semibold`}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(report.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="mt-2 text-xs font-mono text-gray-500">
                        ID: #{report._id.slice(-8)}
                      </div>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/5 rounded-lg">
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg">
                      {report.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{report.user_name}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Mail className="w-3 h-3" />
                          {report.user_email}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Phone className="w-3 h-3" />
                          {report.phone}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Issue Preview */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-300 line-clamp-3">{report.issue}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <button
                      onClick={() => {
                        setSelectedBugReport(report);
                        setShowBugReportModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    
                    {report.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDismiss(report._id)}
                          className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBugReport(report);
                            setShowBugReportModal(true);
                          }}
                          className="px-4 py-2 text-sm font-medium bg-linear-to-r from-green-600 to-emerald-700 text-white rounded-lg hover:opacity-90 transition-opacity shadow-lg"
                        >
                          Resolve
                        </button>
                      </div>
                    ) : report.status === 'resolved' ? (
                      <div className="flex items-center gap-2 text-sm text-emerald-400">
                        <CheckCircle className="w-4 h-4" />
                        Resolved
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Dismissed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredReports.length === 0 && (
          <div className="bg-linear-to-r from-gray-900/20 to-gray-800/20 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-linear-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bug className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No bug reports found</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              {searchQuery ? 'Try adjusting your search or filter criteria' : 'All bug reports have been processed. Great work!'}
            </p>
          </div>
        )}
      </main>

      {/* Bug Report Resolution Modal - Redesigned */}
      {showBugReportModal && selectedBugReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className={`p-6 border-b ${getStatusColor(selectedBugReport.status).border} bg-linear-to-r ${getStatusColor(selectedBugReport.status).gradient}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
                    <Bug className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Resolve Bug Report</h2>
                    <p className="text-gray-300 mt-1">Review and resolve the reported issue</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowBugReportModal(false);
                    setSelectedBugReport(null);
                    setResolutionNotes('');
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Report Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Report Summary */}
                  <div className="bg-linear-to-br from-blue-900/20 to-indigo-900/20 border border-blue-500/20 rounded-xl p-5">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-400" />
                      Issue Summary
                    </h3>
                    <p className="text-gray-300 whitespace-pre-line">{selectedBugReport.issue}</p>
                  </div>

                  {/* Resolution Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Resolution Notes (Optional)
                      </div>
                      <p className="text-xs text-gray-400 font-normal mt-1">
                        These notes will be included in the resolution email to the user
                      </p>
                    </label>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-white/10 bg-white/5 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400"
                      placeholder="Describe how the issue was resolved, steps taken, and any additional information for the user..."
                    />
                  </div>
                </div>

                {/* Right Column - User Info & Actions */}
                <div className="space-y-6">
                  {/* User Card */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                    <h3 className="font-semibold text-white mb-4">Reported By</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-14 h-14 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {selectedBugReport.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-white">{selectedBugReport.user_name}</div>
                        <div className="text-sm text-gray-400">{selectedBugReport.user_email}</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">{selectedBugReport.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {new Date(selectedBugReport.created_at).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {new Date(selectedBugReport.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-linear-to-br from-emerald-900/20 to-green-900/20 border border-emerald-500/20 rounded-xl p-5">
                    <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={handleMarkAsResolved}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-linear-to-r from-green-600 to-emerald-700 text-white rounded-xl hover:opacity-90 transition-opacity shadow-lg font-medium"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Mark as Resolved & Notify User
                      </button>
                      <button
                        onClick={() => handleDismiss(selectedBugReport._id)}
                        className="w-full px-4 py-3 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl transition-colors font-medium"
                      >
                        Dismiss Report
                      </button>
                      <button
                        onClick={() => {
                          setShowBugReportModal(false);
                          setSelectedBugReport(null);
                          setResolutionNotes('');
                        }}
                        className="w-full px-4 py-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Toast Notifications */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-linear-to-r from-green-600 to-emerald-700 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up">
            <CheckCircle className="w-6 h-6" />
            <div>
              <p className="font-medium">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-linear-to-r from-red-600 to-orange-700 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up">
            <AlertCircle className="w-6 h-6" />
            <div>
              <p className="font-medium">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}