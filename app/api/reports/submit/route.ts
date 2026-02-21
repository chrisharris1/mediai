import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import MedicineReport from '@/models/MedicineReport';
import { User } from '@/models/User';

export async function POST(req: NextRequest) {
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

    // Check if user is a doctor
    if (user.role !== 'doctor') {
      return NextResponse.json(
        { success: false, message: 'Only doctors can submit medicine reports' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      medicineName,
      drugBankId,
      issueType,
      issueTitle,
      issueDescription,
      suggestedCorrection,
      evidenceSource,
      urgencyLevel,
      affectsPatientSafety,
    } = body;

    // Validate required fields
    if (!medicineName || !issueType || !issueTitle || !issueDescription) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create medicine report
    const report = new MedicineReport({
      doctorId: user._id,
      doctorName: user.full_name,
      doctorEmail: user.email,
      doctorCredentials: user.profile?.phone || '',
      medicineName,
      drugBankId,
      issueType,
      issueTitle,
      issueDescription,
      suggestedCorrection,
      evidenceSource,
      urgencyLevel: urgencyLevel || 'medium',
      affectsPatientSafety: affectsPatientSafety || false,
      status: 'pending',
      submittedAt: new Date(),
    });

    await report.save();

    // Send email notification to admin (will implement next)
    try {
      await fetch(`${process.env.NEXTAUTH_URL}/api/reports/notify-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report._id,
          medicineName,
          issueType,
          urgencyLevel: report.urgencyLevel,
          affectsPatientSafety: report.affectsPatientSafety,
          doctorName: user.full_name,
          doctorEmail: user.email,
        }),
      });
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully. Our team will review it shortly.',
      reportId: report._id,
      data: {
        reportId: report._id,
        status: report.status,
        submittedAt: report.submittedAt,
      },
    });
  } catch (error: any) {
    console.error('Error submitting medicine report:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to submit report',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
