import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notification_ids } = await req.json();

    if (!notification_ids || !Array.isArray(notification_ids)) {
      return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 });
    }

    const db = await getDatabase();
    const notificationsCollection = db.collection('notifications');

    // Mark notifications as read
    const result = await notificationsCollection.updateMany(
      { _id: { $in: notification_ids.map((id: string) => new ObjectId(id)) } },
      { $set: { is_read: true, read_at: new Date() } }
    );

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    console.error('Mark read error:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read', details: error.message },
      { status: 500 }
    );
  }
}
