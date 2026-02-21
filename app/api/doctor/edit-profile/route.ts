import { NextRequest, NextResponse } from 'next/server';
import { DoctorEditRequest } from '@/models/DoctorEditRequest';
import { sendEditRequestNotificationToAdmin } from '@/lib/notificationService';

export async function POST(request: NextRequest) {
  try {
    const { doctorId, doctorName, doctorEmail, requestedChanges } =
      await request.json();

    if (!doctorId || !doctorName || !doctorEmail || !requestedChanges) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!Array.isArray(requestedChanges) || requestedChanges.length === 0) {
      return NextResponse.json(
        { error: 'requestedChanges must be a non-empty array' },
        { status: 400 }
      );
    }

    // Create the edit request
    const editRequest = await DoctorEditRequest.create(
      doctorId,
      doctorName,
      doctorEmail,
      requestedChanges
    );

    // Send notification to admin
    await sendEditRequestNotificationToAdmin(
      doctorName,
      doctorEmail,
      requestedChanges
    );

    return NextResponse.json({
      success: true,
      message: 'Edit request submitted successfully',
      editRequest,
    });
  } catch (error: any) {
    console.error('Submit edit request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit edit request', details: error.message },
      { status: 500 }
    );
  }
}
