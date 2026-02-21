import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models/User';
import { sendBlockNotification } from '@/lib/notificationService';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const { userId, blockReason, adminId } = await request.json();

    if (!userId || !blockReason || !adminId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, blockReason, adminId' },
        { status: 400 }
      );
    }

    // Find the user to block
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { error: 'User is already blocked' },
        { status: 400 }
      );
    }

    // Block the user
    await User.blockUser(userId, blockReason, adminId);

    // Send email and SMS notifications
    const userEmail = user.email;
    const userPhone = user.profile?.phone || '';
    const userName = user.full_name;

    await sendBlockNotification(userEmail, userPhone, userName, blockReason);

    return NextResponse.json({
      success: true,
      message: 'User blocked successfully',
      blockedUser: {
        id: user._id,
        name: userName,
        email: userEmail,
        isBlocked: true,
        blockedAt: new Date(),
        blockReason,
      },
    });
  } catch (error: any) {
    console.error('Block user error:', error);
    return NextResponse.json(
      { error: 'Failed to block user', details: error.message },
      { status: 500 }
    );
  }
}
