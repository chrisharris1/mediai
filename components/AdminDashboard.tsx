'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NotificationBell from './NotificationBell';
import { Users, UserCheck, Stethoscope, Activity, Settings, Shield, LogOut, Search, X, FileText, CheckCircle, XCircle, Bug, AlertCircle, Bell, TrendingUp, BarChart3, Filter, ChevronRight, Eye, Download, Calendar, Phone, Mail, Award, Building, Clock } from 'lucide-react';

interface User {
  _id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface BugReport {
  _id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  name: string;
  phone: string;
  issue: string;
  status: 'pending' | 'resolved';
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

interface Stats {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  activeUsers: number;
}

interface DoctorDetails {
  status: string;
  _id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  medical_license_number: string;
  specialization: string;
  years_of_experience: number;
  medical_degree: string;
  medical_school: string;
  graduation_year: number;
  has_clinic: boolean;
  clinic_name?: string;
  clinic_address?: string;
  hospital_affiliations?: string;
  consultation_fee: number;
  documents: {
    medical_certificate?: string;
    license_document?: string;
    identity_proof?: string;
    clinic_registration?: string;
  };
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [resolutionMessage, setResolutionMessage] = useState('');
  const [actionTaken, setActionTaken] = useState('No Action');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorDetails | null>(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPatients: 0,
    totalDoctors: 0,
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'doctors' | 'reports' | 'pending' | 'complaints'>('users');
  const [userFilter, setUserFilter] = useState<'all' | 'patients' | 'doctors'>('all');

  useEffect(() => {
    loadDashboardData();
    loadBugReports();
    loadComplaints();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('🔍 Loading admin dashboard data...');
      
      const res = await fetch('/api/admin/users');
      
      console.log('📡 API Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ API Response data:', data);
        
        setUsers(data.users || []);
        setStats({
          totalUsers: data.stats.totalUsers || 0,
          totalPatients: data.stats.totalPatients || 0,
          totalDoctors: data.stats.totalDoctors || 0,
          activeUsers: data.stats.activeUsers || 0,
        });
        
        console.log('📊 Updated stats:', {
          totalUsers: data.stats.totalUsers,
          totalPatients: data.stats.totalPatients,
          totalDoctors: data.stats.totalDoctors,
          activeUsers: data.stats.activeUsers,
        });
      } else {
        const errorData = await res.json();
        console.error('❌ Failed to load admin data:', errorData);
        alert(`Failed to load data: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error);
      alert('Error loading dashboard data. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'toggle_active' }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        loadDashboardData(); // Reload data
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user status');
    }
  };

  const handleApproveDoctor = async (userId: string) => {
    if (!confirm('Are you sure you want to approve this doctor?')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'approve_doctor' }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setSuccessMessage(data.message || 'Doctor approved successfully! Email notification sent.');
        setTimeout(() => setSuccessMessage(''), 5000);
        setShowDoctorModal(false);
        setSelectedDoctor(null);
        loadDashboardData();
      } else {
        setErrorMessage(data.message || 'Failed to approve doctor');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error: any) {
      console.error('Error approving doctor:', error);
      setErrorMessage('Network error: Failed to approve doctor');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleRejectDoctor = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this doctor application?')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'reject_doctor' }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setSuccessMessage(data.message || 'Doctor application rejected. Notification sent.');
        setTimeout(() => setSuccessMessage(''), 5000);
        setShowDoctorModal(false);
        setSelectedDoctor(null);
        loadDashboardData();
      } else {
        setErrorMessage(data.message || 'Failed to reject doctor');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error: any) {
      console.error('Error rejecting doctor:', error);
      setErrorMessage('Network error: Failed to reject doctor');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleViewDoctorDetails = async (userId: string) => {
    console.log('🔍 handleViewDoctorDetails called with userId:', userId);
    console.log('🔍 UserId type:', typeof userId);
    console.log('🔍 UserId length:', userId.length);
    try {
      const res = await fetch(`/api/admin/doctor-details?userId=${userId}`);
      
      console.log('📡 Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('📊 Doctor data received from API:', data.doctor);
        console.log('✅ Setting selectedDoctor state...');
        setSelectedDoctor(data.doctor);
        console.log('✅ Setting showDoctorModal to true...');
        setShowDoctorModal(true);
        console.log('✅ Modal state updated!');
      } else {
        const error = await res.json();
        console.error('❌ API returned error:', error);
        setErrorMessage(error.message || 'Failed to load doctor details');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error: any) {
      console.error('❌ Error loading doctor details:', error);
      setErrorMessage('Network error: Failed to load doctor details');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const loadBugReports = async () => {
    try {
      const res = await fetch('/api/admin/bug-reports');
      if (res.ok) {
        const data = await res.json();
        setBugReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error loading bug reports:', error);
    }
  };

  const loadComplaints = async () => {
    try {
      const res = await fetch('/api/admin/complaints');
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
      }
    } catch (error) {
      console.error('Error loading complaints:', error);
    }
  };

  const handleResolveComplaint = async () => {
    if (!selectedComplaint || !resolutionMessage.trim()) {
      setErrorMessage('Please provide a resolution message');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    try {
      const response = await fetch('/api/admin/resolve-complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintId: selectedComplaint._id,
          adminId: session?.user?.id || 'admin',
          resolutionMessage,
          actionTaken,
        }),
      });

      if (response.ok) {
        setSuccessMessage('Complaint resolved successfully');
        setTimeout(() => setSuccessMessage(''), 5000);
        setShowComplaintModal(false);
        setSelectedComplaint(null);
        setResolutionMessage('');
        setActionTaken('No Action');
        loadComplaints();
      } else {
        const data = await response.json();
        setErrorMessage(data.error || 'Failed to resolve complaint');
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error resolving complaint:', error);
      setErrorMessage('Failed to resolve complaint');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleViewUserDetails = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/user-details?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        // Map API response to User interface
        const userDetails: User = {
          _id: data.user.id || userId,
          email: data.user.email || '',
          full_name: data.user.name || 'N/A',
          role: data.user.role || 'patient',
          is_active: !data.user.isBlocked,
          created_at: data.user.createdAt || new Date().toISOString(),
        };
        setSelectedUser(userDetails);
        setShowUserModal(true);
      } else {
        setErrorMessage('Failed to load user details');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      setErrorMessage('Error loading user details');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'users') {
      if (userFilter === 'patients') return matchesSearch && user.role === 'patient';
      if (userFilter === 'doctors') return matchesSearch && user.role === 'doctor';
      return matchesSearch && (user.role === 'patient' || user.role === 'admin');
    }
    if (activeTab === 'doctors') return matchesSearch && user.role === 'doctor';
    return matchesSearch;
  });

  const pendingDoctors = users.filter(u => u.role === 'pending_doctor');
  const pendingBugReports = bugReports.filter(r => r.status === 'pending');
  const doctors = users.filter(u => u.role === 'doctor');
  const patients = users.filter(u => u.role === 'patient');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Enhanced Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-linear-to-br from-gray-900 via-black to-gray-900">
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#1e40af20_0%,transparent_50%)] animate-pulse"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,#7c3aed20_0%,transparent_50%)] animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute inset-0 bg-[linear-gradient(45deg,#333_1px,transparent_1px)] bg-size-[60px_60px]"></div>
            <div className="absolute inset-0 bg-[linear-gradient(-45deg,#333_1px,transparent_1px)] bg-size-[60px_60px]"></div>
          </div>

          {/* Floating Medical Elements */}
          <div className="absolute inset-0">
            {/* DNA Helix Animation */}
            <div className="absolute top-1/2 left-1/4 transform -translate-y-1/2 opacity-20">
              <div className="relative w-48 h-96">
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-linear-to-b from-red-500/30 via-transparent to-purple-500/30 animate-dna"></div>
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-0.5 bg-red-400/30 rounded-full animate-dna-node"
                    style={{
                      left: '50%',
                      top: `${i * 20}px`,
                      transform: `translateX(${i % 2 === 0 ? '-16px' : '16px'})`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Floating Circles */}
            <div className="absolute top-20 left-20 w-72 h-72 border border-red-500/10 rounded-full animate-float"></div>
            <div className="absolute bottom-20 right-20 w-56 h-56 border border-purple-500/10 rounded-full animate-float-delayed"></div>
            <div className="absolute top-1/3 right-1/4 w-40 h-40 border border-blue-500/10 rounded-full animate-float-slow"></div>
            <div className="absolute bottom-1/3 left-1/4 w-32 h-32 border border-cyan-500/10 rounded-full animate-float-delayed-2"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-red-500/5 rounded-full animate-pulse-slow"></div>

            {/* Particle Effect */}
            <div className="absolute inset-0">
              {[...Array(100)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-red-400/20 rounded-full animate-particle"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationDuration: `${3 + Math.random() * 4}s`
                  }}
                />
              ))}
            </div>

            {/* Medical Cross Animation */}
            <div className="absolute top-1/4 right-1/4 opacity-10">
              <div className="relative w-32 h-32 animate-pulse-slow">
                <div className="absolute top-1/2 left-0 right-0 h-2 bg-red-500/30 rounded-full"></div>
                <div className="absolute left-1/2 top-0 bottom-0 w-2 bg-red-500/30 rounded-full"></div>
              </div>
            </div>

            {/* Wave Pattern */}
            <div className="absolute bottom-0 left-0 right-0 h-32 opacity-5">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent animate-wave"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
          <div className="bg-red-500/10 backdrop-blur-lg border border-red-500/30 rounded-xl p-4 shadow-2xl shadow-red-500/20">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-200 font-medium">{errorMessage}</p>
              <button 
                onClick={() => setErrorMessage('')}
                className="ml-auto text-red-300 hover:text-red-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
          <div className="bg-emerald-500/10 backdrop-blur-lg border border-emerald-500/30 rounded-xl p-4 shadow-2xl shadow-emerald-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-200 font-medium">{successMessage}</p>
              <button 
                onClick={() => setSuccessMessage('')}
                className="ml-auto text-emerald-300 hover:text-emerald-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* Logo & Brand */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black/30 backdrop-blur-sm rounded-xl flex items-center justify-center border border-red-500/30 shadow-lg shadow-red-500/20 shrink-0">
                <img 
                  src="/Mediailogo.png" 
                  alt="MediAI Logo" 
                  className="w-10 h-10 sm:w-14 sm:h-14 object-contain"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold bg-linear-to-br from-red-400 to-red-300 bg-clip-text text-transparent truncate">
                  MediAI Admin
                </h1>
                <p className="hidden sm:block text-xs text-gray-400">System Administration Panel</p>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button className="p-2 hover:bg-white/5 rounded-lg transition-colors relative">
                <Bell className="w-5 h-5 text-gray-300" />
                {(pendingDoctors.length > 0 || pendingBugReports.length > 0) && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-ping">
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"></span>
                  </span>
                )}
              </button>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden lg:block text-right">
                  <p className="text-sm font-medium">{session?.user?.email}</p>
                  <p className="text-xs text-gray-400">Administrator</p>
                </div>
                <div className="w-10 h-10 bg-linear-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                  <div className="text-lg font-bold">A</div>
                </div>
                
                {/* Notification Bell */}
                <NotificationBell />
                
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5 text-gray-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="mb-8 animate-fade-in-up">
          <div className="bg-linear-to-br from-red-500/10 via-red-600/10 to-red-700/10 border border-red-500/20 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-3xl font-bold mb-2">
              System Administration Dashboard
            </h2>
            <p className="text-gray-300">
              Manage users, verify doctors, and monitor system health
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { 
              icon: Users, 
              value: stats.totalUsers, 
              label: 'Total Users',
              color: 'from-blue-500 to-cyan-500',
            },
            { 
              icon: UserCheck, 
              value: stats.totalPatients, 
              label: 'Patients',
              color: 'from-emerald-500 to-green-500',
            },
            { 
              icon: Stethoscope, 
              value: stats.totalDoctors, 
              label: 'Doctors',
              color: 'from-purple-500 to-pink-500',
            },
            { 
              icon: Activity, 
              value: stats.activeUsers, 
              label: 'Active Users',
              color: 'from-amber-500 to-orange-500',
            },
          ].map((stat, index) => (
            <div 
              key={index}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-linear-to-br ${stat.color} shadow-lg animate-pulse`} style={{animationDelay: `${index * 0.2}s`}}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </div>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-linear-to-br ${stat.color} transition-all duration-1000`}
                  style={{ width: `${Math.min(100, (stat.value as number) * 10)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button 
              onClick={() => setActiveTab('users')}
              className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group hover:scale-[1.02]"
            >
              <div className="w-10 h-10 bg-linear-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Patient Management</p>
                <p className="text-xs text-gray-400">Manage patient accounts</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-blue-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={() => setActiveTab('doctors')}
              className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group hover:scale-[1.02] relative"
            >
              <div className="w-10 h-10 bg-linear-to-br from-emerald-500/20 to-green-500/20 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Doctor Management</p>
                <p className="text-xs text-gray-400">Manage verified doctors</p>
              </div>
              {doctors.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {doctors.length}
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button 
              onClick={() => router.push('/admin/bug-reports')}
              className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group hover:scale-[1.02] relative"
            >
              <div className="w-10 h-10 bg-linear-to-br from-amber-500/20 to-orange-500/20 rounded-lg flex items-center justify-center">
                <Bug className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Bug Reports</p>
                <p className="text-xs text-gray-400">Review system issues</p>
              </div>
              {pendingBugReports.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                  {pendingBugReports.length}
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-amber-400 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button 
              onClick={() => setShowSystemSettings(true)}
              className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group hover:scale-[1.02]"
            >
              <div className="w-10 h-10 bg-linear-to-br from-gray-500/20 to-slate-500/20 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">System Settings</p>
                <p className="text-xs text-gray-400">Configure platform</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-gray-300 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* User Management Section */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden animate-fade-in-up" style={{animationDelay: '0.5s'}}>
          {/* Header with Search */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400 animate-pulse" />
                User Management
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'users'
                    ? 'bg-linear-to-br from-blue-500 to-cyan-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="w-5 h-5" />
                Patients ({patients.length})
              </button>
              <button
                onClick={() => setActiveTab('doctors')}
                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'doctors'
                    ? 'bg-linear-to-br from-emerald-500 to-green-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Stethoscope className="w-5 h-5" />
                Doctors ({doctors.length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  activeTab === 'pending'
                    ? 'bg-linear-to-br from-purple-500 to-pink-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Pending Doctors ({pendingDoctors.length})
                {pendingDoctors.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {pendingDoctors.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('complaints')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  activeTab === 'complaints'
                    ? 'bg-linear-to-br from-red-500 to-orange-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                User Complaints ({complaints.filter(c => c.status === 'under_review').length})
                {complaints.filter(c => c.status === 'under_review').length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {complaints.filter(c => c.status === 'under_review').length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Users/Patients Table */}
          {(activeTab === 'users' || activeTab === 'doctors') && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                      {activeTab === 'doctors' ? 'Doctor' : 'User'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Joined</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr 
                      key={user._id} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'doctor'
                            ? 'bg-linear-to-br from-emerald-500/20 to-green-500/10 text-emerald-400 border border-emerald-500/30'
                            : user.role === 'pending_doctor'
                            ? 'bg-linear-to-br from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/30'
                            : user.role === 'admin'
                            ? 'bg-linear-to-br from-red-500/20 to-red-600/10 text-red-400 border border-red-500/30'
                            : 'bg-linear-to-br from-blue-500/20 to-cyan-500/10 text-blue-400 border border-blue-500/30'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.is_active
                            ? 'bg-linear-to-br from-emerald-500/20 to-green-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-linear-to-br from-red-500/20 to-red-600/10 text-red-400 border border-red-500/30'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4">
                        {user.role === 'pending_doctor' ? (
                          <button 
                            onClick={() => handleViewDoctorDetails(user._id)}
                            className="px-3 py-1.5 bg-linear-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg text-sm font-medium transition-all"
                          >
                            Review Application
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                if (user.role === 'doctor') {
                                  handleViewDoctorDetails(user._id);
                                } else {
                                  handleViewUserDetails(user._id);
                                }
                              }}
                              className="px-3 py-1.5 bg-linear-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                            <button 
                              onClick={() => handleToggleUserStatus(user._id, user.is_active)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                user.is_active
                                  ? 'bg-linear-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white'
                                  : 'bg-linear-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white'
                              }`}
                            >
                              {user.is_active ? 'Block' : 'Unblock'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-12 animate-pulse">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
                  <p className="text-gray-400">No users found</p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Pending Doctors Tab */}
          {activeTab === 'pending' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Doctor</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Specialization</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Applied Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDoctors.map((user, index) => (
                    <tr 
                      key={user._id} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {user.full_name}
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-xs">
                              NEW
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-300">
                          {(user as any).specialization || 'Not specified'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-linear-to-br from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3 animate-pulse" />
                          Pending Review
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button 
                          onClick={() => handleViewDoctorDetails(user._id)}
                          className="px-4 py-2 bg-linear-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20"
                        >
                          <Eye className="w-4 h-4" />
                          Review Application
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {pendingDoctors.length === 0 && (
                <div className="text-center py-12 animate-pulse">
                  <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
                  <p className="text-gray-400">No pending doctor applications</p>
                  <p className="text-sm text-gray-500 mt-2">All applications have been processed</p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Complaints Tab */}
          {activeTab === 'complaints' && (
          <div className="p-6">
            <div className="space-y-4">
              {complaints.map((complaint: any, index: number) => (
                <div 
                  key={complaint._id} 
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Complaint #{complaint.complaintId}</h3>
                      <p className="text-sm text-gray-400">
                        {complaint.userName} vs Dr. {complaint.doctorName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(complaint.createdAt).toLocaleDateString()} at {new Date(complaint.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        complaint.status === 'under_review'
                          ? 'bg-linear-to-br from-yellow-500/20 to-amber-500/10 text-yellow-400 border border-yellow-500/30'
                          : complaint.status === 'resolved'
                          ? 'bg-linear-to-br from-green-500/20 to-emerald-500/10 text-green-400 border border-green-500/30'
                          : 'bg-linear-to-br from-gray-500/20 to-gray-600/10 text-gray-400 border border-gray-500/30'
                      }`}
                    >
                      {complaint.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong className="text-gray-300">Issue Type:</strong> <span className="text-gray-400">{complaint.issueType}</span></p>
                    <p><strong className="text-gray-300">Description:</strong> <span className="text-gray-400">{complaint.description}</span></p>
                    <p><strong className="text-gray-300">User Email:</strong> <span className="text-gray-400">{complaint.userEmail}</span></p>
                    {complaint.userPhone && (
                      <p><strong className="text-gray-300">User Phone:</strong> <span className="text-gray-400">{complaint.userPhone}</span></p>
                    )}
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
                              className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-xs font-medium transition-all border border-purple-500/30 flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View File {idx + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {complaint.resolutionMessage && (
                      <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                        <p className="text-sm font-medium text-green-300 mb-1">Resolution:</p>
                        <p className="text-sm text-gray-300">{complaint.resolutionMessage}</p>
                        <p className="text-xs text-gray-400 mt-2">Action Taken: {complaint.actionTaken}</p>
                        <p className="text-xs text-gray-500 mt-1">Resolved by: {complaint.resolvedBy || 'Admin'}</p>
                        <p className="text-xs text-gray-500">Resolved at: {new Date(complaint.resolvedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  {complaint.status === 'under_review' && (
                    <button
                      onClick={() => {
                        setSelectedComplaint(complaint);
                        setShowComplaintModal(true);
                      }}
                      className="mt-4 px-4 py-2 bg-linear-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg text-sm font-medium transition-all"
                    >
                      Resolve Complaint
                    </button>
                  )}
                </div>
              ))}
              {complaints.length === 0 && (
                <div className="text-center py-12 animate-pulse">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
                  <p className="text-gray-400">No complaints found</p>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-60 p-4 animate-fade-in">
          <div className="bg-linear-to-br from-gray-900 to-black border border-white/20 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-linear-to-br from-blue-500/10 to-cyan-600/10 border-b border-white/10 p-6 sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">User Details</h2>
                    <p className="text-sm text-gray-400">{selectedUser.full_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedUser(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Full Name</p>
                    <p className="font-medium text-lg">{selectedUser.full_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Email</p>
                    <p className="font-medium break-all">{selectedUser.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Role</p>
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      selectedUser.role === 'admin'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : selectedUser.role === 'doctor'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {selectedUser.role || 'patient'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Account Status</p>
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      selectedUser.is_active
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {selectedUser.is_active ? 'Active' : 'Blocked'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Joined Date</p>
                    <p className="font-medium">
                      {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Date not available'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">User ID</p>
                    <p className="font-mono text-xs text-gray-300">{selectedUser._id}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleToggleUserStatus(selectedUser._id, selectedUser.is_active);
                    setShowUserModal(false);
                  }}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    selectedUser.is_active
                      ? 'bg-linear-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white'
                      : 'bg-linear-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white'
                  }`}
                >
                  {selectedUser.is_active ? 'Block User' : 'Unblock User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Settings Modal */}
      {showSystemSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-60 p-4 animate-fade-in">
          <div className="bg-linear-to-br from-gray-900 to-black border border-white/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-linear-to-br from-gray-500/10 to-slate-600/10 border-b border-white/10 p-6 sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-br from-gray-500 to-slate-600 rounded-xl flex items-center justify-center">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">System Settings</h2>
                    <p className="text-sm text-gray-400">Configure platform settings</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSystemSettings(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Platform Statistics */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Platform Statistics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-2xl font-bold text-blue-400">{stats.totalUsers}</p>
                    <p className="text-sm text-gray-400 mt-1">Total Users</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-400">{stats.totalDoctors}</p>
                    <p className="text-sm text-gray-400 mt-1">Doctors</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-2xl font-bold text-purple-400">{stats.totalPatients}</p>
                    <p className="text-sm text-gray-400 mt-1">Patients</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <p className="text-2xl font-bold text-amber-400">{pendingDoctors.length}</p>
                    <p className="text-sm text-gray-400 mt-1">Pending Approvals</p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-400" />
                  Administrative Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => router.push('/admin/bug-reports')}
                    className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-left"
                  >
                    <Bug className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="font-medium">View Bug Reports</p>
                      <p className="text-xs text-gray-400">{pendingBugReports.length} pending</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowSystemSettings(false);
                      setActiveTab('pending');
                    }}
                    className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-left"
                  >
                    <UserCheck className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="font-medium">Doctor Approvals</p>
                      <p className="text-xs text-gray-400">{pendingDoctors.length} pending</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowSystemSettings(false);
                      setActiveTab('users');
                    }}
                    className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-left"
                  >
                    <Users className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="font-medium">Manage Users</p>
                      <p className="text-xs text-gray-400">{patients.length} patients</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowSystemSettings(false);
                      setActiveTab('doctors');
                    }}
                    className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-left"
                  >
                    <Stethoscope className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="font-medium">Manage Doctors</p>
                      <p className="text-xs text-gray-400">{doctors.length} verified</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* System Information */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  System Information
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400">Platform Version</span>
                    <span className="font-medium">MediAI v1.0.0</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400">Admin Email</span>
                    <span className="font-medium">{session?.user?.email}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400">Last Database Backup</span>
                    <span className="font-medium text-emerald-400">Today</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-400">System Status</span>
                    <span className="flex items-center gap-2 font-medium text-emerald-400">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      Operational
                    </span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  onClick={() => setShowSystemSettings(false)}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Resolution Modal */}
      {showComplaintModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-60 p-4 animate-fade-in">
          <div className="bg-linear-to-br from-gray-900 to-black border border-white/20 rounded-2xl max-w-2xl w-full">
            <div className="bg-linear-to-br from-red-500/10 to-red-600/10 border-b border-white/10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Resolve Complaint</h2>
                  <p className="text-sm text-gray-400">Complaint #{selectedComplaint.complaintId}</p>
                </div>
                <button 
                  onClick={() => {
                    setShowComplaintModal(false);
                    setSelectedComplaint(null);
                    setResolutionMessage('');
                    setActionTaken('No Action');
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">User:</p>
                <p className="font-medium">{selectedComplaint.userName} ({selectedComplaint.userEmail})</p>
                <p className="text-sm text-gray-400 mt-2 mb-1">Issue Type:</p>
                <p className="font-medium">{selectedComplaint.issueType}</p>
                <p className="text-sm text-gray-400 mt-2 mb-1">Description:</p>
                <p className="text-gray-300">{selectedComplaint.description}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Action Taken
                </label>
                <select
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
                >
                  <option value="No Action">No Action</option>
                  <option value="Warning Issued">Warning Issued</option>
                  <option value="Doctor Suspended">Doctor Suspended</option>
                  <option value="Doctor Removed">Doctor Removed</option>
                  <option value="Complaint Dismissed">Complaint Dismissed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Resolution Message
                </label>
                <textarea
                  value={resolutionMessage}
                  onChange={(e) => setResolutionMessage(e.target.value)}
                  rows={4}
                  placeholder="Enter resolution details..."
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={() => {
                    setShowComplaintModal(false);
                    setSelectedComplaint(null);
                    setResolutionMessage('');
                    setActionTaken('No Action');
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveComplaint}
                  className="px-6 py-2 bg-linear-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg font-medium transition-all"
                >
                  Resolve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Application Modal */}
      {showDoctorModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
          <div className="bg-linear-to-br from-gray-900 to-black border border-white/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-linear-to-br from-red-500/10 to-red-600/10 border-b border-white/10 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Doctor Application Review</h2>
                  <p className="text-sm text-gray-400">Verify medical credentials</p>
                </div>
                <button 
                  onClick={() => {
                    setShowDoctorModal(false);
                    setSelectedDoctor(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Full Name</p>
                    <p className="font-medium text-lg">{selectedDoctor.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Email</p>
                    <p className="font-medium break-all">{selectedDoctor.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <p className="font-medium">{selectedDoctor.phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Date of Birth</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <p className="font-medium">
                        {selectedDoctor.date_of_birth ? new Date(selectedDoctor.date_of_birth).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Gender</p>
                    <p className="font-medium capitalize">{selectedDoctor.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Medical License Number</p>
                    <p className="font-mono text-sm font-medium text-emerald-400">{selectedDoctor.medical_license_number || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-emerald-400" />
                  Professional Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Specialization</p>
                    <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {selectedDoctor.specialization || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Years of Experience</p>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      <p className="font-medium">{selectedDoctor.years_of_experience || 0} years</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Medical Degree</p>
                    <p className="font-medium">{selectedDoctor.medical_degree || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Medical School</p>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-400" />
                      <p className="font-medium">{selectedDoctor.medical_school || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Graduation Year</p>
                    <p className="font-medium">{selectedDoctor.graduation_year || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Consultation Fee</p>
                    <p className="font-medium text-emerald-400">₹{selectedDoctor.consultation_fee || 0}</p>
                  </div>
                </div>
              </div>

              {/* Clinic Information */}
              {selectedDoctor.has_clinic && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Building className="w-5 h-5 text-purple-400" />
                    Clinic Information
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Clinic Name</p>
                      <p className="font-medium">{selectedDoctor.clinic_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Clinic Address</p>
                      <p className="font-medium text-gray-300">{selectedDoctor.clinic_address || 'N/A'}</p>
                    </div>
                    {selectedDoctor.hospital_affiliations && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Hospital Affiliations</p>
                        <p className="font-medium text-gray-300">{selectedDoctor.hospital_affiliations}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documents */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Submitted Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedDoctor.documents?.medical_certificate && (
                    <a
                      href={selectedDoctor.documents.medical_certificate}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-all group"
                    >
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-emerald-300">Medical Certificate</p>
                        <p className="text-xs text-gray-400">Click to view</p>
                      </div>
                      <Eye className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </a>
                  )}
                  {selectedDoctor.documents?.license_document && (
                    <a
                      href={selectedDoctor.documents.license_document}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-all group"
                    >
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-blue-300">License Document</p>
                        <p className="text-xs text-gray-400">Click to view</p>
                      </div>
                      <Eye className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                    </a>
                  )}
                  {selectedDoctor.documents?.identity_proof && (
                    <a
                      href={selectedDoctor.documents.identity_proof}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-all group"
                    >
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-purple-300">Identity Proof</p>
                        <p className="text-xs text-gray-400">Click to view</p>
                      </div>
                      <Eye className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                    </a>
                  )}
                  {selectedDoctor.documents?.clinic_registration && (
                    <a
                      href={selectedDoctor.documents.clinic_registration}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all group"
                    >
                      <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-amber-300">Clinic Registration</p>
                        <p className="text-xs text-gray-400">Click to view</p>
                      </div>
                      <Eye className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                    </a>
                  )}
                </div>
                {!selectedDoctor.documents?.medical_certificate && 
                 !selectedDoctor.documents?.license_document && 
                 !selectedDoctor.documents?.identity_proof && 
                 !selectedDoctor.documents?.clinic_registration && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-500 mx-auto mb-2 opacity-50" />
                    <p className="text-gray-400">No documents uploaded</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowDoctorModal(false);
                    setSelectedDoctor(null);
                  }}
                  className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
                >
                  Close
                </button>
                
                {/* Show Approve/Reject for pending doctors, Block/Unblock for approved doctors */}
                {selectedDoctor.role === 'pending_doctor' || selectedDoctor.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleRejectDoctor(selectedDoctor._id)}
                      className="px-6 py-2.5 bg-linear-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-red-500/30"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => handleApproveDoctor(selectedDoctor._id)}
                      className="px-6 py-2.5 bg-linear-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-emerald-500/30"
                    >
                      Approve Doctor
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      handleToggleUserStatus(selectedDoctor._id, selectedDoctor.is_active);
                      setShowDoctorModal(false);
                    }}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg ${
                      selectedDoctor.is_active
                        ? 'bg-linear-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-red-500/30'
                        : 'bg-linear-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/30'
                    }`}
                  >
                    {selectedDoctor.is_active ? 'Block Doctor' : 'Unblock Doctor'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes dna {
          0% { transform: translateY(-100%) rotate(0deg); }
          100% { transform: translateY(100%) rotate(360deg); }
        }
        
        @keyframes dna-node {
          0%, 100% { background-color: rgba(239, 68, 68, 0.3); }
          50% { background-color: rgba(168, 85, 247, 0.3); }
        }
        
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
        
        @keyframes wave {
          0% { transform: translateX(0) scale(1); }
          50% { transform: translateX(-50px) scale(1.2); }
          100% { transform: translateX(0) scale(1); }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
        
        .animate-dna { animation: dna 20s linear infinite; }
        .animate-dna-node { animation: dna-node 3s ease-in-out infinite; }
        .animate-float { animation: float 25s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 30s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 35s ease-in-out infinite; }
        .animate-float-delayed-2 { animation: float-delayed-2 28s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-particle { animation: particle linear infinite; }
        .animate-wave { animation: wave 20s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
