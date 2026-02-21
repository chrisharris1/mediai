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

    // Verify doctor
    const doctor = await usersCollection.findOne({ 
      email: session.user.email,
      role: 'doctor'
    });

    if (!doctor) {
      return NextResponse.json({ error: 'Only doctors can cancel consultations' }, { status: 403 });
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
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_by: 'doctor',
          cancelled_at: new Date(),
          updated_at: new Date()
        } 
      }
    );

    // Send notifications
    try {
      // Email to patient
      await notificationService.sendEmail({
        to: consultation.patient_email,
        subject: 'Consultation Cancelled - MediAI',
        html: `
          <h2>Consultation Cancelled</h2>
          <p>Dear ${consultation.patient_name},</p>
          <p>We regret to inform you that Dr. ${consultation.doctor_name} has cancelled your consultation request.</p>
          <h3>Cancellation Details:</h3>
          <ul>
            <li><strong>Medicine:</strong> ${consultation.medicine_name}</li>
            <li><strong>Concern:</strong> ${consultation.concern_type}</li>
            <li><strong>Reason:</strong> ${reason}</li>
          </ul>
          <p>You can request a consultation with another doctor from your dashboard.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/dashboard" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Dashboard</a></p>
          <p>Best regards,<br/>MediAI Team</p>
        `
      });

      // SMS to patient
      const patient = await usersCollection.findOne({ email: consultation.patient_email });
      if (patient?.profile?.phone) {
        await notificationService.sendSMS({
          to: patient.profile.phone,
          message: `Your consultation with Dr. ${consultation.doctor_name} has been cancelled. Reason: ${reason}. You can request another consultation from your dashboard.`
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
