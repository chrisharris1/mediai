import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import MedicineLog from '@/models/MedicineLog';
import MedicineTracker from '@/models/MedicineTracker';

/**
 * POST /api/cron/mark-missed-doses
 * Cron job to automatically mark doses as missed when the scheduled time has passed
 * Runs every 15 minutes
 * Secured with CRON_SECRET
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Get current time
    const now = new Date();

    // Find all pending doses where scheduled time + 1 hour has passed
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const pendingDoses = await MedicineLog.find({
      status: 'pending',
      scheduled_time: { $lt: oneHourAgo }, // More than 1 hour past scheduled time
    });

    console.log(`📅 Cron Job - Found ${pendingDoses.length} pending doses to mark as missed`);

    let updatedCount = 0;
    const medicineUpdates: { [key: string]: boolean } = {};

    // Update each pending dose to missed
    for (const dose of pendingDoses) {
      dose.status = 'missed';
      dose.notes = dose.notes || '';
      dose.notes += dose.notes ? ' | Auto-marked as missed (1 hour past scheduled time)'
        : 'Auto-marked as missed (1 hour past scheduled time)';
      await dose.save();
      updatedCount++;

      // Track which medicines need adherence recalculation
      medicineUpdates[dose.medicine_tracker_id.toString()] = true;
    }

    // Recalculate adherence for affected medicines
    const medicineIds = Object.keys(medicineUpdates);
    for (const medicineId of medicineIds) {
      const medicine = await MedicineTracker.findById(medicineId);
      if (medicine) {
        await medicine.calculateAdherence();
        await medicine.save();
      }
    }

    console.log(`✅ Cron Job - Marked ${updatedCount} doses as missed, updated ${medicineIds.length} medicine trackers`);

    // PART 2: Auto-complete expired medicines
    // Find all active medicines where end_date has passed
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredMedicines = await MedicineTracker.find({
      status: 'active',
      end_date: { $lt: today }
    });

    console.log(`📅 Cron Job - Found ${expiredMedicines.length} expired medicines to complete`);

    let completedCount = 0;
    for (const medicine of expiredMedicines) {
      // Mark all remaining pending doses for this medicine as missed
      const pendingResult = await MedicineLog.updateMany(
        {
          medicine_tracker_id: medicine._id,
          status: 'pending'
        },
        {
          $set: {
            status: 'missed',
            notes: 'Auto-marked as missed (medicine course ended)',
            logged_via: 'auto_system'
          }
        }
      );

      // Update medicine status to completed
      medicine.status = 'completed';

      // Recalculate total doses (based on actual logs)
      const allLogs = await MedicineLog.find({ medicine_tracker_id: medicine._id });
      const takenCount = allLogs.filter((l: any) => l.status === 'taken').length;
      const totalLogs = allLogs.length;

      medicine.total_doses_taken = takenCount;
      medicine.total_doses_expected = totalLogs > 0 ? totalLogs : medicine.total_doses_expected;
      medicine.adherence_rate = totalLogs > 0 ? Math.round((takenCount / totalLogs) * 100) : 0;

      await medicine.save();
      completedCount++;

      console.log(`✅ Completed medicine: ${medicine.medicine_name} (${pendingResult.modifiedCount} pending doses marked missed)`);
    }

    console.log(`✅ Cron Job - Completed ${completedCount} expired medicines`);

    return NextResponse.json({
      success: true,
      message: `Marked ${updatedCount} doses as missed, completed ${completedCount} expired medicines`,
      dosesMarkedMissed: updatedCount,
      medicinesUpdated: medicineIds.length,
      medicinesCompleted: completedCount,
    });
  } catch (error: any) {
    console.error('❌ Cron Job Error:', error);
    return NextResponse.json(
      { error: 'Failed to mark missed doses', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for testing/manual trigger (with cron secret)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid cron secret' },
      { status: 401 }
    );
  }

  // Reuse POST logic
  return POST(req);
}
