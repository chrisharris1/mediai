'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, FileText, User, Loader2, Eye } from 'lucide-react';

interface DoctorApplication {
  _id: string;
  full_name: string;
  email: string;
  phone: string;
  specialization: string;
  years_of_experience: number;
  medical_license_number: string;
  medical_degree: string;
  medical_school: string;
  graduation_year: number;
  consultation_fee: number;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  documents: {
    medical_certificate: string;
    license_document: string;
    identity_proof: string;
    clinic_registration: string;
  };
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<DoctorApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<DoctorApplication | null>(null);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      // Check if user is admin
      if ((session.user as any).email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        router.push('/dashboard');
      } else {
        fetchApplications();
      }
    }
  }, [status, session, router]);

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/admin/doctor-applications');
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId: string) => {
    if (!confirm('Are you sure you want to approve this doctor?')) return;
    
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/approve-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, action: 'approve' }),
      });

      if (res.ok) {
        alert('Doctor approved successfully!');
        fetchApplications();
        setSelectedApp(null);
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to approve doctor');
      }
    } catch (error) {
      console.error('Error approving doctor:', error);
      alert('Error approving doctor');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (applicationId: string) => {
    const reason = prompt('Reason for rejection by MediAI Team (Optional - Press OK to skip or Enter to provide reason):');
    // Allow empty string or null (user can skip)

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/approve-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          applicationId, 
          action: 'reject', 
          reason: reason && reason.trim() ? reason.trim() : undefined 
        }),
      });

      if (res.ok) {
        alert('Doctor application rejected');
        fetchApplications();
        setSelectedApp(null);
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to reject application');
      }
    } catch (error) {
      console.error('Error rejecting doctor:', error);
      alert('Error rejecting application');
    } finally {
      setProcessing(false);
    }
  };

  const filteredApps = applications.filter(app => 
    filter === 'all' ? true : app.status === filter
  );

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Manage doctor applications</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
              </div>
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {applications.filter(a => a.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-10 h-10 text-yellow-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {applications.filter(a => a.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {applications.filter(a => a.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f} ({applications.filter(a => f === 'all' || a.status === f).length})
              </button>
            ))}
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Experience</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApps.map((app) => (
                  <tr key={app._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{app.full_name}</div>
                        <div className="text-sm text-gray-500">{app.email}</div>
                        <div className="text-xs text-gray-400">{app.medical_license_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{app.specialization}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{app.years_of_experience} years</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(app.applied_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        app.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
                      >
                        <Eye className="w-4 h-4 inline" /> View
                      </button>
                      {app.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(app._id)}
                            disabled={processing}
                            className="text-green-600 hover:text-green-900 font-medium text-sm disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(app._id)}
                            disabled={processing}
                            className="text-red-600 hover:text-red-900 font-medium text-sm disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Details Modal */}
        {selectedApp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Doctor Application Details</h2>
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Personal Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div><span className="text-gray-600">Name:</span> {selectedApp.full_name}</div>
                      <div><span className="text-gray-600">Email:</span> {selectedApp.email}</div>
                      <div><span className="text-gray-600">Phone:</span> {selectedApp.phone}</div>
                      <div><span className="text-gray-600">License:</span> {selectedApp.medical_license_number}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Professional Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div><span className="text-gray-600">Specialization:</span> {selectedApp.specialization}</div>
                      <div><span className="text-gray-600">Experience:</span> {selectedApp.years_of_experience} years</div>
                      <div><span className="text-gray-600">Degree:</span> {selectedApp.medical_degree}</div>
                      <div><span className="text-gray-600">Medical School:</span> {selectedApp.medical_school}</div>
                      <div><span className="text-gray-600">Graduation:</span> {selectedApp.graduation_year}</div>
                      <div><span className="text-gray-600">Consultation Fee:</span> ₹{selectedApp.consultation_fee}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Documents</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        Medical Certificate: {selectedApp.documents.medical_certificate || 'Not uploaded'}
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        License Document: {selectedApp.documents.license_document || 'Not uploaded'}
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        Identity Proof: {selectedApp.documents.identity_proof || 'Not uploaded'}
                      </div>
                    </div>
                  </div>

                  {selectedApp.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                      <button
                        onClick={() => handleApprove(selectedApp._id)}
                        disabled={processing}
                        className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {processing ? 'Processing...' : 'Approve Doctor'}
                      </button>
                      <button
                        onClick={() => handleReject(selectedApp._id)}
                        disabled={processing}
                        className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject Application
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

