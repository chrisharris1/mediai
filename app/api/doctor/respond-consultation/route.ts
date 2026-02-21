import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { consultationId, response, status } = body;

    if (!consultationId || !response) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user is a doctor
    const client = await connectDB;
    const db = client.db();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: session.user.email });

    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Only doctors can respond to consultations' }, { status: 403 });
    }

    // Update consultation with doctor's response
    const consultationsCollection = db.collection('consultations');
    const result = await consultationsCollection.updateOne(
      { 
        _id: new ObjectId(consultationId),
        doctor_email: session.user.email
      },
      { 
        $set: { 
          doctor_response: response,
          status: status || 'completed',
          responded_at: new Date(),
          completed_at: new Date(),
          updated_at: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
    }

    // TODO: Send email notification to patient with doctor's response

    return NextResponse.json({ 
      success: true, 
      message: 'Response submitted successfully' 
    });
  } catch (error) {
    console.error('Error submitting response:', error);
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 });
  }
}
