import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const client = await connectDB;
    const db = client.db();
    const usersCollection = db.collection('users');
    const consultationsCollection = db.collection('consultations');
    const doctorApplicationsCollection = db.collection('doctor_applications');

    // Get user counts
    const totalUsers = await usersCollection.countDocuments();
    const totalPatients = await usersCollection.countDocuments({ role: 'patient' });
    const totalDoctors = await usersCollection.countDocuments({ role: 'doctor' });
    const pendingDoctors = await usersCollection.countDocuments({ role: 'pending_doctor' });
    const activeUsers = await usersCollection.countDocuments({ is_active: { $ne: false } });

    // Get consultation counts
    const totalConsultations = await consultationsCollection.countDocuments();
    const completedConsultations = await consultationsCollection.countDocuments({ status: 'completed' });
    const pendingConsultations = await consultationsCollection.countDocuments({ status: 'pending' });

    // Get doctor application counts
    const totalApplications = await doctorApplicationsCollection.countDocuments();
    const pendingApplications = await doctorApplicationsCollection.countDocuments({ status: 'pending' });
    const approvedApplications = await doctorApplicationsCollection.countDocuments({ status: 'approved' });

    // Get recent activity
    const recentUsers = await usersCollection
      .find({})
      .sort({ created_at: -1 })
      .limit(5)
      .project({ _id: 1, full_name: 1, email: 1, role: 1, created_at: 1 })
      .toArray();

    const recentConsultations = await consultationsCollection
      .find({})
      .sort({ created_at: -1 })
      .limit(5)
      .project({ _id: 1, patient_email: 1, doctor_name: 1, status: 1, created_at: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          patients: totalPatients,
          doctors: totalDoctors,
          pending_doctors: pendingDoctors,
          active: activeUsers,
        },
        consultations: {
          total: totalConsultations,
          completed: completedConsultations,
          pending: pendingConsultations,
        },
        doctor_applications: {
          total: totalApplications,
          pending: pendingApplications,
          approved: approvedApplications,
        },
        recent_activity: {
          users: recentUsers.map((u: any) => ({
            id: u._id.toString(),
            name: u.full_name || 'N/A',
            email: u.email,
            role: u.role,
            date: u.created_at,
          })),
          consultations: recentConsultations.map((c: any) => ({
            id: c._id.toString(),
            patient: c.patient_email,
            doctor: c.doctor_name,
            status: c.status,
            date: c.created_at,
          })),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
