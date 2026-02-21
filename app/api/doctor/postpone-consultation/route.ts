import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { notificationService } from '@/lib/notificationService';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      consultation_id, 
      new_scheduled_time, 
      reason 
    } = body;

    if (!consultation_id || !new_scheduled_time || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await connectDB;
    const db = client.db();
    const usersCollection = db.collection('users');
    const consultationsCollection = db.collection('consultations');

    // Verify doctor
    const doctor = await usersCollection.findOne({ 
      email: session.user.email,
      role: 'doctor'
    });

    if (!doctor) {
      return NextResponse.json({ error: 'Only doctors can postpone consultations' }, { status: 403 });
    }

    // Find consultation
    const consultation = await consultationsCollection.findOne({
      _id: new ObjectId(consultation_id),
      doctor_email: session.user.email
    });

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
    }

    // Update consultation
    await consultationsCollection.updateOne(
      { _id: new ObjectId(consultation_id) },
      { 
        $set: { 
          status: 'rescheduled',
          scheduled_time: new Date(new_scheduled_time),
          reschedule_reason: reason,
          rescheduled_by: 'doctor',
          rescheduled_at: new Date(),
          updated_at: new Date(),
          requires_patient_confirmation: true,
          patient_requested_changes: false, // Reset flag for new reschedule cycle
          previous_scheduled_time: null // Clear previous tracking
        } 
      }
    );

    // Send notifications
    try {
      // Email to patient
      await notificationService.sendEmail({
        to: consultation.patient_email,
        subject: 'Consultation Rescheduled - MediAI',
        html: `
          <h2>Consultation Time Updated</h2>
          <p>Dear ${consultation.patient_name},</p>
          <p>Dr. ${consultation.doctor_name} has requested to reschedule your consultation.</p>
          <h3>New Schedule Details:</h3>
          <ul>
            <li><strong>Original Time:</strong> ${consultation.scheduled_time ? new Date(consultation.scheduled_time).toLocaleString() : 'Not yet scheduled'}</li>
            <li><strong>New Proposed Time:</strong> ${new Date(new_scheduled_time).toLocaleString()}</li>
            <li><strong>Reason:</strong> ${reason}</li>
          </ul>
          <p>Please log in to your dashboard to confirm or suggest an alternative time.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/dashboard" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Respond Now</a></p>
          <p>Best regards,<br/>MediAI Team</p>
        `
      });

      // SMS to patient
      const patient = await usersCollection.findOne({ email: consultation.patient_email });
      if (patient?.profile?.phone) {
        await notificationService.sendSMS({
          to: patient.profile.phone,
          message: `Dr. ${consultation.doctor_name} has requested to reschedule your consultation to ${new Date(new_scheduled_time).toLocaleString()}. Please check your dashboard to confirm.`
        });
      }
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Consultation rescheduled successfully. Waiting for patient confirmation.',
      new_scheduled_time
    });

  } catch (error: any) {
    console.error('Error postponing consultation:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
