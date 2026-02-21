import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = await connectDB;
    const db = client.db();
    const usersCollection = db.collection('users');
    const consultationsCollection = db.collection('consultations');
    const healthProfilesCollection = db.collection('health_profiles');

    // Get user profile with medical data
    const user = await usersCollection.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get comprehensive health profile data
    const healthProfile = await healthProfilesCollection.findOne({ email: session.user.email });

    // Get consultation history
    const consultations = await consultationsCollection
      .find({ patient_email: session.user.email })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();

    // Calculate health metrics - Use health profile data if available
    const totalConsultations = consultations.length;
    const completedConsultations = consultations.filter((c: any) => c.status === 'completed').length;
    const medications = healthProfile?.medical_info?.current_medications || user.profile?.current_medications || [];
    const allergies = healthProfile?.medical_info?.allergies || user.profile?.allergies || [];
    const chronicConditions = healthProfile?.medical_info?.chronic_conditions || user.profile?.chronic_conditions || [];

    // Prepare report data - Prioritize health_profiles data
    const reportData = {
      patient: {
        name: healthProfile?.full_name || user.full_name || user.name,
        email: user.email,
        age: healthProfile?.date_of_birth ? calculateAge(healthProfile.date_of_birth) : (user.profile?.age || 'N/A'),
        gender: healthProfile?.gender || user.profile?.gender || 'N/A',
        blood_type: healthProfile?.medical_info?.blood_type || user.profile?.blood_type || 'N/A',
        height: healthProfile?.medical_info?.height || user.profile?.height || 'N/A',
        weight: healthProfile?.medical_info?.weight || user.profile?.weight || 'N/A',
        phone: healthProfile?.phone || user.profile?.phone || 'N/A',
      },
      medical_info: {
        current_medications: medications,
        allergies: allergies,
        chronic_conditions: chronicConditions,
        medical_history: healthProfile?.medical_info?.past_medical_history || user.profile?.medical_history || 'No medical history recorded',
        family_history: healthProfile?.medical_info?.family_medical_history || 'No family history recorded',
      },
      emergency_contact: {
        name: healthProfile?.emergency_contact_name || user.profile?.emergency_contact_name || 'N/A',
        phone: healthProfile?.emergency_contact_number || user.profile?.emergency_contact_phone || 'N/A',
      },
      consultations: consultations.map((c: any) => ({
        id: c._id.toString(),
        doctor_name: c.doctor_name || 'N/A',
        specialty: c.specialty || 'N/A',
        symptoms: c.symptoms || 'N/A',
        diagnosis: c.diagnosis || 'Pending',
        prescription: c.prescription || 'N/A',
        status: c.status,
        date: c.created_at,
        notes: c.doctor_notes || 'N/A',
      })),
      statistics: {
        total_consultations: totalConsultations,
        completed_consultations: completedConsultations,
        total_medications: medications.length,
        total_allergies: allergies.length,
        chronic_conditions: chronicConditions.length,
      },
      generated_at: new Date().toISOString(),
      profile_last_updated: healthProfile?.updated_at || user.created_at || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: reportData,
    });
  } catch (error: any) {
    console.error('Error generating health report:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}

// Helper function to calculate age from date of birth
function calculateAge(dob: string): string {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age.toString();
}
