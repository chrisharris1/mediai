import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { ObjectId } from 'mongodb';
import { sendNotification } from '@/lib/notificationService';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { applicationId, action, reason } = await request.json();

    if (!applicationId || !action) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const applicationsCollection = db.collection('doctor_applications');
    const usersCollection = db.collection('users');

    // Get application
    const application = await applicationsCollection.findOne({ _id: new ObjectId(applicationId) });
    if (!application) {
      return NextResponse.json(
        { success: false, message: 'Application not found' },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      // Update application status in MongoDB
      await applicationsCollection.updateOne(
        { _id: new ObjectId(applicationId) },
        {
          $set: {
            status: 'approved',
            reviewed_at: new Date(),
            reviewed_by: session.user.email,
          },
        }
      );

      // Update user role from pending_doctor to doctor in MongoDB
      await usersCollection.updateOne(
        { email: application.email },
        {
          $set: {
            role: 'doctor',
            is_active: true,
          },
        }
      );

      // Create audit log in MongoDB
      await db.collection('audit_logs').insertOne({
        action: 'doctor_approved',
        performed_by: session.user.email,
        target_user: application.email,
        application_id: new ObjectId(applicationId),
        timestamp: new Date(),
        details: {
          doctor_name: application.full_name,
          specialization: application.specialization,
        },
      });

      // Send approval EMAIL to doctor
      try {
        console.log('📧 Sending approval email to:', application.email);
        await sendNotification({
          to: application.email,
          subject: '🎉 Application Approved - Welcome to MediAI!',
          type: 'email',
          templateData: {
            title: 'Your Application Has Been Approved!',
            message: `Congratulations ${application.full_name}! Your application has been approved. You can now login to MediAI and start accepting patient consultations. Welcome to the team!`,
            doctorName: application.full_name,
            actionUrl: `${process.env.NEXTAUTH_URL}/login`,
          },
        });
      } catch (error: any) {
        console.error('⚠️ Failed to send approval email:', error.message);
      }

      // Send approval SMS to doctor
      try {
        if (application.phone) {
          console.log('📱 Sending approval SMS to:', application.phone);
          await sendNotification({
            to: application.phone,
            type: 'sms',
            message: `MediAI: Congratulations ${application.full_name}! Your application has been APPROVED. Login now at ${process.env.NEXTAUTH_URL}/login to start accepting consultations!`,
          });
        }
      } catch (error: any) {
        console.error('⚠️ Failed to send approval SMS:', error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Doctor approved successfully',
      });

    } else if (action === 'reject') {
      // Update application status in MongoDB
      await applicationsCollection.updateOne(
        { _id: new ObjectId(applicationId) },
        {
          $set: {
            status: 'rejected',
            reviewed_at: new Date(),
            reviewed_by: session.user.email,
            rejection_reason: reason || 'Not specified',
          },
        }
      );

      // Keep user as pending_doctor or delete account
      await usersCollection.updateOne(
        { email: application.email },
        {
          $set: {
            is_active: false,
          },
        }
      );

      // Create audit log in MongoDB
      await db.collection('audit_logs').insertOne({
        action: 'doctor_rejected',
        performed_by: session.user.email,
        target_user: application.email,
        application_id: new ObjectId(applicationId),
        timestamp: new Date(),
        details: {
          doctor_name: application.full_name,
          reason: reason || 'Not specified',
        },
      });

      // Send rejection EMAIL to doctor
      try {
        console.log('📧 Sending rejection email to:', application.email);
        const rejectionMessage = reason 
          ? `Dear ${application.full_name}, your application has been rejected.\n\nReason for rejection by MediAI Team: ${reason}\n\nIf you believe this is a mistake or would like to reapply with updated information, please contact our support team.`
          : `Dear ${application.full_name}, your application has been rejected. If you believe this is a mistake or would like to reapply with updated information, please contact our support team.`;
        
        await sendNotification({
          to: application.email,
          subject: '❌ Application Update - MediAI',
          type: 'email',
          templateData: {
            title: 'Application Status Update',
            message: rejectionMessage,
            doctorName: application.full_name,
          },
        });
      } catch (error: any) {
        console.error('⚠️ Failed to send rejection email:', error.message);
      }

      // Send rejection SMS to doctor
      try {
        if (application.phone) {
          console.log('📱 Sending rejection SMS to:', application.phone);
          const smsMessage = reason
            ? `MediAI: Dear ${application.full_name}, your application has been REJECTED. Reason: ${reason}. Check your email for more details.`
            : `MediAI: Dear ${application.full_name}, your application has been REJECTED. Check your email for more details.`;
          
          await sendNotification({
            to: application.phone,
            type: 'sms',
            message: smsMessage,
          });
        }
      } catch (error: any) {
        console.error('⚠️ Failed to send rejection SMS:', error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Application rejected',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error processing application:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to process application' },
      { status: 500 }
    );
  }
}
