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
      medicine_name, 
      concern_type, 
      description,
      preferred_datetime
    } = body;

    if (!consultation_id || !medicine_name || !concern_type || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await connectDB;
    const db = client.db();
    const consultationsCollection = db.collection('consultations');
    const usersCollection = db.collection('users');

    // Verify consultation exists and belongs to user
    const consultation = await consultationsCollection.findOne({
      _id: new ObjectId(consultation_id),
      patient_email: session.user.email
    });

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found or unauthorized' }, { status: 404 });
    }

    // Only allow editing rescheduled consultations
    if (consultation.status !== 'rescheduled') {
      return NextResponse.json({ 
        error: 'Can only edit rescheduled consultations' 
      }, { status: 400 });
    }

    // Update consultation - back to pending for doctor to review
    const updateData: any = {
      medicine_name,
      concern_type,
      description,
      status: 'pending', // Back to pending for doctor to review patient's counter-proposal
      scheduled_time: null, // Clear previous scheduled time
      reschedule_reason: null, // Clear previous reschedule reason
      requires_patient_confirmation: false, // Reset confirmation flag
      patient_requested_changes: true, // Flag to indicate patient modified after reschedule
      previous_scheduled_time: consultation.scheduled_time, // Keep track of what doctor suggested
      updated_at: new Date(),
      edit_count: (consultation.edit_count || 0) + 1,
      last_edited_at: new Date()
    };

    if (preferred_datetime) {
      updateData.preferred_datetime = new Date(preferred_datetime);
    }

    await consultationsCollection.updateOne(
      { _id: new ObjectId(consultation_id) },
      { $set: updateData }
    );

    // Get patient and doctor info for notifications
    const patient = await usersCollection.findOne({ email: session.user.email });
    const doctorApps = db.collection('doctor_applications');
    const doctor = await doctorApps.findOne({ email: consultation.doctor_email });

    // Send notifications
    try {
      // Email to patient
      await notificationService.sendEmail({
        to: session.user.email!,
        subject: 'Consultation Updated - MediAI',
        html: `
          <h2>Counter-Proposal Submitted</h2>
          <p>Dear ${consultation.patient_name},</p>
          <p>Your counter-proposal for a different consultation time has been submitted successfully.</p>
          <h3>Your Requested Details:</h3>
          <ul>
            <li><strong>Medicine:</strong> ${medicine_name}</li>
            <li><strong>Concern:</strong> ${concern_type}</li>
            <li><strong>Doctor:</strong> ${consultation.doctor_name}</li>
            ${preferred_datetime ? `<li><strong>Your Preferred Time:</strong> ${new Date(preferred_datetime).toLocaleString()}</li>` : ''}
          </ul>
          <p>Dr. ${consultation.doctor_name} will review your preferred time and either accept it or suggest an alternative.</p>
          <p>Best regards,<br/>MediAI Team</p>
        `
      });

      // In-app notification to patient
      await notificationService.createInAppNotification({
        userId: patient!._id.toString(),
        type: 'consultation_updated',
        title: 'Consultation Updated',
        message: `Your consultation request for ${medicine_name} has been updated and sent to Dr. ${consultation.doctor_name}.`,
        link: '/patient-consultations'
      });

      // Email to doctor
      await notificationService.sendEmail({
        to: consultation.doctor_email,
        subject: 'Updated Consultation Request - MediAI',
        html: `
          <h2>Patient Updated Consultation Request</h2>
          <p>Dear Dr. ${consultation.doctor_name},</p>
          <p>${consultation.patient_name} has updated their consultation request.</p>
          <h3>Updated Details:</h3>
          <ul>
            <li><strong>Medicine:</strong> ${medicine_name}</li>
            <li><strong>Concern Type:</strong> ${concern_type}</li>
            <li><strong>Description:</strong> ${description}</li>
            ${preferred_datetime ? `<li><strong>Preferred Time:</strong> ${new Date(preferred_datetime).toLocaleString()}</li>` : ''}
            <li><strong>Edit Count:</strong> ${updateData.edit_count}</li>
          </ul>
          <p>Please review and respond to this updated request.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/doctor-dashboard" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Request</a></p>
          <p>Best regards,<br/>MediAI Team</p>
        `
      });

      // In-app notification to doctor
      await notificationService.createInAppNotification({
        userId: doctor!._id.toString(),
        type: 'consultation_updated',
        title: 'Patient Updated Consultation',
        message: `${consultation.patient_name} has updated their consultation request for ${medicine_name}.`,
        link: '/doctor-dashboard'
      });

      // SMS to doctor (if enabled)
      if (doctor?.phone) {
        await notificationService.sendSMS({
          to: doctor.phone,
          message: `MediAI: ${consultation.patient_name} updated their consultation request for ${medicine_name}. Please review in your dashboard.`
        });
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({ 
      success: true,
      message: 'Consultation updated successfully',
      consultation_id
    });

  } catch (error: any) {
    console.error('Edit consultation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
