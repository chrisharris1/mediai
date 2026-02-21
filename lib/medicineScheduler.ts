/**
 * Medicine Scheduler Library
 * Creates scheduled MedicineLog entries for automated tracking
 * Supports 7, 30, or 90 days ahead scheduling
 */

import MedicineLog from '@/models/MedicineLog';
import { IMedicineTracker } from '@/models/MedicineTracker';

interface ScheduleOptions {
  userId: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  times: string[]; // Array of times in "HH:MM" format
  startDate: Date;
  endDate?: Date;
  scheduleDuration: 7 | 30 | 90; // Days ahead to schedule
}

/**
 * Generate scheduled doses for a medicine
 * Creates MedicineLog entries in database for future doses
 */
export async function createScheduledDoses(options: ScheduleOptions): Promise<number> {
  const {
    userId,
    medicineId,
    medicineName,
    dosage,
    times,
    startDate,
    endDate,
    scheduleDuration
  } = options;

  const scheduledLogs: any[] = [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0); // Reset to midnight

  // Calculate end date based on schedule duration
  const scheduleEnd = new Date(start);
  scheduleEnd.setDate(scheduleEnd.getDate() + scheduleDuration);

  // If medicine has an end date and it's before schedule end, use that
  const finalEnd = endDate && new Date(endDate) < scheduleEnd 
    ? new Date(endDate) 
    : scheduleEnd;

  // Generate doses for each day
  let currentDate = new Date(start);
  
  while (currentDate <= finalEnd) {
    // Create a dose for each time slot
    for (const timeStr of times) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const scheduledTime = new Date(currentDate);
      scheduledTime.setHours(hours, minutes, 0, 0);

      // Only create if scheduled time is in the future
      if (scheduledTime > new Date()) {
        scheduledLogs.push({
          user_id: userId,
          medicine_tracker_id: medicineId,
          medicine_name: medicineName,
          scheduled_time: scheduledTime,
          status: 'pending',
          actual_time: null,
          notes: '',
          side_effects: [],
          logged_via: 'auto_scheduled',
          created_at: new Date(),
        });
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Bulk insert all scheduled doses
  if (scheduledLogs.length > 0) {
    await MedicineLog.insertMany(scheduledLogs);
    console.log(`✅ Created ${scheduledLogs.length} scheduled doses for ${medicineName}`);
  }

  return scheduledLogs.length;
}

/**
 * Extend schedule for existing medicine
 * Used when medicine is still active and needs more scheduled doses
 */
export async function extendSchedule(
  medicineId: string,
  additionalDays: 7 | 30 | 90
): Promise<number> {
  // Find the latest scheduled dose for this medicine
  const latestDose = await MedicineLog.findOne({
    medicine_tracker_id: medicineId,
  }).sort({ scheduled_time: -1 }).limit(1);

  if (!latestDose) {
    console.error('No existing doses found to extend');
    return 0;
  }

  const medicine: any = await (await import('@/models/MedicineTracker')).default.findById(medicineId);
  if (!medicine) {
    console.error('Medicine not found');
    return 0;
  }

  // Start from day after latest scheduled dose
  const startDate = new Date(latestDose.scheduled_time);
  startDate.setDate(startDate.getDate() + 1);

  return await createScheduledDoses({
    userId: medicine.user_id.toString(),
    medicineId: medicine._id.toString(),
    medicineName: medicine.medicine_name,
    dosage: medicine.dosage,
    times: medicine.times,
    startDate,
    endDate: medicine.end_date,
    scheduleDuration: additionalDays,
  });
}

/**
 * Auto-mark missed doses
 * Finds all pending doses that are past scheduled time + grace period
 * Marks them as missed automatically
 */
export async function autoMarkMissedDoses(gracePeriodMinutes: number = 30): Promise<number> {
  const cutoffTime = new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - gracePeriodMinutes);

  const result = await MedicineLog.updateMany(
    {
      status: 'pending',
      scheduled_time: { $lt: cutoffTime }
    },
    {
      $set: {
        status: 'missed',
        actual_time: null,
        notes: 'Auto-marked as missed',
        logged_via: 'auto_system'
      }
    }
  );

  console.log(`⏰ Auto-marked ${result.modifiedCount} doses as missed`);
  return result.modifiedCount;
}

/**
 * Get pending doses for a user (for notifications)
 * Returns doses that are scheduled in the next X minutes
 */
export async function getPendingDosesForReminders(
  minutesAhead: number = 60
): Promise<any[]> {
  const now = new Date();
  const futureTime = new Date(now.getTime() + minutesAhead * 60 * 1000);

  const pendingDoses = await MedicineLog.find({
    status: 'pending',
    scheduled_time: {
      $gte: now,
      $lte: futureTime
    }
  }).populate('medicine_tracker_id');

  return pendingDoses;
}

/**
 * Get today's doses for a user
 * Returns all doses scheduled for today (for dashboard display)
 */
export async function getTodaysDoses(userId: string): Promise<any[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const doses = await MedicineLog.find({
    user_id: userId,
    scheduled_time: {
      $gte: today,
      $lt: tomorrow
    }
  }).sort({ scheduled_time: 1 });

  return doses;
}

/**
 * Delete all scheduled doses for a medicine
 * Used when medicine is deleted or discontinued
 */
export async function deleteScheduledDoses(medicineId: string): Promise<number> {
  const result = await MedicineLog.deleteMany({
    medicine_tracker_id: medicineId,
    status: 'pending' // Only delete pending doses, keep history
  });

  console.log(`🗑️ Deleted ${result.deletedCount} pending doses for medicine ${medicineId}`);
  return result.deletedCount;
}

/**
 * Update scheduled doses when medicine times change
 * Deletes old pending doses and creates new ones
 */
export async function updateScheduledTimes(
  medicineId: string,
  newTimes: string[],
  scheduleDuration: 7 | 30 | 90 = 30
): Promise<number> {
  // Delete all future pending doses
  await deleteScheduledDoses(medicineId);

  // Recreate with new times
  const medicine: any = await (await import('@/models/MedicineTracker')).default.findById(medicineId);
  if (!medicine) return 0;

  return await createScheduledDoses({
    userId: medicine.user_id.toString(),
    medicineId: medicine._id.toString(),
    medicineName: medicine.medicine_name,
    dosage: medicine.dosage,
    times: newTimes,
    startDate: new Date(),
    endDate: medicine.end_date,
    scheduleDuration,
  });
}
