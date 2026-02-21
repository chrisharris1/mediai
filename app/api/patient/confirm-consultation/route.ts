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
    const { consultation_id } = body;

    if (!consultation_id) {
      return NextResponse.json({ error: 'Missing consultation_id' }, { status: 400 });
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
      return NextResponse.json({ error: 'Only patients can confirm consultations' }, { status: 403 });
    }

    // Find consultation
    const consultation = await consultationsCollection.findOne({
      _id: new ObjectId(consultation_id),
      patient_email: session.user.email,
      requires_patient_confirmation: true
    });

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found or does not require confirmation' }, { status: 404 });
    }

    // Update consultation - Keep as rescheduled but mark patient confirmed
    await consultationsCollection.updateOne(
      { _id: new ObjectId(consultation_id) },
      { 
        $set: { 
          status: 'rescheduled',
          requires_patient_confirmation: false,
          awaiting_doctor_link: true,
          patient_confirmed_at: new Date(),
          updated_at: new Date()
        } 
      }
    );

    // Send notification to doctor
    try {
      await notificationService.sendEmail({
        to: consultation.doctor_email,
        subject: 'Patient Confirmed Consultation - MediAI',
        html: `
          <h2>Consultation Confirmed</h2>
          <p>Dear Dr. ${consultation.doctor_name},</p>
          <p>${consultation.patient_name} has confirmed the rescheduled consultation time.</p>
          <h3>Confirmed Details:</h3>
          <ul>
            <li><strong>Patient:</strong> ${consultation.patient_name}</li>
            <li><strong>Scheduled Time:</strong> ${new Date(consultation.scheduled_time).toLocaleString()}</li>
            <li><strong>Medicine:</strong> ${consultation.medicine_name}</li>
            <li><strong>Concern:</strong> ${consultation.concern_type}</li>
          </ul>
          <p>Please log in to your dashboard to accept the consultation and provide the meeting link.</p>
          <p>Best regards,<br/>MediAI Team</p>
        `
      });
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Consultation confirmed successfully'
    });

  } catch (error: any) {
    console.error('Error confirming consultation:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
