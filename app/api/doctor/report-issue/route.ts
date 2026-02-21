import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { notificationService } from '@/lib/notificationService';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      feature_name,
      issue_type,
      description,
      expected_output,
      actual_output
    } = body;

    if (!feature_name || !issue_type || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await connectDB;
    const db = client.db();
    
    // Get doctor info
    const doctorApps = db.collection('doctor_applications');
    const doctor = await doctorApps.findOne({ email: session.user.email });

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // Create report
    const reportsCollection = db.collection('doctor_reports');
    const report = {
      doctor_id: doctor._id.toString(),
      doctor_name: doctor.full_name || doctor.name,
      doctor_email: session.user.email,
      feature_name,
      issue_type,
      description,
      expected_output: expected_output || null,
      actual_output: actual_output || null,
      status: 'pending',
      admin_response: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await reportsCollection.insertOne(report);

    // Get admin users
    const usersCollection = db.collection('users');
    const admins = await usersCollection.find({ role: 'admin' }).toArray();

    // Send notifications to all admins
    for (const admin of admins) {
      try {
        // Email notification
        await notificationService.sendEmail({
          to: admin.email,
          subject: `New Doctor Report: ${feature_name} - MediAI`,
          html: `
            <h2>New Issue Report from Doctor</h2>
            <p>A doctor has reported an issue that requires your attention.</p>
            <h3>Report Details:</h3>
            <ul>
              <li><strong>Doctor:</strong> ${doctor.full_name || doctor.name}</li>
              <li><strong>Email:</strong> ${session.user.email}</li>
              <li><strong>Feature:</strong> ${feature_name}</li>
              <li><strong>Issue Type:</strong> ${issue_type}</li>
              <li><strong>Description:</strong> ${description}</li>
              ${expected_output ? `<li><strong>Expected:</strong> ${expected_output}</li>` : ''}
              ${actual_output ? `<li><strong>Actual:</strong> ${actual_output}</li>` : ''}
            </ul>
            <p><a href="${process.env.NEXTAUTH_URL}/admin/doctor-reports" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Report</a></p>
            <p>Please review and respond to this report.</p>
            <p>Best regards,<br/>MediAI System</p>
          `
        });

        // In-app notification
        await notificationService.createInAppNotification({
          userId: admin._id.toString(),
          type: 'doctor_report',
          title: 'New Doctor Report',
          message: `Dr. ${doctor.full_name || doctor.name} reported an issue with ${feature_name}`,
          link: '/admin/doctor-reports'
        });
      } catch (notifError) {
        console.error('Error sending notification to admin:', notifError);
      }
    }

    // Send confirmation to doctor
    try {
      await notificationService.sendEmail({
        to: session.user.email!,
        subject: 'Report Submitted - MediAI',
        html: `
          <h2>Thank You for Your Report</h2>
          <p>Dear Dr. ${doctor.full_name || doctor.name},</p>
          <p>We have received your report about <strong>${feature_name}</strong>.</p>
          <h3>Your Report:</h3>
          <ul>
            <li><strong>Issue Type:</strong> ${issue_type}</li>
            <li><strong>Description:</strong> ${description}</li>
          </ul>
          <p>Our admin team will review this and respond within 24-48 hours.</p>
          <p>You'll receive updates via email and in your dashboard.</p>
          <p>Thank you for helping us improve MediAI!</p>
          <p>Best regards,<br/>MediAI Team</p>
        `
      });

      await notificationService.createInAppNotification({
        userId: doctor._id.toString(),
        type: 'report_submitted',
        title: 'Report Submitted',
        message: `Your report about ${feature_name} has been submitted successfully. Admin will review soon.`,
        link: '/doctor-dashboard'
      });
    } catch (notifError) {
      console.error('Error sending confirmation to doctor:', notifError);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Report submitted successfully',
      report_id: result.insertedId.toString()
    });

  } catch (error: any) {
    console.error('Report issue error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
