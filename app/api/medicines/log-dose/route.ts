import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { dbConnect } from '@/lib/mongodb';
import MedicineLog from '@/models/MedicineLog';
import MedicineTracker from '@/models/MedicineTracker';

// GET - Get dose log for a specific medicine and time
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const medicine_id = searchParams.get('medicine_id');
    const scheduled_time = searchParams.get('scheduled_time');

    // If specific medicine and time requested, find that specific log
    if (medicine_id && scheduled_time) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Parse the time string (HH:MM) and create a date for today
      const [hours, minutes] = scheduled_time.split(':');
      const scheduledDate = new Date(today);
      scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Find log within a 5-minute window to account for slight timing differences
      const startWindow = new Date(scheduledDate.getTime() - 2.5 * 60 * 1000);
      const endWindow = new Date(scheduledDate.getTime() + 2.5 * 60 * 1000);

      const existingLog = await MedicineLog.findOne({
        user_id: session.user.id,
        medicine_tracker_id: medicine_id,
        scheduled_time: {
          $gte: startWindow,
          $lt: endWindow,
        },
      });

      return NextResponse.json({ success: true, data: existingLog }, { status: 200 });
    }

    // Otherwise, return today's pending doses
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pendingLogs = await MedicineLog.find({
      user_id: session.user.id,
      scheduled_time: {
        $gte: today,
        $lt: tomorrow,
      },
      status: 'pending',
    }).sort({ scheduled_time: 1 });

    return NextResponse.json({ success: true, pending_doses: pendingLogs }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching doses:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Log a dose (taken/missed/skipped)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { medicine_id, scheduled_time, status, taken_at, notes, side_effects } = body;

    console.log('📝 Log dose request:', { medicine_id, scheduled_time, status });

    if (!medicine_id || !scheduled_time || !status) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();

    // Parse the time string (HH:MM) and create a date for today
    const [hours, minutes] = scheduled_time.split(':');
    const scheduledDate = new Date();
    scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Check if log already exists for today (within 5-minute window)
    const startWindow = new Date(scheduledDate.getTime() - 2.5 * 60 * 1000);
    const endWindow = new Date(scheduledDate.getTime() + 2.5 * 60 * 1000);

    const existingLog = await MedicineLog.findOne({
      user_id: session.user.id,
      medicine_tracker_id: medicine_id,
      scheduled_time: {
        $gte: startWindow,
        $lt: endWindow,
      },
    });

    if (existingLog) {
      // Update existing log
      existingLog.status = status;
      if (taken_at) existingLog.actual_time = new Date(taken_at);
      if (notes) existingLog.notes = notes;
      if (side_effects) existingLog.side_effects = side_effects;
      await existingLog.save();

      // Update medicine tracker stats
      const medicine = await MedicineTracker.findById(medicine_id);
      if (medicine) {
        if (status === 'taken') {
          medicine.total_doses_taken = (medicine.total_doses_taken || 0) + 1;
        }
        medicine.calculateAdherence();
        await medicine.save();
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Dose log updated', 
        data: existingLog 
      }, { status: 200 });
    }

    // Create new log
    const newLog = await MedicineLog.create({
      user_id: session.user.id,
      medicine_tracker_id: medicine_id,
      medicine_name: (await MedicineTracker.findById(medicine_id))?.medicine_name || 'Unknown',
      scheduled_time: scheduledDate,
      status,
      actual_time: taken_at ? new Date(taken_at) : null,
      notes: notes || '',
      side_effects: side_effects || [],
      logged_via: 'manual',
    });

    // Update medicine tracker stats
    const medicine = await MedicineTracker.findById(medicine_id);
    if (medicine) {
      if (status === 'taken') {
        medicine.total_doses_taken = (medicine.total_doses_taken || 0) + 1;
      }
      medicine.calculateAdherence();
      await medicine.save();
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Dose logged successfully', 
      data: newLog 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error logging dose:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


