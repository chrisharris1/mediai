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
    
    // Get patient's consultation stats
    const total_consultations = await consultationsCollection.countDocuments({ 
      patient_email: session.user.email 
    });

    const pending_consultations = await consultationsCollection.countDocuments({ 
      patient_email: session.user.email,
      status: 'pending'
    });

    const completed_consultations = await consultationsCollection.countDocuments({ 
      patient_email: session.user.email,
      status: 'completed'
    });

    // Get interaction checks from user profile (for now mock, can be tracked later)
    const interaction_checks = 0;
    const medicines_tracked = 0;
    const safe_combinations = 0;

    return NextResponse.json({ 
      success: true, 
      stats: {
        medicines_tracked,
        interaction_checks,
        safe_combinations,
        total_consultations,
        pending_consultations,
        completed_consultations
      }
    });
  } catch (error) {
    console.error('Error fetching patient stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
