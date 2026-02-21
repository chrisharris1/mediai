'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Bell, Mail, MessageSquare } from 'lucide-react';

interface AddMedicineFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editData?: any;
}

interface TimeSlot {
  id: number;
  time: string;
}

export default function AddMedicineForm({ onClose, onSuccess, editData }: AddMedicineFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const isEditing = !!editData;
  
  // Form fields - Pre-fill if editing
  const [medicineName, setMedicineName] = useState(editData?.medicine_name || '');
  const [dosage, setDosage] = useState(editData?.dosage || '');
  const [frequency, setFrequency] = useState(editData?.frequency || 'daily');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(
    editData?.times?.map((time: string, idx: number) => ({ id: Date.now() + idx, time })) || [{ id: 1, time: '08:00' }]
  );
  const [startDate, setStartDate] = useState(editData?.start_date?.split('T')[0] || '');
  const [endDate, setEndDate] = useState(editData?.end_date?.split('T')[0] || '');
  const [instructions, setInstructions] = useState(editData?.instructions || '');
  const [prescribingDoctor, setPrescribingDoctor] = useState(editData?.prescribing_doctor || '');
  const [purpose, setPurpose] = useState(editData?.purpose || '');
  const [phoneNumber, setPhoneNumber] = useState(editData?.phone_number || '');
  const [scheduleDuration, setScheduleDuration] = useState<7 | 30 | 90>(editData?.schedule_duration || 30);
  
  // Notification settings - Pre-fill if editing
  const [notificationsEnabled, setNotificationsEnabled] = useState(editData?.notifications_enabled ?? true);
  const [inAppNotif, setInAppNotif] = useState(editData?.notification_channels?.in_app ?? true);
  const [emailNotif, setEmailNotif] = useState(editData?.notification_channels?.email ?? true);
  const [smsNotif, setSmsNotif] = useState(editData?.notification_channels?.sms ?? false);
  
  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { id: Date.now(), time: '08:00' }]);
  };

  const removeTimeSlot = (id: number) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter(slot => slot.id !== id));
    }
  };

  const updateTimeSlot = (id: number, time: string) => {
    setTimeSlots(timeSlots.map(slot => slot.id === id ? { ...slot, time } : slot));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!medicineName.trim()) {
      errors.medicineName = 'Medicine name is required';
    }

    if (!dosage.trim()) {
      errors.dosage = 'Dosage is required';
    }

    if (!startDate) {
      errors.startDate = 'Start date is required';
    }

    if (timeSlots.some(slot => !slot.time)) {
      errors.timeSlots = 'All time slots must have a valid time';
    }

    if (smsNotif && !phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required for SMS notifications';
    }

    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      errors.endDate = 'End date must be after start date';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      setError('Please fix the errors below');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/medicines/tracker', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEditing && { id: editData._id }),
          medicine_name: medicineName,
          dosage,
          frequency,
          times: timeSlots.map(slot => slot.time),
          start_date: startDate,
          end_date: endDate || undefined,
          instructions,
          prescribing_doctor: prescribingDoctor,
          purpose,
          schedule_duration: scheduleDuration,
          notifications_enabled: notificationsEnabled,
          notification_channels: {
            in_app: inAppNotif,
            email: emailNotif,
            sms: smsNotif
          },
          phone_number: smsNotif ? phoneNumber : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'add'} medicine`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to ${isEditing ? 'update' : 'add'} medicine. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
        {/* Header */}
        <div className="sticky top-0 bg-linear-to-r from-blue-600 to-purple-600 p-6 flex items-center justify-between border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">{isEditing ? 'Edit Medicine' : 'Add New Medicine'}</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Medicine Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Medicine Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              className={`w-full px-4 py-3 bg-slate-800/50 border ${fieldErrors.medicineName ? 'border-red-500' : 'border-white/10'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
              placeholder="e.g., Aspirin, Metformin"
            />
            {fieldErrors.medicineName && (
              <p className="text-red-400 text-sm mt-1">{fieldErrors.medicineName}</p>
            )}
          </div>

          {/* Dosage */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dosage <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className={`w-full px-4 py-3 bg-slate-800/50 border ${fieldErrors.dosage ? 'border-red-500' : 'border-white/10'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
              placeholder="e.g., 500mg, 1 tablet, 5ml"
            />
            {fieldErrors.dosage && (
              <p className="text-red-400 text-sm mt-1">{fieldErrors.dosage}</p>
            )}
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Frequency <span className="text-red-400">*</span>
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="daily">Daily</option>
              <option value="twice_daily">Twice Daily</option>
              <option value="thrice_daily">Thrice Daily</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Schedule Duration */}
          {frequency === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Schedule Duration <span className="text-red-400">*</span>
              </label>
              <select
                value={scheduleDuration}
                onChange={(e) => setScheduleDuration(Number(e.target.value) as 7 | 30 | 90)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value={7}>7 Days (1 Week)</option>
                <option value={30}>30 Days (1 Month) - Recommended</option>
                <option value={90}>90 Days (3 Months)</option>
              </select>
              <p className="text-gray-400 text-xs mt-2">
                📅 How many days ahead should we schedule your medicine reminders?
              </p>
            </div>
          )}

          {/* 
          {/* Time Slots */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Time Slots <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2">
              {timeSlots.map((slot) => (
                <div key={slot.id} className="flex gap-2">
                  <input
                    type="time"
                    value={slot.time}
                    onChange={(e) => updateTimeSlot(slot.id, e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {timeSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(slot.id)}
                      className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {fieldErrors.timeSlots && (
              <p className="text-red-400 text-sm mt-1">{fieldErrors.timeSlots}</p>
            )}
            <button
              type="button"
              onClick={addTimeSlot}
              className="mt-2 flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Time Slot
            </button>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-800/50 border ${fieldErrors.startDate ? 'border-red-500' : 'border-white/10'} rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors`}
              />
              {fieldErrors.startDate && (
                <p className="text-red-400 text-sm mt-1">{fieldErrors.startDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-800/50 border ${fieldErrors.endDate ? 'border-red-500' : 'border-white/10'} rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors`}
              />
              {fieldErrors.endDate && (
                <p className="text-red-400 text-sm mt-1">{fieldErrors.endDate}</p>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              placeholder="e.g., Take with food, before bed, etc."
            />
          </div>

          {/* Prescribing Doctor */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Prescribing Doctor
            </label>
            <input
              type="text"
              value={prescribingDoctor}
              onChange={(e) => setPrescribingDoctor(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Dr. Name"
            />
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Purpose/Condition
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="e.g., Blood pressure, Pain relief"
            />
          </div>

          {/* Notifications Section */}
          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Notification Settings</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-slate-800 checked:bg-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-gray-300">Enable Reminders</span>
              </label>
            </div>

            {notificationsEnabled && (
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={inAppNotif}
                    onChange={(e) => setInAppNotif(e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-slate-800 checked:bg-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <Bell className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-300">In-App Notifications</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={emailNotif}
                    onChange={(e) => setEmailNotif(e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-slate-800 checked:bg-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <Mail className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Email Notifications</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={smsNotif}
                    onChange={(e) => setSmsNotif(e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-slate-800 checked:bg-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-300">SMS Notifications</span>
                </label>

                {smsNotif && (
                  <div className="ml-8 mt-2">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className={`w-full px-4 py-3 bg-slate-800/50 border ${fieldErrors.phoneNumber ? 'border-red-500' : 'border-white/10'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                      placeholder="+1234567890"
                    />
                    {fieldErrors.phoneNumber && (
                      <p className="text-red-400 text-sm mt-1">{fieldErrors.phoneNumber}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-700/50 text-gray-300 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? `${isEditing ? 'Updating' : 'Adding'} Medicine...` : `${isEditing ? 'Update' : 'Add'} Medicine`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

