import { NextRequest, NextResponse } from 'next/server';
import { DoctorComplaint } from '@/models/DoctorComplaint';
import { User } from '@/models/User';
import {
  sendComplaintResolutionToUser,
  sendBlockNotification,
} from '@/lib/notificationService';

export async function POST(request: NextRequest) {
  try {
    const {
      complaintId,
      adminId,
      resolutionMessage,
      actionTaken,
      adminNotes,
    } = await request.json();

    if (!complaintId || !adminId || !resolutionMessage || !actionTaken) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: complaintId, adminId, resolutionMessage, actionTaken',
        },
        { status: 400 }
      );
    }

    // Get the complaint
    const complaint = await DoctorComplaint.findById(complaintId);
    if (!complaint) {
      return NextResponse.json(
        { error: 'Complaint not found' },
        { status: 404 }
      );
    }

    if (complaint.status !== 'under_review') {
      return NextResponse.json(
        { error: `Complaint is already ${complaint.status}` },
        { status: 400 }
      );
    }

    // Resolve the complaint
    await DoctorComplaint.resolve(
      complaintId,
      adminId,
      resolutionMessage,
      actionTaken,
      adminNotes
    );

    // Send resolution to user
    await sendComplaintResolutionToUser(
      complaint.userEmail,
      complaint.userName,
      complaint.userPhone || '',
      complaint.complaintId,
      resolutionMessage
    );

    // If action taken is "Block Doctor", block the doctor
    if (
      actionTaken === 'Blocked Doctor' ||
      actionTaken === 'Suspended Doctor'
    ) {
      const blockReason = `Account suspended following complaint #${complaint.complaintId}: ${complaint.issueType}`;
      await User.blockUser(complaint.doctorId.toString(), blockReason, adminId);

      // Get doctor details for notification
      const doctor = await User.findById(complaint.doctorId.toString());
      if (doctor) {
        await sendBlockNotification(
          doctor.email,
          doctor.profile?.phone || '',
          doctor.full_name,
          blockReason
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Complaint resolved successfully',
      actionTaken,
    });
  } catch (error: any) {
    console.error('Resolve complaint error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve complaint', details: error.message },
      { status: 500 }
    );
  }
}
