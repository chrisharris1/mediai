import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { dbConnect } from '@/lib/mongodb';
import { getTodaysDoses } from '@/lib/medicineScheduler';
import MedicineTracker from '@/models/MedicineTracker';

/**
 * GET /api/medicines/todays-doses
 * Fetch all scheduled doses for today from database
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get today's doses from database
    const doses = await getTodaysDoses(session.user.id);

    // Enrich with medicine data (dosage) and add canEdit flag
    const now = new Date();
    const enrichedDoses = await Promise.all(
      doses.map(async (dose) => {
        const medicine = await MedicineTracker.findById(dose.medicine_tracker_id);
        const scheduledTime = new Date(dose.scheduled_time);

        // Can edit if:
        // 1. Dose is from today (already filtered by getTodaysDoses)
        // 2. Scheduled time has passed OR status is not pending
        const canEdit = scheduledTime < now || dose.status !== 'pending';

        return {
          ...dose.toObject(),
          dosage: medicine?.dosage || 'N/A',
          canEdit,
        };
      })
    );

    return NextResponse.json({
      success: true,
      doses: enrichedDoses
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching todays doses:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
