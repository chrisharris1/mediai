'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Download, FileText, Activity, Heart, Pill, AlertTriangle, Calendar, User, Phone, Droplet, Loader2, TrendingUp, BarChart3, Clock, Database, FileCheck, Shield, Eye, Printer, Share2, ChevronRight, Thermometer, Stethoscope, Brain } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import AnimatedBackground from '@/components/AnimatedBackground';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

interface ReportData {
  profile_last_updated: any;
  patient: {
    name: string;
    email: string;
    age: string;
    gender: string;
    blood_type: string;
    height: string;
    weight: string;
    phone: string;
  };
  medical_info: {
    current_medications: Array<string | { name: string; added_at: string; updated_at: string }>;
    allergies: Array<string | { name: string; added_at: string; updated_at: string }>;
    chronic_conditions: string[];
    medical_history: string;
  };
  emergency_contact: {
    name: string;
    phone: string;
  };
  consultations: Array<{
    id: string;
    doctor_name: string;
    specialty: string;
    symptoms: string;
    diagnosis: string;
    prescription: string;
    status: string;
    date: string;
    notes: string;
  }>;
  statistics: {
    total_consultations: number;
    completed_consultations: number;
    total_medications: number;
    total_allergies: number;
    chronic_conditions: number;
  };
  generated_at: string;
}

export default function HealthReportGenerator() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'medications' | 'allergies' | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const doughnutRef = useRef<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchReportData();
    }
  }, [status, router]);

  const fetchReportData = async () => {
    try {
      const res = await fetch('/api/health-report');
      const result = await res.json();

      if (result.success) {
        setReportData(result.data);
      } else {
        alert('Failed to load report data');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Error loading report data');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!reportData) return;
    setGenerating(true);

    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Header with logo and title
      doc.setFillColor(99, 102, 241); // Indigo
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('MediAI', 20, 25);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Healthcare Intelligence', 20, 32);
      
      doc.setTextColor(0, 0, 0);
      yPos = 50;

      // Report Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Comprehensive Health Report', 20, yPos);
      yPos += 5;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date(reportData.generated_at).toLocaleString()}`, 20, yPos);
      yPos += 15;

      // Patient Information
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Patient Information', 20, yPos);
      yPos += 7;

      autoTable(doc, {
        startY: yPos,
        head: [['Field', 'Value']],
        body: [
          ['Full Name', reportData.patient.name],
          ['Email', reportData.patient.email],
          ['Age', reportData.patient.age.toString()],
          ['Gender', reportData.patient.gender],
          ['Blood Type', reportData.patient.blood_type],
          ['Height', `${reportData.patient.height} cm`],
          ['Weight', `${reportData.patient.weight} kg`],
          ['Phone', reportData.patient.phone],
        ],
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] },
        margin: { left: 20, right: 20 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Health Statistics
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Health Statistics', 20, yPos);
      yPos += 7;

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Count']],
        body: [
          ['Total Consultations', reportData.statistics.total_consultations.toString()],
          ['Completed Consultations', reportData.statistics.completed_consultations.toString()],
          ['Current Medications', reportData.statistics.total_medications.toString()],
          ['Known Allergies', reportData.statistics.total_allergies.toString()],
          ['Chronic Conditions', reportData.statistics.chronic_conditions.toString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20, right: 20 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Current Medications
      if (reportData.medical_info.current_medications.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Current Medications', 20, yPos);
        yPos += 7;

        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Medication Name']],
          body: reportData.medical_info.current_medications.map((med: any, idx: number) => [
            (idx + 1).toString(),
            typeof med === 'string' ? med : med.name,
          ]),
          theme: 'grid',
          headStyles: { fillColor: [34, 197, 94] },
          margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Allergies
      if (reportData.medical_info.allergies.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Known Allergies', 20, yPos);
        yPos += 7;

        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Allergy']],
          body: reportData.medical_info.allergies.map((allergy: any, idx: number) => [
            (idx + 1).toString(),
            typeof allergy === 'string' ? allergy : allergy.name,
          ]),
          theme: 'grid',
          headStyles: { fillColor: [239, 68, 68] },
          margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Chronic Conditions
      if (reportData.medical_info.chronic_conditions.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Chronic Conditions', 20, yPos);
        yPos += 7;

        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Condition']],
          body: reportData.medical_info.chronic_conditions.map((condition, idx) => [
            (idx + 1).toString(),
            condition,
          ]),
          theme: 'grid',
          headStyles: { fillColor: [251, 146, 60] },
          margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Consultation History
      if (reportData.consultations.length > 0) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Recent Consultation History', 20, yPos);
        yPos += 7;

        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'Doctor', 'Specialty', 'Symptoms', 'Diagnosis', 'Status']],
          body: reportData.consultations.map((consult) => [
            new Date(consult.date).toLocaleDateString(),
            consult.doctor_name,
            consult.specialty,
            consult.symptoms.substring(0, 30) + (consult.symptoms.length > 30 ? '...' : ''),
            consult.diagnosis.substring(0, 30) + (consult.diagnosis.length > 30 ? '...' : ''),
            consult.status,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [139, 92, 246] },
          margin: { left: 20, right: 20 },
          styles: { fontSize: 8 },
        });
      }

      // Emergency Contact
      doc.addPage();
      yPos = 20;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Emergency Contact', 20, yPos);
      yPos += 7;

      autoTable(doc, {
        startY: yPos,
        head: [['Field', 'Value']],
        body: [
          ['Contact Name', reportData.emergency_contact.name],
          ['Contact Phone', reportData.emergency_contact.phone],
        ],
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68] },
        margin: { left: 20, right: 20 },
      });

      // Footer on every page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `MediAI - Confidential Medical Report | Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      doc.save(`MediAI_Health_Report_${reportData.patient.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading your health report...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-300">No report data available</p>
        </div>
      </div>
    );
  }

  // Chart data
  const consultationChartData = {
    labels: ['Total', 'Completed', 'Pending'],
    datasets: [
      {
        label: 'Consultations',
        data: [
          reportData.statistics.total_consultations,
          reportData.statistics.completed_consultations,
          reportData.statistics.total_consultations - reportData.statistics.completed_consultations,
        ],
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
        ],
        borderColor: [
          'rgb(99, 102, 241)',
          'rgb(34, 197, 94)',
          'rgb(251, 146, 60)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const healthMetricsData = {
    labels: ['Medications', 'Allergies', 'Chronic Conditions'],
    datasets: [
      {
        data: [
          reportData.statistics.total_medications,
          reportData.statistics.total_allergies,
          reportData.statistics.chronic_conditions,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 146, 60, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(251, 146, 60)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const timelineData = {
    labels: reportData.consultations.slice(0, 6).reverse().map((c) => new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Consultation Timeline',
        data: reportData.consultations.slice(0, 6).reverse().map((_, idx) => idx + 1),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#9ca3af',
        },
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

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event: any, elements: any) => {
      if (elements.length > 0) {
        const elementIndex = elements[0].index;
        if (elementIndex === 0 && reportData.medical_info.current_medications.length > 0) {
          setSelectedCategory('medications');
          setShowDetailsModal(true);
        } else if (elementIndex === 1 && reportData.medical_info.allergies.length > 0) {
          setSelectedCategory('allergies');
          setShowDetailsModal(true);
        }
      }
    },
    onHover: (event: any, elements: any) => {
      if (event.native && elements.length > 0) {
        const elementIndex = elements[0].index;
        if (elementIndex === 0 || elementIndex === 1) {
          event.native.target.style.cursor = 'pointer';
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: '#9ca3af',
        },
        position: 'bottom' as const,
        onClick: (e: any, legendItem: any, legend: any) => {
          const index = legendItem.datasetIndex;
          if (index === 0 && reportData.medical_info.current_medications.length > 0) {
            setSelectedCategory('medications');
            setShowDetailsModal(true);
          } else if (index === 1 && reportData.medical_info.allergies.length > 0) {
            setSelectedCategory('allergies');
            setShowDetailsModal(true);
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          title: function(tooltipItems: any) {
            return tooltipItems[0].label || '';
          },
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${value} item${value !== 1 ? 's' : ''}`;
          },
          afterLabel: function(context: any) {
            const dataIndex = context.dataIndex;
            const lines: string[] = [];
            
            if (dataIndex === 0 && reportData.medical_info.current_medications.length > 0) {
              lines.push('\n--- Current Medications ---');
              reportData.medical_info.current_medications.slice(0, 3).forEach((med: any, idx: number) => {
                const medName = typeof med === 'string' ? med : med.name;
                lines.push(`• ${medName}`);
              });
              if (reportData.medical_info.current_medications.length > 3) {
                lines.push(`...and ${reportData.medical_info.current_medications.length - 3} more`);
              }
              lines.push('\n📌 Click to view all details');
            } else if (dataIndex === 1 && reportData.medical_info.allergies.length > 0) {
              lines.push('\n--- Known Allergies ---');
              reportData.medical_info.allergies.slice(0, 3).forEach((allergy: any, idx: number) => {
                const allergyName = typeof allergy === 'string' ? allergy : allergy.name;
                lines.push(`⚠ ${allergyName}`);
              });
              if (reportData.medical_info.allergies.length > 3) {
                lines.push(`...and ${reportData.medical_info.allergies.length - 3} more`);
              }
              lines.push('\n📌 Click to view all details');
            } else if (dataIndex === 2 && reportData.medical_info.chronic_conditions.length > 0) {
              lines.push('\n--- Chronic Conditions ---');
              reportData.medical_info.chronic_conditions.slice(0, 3).forEach((condition: string) => {
                lines.push(`🔴 ${condition}`);
              });
              if (reportData.medical_info.chronic_conditions.length > 3) {
                lines.push(`...and ${reportData.medical_info.chronic_conditions.length - 3} more`);
              }
            }
            
            if (reportData.profile_last_updated) {
              lines.push('\n--- Last Updated ---');
              lines.push(new Date(reportData.profile_last_updated).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }));
            }
            
            return lines;
          }
        }
      }
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#9ca3af',
        },
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

  const openDetails = (category: 'medications' | 'allergies') => {
    setSelectedCategory(category);
    setShowDetailsModal(true);
  };

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
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-linear-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Health Report
                  </h1>
                  <p className="text-sm text-gray-400">Comprehensive Medical Overview</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={generatePDF}
                disabled={generating}
                className="flex items-center gap-2 px-6 py-3 bg-linear-to-br from-indigo-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div ref={reportRef} className="space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-indigo-500/30 transition-all cursor-pointer group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Consultations</p>
                  <p className="text-2xl font-bold text-blue-400">{reportData.statistics.total_consultations}</p>
                </div>
              </div>
              <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-linear-to-br from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${(reportData.statistics.total_consultations / 10) * 100}%` }}
                ></div>
              </div>
            </div>

            <div 
              onClick={() => openDetails('medications')}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-emerald-500/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-linear-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Pill className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Medications</p>
                  <p className="text-2xl font-bold text-emerald-400">{reportData.statistics.total_medications}</p>
                </div>
              </div>
              <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-linear-to-br from-emerald-500 to-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${(reportData.statistics.total_medications / 5) * 100}%` }}
                ></div>
              </div>
            </div>

            <div 
              onClick={() => openDetails('allergies')}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-red-500/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-linear-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Allergies</p>
                  <p className="text-2xl font-bold text-red-400">{reportData.statistics.total_allergies}</p>
                </div>
              </div>
              <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-linear-to-br from-red-500 to-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${(reportData.statistics.total_allergies / 5) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-orange-500/30 transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-linear-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Chronic Conditions</p>
                  <p className="text-2xl font-bold text-orange-400">{reportData.statistics.chronic_conditions}</p>
                </div>
              </div>
              <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-linear-to-br from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${(reportData.statistics.chronic_conditions / 5) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-cyan-500/30 transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-linear-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-cyan-400">{reportData.statistics.completed_consultations}</p>
                </div>
              </div>
              <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-linear-to-br from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${(reportData.statistics.completed_consultations / reportData.statistics.total_consultations) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Consultation Overview
              </h3>
              <div className="h-64">
                <Bar data={consultationChartData} options={chartOptions} />
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-400" />
                  Health Metrics
                </h3>
                {(reportData.medical_info.current_medications.length > 0 || reportData.medical_info.allergies.length > 0) && (
                  <button className="text-xs text-gray-400 hover:text-gray-300 transition-colors cursor-default">
                    Click on chart to view details
                  </button>
                )}
              </div>
              <div className="h-64">
                <Doughnut 
                  ref={doughnutRef}
                  data={healthMetricsData} 
                  options={doughnutOptions} 
                />
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Consultation Timeline
              </h3>
              <div className="h-64">
                <Line data={timelineData} options={lineOptions} />
              </div>
            </div>
          </div>

          {/* Patient Information */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Patient Information</h2>
                  <p className="text-sm text-gray-400">Personal & Medical Details</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                Updated: {new Date(reportData.generated_at).toLocaleDateString()}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-indigo-500/30 transition-colors group">
                <p className="text-sm text-gray-400 mb-1">Full Name</p>
                <p className="font-semibold text-lg">{reportData.patient.name}</p>
              </div>
              
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-indigo-500/30 transition-colors group">
                <p className="text-sm text-gray-400 mb-1">Age / Gender</p>
                <p className="font-semibold text-lg">{reportData.patient.age} / {reportData.patient.gender}</p>
              </div>
              
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-indigo-500/30 transition-colors group">
                <p className="text-sm text-gray-400 mb-1 flex items-center gap-1">
                  <Droplet className="w-4 h-4" />
                  Blood Type
                </p>
                <p className="font-semibold text-lg">{reportData.patient.blood_type}</p>
              </div>
              
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-indigo-500/30 transition-colors group">
                <p className="text-sm text-gray-400 mb-1 flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  Phone
                </p>
                <p className="font-semibold text-lg">{reportData.patient.phone}</p>
              </div>
              
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-indigo-500/30 transition-colors group">
                <p className="text-sm text-gray-400 mb-1">Height</p>
                <p className="font-semibold text-lg">{reportData.patient.height} cm</p>
              </div>
              
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-indigo-500/30 transition-colors group">
                <p className="text-sm text-gray-400 mb-1">Weight</p>
                <p className="font-semibold text-lg">{reportData.patient.weight} kg</p>
              </div>
              
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-indigo-500/30 transition-colors group">
                <p className="text-sm text-gray-400 mb-1">BMI</p>
                <p className="font-semibold text-lg">
                  {reportData.patient.height && reportData.patient.weight && !isNaN(Number(reportData.patient.height)) && !isNaN(Number(reportData.patient.weight))
                    ? (Number(reportData.patient.weight) / Math.pow(Number(reportData.patient.height) / 100, 2)).toFixed(1)
                    : 'N/A'}
                </p>
              </div>
              
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-indigo-500/30 transition-colors group">
                <p className="text-sm text-gray-400 mb-1">Email</p>
                <p className="font-semibold text-lg truncate">{reportData.patient.email}</p>
              </div>
            </div>
          </div>

          {/* Current Medications */}
          {reportData.medical_info.current_medications.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Pill className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Current Medications</h2>
                    <p className="text-sm text-gray-400">{reportData.medical_info.current_medications.length} active medications</p>
                  </div>
                </div>
                <button 
                  onClick={() => openDetails('medications')}
                  className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {reportData.medical_info.current_medications.slice(0, 6).map((med, idx) => {
                  const medName = typeof med === 'string' ? med : med.name;
                  return (
                    <div key={idx} className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20 hover:border-emerald-500/40 transition-colors group">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                          <span className="text-xs font-bold text-emerald-400">{idx + 1}</span>
                        </div>
                        <p className="font-medium truncate">{medName}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Allergies & Chronic Conditions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {reportData.medical_info.allergies.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-linear-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Known Allergies</h2>
                      <p className="text-sm text-gray-400">{reportData.medical_info.allergies.length} recorded allergies</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => openDetails('allergies')}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {reportData.medical_info.allergies.slice(0, 5).map((allergy, idx) => {
                    const allergyName = typeof allergy === 'string' ? allergy : allergy.name;
                    return (
                      <div key={idx} className="p-4 bg-red-500/5 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <p className="font-medium">{allergyName}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {reportData.medical_info.chronic_conditions.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-linear-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Chronic Conditions</h2>
                    <p className="text-sm text-gray-400">{reportData.medical_info.chronic_conditions.length} conditions</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {reportData.medical_info.chronic_conditions.map((condition, idx) => (
                    <div key={idx} className="p-4 bg-orange-500/5 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <p className="font-medium">{condition}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Consultations */}
          {reportData.consultations.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Recent Consultations</h2>
                  <p className="text-sm text-gray-400">{reportData.consultations.length} consultation records</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {reportData.consultations.map((consultation) => (
                  <div key={consultation.id} className="p-6 bg-white/5 rounded-xl border border-white/10 hover:border-purple-500/30 transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-semibold text-lg mb-1">{consultation.doctor_name}</p>
                        <p className="text-sm text-gray-400">{consultation.specialty}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-400 mb-1">
                          {new Date(consultation.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium ${
                          consultation.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                          consultation.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {consultation.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-sm font-medium text-gray-400 mb-1">Symptoms</p>
                        <p className="text-sm text-gray-300">{consultation.symptoms}</p>
                      </div>
                      
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-sm font-medium text-gray-400 mb-1">Diagnosis</p>
                        <p className="text-sm text-gray-300">{consultation.diagnosis}</p>
                      </div>
                    </div>
                    
                    {consultation.prescription && consultation.prescription !== 'N/A' && (
                      <div className="mt-4 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                        <p className="text-sm font-medium text-blue-400 mb-1">Prescription</p>
                        <p className="text-sm text-gray-300">{consultation.prescription}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          <div className="bg-linear-to-br from-red-900/10 to-rose-900/10 backdrop-blur-sm border border-red-500/20 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-linear-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Emergency Contact</h2>
                <p className="text-sm text-gray-400">Critical contact information</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <p className="text-sm text-gray-400 mb-2">Contact Name</p>
                <p className="text-xl font-bold">{reportData.emergency_contact.name}</p>
              </div>
              
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <p className="text-sm text-gray-400 mb-2">Contact Phone</p>
                <a 
                  href={`tel:${reportData.emergency_contact.phone}`}
                  className="text-xl font-bold text-rose-400 hover:text-rose-300 transition-colors"
                >
                  {reportData.emergency_contact.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Report Footer */}
          <div className="bg-linear-to-br from-gray-900/20 to-gray-800/20 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Confidential Medical Document</p>
                  <p className="text-sm text-gray-400">
                    Report generated on {new Date(reportData.generated_at).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={generatePDF}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                
                <button className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors">
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-linear-to-br from-indigo-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Details Modal */}
      {showDetailsModal && selectedCategory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={`p-6 border-b ${selectedCategory === 'allergies' ? 'border-red-500/30 bg-linear-to-br from-red-900/20 to-rose-900/10' : 'border-emerald-500/30 bg-linear-to-br from-emerald-900/20 to-green-900/10'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedCategory === 'medications' ? (
                    <div className="w-10 h-10 bg-linear-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                      <Pill className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-linear-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {selectedCategory === 'medications' ? 'Current Medications' : 'Known Allergies'}
                    </h2>
                    <p className="text-sm text-gray-400">
                      {selectedCategory === 'medications' 
                        ? `${reportData.medical_info.current_medications.length} medication${reportData.medical_info.current_medications.length !== 1 ? 's' : ''}`
                        : `${reportData.medical_info.allergies.length} allerg${reportData.medical_info.allergies.length !== 1 ? 'ies' : 'y'}`
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
              <div className="space-y-3">
                {selectedCategory === 'medications' ? (
                  reportData.medical_info.current_medications.map((med: any, idx: number) => {
                    const medName = typeof med === 'string' ? med : med.name;
                    return (
                      <div key={idx} className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-emerald-400">{idx + 1}</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white mb-1">{medName}</h3>
                            <p className="text-xs text-gray-400">
                              Last updated: {reportData.profile_last_updated ? 
                                new Date(reportData.profile_last_updated).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'N/A'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  reportData.medical_info.allergies.map((allergy: any, idx: number) => {
                    const allergyName = typeof allergy === 'string' ? allergy : allergy.name;
                    return (
                      <div key={idx} className="p-4 bg-red-500/5 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white mb-1">{allergyName}</h3>
                            <p className="text-xs text-gray-400">
                              Last updated: {reportData.profile_last_updated ? 
                                new Date(reportData.profile_last_updated).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'N/A'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-800">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => router.push('/profile')}
                  className="px-6 py-2 bg-linear-to-br from-indigo-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  Update Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}