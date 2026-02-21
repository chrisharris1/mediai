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
      return NextResponse.json({ error: 'Only doctors can access stats' }, { status: 403 });
    }

    // Calculate stats from MongoDB
    const consultationsCollection = db.collection('consultations');
    
    const total_consultations = await consultationsCollection.countDocuments({ 
      doctor_email: session.user.email 
    });

    const pending_consultations = await consultationsCollection.countDocuments({ 
      doctor_email: session.user.email,
      status: 'pending'
    });

    const completed_consultations = await consultationsCollection.countDocuments({ 
      doctor_email: session.user.email,
      status: 'completed'
    });

    // Calculate total earnings (80% after platform commission) - ONLY from completed consultations
    const completedConsultations = await consultationsCollection
      .find({ 
        doctor_email: session.user.email,
        status: 'completed'  // Explicitly only completed consultations
      })
      .toArray();

    const total_earnings = completedConsultations.reduce((sum, c) => {
      return sum + (c.consultation_fee * 0.8); // 80% goes to doctor, 20% platform fee
    }, 0);

    // Calculate this month's earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthConsultations = await consultationsCollection
      .find({ 
        doctor_email: session.user.email,
        status: 'completed',
        completed_at: { $gte: startOfMonth }
      })
      .toArray();

    const this_month_earnings = thisMonthConsultations.reduce((sum, c) => {
      return sum + (c.consultation_fee * 0.8);
    }, 0);

    return NextResponse.json({ 
      success: true, 
      stats: {
        total_consultations,
        pending_consultations,
        completed_consultations,
        total_earnings: Math.round(total_earnings),
        this_month_earnings: Math.round(this_month_earnings)
      }
    });
  } catch (error) {
    console.error('Error fetching doctor stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
