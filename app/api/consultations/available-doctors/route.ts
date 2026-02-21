import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const client = await connectDB;
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Fetch all approved doctors with their details
    const doctors = await usersCollection
      .find({ 
        status: 'approved',
        medical_license_number: { $exists: true }
      })
      .project({
        _id: 1,
        full_name: 1,
        email: 1,
        specialization: 1,
        years_of_experience: 1,
        consultation_fee: 1,
        medical_degree: 1,
        hospital_affiliations: 1
      })
      .toArray();

    const doctorsFormatted = doctors.map(doctor => ({
      _id: doctor._id.toString(),
      name: doctor.full_name || 'Doctor',
      email: doctor.email,
      specialization: doctor.specialization || 'General Medicine',
      experience: doctor.years_of_experience || 0,
      consultation_fee: doctor.consultation_fee || 500
    }));

    return NextResponse.json({ 
      success: true, 
      doctors: doctorsFormatted
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return NextResponse.json({ error: 'Failed to fetch doctors' }, { status: 500 });
  }
}
