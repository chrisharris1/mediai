import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import MedicineReport from '@/models/MedicineReport';
import { User } from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Get user details
    const user = await User.getUserByEmail(session.user.email!);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Only admins can view all reports' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const safetyOnly = searchParams.get('safetyOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    if (status) query.status = status;
    if (urgency) query.urgencyLevel = urgency;
    if (safetyOnly) query.affectsPatientSafety = true;

    // Fetch reports with pagination
    const reports = await MedicineReport.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('doctorId', 'name email specialization')
      .populate('reviewedBy', 'name email')
      .lean();

    // Get total count
    const totalCount = await MedicineReport.countDocuments(query);

    // Get statistics
    const stats = await MedicineReport.getStatistics();

    return NextResponse.json({
      success: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        statistics: stats,
      },
    });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch reports',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
