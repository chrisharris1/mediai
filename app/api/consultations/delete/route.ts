import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { consultation_id } = body;

    if (!consultation_id) {
      return NextResponse.json({ error: 'Missing consultation ID' }, { status: 400 });
    }

    const client = await connectDB;
    const db = client.db();
    const consultationsCollection = db.collection('consultations');

    // Find consultation and verify ownership
    const consultation = await consultationsCollection.findOne({
      _id: new ObjectId(consultation_id)
    });

    if (!consultation) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
    }

    // Verify user is authorized to delete (either the patient or the doctor)
    if (consultation.patient_email !== session.user.email && 
        consultation.doctor_email !== session.user.email) {
      return NextResponse.json({ 
        error: 'You are not authorized to delete this consultation' 
      }, { status: 403 });
    }

    // Only allow deletion of completed consultations
    if (consultation.status !== 'completed') {
      return NextResponse.json({ 
        error: 'Only completed consultations can be deleted' 
      }, { status: 400 });
    }

    // Delete the consultation
    await consultationsCollection.deleteOne({
      _id: new ObjectId(consultation_id)
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Consultation deleted successfully' 
    });

  } catch (error: any) {
    console.error('Error deleting consultation:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
