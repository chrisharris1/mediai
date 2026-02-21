import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Use ADMIN_EMAIL or NEXT_PUBLIC_ADMIN_EMAIL or default
    const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'mediai.health26@gmail.com';

    console.log('🔍 Admin Users API - Session:', {
      email: session?.user?.email,
      role: session?.user?.role,
      adminEmail: adminEmail
    });

    // Check if user is admin
    if (!session?.user?.email) {
      console.error('❌ No session email found');
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Not logged in' },
        { status: 401 }
      );
    }

    if (session.user.email !== adminEmail) {
      console.error('❌ Not admin email:', session.user.email, 'vs', adminEmail);
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    console.log('✅ Admin authorization passed');

    const client = await connectDB;
    const db = client.db();
    const usersCollection = db.collection('users');
    const doctorApplicationsCollection = db.collection('doctor_applications');

    console.log('🔍 Fetching users from MongoDB...');

    // Get all users
    const users = await usersCollection
      .find({})
      .project({
        password: 0, // Exclude password from results
      })
      .sort({ created_at: -1 })
      .toArray();

    // Get pending doctor applications (not already in users collection)
    const pendingApplications = await doctorApplicationsCollection
      .find({ status: 'pending' })
      .sort({ applied_at: -1 })
      .toArray();

    console.log('✅ Found users:', users.length);
    console.log('✅ Found pending applications:', pendingApplications.length);

    // Filter out duplicate applications (those already in users)
    const userEmails = new Set(users.map((u: any) => u.email));
    const uniquePendingApplications = pendingApplications.filter(
      (app: any) => !userEmails.has(app.email)
    );

    console.log('✅ Unique pending applications:', uniquePendingApplications.length);

    // Merge pending applications into users list
    const allUsers = [
      ...users.map((u: any) => ({
        _id: u._id.toString(),
        email: u.email,
        full_name: u.full_name || u.name || 'N/A',
        role: u.role || 'patient',
        is_active: u.is_active !== false,
        created_at: u.created_at || new Date(),
        oauth_provider: u.oauth_provider || null,
        source: 'users'
      })),
      ...uniquePendingApplications.map((app: any) => ({
        _id: app._id.toString(),
        email: app.email,
        full_name: app.full_name || 'N/A',
        role: 'pending_doctor',
        is_active: false,
        created_at: app.applied_at || new Date(),
        oauth_provider: null,
        source: 'doctor_applications'
      }))
    ];

    // Calculate statistics
    const stats = {
      totalUsers: users.length + pendingApplications.length,
      totalPatients: users.filter((u: any) => u.role === 'patient').length,
      totalDoctors: users.filter((u: any) => u.role === 'doctor').length,
      pendingDoctors: pendingApplications.length,
      activeUsers: users.filter((u: any) => u.is_active !== false).length,
      adminUsers: users.filter((u: any) => u.role === 'admin').length,
    };

    console.log('📊 Stats:', stats);

    return NextResponse.json({
      success: true,
      users: allUsers,
      stats,
    });
  } catch (error: any) {
    console.error('❌ Error fetching users:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { userId, action } = await request.json();

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, message: 'User ID and action are required' },
        { status: 400 }
      );
    }

    const client = await connectDB;
    const db = client.db();
    const usersCollection = db.collection('users');
    const doctorApplicationsCollection = db.collection('doctor_applications');
    const { ObjectId } = require('mongodb');
    const { sendNotification } = require('@/lib/notificationService');

    if (action === 'toggle_active') {
      // Toggle user active status
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }

      const newStatus = !user.is_active;
      await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { is_active: newStatus } }
      );

      return NextResponse.json({
        success: true,
        message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
        is_active: newStatus,
      });
    }

    if (action === 'approve_doctor') {
      // Try to find in doctor_applications first
      let doctorApp = await doctorApplicationsCollection.findOne({ _id: new ObjectId(userId) });
      let user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      
      if (!doctorApp && !user) {
        return NextResponse.json(
          { success: false, message: 'Doctor not found' },
          { status: 404 }
        );
      }

      const doctorEmail = doctorApp?.email || user?.email;
      const doctorName = doctorApp?.full_name || user?.full_name;
      const doctorPhone = doctorApp?.phone || user?.phone;

      // Update application status if exists
      if (doctorApp) {
        await doctorApplicationsCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { status: 'approved', reviewed_at: new Date(), reviewed_by: session.user.email } }
        );
      }

      // Update or create user record
      if (user) {
        // User already exists, just update role and status
        await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { role: 'doctor', is_active: true } }
        );
      } else if (doctorApp) {
        // Check if user with this email already exists
        const existingUser = await usersCollection.findOne({ email: doctorApp.email });
        
        if (existingUser) {
          // Update existing user instead of creating new one
          await usersCollection.updateOne(
            { email: doctorApp.email },
            { 
              $set: { 
                role: 'doctor', 
                is_active: true,
                'profile.phone': doctorApp.phone,
                'profile.specialization': doctorApp.specialization,
                'profile.medical_license_number': doctorApp.medical_license_number,
              } 
            }
          );
        } else {
          // Create new user from application
          await usersCollection.insertOne({
            email: doctorApp.email,
            password: doctorApp.password,
            full_name: doctorApp.full_name,
            role: 'doctor',
            is_active: true,
            created_at: new Date(),
            profile: {
              phone: doctorApp.phone,
              specialization: doctorApp.specialization,
              medical_license_number: doctorApp.medical_license_number,
            },
          });
        }
      }

      // Send approval email
      try {
        await sendNotification({
          to: doctorEmail,
          subject: '🎉 Your Doctor Application has been Approved!',
          type: 'email',
          templateData: {
            title: 'Application Approved',
            message: `Congratulations ${doctorName}! Your doctor registration has been approved. You can now log in and start accepting patient consultations.`,
            doctorName: doctorName,
            actionUrl: `${process.env.NEXTAUTH_URL}/login`,
          },
        });
      } catch (error) {
        console.error('Failed to send approval email:', error);
      }

      // Send SMS if phone available
      if (doctorPhone) {
        try {
          await sendNotification({
            to: doctorPhone,
            type: 'sms',
            message: `🎉 MediAI: Your doctor application has been APPROVED! Login now at ${process.env.NEXTAUTH_URL}/login with your registered email (${doctorEmail}) and password. Start accepting patient consultations today!`,
          });
        } catch (error) {
          console.error('Failed to send SMS:', error);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Doctor approved successfully',
      });
    }

    if (action === 'reject_doctor') {
      // Try to find in doctor_applications first
      let doctorApp = await doctorApplicationsCollection.findOne({ _id: new ObjectId(userId) });
      let user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      
      if (!doctorApp && !user) {
        return NextResponse.json(
          { success: false, message: 'Doctor not found' },
          { status: 404 }
        );
      }

      const doctorEmail = doctorApp?.email || user?.email;
      const doctorName = doctorApp?.full_name || user?.full_name;
      const doctorPhone = doctorApp?.phone || user?.phone;

      // Delete from doctor_applications
      if (doctorApp) {
        await doctorApplicationsCollection.deleteOne({ _id: new ObjectId(userId) });
      }

      // Delete from users if exists
      if (user) {
        await usersCollection.deleteOne({ _id: new ObjectId(userId) });
      }

      // Send rejection email
      try {
        await sendNotification({
          to: doctorEmail,
          subject: 'Doctor Application Status Update',
          type: 'email',
          templateData: {
            title: 'Application Not Approved',
            message: `Dear ${doctorName}, we regret to inform you that your doctor registration application could not be approved at this time. Please ensure all credentials are valid and feel free to reapply.`,
            doctorName: doctorName,
          },
        });
      } catch (error) {
        console.error('Failed to send rejection email:', error);
      }

      // Send SMS if phone available
      if (doctorPhone) {
        try {
          await sendNotification({
            to: doctorPhone,
            type: 'sms',
            message: `MediAI: Your doctor application was not approved. Please verify your credentials and reapply at ${process.env.NEXTAUTH_URL}/doctor-register. Check email for details.`,
          });
        } catch (error) {
          console.error('Failed to send SMS:', error);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Doctor application rejected and removed',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}
