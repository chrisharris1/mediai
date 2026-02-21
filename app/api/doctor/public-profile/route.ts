import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorEmail = searchParams.get('email');

    if (!doctorEmail) {
      return NextResponse.json({ error: 'Doctor email required' }, { status: 400 });
    }

    const db = await dbConnect();

    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Fetch doctor application data
    const doctorApp = await db.collection('doctor_applications').findOne({
      email: doctorEmail,
      status: 'approved' // Only show approved doctors
    });

    if (!doctorApp) {
      return NextResponse.json({ error: 'Doctor not found or not approved' }, { status: 404 });
    }

    // Return public profile information (exclude sensitive data)
    const publicProfile = {
      full_name: doctorApp.full_name,
      email: doctorApp.email,
      phone: doctorApp.phone,
      gender: doctorApp.gender,
      
      // Professional Info
      medical_license_number: doctorApp.medical_license_number,
      specialization: doctorApp.specialization,
      custom_specialization: doctorApp.custom_specialization,
      years_of_experience: doctorApp.years_of_experience,
      medical_degree: doctorApp.medical_degree,
      medical_school: doctorApp.medical_school,
      graduation_year: doctorApp.graduation_year,
      
      // Practice Info
      has_clinic: doctorApp.has_clinic,
      clinic_name: doctorApp.clinic_name,
      clinic_address: doctorApp.clinic_address,
      hospital_affiliations: doctorApp.hospital_affiliations,
      consultation_fee: doctorApp.consultation_fee,
      
      // Documents (publicly viewable for verification)
      documents: doctorApp.documents || {},
      
      // Status
      status: doctorApp.status,
      approved_at: doctorApp.approved_at,
      reviewed_by: doctorApp.reviewed_by
    };

    return NextResponse.json({ success: true, data: publicProfile });
  } catch (error: any) {
    console.error('Error fetching doctor public profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
