import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { dbConnect } from '@/lib/mongodb';
import MedicineTracker from '@/models/MedicineTracker';
import MedicineLog from '@/models/MedicineLog';
import { createScheduledDoses, deleteScheduledDoses, updateScheduledTimes } from '@/lib/medicineScheduler';

// GET - Fetch all medicines for user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // First, check and update any expired medicines
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find expired medicines that are still marked as active
    const expiredMedicines = await MedicineTracker.find({
      user_id: session.user.id,
      status: 'active',
      end_date: { $exists: true, $lt: today }
    });

    // Auto-complete expired medicines
    for (const medicine of expiredMedicines) {
      medicine.status = 'completed';

      // Mark remaining pending doses as missed
      await MedicineLog.updateMany(
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

      // Recalculate adherence
      const allLogs = await MedicineLog.find({ medicine_tracker_id: medicine._id });
      const takenCount = allLogs.filter((l: any) => l.status === 'taken').length;
      const totalLogs = allLogs.length;

      medicine.total_doses_taken = takenCount;
      medicine.total_doses_expected = totalLogs > 0 ? totalLogs : medicine.total_doses_expected;
      medicine.adherence_rate = totalLogs > 0 ? Math.round((takenCount / totalLogs) * 100) : 0;

      await medicine.save();
      console.log(`✅ Auto-completed expired medicine: ${medicine.medicine_name}`);
    }

    // Now fetch all medicines (including newly completed ones)
    const medicines = await MedicineTracker.find({
      user_id: session.user.id,
    }).sort({ created_at: -1 });

    return NextResponse.json({ medicines }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching medicines:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add new medicine
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      medicine_name,
      dosage,
      frequency,
      custom_schedule,
      times,
      start_date,
      end_date,
      instructions,
      prescribing_doctor,
      purpose,
      schedule_duration,
      notifications_enabled,
      notification_channels,
      phone_number,
    } = body;

    // Validation
    if (!medicine_name || !dosage || !frequency || !start_date || !times || times.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Calculate expected doses
    const startDate = new Date(start_date);
    const endDate = end_date ? new Date(end_date) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // Default 90 days
    const daysOfTreatment = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    let dosesPerDay = times.length;
    if (frequency === 'weekly') {
      dosesPerDay = times.length / 7;
    } else if (frequency === 'as_needed') {
      dosesPerDay = 0; // Don't calculate for as-needed
    }

    const total_doses_expected = Math.ceil(daysOfTreatment * dosesPerDay);

    const newMedicine = new MedicineTracker({
      user_id: session.user.id,
      medicine_name,
      dosage,
      frequency,
      custom_schedule,
      times,
      start_date: startDate,
      end_date: end_date ? new Date(end_date) : undefined,
      instructions,
      prescribing_doctor,
      purpose,
      notifications_enabled: notifications_enabled !== false,
      notification_channels: notification_channels || {
        in_app: true,
        email: false,
        sms: false,
      },
      phone_number,
      status: 'active',
      total_doses_expected,
      total_doses_taken: 0,
      adherence_rate: 0,
    });

    await newMedicine.save();

    // Generate scheduled logs using medicine scheduler
    const scheduleDays = schedule_duration || 30; // Default to 30 days
    await createScheduledDoses({
      userId: session.user.id,
      medicineId: newMedicine._id.toString(),
      medicineName: medicine_name,
      dosage: dosage,
      times: times,
      startDate: startDate,
      endDate: end_date,
      scheduleDuration: scheduleDays as 7 | 30 | 90,
    });

    console.log(`✅ Medicine added: ${medicine_name} with ${scheduleDays} days scheduled`);

    return NextResponse.json(
      { message: 'Medicine added successfully', medicine: newMedicine },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding medicine:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update medicine
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('📝 PUT medicine request body:', body);
    const { medicine_id, ...updates } = body;

    if (!medicine_id) {
      console.error('❌ Medicine ID missing in request');
      return NextResponse.json({ error: 'Medicine ID required' }, { status: 400 });
    }

    await dbConnect();

    const medicine = await MedicineTracker.findOne({
      _id: medicine_id,
      user_id: session.user.id,
    });

    if (!medicine) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 });
    }

    Object.assign(medicine, updates);
    await medicine.save();

    return NextResponse.json({ message: 'Medicine updated', medicine }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating medicine:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete medicine
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const medicine_id = searchParams.get('id');

    if (!medicine_id) {
      return NextResponse.json({ error: 'Medicine ID required' }, { status: 400 });
    }

    await dbConnect();

    const medicine = await MedicineTracker.findOneAndDelete({
      _id: medicine_id,
      user_id: session.user.id,
    });

    if (!medicine) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 });
    }

    // Delete associated logs
    await MedicineLog.deleteMany({
      medicine_tracker_id: medicine_id,
    });

    return NextResponse.json({ message: 'Medicine deleted' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting medicine:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

