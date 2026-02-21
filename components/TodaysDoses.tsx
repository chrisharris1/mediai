'use client';

import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiClock, FiAlertCircle, FiChevronRight } from 'react-icons/fi';

interface Medicine {
  _id: string;
  medicine_name: string;
  dosage: string;
  times: string[];
}

interface DoseLog {
  medicine_id: string;
  medicine_name: string;
  dosage: string;
  scheduled_time: string;
  status: 'pending' | 'taken' | 'missed';
  taken_at?: string;
}

export default function TodaysDoses() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [todaysDoses, setTodaysDoses] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      // Fetch today's scheduled doses from database (shows 30 min before scheduled time)
      const response = await fetch('/api/medicines/todays-doses');
      const data = await response.json();

      if (data.success) {
        const now = new Date();
        
        // Transform and filter doses - show 30 minutes before scheduled time
        const doses: DoseLog[] = data.doses
          .filter((dose: any) => {
            const scheduledTime = new Date(dose.scheduled_time);
            const reminderTime = new Date(scheduledTime.getTime() - 30 * 60 * 1000); // 30 min before
            
            // Show if:
            // 1. Already taken/missed (always show)
            // 2. Reminder time has passed (30 min before scheduled)
            return dose.status !== 'pending' || now >= reminderTime;
          })
          .map((dose: any) => ({
            medicine_id: dose.medicine_tracker_id,
            medicine_name: dose.medicine_name,
            dosage: dose.dosage || 'N/A',
            scheduled_time: new Date(dose.scheduled_time).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }),
            status: dose.status,
            taken_at: dose.actual_time,
          }));
        setTodaysDoses(doses);
      }
    } catch (error) {
      console.error('Error fetching doses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDoseAction = async (dose: DoseLog, status: 'taken' | 'missed') => {
    const doseKey = `${dose.medicine_id}-${dose.scheduled_time}`;
    setActionLoading(doseKey);

    try {
      const response = await fetch('/api/medicines/log-dose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_id: dose.medicine_id,
          scheduled_time: dose.scheduled_time,
          status: status,
          taken_at: status === 'taken' ? new Date().toISOString() : undefined,
          notes: status === 'missed' ? 'Marked as missed by user' : 'Taken as scheduled',
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the dose status locally
        setTodaysDoses(prev =>
          prev.map(d =>
            d.medicine_id === dose.medicine_id && d.scheduled_time === dose.scheduled_time
              ? { ...d, status, taken_at: status === 'taken' ? new Date().toISOString() : undefined }
              : d
          )
        );
      } else {
        alert('Failed to log dose: ' + data.message);
      }
    } catch (error) {
      console.error('Error logging dose:', error);
      alert('Failed to log dose');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'taken':
        return 'bg-green-900/30 text-green-300 border-green-700/50 shadow-green-900/20';
      case 'missed':
        return 'bg-red-900/30 text-red-300 border-red-700/50 shadow-red-900/20';
      case 'pending':
        return 'bg-blue-900/30 text-blue-300 border-blue-700/50 shadow-blue-900/20';
      default:
        return 'bg-gray-800/50 text-gray-300 border-gray-700/50';
    }
  };

  if (loading) {
    return (
      <button 
        className="w-full bg-linear-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg border border-indigo-500/50 p-4 hover:shadow-xl transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <FiClock className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-semibold text-sm">Today's Medications</h3>
              <p className="text-indigo-200 text-xs">Loading...</p>
            </div>
          </div>
        </div>
      </button>
    );
  }

  const pendingCount = todaysDoses.filter(d => d.status === 'pending').length;
  const takenCount = todaysDoses.filter(d => d.status === 'taken').length;
  const totalCount = todaysDoses.length;

  // Compact Summary Card
  if (!showModal) {
    return (
      <button 
        onClick={() => setShowModal(true)}
        className="w-full bg-linear-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg border border-indigo-500/50 p-4 hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2 group-hover:bg-white/30 transition-colors">
              <FiClock className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-semibold text-sm">Today's Medications</h3>
              {totalCount === 0 ? (
                <p className="text-indigo-200 text-xs">No doses scheduled</p>
              ) : (
                <p className="text-indigo-200 text-xs">
                  {pendingCount > 0 ? (
                    <span className="font-medium">{pendingCount} pending</span>
                  ) : (
                    <span>All done! ✓</span>
                  )}
                  {totalCount > 0 && <span className="opacity-75"> • {takenCount}/{totalCount} taken</span>}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <div className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                {pendingCount}
              </div>
            )}
            <FiChevronRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </button>
    );
  }

  // Full Modal View
  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
        <div className="bg-linear-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="sticky top-0 bg-linear-to-r from-indigo-600 to-purple-700 px-6 py-4 flex items-center justify-between border-b border-indigo-500/50">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2">
                <FiClock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Today's Medications</h2>
                <p className="text-indigo-200 text-sm">{pendingCount} pending • {takenCount} taken</p>
              </div>
            </div>
            <button 
              onClick={() => setShowModal(false)}
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {todaysDoses.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-800/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <FiAlertCircle className="w-10 h-10 text-gray-500" />
                </div>
                <p className="text-gray-400 text-lg font-medium">No doses scheduled for today</p>
                <p className="text-gray-500 text-sm mt-2">Your upcoming medication reminders will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
        {todaysDoses.map((dose, index) => {
          const doseKey = `${dose.medicine_id}-${dose.scheduled_time}`;
          const isLoading = actionLoading === doseKey;

          return (
            <div
              key={index}
              className={`border-2 rounded-xl p-5 transition-all backdrop-blur-sm shadow-lg ${getStatusColor(dose.status)}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{dose.medicine_name}</h3>
                  <p className="text-sm opacity-80 mb-2">💊 Dosage: {dose.dosage}</p>
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-800/50 rounded-lg px-3 py-1.5 flex items-center gap-2">
                      <FiClock className="w-4 h-4" />
                      <span className="text-sm font-semibold">{dose.scheduled_time}</span>
                    </div>
                  </div>
                  {dose.status === 'taken' && dose.taken_at && (
                    <p className="text-xs mt-2 opacity-75 bg-green-900/20 rounded px-2 py-1 inline-block">
                      ✓ Taken at: {new Date(dose.taken_at).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  {dose.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleDoseAction(dose, 'taken')}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        <FiCheck className="w-5 h-5" />
                        <span>Take</span>
                      </button>
                      <button
                        onClick={() => handleDoseAction(dose, 'missed')}
                        disabled={isLoading}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        <FiX className="w-5 h-5" />
                        <span>Miss</span>
                      </button>
                    </>
                  )}

                  {dose.status === 'taken' && (
                    <>
                      <div className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <FiCheck className="w-5 h-5" />
                        <span>Taken</span>
                      </div>
                      <button
                        onClick={() => handleDoseAction(dose, 'missed')}
                        disabled={isLoading}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                        title="Edit: Mark as Missed"
                      >
                        Edit
                      </button>
                    </>
                  )}

                  {dose.status === 'missed' && (
                    <>
                      <div className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <FiX className="w-5 h-5" />
                        <span>Missed</span>
                      </div>
                      <button
                        onClick={() => handleDoseAction(dose, 'taken')}
                        disabled={isLoading}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                        title="Edit: Mark as Taken"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
