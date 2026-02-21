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
      meeting_link, 
      scheduled_time, 
      doctor_notes 
    } = body;

    if (!consultation_id || !meeting_link || !scheduled_time) {
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
      return NextResponse.json({ error: 'Only doctors can accept consultations' }, { status: 403 });
    }

    // Find consultation - allow both pending and rescheduled awaiting link
    const consultation = await consultationsCollection.findOne({
      _id: new ObjectId(consultation_id),
      doctor_email: session.user.email,
      $or: [
        { status: 'pending' },
        { status: 'rescheduled', awaiting_doctor_link: true }
      ]
    });

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found or already processed' }, { status: 404 });
    }

    // Update consultation
    const updateData: any = { 
      status: 'accepted',
      meeting_link,
      scheduled_time: new Date(scheduled_time),
      doctor_notes,
      updated_at: new Date(),
      patient_requested_changes: false, // Clear counter-proposal flag
      previous_scheduled_time: null // Clear previous time tracking
    };
    
    // If it was rescheduled, clear the awaiting_doctor_link flag
    if (consultation.status === 'rescheduled') {
      updateData.awaiting_doctor_link = false;
    }

    await consultationsCollection.updateOne(
      { _id: new ObjectId(consultation_id) },
      { $set: updateData }
    );

    // Send notifications
    try {
      // Email to patient
      await notificationService.sendEmail({
        to: consultation.patient_email,
        subject: 'Consultation Accepted - MediAI',
        html: `
          <h2>Your Consultation Has Been Accepted!</h2>
          <p>Dear ${consultation.patient_name},</p>
          <p>Great news! Dr. ${consultation.doctor_name} has ${consultation.status === 'rescheduled' ? 'confirmed the rescheduled consultation and provided the meeting link' : 'accepted your consultation request'}.</p>
          <h3>Consultation Details:</h3>
          <ul>
            <li><strong>Doctor:</strong> Dr. ${consultation.doctor_name}</li>
            <li><strong>Medicine:</strong> ${consultation.medicine_name}</li>
            <li><strong>Concern:</strong> ${consultation.concern_type}</li>
            <li><strong>Scheduled Time:</strong> ${new Date(scheduled_time).toLocaleString()}</li>
            <li><strong>Fee:</strong> ₹${consultation.consultation_fee}</li>
          </ul>
          ${doctor_notes ? `<p><strong>Doctor's Note:</strong> ${doctor_notes}</p>` : ''}
          <h3>Meeting Link:</h3>
          <p><a href="${meeting_link}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Join Consultation</a></p>
          <p>Please join the consultation at the scheduled time using the link above.</p>
          <p>Best regards,<br/>MediAI Team</p>
        `
      });

      // SMS to patient
      const patient = await usersCollection.findOne({ email: consultation.patient_email });
      if (patient?.profile?.phone) {
        await notificationService.sendSMS({
          to: patient.profile.phone,
          message: `Your consultation with Dr. ${consultation.doctor_name} has been accepted! Scheduled for ${new Date(scheduled_time).toLocaleString()}. Meeting link: ${meeting_link}`
        });
      }
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Consultation accepted successfully',
      meeting_link,
      scheduled_time
    });

  } catch (error: any) {
    console.error('Error accepting consultation:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
