'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Pill,
  Plus,
  Calendar,
  Clock,
  TrendingUp,
  Download,
  Share2,
  Bell,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
  ChevronLeft,
  BarChart3,
  Activity,
  Target
} from 'lucide-react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import AnimatedBackground from '@/components/AnimatedBackground';
import AddMedicineForm from '@/components/AddMedicineForm';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Medicine {
  _id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  times: string[];
  start_date: string;
  end_date?: string;
  status: string;
  adherence_rate: number;
  total_doses_taken: number;
  total_doses_expected: number;
  notifications_enabled: boolean;
  notification_channels: {
    in_app: boolean;
    email: boolean;
    sms: boolean;
  };
}

export default function MedicineTrackerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adherenceData, setAdherenceData] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchMedicines();
      fetchAdherenceData();
    }
  }, [status, router]);

  const fetchMedicines = async () => {
    try {
      const res = await fetch('/api/medicines/tracker');
      if (res.ok) {
        const data = await res.json();
        setMedicines(data.medicines || []);
      }
    } catch (error) {
      console.error('Error fetching medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdherenceData = async () => {
    try {
      const res = await fetch('/api/medicines/adherence-stats');
      if (res.ok) {
        const data = await res.json();
        setAdherenceData(data.overall);
        setWeeklyData(data.weekly);
      }
    } catch (error) {
      console.error('Error fetching adherence data:', error);
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this medicine?')) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/medicines/tracker?id=${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        await fetchMedicines();
        await fetchAdherenceData();
        alert('Medicine deleted successfully!');
      } else {
        alert('Failed to delete medicine');
      }
    } catch (error) {
      console.error('Error deleting medicine:', error);
      alert('Error deleting medicine');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (medicine: any) => {
    setEditingMedicine(medicine);
    setShowAddModal(true);
  };
  const handleDownloadReport = async () => {
    try {
      const res = await fetch('/api/medicines/generate-report', {
        method: 'POST',
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medicine-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to generate report');
    }
  };

  const handleShareWithDoctor = async () => {
    router.push('/consultations/new?attachReport=true');
  };

  const handleMedicineClick = async (medicine: Medicine) => {
    if (medicine._id === selectedMedicine?._id) {
      // Deselect and reload last 7 days data
      setSelectedMedicine(null);
      await fetchAdherenceData();
    } else {
      // Select and fetch data for this medicine's date range
      setSelectedMedicine(medicine);
      await fetchAdherenceDataForMedicine(medicine);
    }
  };

  const handleViewAll = async () => {
    setSelectedMedicine(null);
    await fetchAdherenceData(); // Reload last 7 days
  };

  // Fetch adherence data for a specific medicine's date range
  const fetchAdherenceDataForMedicine = async (medicine: Medicine) => {
    try {
      const startDate = new Date(medicine.start_date);
      const endDate = medicine.end_date ? new Date(medicine.end_date) : new Date();
      
      // Fetch data for the medicine's active period
      const res = await fetch(`/api/medicines/adherence-stats?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
      
      if (res.ok) {
        const data = await res.json();
        setAdherenceData(data.overall);
        setWeeklyData(data.weekly);
      }
    } catch (error) {
      console.error('Error fetching medicine adherence data:', error);
    }
  };

  // Filter data by selected medicine
  const getFilteredData = () => {
    if (!selectedMedicine || !weeklyData) {
      return { weeklyData, adherenceData };
    }

    // Filter weekly data by selected medicine
    const filteredWeekly = { ...weeklyData };
    const filteredDetailed = weeklyData.detailed.map((day: any) => ({
      ...day,
      taken: day.taken.filter((dose: any) => dose.medicine === selectedMedicine.medicine_name),
      missed: day.missed.filter((dose: any) => dose.medicine === selectedMedicine.medicine_name),
      pending: day.pending.filter((dose: any) => dose.medicine === selectedMedicine.medicine_name),
    }));

    // Recalculate rates for filtered data
    const filteredRates = filteredDetailed.map((day: any) => {
      const takenCount = day.taken.length;
      const totalNonPending = takenCount + day.missed.length;
      return totalNonPending > 0 ? Math.round((takenCount / totalNonPending) * 100) : 0;
    });

    filteredWeekly.detailed = filteredDetailed;
    filteredWeekly.rates = filteredRates;

    // Filter overall adherence data
    const filteredAdherence = {
      total_taken: filteredDetailed.reduce((sum: number, day: any) => sum + day.taken.length, 0),
      total_missed: filteredDetailed.reduce((sum: number, day: any) => sum + day.missed.length, 0),
      total_pending: filteredDetailed.reduce((sum: number, day: any) => sum + day.pending.length, 0),
      detailed_doses: {
        taken: adherenceData?.detailed_doses?.taken?.filter((d: any) => d.medicine_name === selectedMedicine.medicine_name) || [],
        missed: adherenceData?.detailed_doses?.missed?.filter((d: any) => d.medicine_name === selectedMedicine.medicine_name) || [],
        pending: adherenceData?.detailed_doses?.pending?.filter((d: any) => d.medicine_name === selectedMedicine.medicine_name) || [],
      }
    };

    return { weeklyData: filteredWeekly, adherenceData: filteredAdherence };
  };

  const { weeklyData: displayWeeklyData, adherenceData: displayAdherenceData } = getFilteredData();

  // Check if filtered data is empty
  const hasFilteredData = selectedMedicine && displayAdherenceData && 
    (displayAdherenceData.total_taken > 0 || displayAdherenceData.total_missed > 0 || displayAdherenceData.total_pending > 0);

  // Chart Data
  const weeklyAdherenceChart = displayWeeklyData ? {
    labels: displayWeeklyData.labels,
    datasets: [
      {
        label: 'Adherence Rate (%)',
        data: displayWeeklyData.rates,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
      },
    ],
  } : null;

  const medicineStatusChart = {
    labels: ['Taken', 'Missed', 'Pending'],
    datasets: [
      {
        data: [
          displayAdherenceData?.total_taken || 0,
          displayAdherenceData?.total_missed || 0,
          displayAdherenceData?.total_pending || 0
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 191, 36, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#fff',
        },
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            const index = context[0].dataIndex;
            if (displayWeeklyData?.detailed?.[index]) {
              return displayWeeklyData.detailed[index].displayDate;
            }
            return context[0].label;
          },
          afterTitle: (context: any) => {
            const index = context[0].dataIndex;
            const dayData = displayWeeklyData?.detailed?.[index];
            if (!dayData) return '';
            
            const total = dayData.taken.length + dayData.missed.length + dayData.pending.length;
            return total > 0 ? `Total: ${total} doses` : 'No doses scheduled';
          },
          label: (context: any) => {
            return `Adherence: ${context.parsed.y}%`;
          },
          afterLabel: (context: any) => {
            const index = context.dataIndex;
            const dayData = weeklyData?.detailed?.[index];
            if (!dayData) return [];

            const lines: string[] = [];
            
            if (dayData.taken.length > 0) {
              lines.push('');
              lines.push('✓ Taken:');
              dayData.taken.forEach((dose: any) => {
                lines.push(`  ${dose.medicine} at ${dose.time}`);
              });
            }
            
            if (dayData.missed.length > 0) {
              lines.push('');
              lines.push('✗ Missed:');
              dayData.missed.forEach((dose: any) => {
                lines.push(`  ${dose.medicine} at ${dose.time}`);
              });
            }
            
            if (dayData.pending.length > 0) {
              lines.push('');
              lines.push('⏳ Pending:');
              dayData.pending.forEach((dose: any) => {
                lines.push(`  ${dose.medicine} at ${dose.time}`);
              });
            }
            
            return lines;
          },
        },
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      y: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#fff',
        },
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = displayAdherenceData ? 
              displayAdherenceData.total_taken + displayAdherenceData.total_missed + displayAdherenceData.total_pending : 0;
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} doses (${percentage}%)`;
          },
          afterLabel: (context: any) => {
            const status = context.label.toLowerCase();
            const detailedDoses = displayAdherenceData?.detailed_doses?.[status] || [];
            
            if (detailedDoses.length === 0) return '';
            
            // Show up to 3 most recent doses with date and time
            const recentDoses = detailedDoses.slice(0, 3);
            const tooltipLines = ['', 'Recent doses:'];
            
            recentDoses.forEach((dose: any) => {
              const date = new Date(dose.scheduled_time);
              const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              tooltipLines.push(`• ${dose.medicine_name} - ${dateStr} at ${timeStr}`);
            });
            
            if (detailedDoses.length > 3) {
              tooltipLines.push(`... and ${detailedDoses.length - 3} more`);
            }
            
            return tooltipLines;
          },
        },
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        padding: 12,
      },
    },
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  const overallAdherence = medicines.length > 0
    ? Math.round(medicines.reduce((acc, m) => acc + m.adherence_rate, 0) / medicines.length)
    : 0;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden">
      <AnimatedBackground />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-linear-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  Medicine Tracker
                </h1>
                <p className="text-sm text-gray-400">Manage your medications and track adherence</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Download Report</span>
              </button>
              <button
                onClick={handleShareWithDoctor}
                className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl transition-colors shadow-lg"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden md:inline">Share with Doctor</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl transition-colors shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medicine</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-linear-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Pill className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold">{medicines.filter(m => m.status === 'active').length}</p>
            <p className="text-sm text-gray-400">Active Medicines</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold">{overallAdherence}%</p>
            <p className="text-sm text-gray-400">Overall Adherence</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-linear-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold">{adherenceData?.total_taken || 0}</p>
            <p className="text-sm text-gray-400">Doses Taken Today</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-linear-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                <X className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold">{adherenceData?.total_missed || 0}</p>
            <p className="text-sm text-gray-400">Doses Missed</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weekly Adherence Chart */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                {selectedMedicine ? (
                  <>
                    {selectedMedicine.medicine_name} Adherence
                    <span className="text-xs text-gray-400 font-normal">
                      ({new Date(selectedMedicine.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {selectedMedicine.end_date && (
                        <> - {new Date(selectedMedicine.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                      )})
                    </span>
                  </>
                ) : (
                  '7-Day Adherence Trend'
                )}
              </h3>
              {selectedMedicine && (
                <button
                  onClick={handleViewAll}
                  className="px-3 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                >
                  View All
                </button>
              )}
            </div>
            <div className="h-64">
              {weeklyAdherenceChart && (
                <Bar data={weeklyAdherenceChart} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Dose Status Distribution
                {selectedMedicine && (
                  <span className="text-sm text-purple-400">- {selectedMedicine.medicine_name}</span>
                )}
              </h3>
              {selectedMedicine && (
                <button
                  onClick={handleViewAll}
                  className="px-3 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors"
                >
                  View All
                </button>
              )}
            </div>
            <div className="h-64">
              <Pie data={medicineStatusChart} options={pieOptions} />
            </div>
          </div>
        </div>

        {/* Active Medicines List */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-6">
            Active Medications
            {selectedMedicine && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                (Click a medicine card to view its data in charts)
              </span>
            )}
          </h3>
          
          {medicines.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No medicines being tracked yet</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-linear-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-colors"
              >
                Add Your First Medicine
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {medicines.map((medicine) => (
                <div
                  key={medicine._id}
                  onClick={() => handleMedicineClick(medicine)}
                  className={`bg-white/5 border rounded-xl p-6 transition-all cursor-pointer ${
                    selectedMedicine?._id === medicine._id
                      ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/30'
                      : 'border-white/10 hover:border-blue-500/50 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {selectedMedicine?._id === medicine._id && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        )}
                        <h4 className="text-lg font-semibold">{medicine.medicine_name}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          medicine.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {medicine.status.toUpperCase()}
                        </span>
                        {selectedMedicine?._id === medicine._id && (
                          <span className="text-xs text-blue-400 font-medium">
                            ← Viewing in Charts
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-gray-400">Dosage</p>
                          <p className="font-medium">{medicine.dosage}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Frequency</p>
                          <p className="font-medium capitalize">{medicine.frequency.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Reminder Times</p>
                          <p className="font-medium">{medicine.times?.join(', ') || 'Not set'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Progress</p>
                          <p className="font-medium">{medicine.total_doses_taken}/{medicine.total_doses_expected}</p>
                        </div>
                      </div>

                      {/* Date Range */}
                      <div className="mt-4 flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-400">Tracking Period:</span>
                        <span className="font-medium text-white">
                          {new Date(medicine.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {medicine.end_date && (
                            <>
                              {' → '}
                              {new Date(medicine.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </>
                          )}
                          {!medicine.end_date && ' → Ongoing'}
                        </span>
                        {medicine.end_date && new Date(medicine.end_date) < new Date() && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                            <Check className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                      </div>
                      
                      {/* Adherence */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-400">Adherence Rate</span>
                          <span className="font-medium">{medicine.adherence_rate}%</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-linear-to-r from-green-500 to-emerald-500 transition-all duration-500"
                            style={{ width: `${medicine.adherence_rate}%` }}
                          />
                        </div>
                      </div>

                      {/* Notification Settings */}
                      <div className="mt-4 flex items-center gap-4 text-sm">
                        {medicine.notifications_enabled && (
                          <>
                            {medicine.notification_channels.in_app && (
                              <span className="flex items-center gap-1 text-blue-400">
                                <Bell className="w-3 h-3" /> In-App
                              </span>
                            )}
                            {medicine.notification_channels.email && (
                              <span className="flex items-center gap-1 text-purple-400">
                                ✉️ Email
                              </span>
                            )}
                            {medicine.notification_channels.sms && (
                              <span className="flex items-center gap-1 text-green-400">
                                📱 SMS
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {/* Only show edit button if medicine hasn't ended */}
                      {(!medicine.end_date || new Date(medicine.end_date) >= new Date()) && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(medicine);
                          }}
                          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                          title="Edit Medicine"
                        >
                          <Edit className="w-4 h-4 text-blue-400" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(medicine._id);
                        }}
                        disabled={deletingId === medicine._id}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete Medicine"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Medicine Modal */}
      {showAddModal && (
        <AddMedicineForm 
          onClose={() => {
            setShowAddModal(false);
            setEditingMedicine(null);
          }} 
          onSuccess={() => {
            fetchMedicines();
            setEditingMedicine(null);
          }}
          editData={editingMedicine}
        />
      )}
    </div>
  );
}

