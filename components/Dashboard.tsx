'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import ConsultationRequestModal from './ConsultationRequestModal';
import BugReportButton from './BugReportButton';
import TodaysDoses from './TodaysDoses';
import ComplaintForm from './ComplaintForm';
import NotificationBell from './NotificationBell';
import { 
  Pill, 
  AlertTriangle, 
  FileText, 
  User, 
  LogOut,
  Shield,
  Activity,
  Stethoscope,
  MessageSquare,
  HeartPulse,
  Bell,
  Search,
  Clock,
  ChevronRight,
  Award,
  Brain,
  Settings,
  PlusCircle,
  BarChart3 // Changed from ChartBar to BarChart3
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [consultationMedicine, setConsultationMedicine] = useState('');
  const [myConsultations, setMyConsultations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [dashboardStats, setDashboardStats] = useState({
    medicines_tracked: 0,
    interaction_checks: 0,
    safe_combinations: 0,
    total_consultations: 0
  });
  
  // Admin-specific states
  const [adminTab, setAdminTab] = useState<'users' | 'editRequests' | 'complaints'>('users');
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [editRequests, setEditRequests] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [resolutionMessage, setResolutionMessage] = useState('');
  const [actionTaken, setActionTaken] = useState('No Action');
  
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        full_name: session.user.name || '',
        role: session.user.role || 'patient',
      });
      setLoading(false);
      fetchMyConsultations();
    }
  }, [status, session, router]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchMyConsultations = async () => {
    try {
      const [consultationsRes, statsRes] = await Promise.all([
        fetch('/api/consultations/my-consultations'),
        fetch('/api/patient/stats')
      ]);
      
      if (consultationsRes.ok) {
        const data = await consultationsRes.json();
        setMyConsultations(data.consultations || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setDashboardStats(data.stats || dashboardStats);
      }
    } catch (error) {
      console.error('Error fetching consultations:', error);
    }
  };

  const handleRequestConsultation = (medicineName?: string) => {
    setConsultationMedicine(medicineName || '');
    setShowConsultationModal(true);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  // Admin functions
  const loadAdminData = async () => {
    if (user?.role !== 'admin') return;
    
    try {
      if (adminTab === 'users') {
        const response = await fetch('/api/admin/users');
        if (response.ok) {
          const data = await response.json();
          // Map the users to match expected format
          const mappedUsers = (data.users || []).map((u: any) => ({
            id: u._id,
            name: u.full_name,
            email: u.email,
            phone: u.profile?.phone || null,
            role: u.role,
            isBlocked: u.isBlocked || false,
            blockedReason: u.blockedReason || null,
            blockedAt: u.blockedAt || null,
            createdAt: u.created_at,
          }));
          setAdminUsers(mappedUsers);
        }
      } else if (adminTab === 'editRequests') {
        const response = await fetch('/api/admin/edit-requests');
        if (response.ok) {
          const data = await response.json();
          setEditRequests(data.editRequests || []);
        }
      } else if (adminTab === 'complaints') {
        const response = await fetch('/api/admin/complaints');
        if (response.ok) {
          const data = await response.json();
          setComplaints(data.complaints || []);
        }
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminData();
    }
  }, [adminTab, user]);

  const handleBlockUser = async () => {
    if (!selectedUser || !blockReason.trim()) {
      alert('Please provide a reason for blocking');
      return;
    }

    try {
      const response = await fetch('/api/admin/block-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          blockReason: blockReason,
          adminId: user?.id || 'admin',
        }),
      });

      if (response.ok) {
        alert('User blocked successfully');
        setBlockModalOpen(false);
        setBlockReason('');
        loadAdminData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to block user');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Failed to block user');
    }
  };

  const handleUnblockUser = async (userId: string) => {
    if (!confirm('Are you sure you want to unblock this user?')) return;

    try {
      const response = await fetch('/api/admin/unblock-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        alert('User unblocked successfully');
        loadAdminData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to unblock user');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      alert('Failed to unblock user');
    }
  };

  const handleApproveEditRequest = async (requestId: string, action: 'approve' | 'block' | 'approve+block') => {
    const confirmMessage = action === 'block' 
      ? 'Block doctor and reject request?' 
      : action === 'approve+block'
      ? 'Approve changes and block doctor?'
      : 'Approve this edit request?';
    
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch('/api/admin/approve-edit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          adminId: user?.id || 'admin',
          action,
        }),
      });

      if (response.ok) {
        alert('Request processed successfully');
        loadAdminData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to process request');
      }
    } catch (error) {
      console.error('Error processing request:', error);
      alert('Failed to process request');
    }
  };

  const handleRejectEditRequest = async (requestId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const response = await fetch('/api/admin/reject-edit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          adminId: user?.id || 'admin',
          rejectionReason: reason,
        }),
      });

      if (response.ok) {
        alert('Request rejected successfully');
        loadAdminData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    }
  };

  const handleResolveComplaint = async () => {
    if (!selectedComplaint || !resolutionMessage.trim()) {
      alert('Please provide a resolution message');
      return;
    }

    try {
      const response = await fetch('/api/admin/resolve-complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintId: selectedComplaint._id,
          adminId: user?.id || 'admin',
          resolutionMessage,
          actionTaken,
        }),
      });

      if (response.ok) {
        alert('Complaint resolved successfully');
        setResolveModalOpen(false);
        setResolutionMessage('');
        loadAdminData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to resolve complaint');
      }
    } catch (error) {
      console.error('Error resolving complaint:', error);
      alert('Failed to resolve complaint');
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setShowSearchResults(false);
      return;
    }

    // Quick search suggestions
    const suggestions = [
      { type: 'feature', name: 'Drug Interaction Checker', icon: 'alert', path: '/interaction-checker' },
      { type: 'feature', name: 'AI Symptom Checker', icon: 'brain', path: '/symptom-checker' },
      { type: 'feature', name: 'Doctor Consultation', icon: 'stethoscope', path: '/consultations' },
      { type: 'feature', name: 'Health Profile', icon: 'user', path: '/profile' },
      { type: 'feature', name: 'Side Effect Predictor', icon: 'activity', path: '/side-effects' },
      { type: 'feature', name: 'Health Report', icon: 'file', path: '/health-report' },
    ];

    const filtered = suggestions.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(filtered);
    setShowSearchResults(true);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden">
      {/* Animated Medical Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#1e40af20_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,#7c3aed20_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(45deg,#333_1px,transparent_1px)] bg-size-[60px_60px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(-45deg,#333_1px,transparent_1px)] bg-size-[60px_60px]"></div>
        </div>

        {/* Floating Medical Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 border border-blue-500/10 rounded-full animate-float"></div>
          <div className="absolute bottom-20 right-20 w-56 h-56 border border-purple-500/10 rounded-full animate-float-delayed"></div>
          <div className="absolute top-1/3 right-1/4 w-40 h-40 border border-emerald-500/10 rounded-full animate-float-slow"></div>
          <div className="absolute bottom-1/3 left-1/4 w-32 h-32 border border-cyan-500/10 rounded-full animate-float-delayed-2"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-blue-500/5 rounded-full animate-pulse-slow"></div>
        </div>

        {/* Particle Effect */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/20 rounded-full animate-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* Logo & Brand */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black/30 backdrop-blur-sm rounded-xl flex items-center justify-center border border-cyan-500/30 shadow-lg shadow-blue-500/20 shrink-0">
                <img 
                  src="/Mediailogo.png" 
                  alt="MediAI Logo" 
                  className="w-10 h-10 sm:w-14 sm:h-14 object-contain"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent truncate">
                  MediAI
                </h1>
                <p className="hidden sm:block text-xs text-gray-400">Medical Intelligence Platform</p>
              </div>
            </div>

            {/* Search Bar */}
            <div ref={searchRef} className="hidden md:flex flex-1 max-w-md mx-8 relative">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchQuery && setShowSearchResults(true)}
                  placeholder="Search medicines, symptoms, doctors..."
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                />
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        router.push(result.path);
                        setShowSearchResults(false);
                        setSearchQuery('');
                      }}
                      className="px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          {result.icon === 'alert' && <AlertTriangle className="w-4 h-4 text-blue-400" />}
                          {result.icon === 'brain' && <Brain className="w-4 h-4 text-purple-400" />}
                          {result.icon === 'stethoscope' && <Stethoscope className="w-4 h-4 text-emerald-400" />}
                          {result.icon === 'user' && <User className="w-4 h-4 text-blue-400" />}
                          {result.icon === 'activity' && <Activity className="w-4 h-4 text-red-400" />}
                          {result.icon === 'file' && <FileText className="w-4 h-4 text-amber-400" />}
                        </div>
                        <div>
                          <p className="text-white font-medium">{result.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{result.type}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Notification Bell */}
                <NotificationBell />
                
                <div className="hidden lg:block text-right">
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className="text-xs text-gray-400">Patient</p>
                </div>
                <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5 text-gray-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-4xl font-bold mb-2 break-words">
            Welcome back, <span className="bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{user?.full_name}</span> 👋
          </h2>
          <p className="text-gray-400">
            {user?.role === 'admin' ? 'System Administration Dashboard' : 'Your AI-powered health companion for safe medication management'}
          </p>
        </div>

        {/* Admin Dashboard */}
        {user?.role === 'admin' ? (
          <div className="space-y-6">
            {/* Admin Tabs */}
            <div className="border-b border-white/10">
              <nav className="-mb-px flex gap-8 overflow-x-auto">
                <button
                  onClick={() => setAdminTab('users')}
                  className={`${
                    adminTab === 'users'
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
                  } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  Users & Doctors
                </button>
                <button
                  onClick={() => setAdminTab('editRequests')}
                  className={`${
                    adminTab === 'editRequests'
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
                  } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  Doctor Edit Requests
                </button>
                <button
                  onClick={() => setAdminTab('complaints')}
                  className={`${
                    adminTab === 'complaints'
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
                  } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  User Complaints
                </button>
              </nav>
            </div>

            {/* Users Tab */}
            {adminTab === 'users' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {adminUsers.map((adminUser: any) => (
                        <tr key={adminUser.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{adminUser.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{adminUser.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 capitalize">{adminUser.role}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {adminUser.isBlocked ? (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400 border border-red-500/50">
                                Blocked
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400 border border-green-500/50">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">
                            <div className="flex flex-wrap justify-end gap-2">
                            {adminUser.isBlocked ? (
                              <button
                                onClick={() => handleUnblockUser(adminUser.id)}
                                className="text-green-400 hover:text-green-300 transition-colors"
                              >
                                Unblock
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedUser(adminUser);
                                  setBlockModalOpen(true);
                                }}
                                className="text-red-400 hover:text-red-300 transition-colors"
                              >
                                Block
                              </button>
                            )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Edit Requests Tab */}
            {adminTab === 'editRequests' && (
              <div className="space-y-4">
                {editRequests.map((request: any) => (
                  <div key={request._id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Dr. {request.doctorName}</h3>
                        <p className="text-sm text-gray-400">{request.doctorEmail}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          request.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                            : request.status === 'approved'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-red-500/20 text-red-400 border border-red-500/50'
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <div className="border-t border-white/10 pt-4">
                      <h4 className="text-sm font-medium mb-2">Requested Changes:</h4>
                      <div className="bg-black/30 rounded-lg overflow-hidden">
                        <table className="min-w-full text-sm">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="px-3 py-2 text-left text-gray-400">Field</th>
                              <th className="px-3 py-2 text-left text-gray-400">Current</th>
                              <th className="px-3 py-2 text-left text-gray-400">New Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {request.requestedChanges.map((change: any, idx: number) => (
                              <tr key={idx} className="border-t border-white/10">
                                <td className="px-3 py-2 font-medium">{change.field}</td>
                                <td className="px-3 py-2 text-gray-400">{change.oldValue || 'N/A'}</td>
                                <td className="px-3 py-2 text-purple-400 font-medium">{change.newValue}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {request.status === 'pending' && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleApproveEditRequest(request._id, 'approve')}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproveEditRequest(request._id, 'approve+block')}
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                        >
                          Approve + Block
                        </button>
                        <button
                          onClick={() => handleRejectEditRequest(request._id)}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveEditRequest(request._id, 'block')}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          Block Doctor
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {editRequests.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    No edit requests found
                  </div>
                )}
              </div>
            )}

            {/* Complaints Tab */}
            {adminTab === 'complaints' && (
              <div className="space-y-4">
                {complaints.map((complaint: any) => (
                  <div key={complaint._id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Complaint #{complaint.complaintId}</h3>
                        <p className="text-sm text-gray-400">
                          {complaint.userName} vs Dr. {complaint.doctorName}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          complaint.status === 'under_review'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                            : complaint.status === 'resolved'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                        }`}
                      >
                        {complaint.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><strong className="text-gray-300">Issue Type:</strong> <span className="text-gray-400">{complaint.issueType}</span></p>
                      <p><strong className="text-gray-300">Description:</strong> <span className="text-gray-400">{complaint.description}</span></p>
                      {complaint.evidenceUrls?.length > 0 && (
                        <div>
                          <strong className="text-gray-300">Evidence:</strong>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {complaint.evidenceUrls.map((url: string, idx: number) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-300 underline"
                              >
                                File {idx + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {complaint.status === 'under_review' && (
                      <button
                        onClick={() => {
                          setSelectedComplaint(complaint);
                          setResolveModalOpen(true);
                        }}
                        className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      >
                        Resolve Complaint
                      </button>
                    )}
                  </div>
                ))}
                {complaints.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    No complaints found
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { 
              icon: Pill, 
              value: dashboardStats.medicines_tracked, 
              label: 'Medicines Tracked',
              color: 'from-blue-500 to-cyan-500',
              iconColor: 'text-blue-400'
            },
            { 
              icon: AlertTriangle, 
              value: dashboardStats.interaction_checks, 
              label: 'Interaction Checks',
              color: 'from-amber-500 to-orange-500',
              iconColor: 'text-amber-400'
            },
            { 
              icon: Shield, 
              value: dashboardStats.safe_combinations, 
              label: 'Safe Combinations',
              color: 'from-emerald-500 to-green-500',
              iconColor: 'text-emerald-400'
            },
            { 
              icon: Stethoscope, 
              value: dashboardStats.total_consultations, 
              label: 'Consultations',
              color: 'from-purple-500 to-pink-500',
              iconColor: 'text-purple-400'
            },
          ].map((stat, index) => (
            <div 
              key={index}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-linear-to-br ${stat.color} shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </div>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-linear-to-r ${stat.color} transition-all duration-1000`}
                  style={{ width: `${Math.min(100, (stat.value as number) * 20)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Today's Doses Section */}
        <div className="mb-8">
          <TodaysDoses />
        </div>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Quick Actions */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Quick Actions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Drug Interaction Checker */}
              <div 
                onClick={() => router.push('/interaction-checker')}
                className="relative group cursor-pointer overflow-hidden rounded-xl bg-linear-to-br from-blue-600/10 via-blue-500/5 to-cyan-500/10 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-1"
              >
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-12 h-12 bg-linear-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <AlertTriangle className="w-6 h-6 text-white" />
                      <div className="absolute inset-0 bg-blue-400 rounded-lg blur-xl opacity-0 group-hover:opacity-50 transition-opacity"></div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base mb-0.5">Drug Interaction Checker</h4>
                      <p className="text-xs text-gray-400">Check medicine compatibility</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {dashboardStats.medicines_tracked === 0 
                        ? 'Add medicines to start tracking'
                        : `${dashboardStats.interaction_checks} checks performed`}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>

              {/* AI Symptom Checker */}
              <div 
                onClick={() => router.push('/symptom-checker')}
                className="relative group cursor-pointer overflow-hidden rounded-xl bg-linear-to-br from-purple-600/10 via-purple-500/5 to-pink-500/10 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1"
              >
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-12 h-12 bg-linear-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Brain className="w-6 h-6 text-white" />
                      <div className="absolute inset-0 bg-purple-400 rounded-lg blur-xl opacity-0 group-hover:opacity-50 transition-opacity"></div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base mb-0.5">AI Symptom Checker</h4>
                      <p className="text-xs text-gray-400">Get AI-powered health insights</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Advanced symptom analysis</span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>

              {/* Doctor Consultation */}
              <div 
                onClick={() => handleRequestConsultation()}
                className="relative group cursor-pointer overflow-hidden rounded-xl bg-linear-to-br from-emerald-600/10 via-emerald-500/5 to-green-500/10 border border-emerald-500/20 hover:border-emerald-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-1"
              >
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-12 h-12 bg-linear-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Stethoscope className="w-6 h-6 text-white" />
                      <div className="absolute inset-0 bg-emerald-400 rounded-lg blur-xl opacity-0 group-hover:opacity-50 transition-opacity"></div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base mb-0.5">Doctor Consultation</h4>
                      <p className="text-xs text-gray-400">Get professional medical advice</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Starting at ₹500 per consultation</span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>

              {/* Health Report */}
              <div 
                onClick={() => router.push('/health-report')}
                className="relative group cursor-pointer overflow-hidden rounded-xl bg-linear-to-br from-amber-600/10 via-amber-500/5 to-orange-500/10 border border-amber-500/20 hover:border-amber-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20 hover:-translate-y-1"
              >
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-12 h-12 bg-linear-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <FileText className="w-6 h-6 text-white" />
                      <div className="absolute inset-0 bg-amber-400 rounded-lg blur-xl opacity-0 group-hover:opacity-50 transition-opacity"></div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base mb-0.5">Health Report</h4>
                      <p className="text-xs text-gray-400">Generate comprehensive PDF report</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">With charts and analysis</span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* My Consultations */}
            {myConsultations.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    Recent Consultations
                    <span className="ml-2 px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm font-semibold border border-blue-500/20">
                      {myConsultations.length}
                    </span>
                  </h3>
                  <Link
                    href="/consultations"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-xl transition-all text-sm font-medium group"
                  >
                    View All
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
                <div className="space-y-4">
                  {myConsultations.slice(0, 3).map((consultation) => (
                    <div 
                      key={consultation._id} 
                      className="bg-linear-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-white/20 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group"
                    >
                      {/* Header with Medicine Name and Status */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-9 h-9 bg-linear-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center border border-purple-500/30 shrink-0">
                            <Pill className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-white group-hover:text-blue-300 transition-colors truncate" title={consultation.medicine_name}>
                              {consultation.medicine_name}
                            </h4>
                            <p className="text-xs text-gray-500">Consultation Request</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0 ${
                          consultation.status === 'completed' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : consultation.status === 'accepted'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : consultation.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                        }`}>
                          {consultation.status === 'accepted' ? '✓ Accepted' : 
                           consultation.status === 'completed' ? '✓ Completed' :
                           consultation.status === 'pending' ? '⏳ Pending' :
                           consultation.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Concern Type Badge */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
                          {consultation.concern_type.toLowerCase().includes('interaction') ? (
                            <AlertTriangle className="w-4 h-4 text-orange-400" />
                          ) : consultation.concern_type.toLowerCase().includes('side') ? (
                            <Activity className="w-4 h-4 text-red-400" />
                          ) : (
                            <Stethoscope className="w-4 h-4 text-blue-400" />
                          )}
                          <span className="text-sm font-medium text-gray-300">{consultation.concern_type}</span>
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Submitted</p>
                            <p className="text-sm font-medium text-gray-300">
                              {new Date(consultation.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        {consultation.doctor_name && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <Stethoscope className="w-4 h-4 text-emerald-400" />
                            <div>
                              <p className="text-xs text-emerald-500">Doctor</p>
                              <p className="text-sm font-semibold text-emerald-300">Dr. {consultation.doctor_name}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Meeting ID for accepted/completed consultations */}
                      {consultation.doctor_id && (consultation.status === 'accepted' || consultation.status === 'completed') && (
                        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-blue-400" />
                              <span className="text-xs font-medium text-blue-300">Meeting ID</span>
                            </div>
                            <code className="text-sm font-mono font-semibold text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                              {consultation.doctor_id}
                            </code>
                          </div>
                        </div>
                      )}

                      {/* Doctor Response */}
                      {consultation.doctor_response && (
                        <div className="mt-4 p-4 bg-linear-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                              <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <p className="text-sm font-semibold text-emerald-300">Doctor's Response</p>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed pl-8">{consultation.doctor_response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {myConsultations.length > 3 && (
                  <div className="mt-6 text-center">
                    <Link
                      href="/consultations"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/30 rounded-xl text-blue-300 transition-all text-sm font-medium group"
                    >
                      View {myConsultations.length - 3} more consultation{myConsultations.length - 3 !== 1 ? 's' : ''}
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Additional Features */}
          <div>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-400" />
              Health Tools
            </h3>

            <div className="space-y-4">
              {/* Health Profile */}
              <div 
                onClick={() => router.push('/profile')}
                className="relative group cursor-pointer overflow-hidden rounded-xl bg-linear-to-br from-blue-600/10 via-blue-500/5 to-purple-500/10 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-1"
              >
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-12 h-12 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <User className="w-6 h-6 text-white" />
                      <div className="absolute inset-0 bg-blue-400 rounded-lg blur-xl opacity-0 group-hover:opacity-50 transition-opacity"></div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base mb-0.5">Health Profile</h4>
                      <p className="text-xs text-gray-400">Manage medical history</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Update allergies, conditions, and personal information
                  </p>
                  <div className="flex items-center text-blue-400 text-sm font-semibold group-hover:gap-2 transition-all">
                    Update Profile
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Side Effect Predictor */}
              <div 
                onClick={() => router.push('/side-effects')}
                className="relative group cursor-pointer overflow-hidden rounded-xl bg-linear-to-br from-red-600/10 via-red-500/5 to-pink-500/10 border border-red-500/20 hover:border-red-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20 hover:-translate-y-1"
              >
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-12 h-12 bg-linear-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Activity className="w-6 h-6 text-white" />
                      <div className="absolute inset-0 bg-red-400 rounded-lg blur-xl opacity-0 group-hover:opacity-50 transition-opacity"></div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base mb-0.5">Side Effect Predictor</h4>
                      <p className="text-xs text-gray-400">AI-powered predictions</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Get insights on potential medication side effects
                  </p>
                  <div className="flex items-center text-red-400 text-sm font-semibold group-hover:gap-2 transition-all">
                    Predict Side Effects
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Medicine Tracker */}
              <div 
                onClick={() => router.push('/medicines')}
                className="relative group cursor-pointer overflow-hidden rounded-xl bg-linear-to-br from-green-600/10 via-green-500/5 to-emerald-500/10 border border-green-500/20 hover:border-green-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-1"
              >
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-12 h-12 bg-linear-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Pill className="w-6 h-6 text-white" />
                      <div className="absolute inset-0 bg-green-400 rounded-lg blur-xl opacity-0 group-hover:opacity-50 transition-opacity"></div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base mb-0.5">Medicine Tracker</h4>
                      <p className="text-xs text-gray-400">Track your medications</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3 px-3 py-2 bg-white/5 rounded-lg">
                    <span className="text-xs text-gray-400">Active Medicines</span>
                    <span className="text-lg font-bold text-green-400">{dashboardStats.medicines_tracked}</span>
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-linear-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 border border-green-500/30 rounded-lg text-sm font-semibold transition-all group-hover:border-green-400/50">
                    <PlusCircle className="w-4 h-4" />
                    Add New Medicine
                  </button>
                </div>
              </div>


            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 bg-linear-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 border-t border-white/10 rounded-t-3xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* About */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <img src="/Mediailogo.png" alt="MediAI" className="w-8 h-8 object-contain" />
                  </div>
                  <h3 className="text-xl font-bold">
                    <span className="text-blue-400">Medi</span>
                    <span className="text-purple-400">AI</span>
                  </h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Advanced AI-powered healthcare platform for safe medication management and clinical decision support.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="font-semibold text-white mb-4">Quick Links</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/dashboard" className="text-gray-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1 group">
                      <span>Dashboard</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/medicines" className="text-gray-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1 group">
                      <span>Medicine Tracker</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/symptom-checker" className="text-gray-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1 group">
                      <span>Symptom Checker</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/consultations" className="text-gray-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1 group">
                      <span>Consultations</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                  </li>
                </ul>
              </div>

              {/* AI Tools */}
              <div>
                <h4 className="font-semibold text-white mb-4">AI Tools</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/interaction-checker" className="text-gray-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1 group">
                      <span>Drug Interaction Checker</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/side-effects" className="text-gray-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1 group">
                      <span>Side Effect Predictor</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/health-report" className="text-gray-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1 group">
                      <span>Health Report</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                  </li>
                  <li>
                    <Link href="/doctors" className="text-gray-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1 group">
                      <span>Find Doctors</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Contact & Support */}
              <div>
                <h4 className="font-semibold text-white mb-4">Support</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/profile" className="text-gray-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1 group">
                      <span>Health Profile</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                  </li>
                  <li>
                    <a href="mailto:support@mediai.com" className="text-gray-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1 group">
                      <span>Contact Support</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </a>
                  </li>
                  <li><span className="text-gray-400">Emergency: 911</span></li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-400">
                &copy; {new Date().getFullYear()} MediAI. All rights reserved.
              </p>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <Link href="#" className="hover:text-blue-400 transition-colors inline-flex items-center gap-1 group">
                  <span>Privacy Policy</span>
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
                <Link href="#" className="hover:text-blue-400 transition-colors inline-flex items-center gap-1 group">
                  <span>Terms of Service</span>
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
                <Link href="#" className="hover:text-blue-400 transition-colors inline-flex items-center gap-1 group">
                  <span>HIPAA Compliance</span>
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
              </div>
            </div>
          </div>
        </footer>

        {/* Submit Complaint Button */}
        {user && (
          <ComplaintForm
            userId={user.id}
            userName={user.full_name}
            userEmail={user.email}
            userPhone=""
          />
        )}
        </>
        )}
      </div>

      {/* Block User Modal */}
      {blockModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Block User</h2>
            <p className="text-sm text-gray-400 mb-4">
              User: {selectedUser?.name} ({selectedUser?.email})
            </p>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Provide a reason for blocking this user..."
              className="w-full bg-black/30 border border-white/10 rounded-lg p-3 mb-4 h-24 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleBlockUser}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Block User
              </button>
              <button
                onClick={() => {
                  setBlockModalOpen(false);
                  setBlockReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Complaint Modal */}
      {resolveModalOpen && selectedComplaint && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Resolve Complaint</h2>
            <p className="text-sm text-gray-400 mb-4">
              Complaint #{selectedComplaint.complaintId}
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Action Taken
              </label>
              <select
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="No Action">No Action</option>
                <option value="Warning Issued">Warning Issued</option>
                <option value="Blocked Doctor">Blocked Doctor</option>
                <option value="Refund Processed">Refund Processed</option>
                <option value="Education Provided">Education Provided</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <textarea
              value={resolutionMessage}
              onChange={(e) => setResolutionMessage(e.target.value)}
              placeholder="Provide a resolution message to the user..."
              className="w-full bg-black/30 border border-white/10 rounded-lg p-3 mb-4 h-32 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            
            <div className="flex gap-2">
              <button
                onClick={handleResolveComplaint}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Resolve
              </button>
              <button
                onClick={() => {
                  setResolveModalOpen(false);
                  setResolutionMessage('');
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consultation Request Modal */}
      <ConsultationRequestModal
        isOpen={showConsultationModal}
        onClose={() => {
          setShowConsultationModal(false);
          fetchMyConsultations();
        }}
        medicineName={consultationMedicine}
        patientName={user?.full_name || ''}
      />

      {/* Bug Report Button */}
      <BugReportButton />

      {/* Animation Styles */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-40px) rotate(180deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(60px) rotate(-180deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.2); }
        }
        @keyframes float-delayed-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(40px) rotate(90deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.05); }
        }
        @keyframes particle {
          0% { transform: translateY(0px) translateX(0px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
        }
        
        .animate-float { animation: float 25s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 30s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 35s ease-in-out infinite; }
        .animate-float-delayed-2 { animation: float-delayed-2 28s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-particle { animation: particle linear infinite; }
      `}</style>
    </div>
  );
}
