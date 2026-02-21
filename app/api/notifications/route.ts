import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: session.user.email });

    if (!user) {
      // Some roles (e.g. env-configured admin) may have a session without a DB user record.
      // Return an empty payload so UI does not break on 404.
      return NextResponse.json({
        success: true,
        notifications: [],
        unreadCount: 0,
      });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const query: any = { user_id: user._id };
    if (unreadOnly) {
      query.is_read = false;
    }

    const notificationsCollection = db.collection('notifications');
    const notifications = await notificationsCollection
      .find(query)
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();

    const unreadCount = await notificationsCollection.countDocuments({
      user_id: user._id,
      is_read: false,
    });

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ success: true, modifiedCount: 0 });
    }

    const body = await req.json();
    const { notificationId, markAllAsRead } = body;

    const notificationsCollection = db.collection('notifications');

    if (markAllAsRead) {
      // Mark all notifications as read
      await notificationsCollection.updateMany(
        { user_id: user._id, is_read: false },
        { $set: { is_read: true } }
      );
    } else if (notificationId) {
      // Mark specific notification as read
      await notificationsCollection.updateOne(
        { _id: new ObjectId(notificationId) },
        { $set: { is_read: true } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update notification error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification', details: error.message },
      { status: 500 }
    );
  }
}
