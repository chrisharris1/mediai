import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import MedicineReport from '@/models/MedicineReport';
import { User } from '@/models/User';

export async function PUT(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Get admin user
    const admin = await User.getUserByEmail(session.user.email!);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Only admins can update report status' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { reportId, status, adminNotes, actionTaken } = body;

    // Validate required fields
    if (!reportId || !status) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'under_review', 'resolved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Find and update report
    const report = await MedicineReport.findById(reportId);
    if (!report) {
      return NextResponse.json(
        { success: false, message: 'Report not found' },
        { status: 404 }
      );
    }

    // Update report using the model method
    await report.updateStatus(status, new (require('mongoose')).Types.ObjectId(admin._id), adminNotes, actionTaken);

    // Send email notification to doctor
    try {
      await fetch(`${process.env.NEXTAUTH_URL}/api/reports/notify-doctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report._id,
          doctorEmail: report.doctorEmail,
          doctorName: report.doctorName,
          medicineName: report.medicineName,
          status,
          adminNotes,
          actionTaken,
        }),
      });
    } catch (emailError) {
      console.error('Failed to send doctor notification:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Report status updated successfully',
      data: {
        reportId: report._id,
        status: report.status,
        reviewedBy: admin.full_name,
        reviewedAt: report.reviewedAt,
      },
    });
  } catch (error: any) {
    console.error('Error updating report status:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update report status',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// GET single report details
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json(
        { success: false, message: 'Report ID required' },
        { status: 400 }
      );
    }

    const report = await MedicineReport.findById(reportId)
      .populate('doctorId', 'name email specialization')
      .populate('reviewedBy', 'name email')
      .lean();

    if (!report) {
      return NextResponse.json(
        { success: false, message: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch report', error: error.message },
      { status: 500 }
    );
  }
}
