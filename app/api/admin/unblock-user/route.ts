import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models/User';
import { sendUnblockNotification } from '@/lib/notificationService';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Find the user to unblock
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isBlocked) {
      return NextResponse.json(
        { error: 'User is not blocked' },
        { status: 400 }
      );
    }

    // Unblock the user
    await User.unblockUser(userId);

    // Send email and SMS notifications
    const userEmail = user.email;
    const userPhone = user.profile?.phone || '';
    const userName = user.full_name;

    await sendUnblockNotification(userEmail, userPhone, userName);

    return NextResponse.json({
      success: true,
      message: 'User unblocked successfully',
      unblockedUser: {
        id: user._id,
        name: userName,
        email: userEmail,
        isBlocked: false,
      },
    });
  } catch (error: any) {
    console.error('Unblock user error:', error);
    return NextResponse.json(
      { error: 'Failed to unblock user', details: error.message },
      { status: 500 }
    );
  }
}
