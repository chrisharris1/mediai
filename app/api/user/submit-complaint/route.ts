import { NextRequest, NextResponse } from 'next/server';
import { DoctorComplaint } from '@/models/DoctorComplaint';
import {
  sendComplaintConfirmationToUser,
  sendComplaintNotificationToAdmin,
} from '@/lib/notificationService';

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      userName,
      userEmail,
      userPhone,
      doctorId,
      doctorName,
      issueType,
      description,
      evidenceUrls,
    } = await request.json();

    if (
      !userId ||
      !userName ||
      !userEmail ||
      !doctorId ||
      !doctorName ||
      !issueType ||
      !description
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate description length
    if (description.length < 50 || description.length > 2000) {
      return NextResponse.json(
        { error: 'Description must be between 50 and 2000 characters' },
        { status: 400 }
      );
    }

    // Create the complaint
    const result = await DoctorComplaint.create(
      userId,
      userName,
      userEmail,
      userPhone || '',
      doctorId,
      doctorName,
      issueType,
      description,
      evidenceUrls || []
    );

    if (!result.success || !result.complaintId) {
      return NextResponse.json(
        { error: 'Failed to create complaint' },
        { status: 500 }
      );
    }

    // Send confirmation to user
    await sendComplaintConfirmationToUser(
      userEmail,
      userName,
      userPhone || '',
      result.complaintId,
      doctorName,
      issueType
    );

    // Send alert to admin
    await sendComplaintNotificationToAdmin(
      userName,
      userEmail,
      result.complaintId,
      doctorName,
      issueType,
      description
    );

    return NextResponse.json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint: {
        complaintId: result.complaintId,
        status: 'under_review',
        submittedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error('Submit complaint error:', error);
    return NextResponse.json(
      { error: 'Failed to submit complaint', details: error.message },
      { status: 500 }
    );
  }
}
