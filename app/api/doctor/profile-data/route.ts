import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await connectDB;
    const db = client.db();

    // Get doctor application data
    const doctorApp = await db.collection('doctor_applications').findOne({ email: session.user.email });

    if (!doctorApp) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    // Return profile data (exclude password if exists)
    const { password, ...profileData } = doctorApp;

    return NextResponse.json({ 
      success: true,
      data: profileData
    });

  } catch (error: any) {
    console.error('Error fetching doctor profile:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
