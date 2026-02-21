import { NextRequest, NextResponse } from 'next/server';
import { DoctorEditRequest } from '@/models/DoctorEditRequest';
import { sendEditRequestRejectionToDoctor } from '@/lib/notificationService';

export async function POST(request: NextRequest) {
  try {
    const { requestId, adminId, rejectionReason } = await request.json();

    if (!requestId || !adminId || !rejectionReason) {
      return NextResponse.json(
        { error: 'Missing required fields: requestId, adminId, rejectionReason' },
        { status: 400 }
      );
    }

    // Get the edit request
    const editRequest = await DoctorEditRequest.findById(requestId);
    if (!editRequest) {
      return NextResponse.json(
        { error: 'Edit request not found' },
        { status: 404 }
      );
    }

    if (editRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Edit request is already ${editRequest.status}` },
        { status: 400 }
      );
    }

    // Reject the request
    await DoctorEditRequest.reject(requestId, adminId, rejectionReason);

    // Send rejection email to doctor
    await sendEditRequestRejectionToDoctor(
      editRequest.doctorEmail,
      editRequest.doctorName,
      rejectionReason
    );

    return NextResponse.json({
      success: true,
      message: 'Edit request rejected successfully',
    });
  } catch (error: any) {
    console.error('Reject edit request error:', error);
    return NextResponse.json(
      { error: 'Failed to reject edit request', details: error.message },
      { status: 500 }
    );
  }
}
