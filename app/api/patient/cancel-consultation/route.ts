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
      reason 
    } = body;

    if (!consultation_id || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await connectDB;
    const db = client.db();
    const usersCollection = db.collection('users');
    const consultationsCollection = db.collection('consultations');

    // Verify patient
    const patient = await usersCollection.findOne({ 
      email: session.user.email,
      role: 'patient'
    });

    if (!patient) {
      return NextResponse.json({ error: 'Only patients can cancel consultations' }, { status: 403 });
    }

    // Find consultation
    const consultation = await consultationsCollection.findOne({
      _id: new ObjectId(consultation_id),
      patient_email: session.user.email
    });

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
    }

    // Update consultation
    await consultationsCollection.updateOne(
      { _id: new ObjectId(consultation_id) },
      { 
        $set: { 
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_by: 'patient',
          cancelled_at: new Date(),
          updated_at: new Date()
        } 
      }
    );

    // Send notifications to both doctor and patient
    try {
      // Email to doctor
      await notificationService.sendEmail({
        to: consultation.doctor_email,
        subject: 'Patient Cancelled Consultation - MediAI',
        html: `
          <h2>Consultation Cancelled</h2>
          <p>Dear Dr. ${consultation.doctor_name},</p>
          <p>${consultation.patient_name} has cancelled their consultation request.</p>
          <h3>Cancellation Details:</h3>
          <ul>
            <li><strong>Patient:</strong> ${consultation.patient_name}</li>
            <li><strong>Medicine:</strong> ${consultation.medicine_name}</li>
            <li><strong>Concern:</strong> ${consultation.concern_type}</li>
            <li><strong>Reason:</strong> ${reason}</li>
          </ul>
          <p>This consultation has been removed from your pending queue.</p>
          <p>Best regards,<br/>MediAI Team</p>
        `
      });

      // Confirmation email to patient
      await notificationService.sendEmail({
        to: consultation.patient_email,
        subject: 'Consultation Cancelled - MediAI',
        html: `
          <h2>Consultation Cancelled</h2>
          <p>Dear ${consultation.patient_name},</p>
          <p>Your consultation with Dr. ${consultation.doctor_name} has been successfully cancelled.</p>
          <p>You can request a new consultation anytime from your dashboard.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/dashboard" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Go to Dashboard</a></p>
          <p>Best regards,<br/>MediAI Team</p>
        `
      });

      // SMS to doctor
      const doctor = await usersCollection.findOne({ email: consultation.doctor_email });
      if (doctor?.profile?.phone) {
        await notificationService.sendSMS({
          to: doctor.profile.phone,
          message: `Patient ${consultation.patient_name} has cancelled their consultation. Reason: ${reason}`
        });
      }
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Consultation cancelled successfully'
    });

  } catch (error: any) {
    console.error('Error cancelling consultation:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
