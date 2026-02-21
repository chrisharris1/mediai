import { NextRequest, NextResponse } from 'next/server';
import { DoctorEditRequest } from '@/models/DoctorEditRequest';
import { User } from '@/models/User';
import {
  sendEditRequestApprovalToDoctor,
  sendBlockNotification,
} from '@/lib/notificationService';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const { requestId, adminId, action } = await request.json();

    if (!requestId || !adminId) {
      return NextResponse.json(
        { error: 'Missing required fields: requestId, adminId' },
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

    // Handle actions: approve, block, approve+block
    if (action === 'approve' || action === 'approve+block') {
      // Apply changes to doctor's profile
      const db = await getDatabase();
      const usersCollection = db.collection('users');

      const updateFields: any = {};
      for (const change of editRequest.requestedChanges) {
        updateFields[change.field] = change.newValue;
      }

      await usersCollection.updateOne(
        { _id: new ObjectId(editRequest.doctorId.toString()) },
        { $set: updateFields }
      );

      // Approve the request
      await DoctorEditRequest.approve(requestId, adminId);

      // Send approval email to doctor
      await sendEditRequestApprovalToDoctor(
        editRequest.doctorEmail,
        editRequest.doctorName
      );

      // If approve+block, block the doctor
      if (action === 'approve+block') {
        const blockReason =
          'Your profile changes have been approved, but your account has been temporarily suspended pending verification.';
        const doctorIdStr = editRequest.doctorId instanceof ObjectId ? editRequest.doctorId.toString() : String(editRequest.doctorId);
        await User.blockUser(doctorIdStr, blockReason, adminId);

        // Get doctor details for notification
        const doctor = await User.findById(doctorIdStr);
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
        message:
          action === 'approve+block'
            ? 'Edit request approved and doctor blocked'
            : 'Edit request approved successfully',
        action,
      });
    } else if (action === 'block') {
      // Reject the request and block the doctor
      const blockReason =
        'Your profile edit request has been rejected due to suspicious activity. Your account has been suspended.';
      
      const doctorIdStr = editRequest.doctorId instanceof ObjectId ? editRequest.doctorId.toString() : String(editRequest.doctorId);
      await DoctorEditRequest.reject(requestId, adminId, blockReason);
      await User.blockUser(doctorIdStr, blockReason, adminId);

      // Get doctor details for notification
      const doctor = await User.findById(doctorIdStr);
      if (doctor) {
        await sendBlockNotification(
          doctor.email,
          doctor.profile?.phone || '',
          doctor.full_name,
          blockReason
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Edit request rejected and doctor blocked',
        action,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, block, or approve+block' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Approve edit request error:', error);
    return NextResponse.json(
      { error: 'Failed to process edit request', details: error.message },
      { status: 500 }
    );
  }
}
