import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await connectDB;
    const db = client.db();
    const consultationsCollection = db.collection('consultations');
    
    // Fetch consultations for this patient
    const consultations = await consultationsCollection
      .find({ patient_email: session.user.email })
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
    console.error('Error fetching patient consultations:', error);
    return NextResponse.json({ error: 'Failed to fetch consultations' }, { status: 500 });
  }
}
