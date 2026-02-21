import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a doctor
    const client = await connectDB;
    const db = client.db();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: session.user.email });

    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Only doctors can access consultations' }, { status: 403 });
    }

    // Fetch consultations assigned to this doctor
    const consultationsCollection = db.collection('consultations');
    const consultations = await consultationsCollection
      .find({ doctor_email: session.user.email })
      .sort({ created_at: -1 })
      .toArray();

    // Convert ObjectId to string
    const formattedConsultations = consultations.map(c => ({
      ...c,
      _id: c._id.toString()
    }));

    return NextResponse.json({ 
      success: true, 
      consultations: formattedConsultations 
    });
  } catch (error) {
    console.error('Error fetching consultations:', error);
    return NextResponse.json({ error: 'Failed to fetch consultations' }, { status: 500 });
  }
}
