import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { dbConnect } from '@/lib/mongodb';
import MedicineLog from '@/models/MedicineLog';
import MedicineTracker from '@/models/MedicineTracker';

/**
 * PATCH /api/medicines/log/[id]
 * Update a dose log entry (mark as taken or missed)
 * Only allows editing doses from today
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const { status, notes } = await req.json();

        if (!status || !['taken', 'missed', 'skipped'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be "taken", "missed", or "skipped"' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Find the dose log
        const doseLog = await MedicineLog.findOne({
            _id: id,
            user_id: session.user.id,
        });

        if (!doseLog) {
            return NextResponse.json({ error: 'Dose log not found' }, { status: 404 });
        }

        // Check if the dose is from today (allow editing today's doses only)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const scheduledDate = new Date(doseLog.scheduled_time);

        if (scheduledDate < today || scheduledDate >= tomorrow) {
            return NextResponse.json(
                { error: 'Can only edit doses from today' },
                { status: 400 }
            );
        }

        // Update the dose log
        const previousStatus = doseLog.status;
        doseLog.status = status;
        doseLog.actual_time = status === 'taken' ? new Date() : null;
        doseLog.notes = notes || doseLog.notes;
        doseLog.logged_via = 'manual_edit';

        await doseLog.save();

        // Update medicine tracker adherence stats
        const medicine = await MedicineTracker.findById(doseLog.medicine_tracker_id);
        if (medicine) {
            // If changing from missed/pending to taken, increment taken count
            if (status === 'taken' && previousStatus !== 'taken') {
                medicine.total_doses_taken = (medicine.total_doses_taken || 0) + 1;
            }
            // If changing from taken to missed/skipped, decrement taken count
            else if (previousStatus === 'taken' && status !== 'taken') {
                medicine.total_doses_taken = Math.max(0, (medicine.total_doses_taken || 0) - 1);
            }

            // Recalculate adherence rate
            if (medicine.total_doses_expected > 0) {
                medicine.adherence_rate = Math.round(
                    (medicine.total_doses_taken / medicine.total_doses_expected) * 100
                );
            }

            await medicine.save();
        }

        return NextResponse.json({
            success: true,
            message: `Dose marked as ${status}`,
            doseLog,
        });
    } catch (error: any) {
        console.error('Error updating dose log:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/medicines/log/[id]
 * Get a specific dose log entry
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const doseLog = await MedicineLog.findOne({
            _id: params.id,
            user_id: session.user.id,
        });

        if (!doseLog) {
            return NextResponse.json({ error: 'Dose log not found' }, { status: 404 });
        }

        return NextResponse.json({ doseLog });
    } catch (error: any) {
        console.error('Error fetching dose log:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
