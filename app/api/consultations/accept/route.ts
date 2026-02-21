import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { sendNotification } from '@/lib/notificationService';
import { generateConsultationRoom } from '@/lib/meetingLinkGenerator';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('id');

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
    }

    const body = await req.json();
    const { scheduledTime, meetingLink, doctorNotes } = body;

    if (!scheduledTime) {
      return NextResponse.json(
        { error: 'Scheduled time is required' },
        { status: 400 }
      );
    }

    // Generate meeting link if not provided (using Jitsi Meet - free video conferencing)
    const finalMeetingLink = meetingLink || generateConsultationRoom(requestId);

    // Update consultation request
    const consultationsCollection = db.collection('consultation_requests');
    const consultation = await consultationsCollection.findOneAndUpdate(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          status: 'accepted',
          scheduled_time: new Date(scheduledTime),
          meeting_link: finalMeetingLink,
          doctor_notes: doctorNotes,
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!consultation) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Get patient and doctor info
    const usersCollection = db.collection('users');
    const patient = await usersCollection.findOne({ _id: new ObjectId(consultation.patient_id) });
    const doctor = await usersCollection.findOne({ _id: new ObjectId(consultation.doctor_id) });

    if (!patient || !doctor) {
      return NextResponse.json(
        { error: 'Patient or doctor not found' },
        { status: 404 }
      );
    }

    // Create in-app notification
    const notificationsCollection = db.collection('notifications');
    await notificationsCollection.insertOne({
      user_id: patient._id,
      type: 'consultation_accepted',
      title: 'Consultation Accepted!',
      message: `Dr. ${doctor.full_name} has accepted your consultation request`,
      related_id: consultation._id,
      related_model: 'consultation_requests',
      is_read: false,
      sent_via: { in_app: true, email: false, sms: false },
      created_at: new Date(),
    });

    // Send email notification
    await sendNotification({
      to: patient.email,
      subject: '✅ Consultation Request Accepted',
      type: 'email',
      templateData: {
        title: 'Consultation Request Accepted!',
        message: `Dr. ${doctor.full_name} has accepted your consultation request.`,
        doctorName: doctor.full_name,
        appointmentTime: new Date(scheduledTime).toLocaleString(),
        meetingLink: finalMeetingLink,
      },
    });

    // Send SMS notification if phone available
    if (patient.profile?.phone) {
      await sendNotification({
        to: patient.profile.phone,
        type: 'sms',
        message: `MediAI: Dr. ${doctor.full_name} accepted your consultation! Appointment: ${new Date(scheduledTime).toLocaleString()}. Link: ${finalMeetingLink}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Consultation accepted',
      consultation,
    });
  } catch (error: any) {
    console.error('Accept consultation error:', error);
    return NextResponse.json(
      { error: 'Failed to accept consultation', details: error.message },
      { status: 500 }
    );
  }
}
