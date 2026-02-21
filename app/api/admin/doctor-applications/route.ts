import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (!session || session.user?.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    const applicationsCollection = db.collection('doctor_applications');

    // Fetch all applications from MongoDB
    const applications = await applicationsCollection
      .find({})
      .sort({ applied_at: -1 })
      .toArray();

    // Convert ObjectId to string
    const formattedApplications = applications.map(app => ({
      ...app,
      _id: app._id.toString(),
    }));

    return NextResponse.json({
      success: true,
      applications: formattedApplications,
    });

  } catch (error: any) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
