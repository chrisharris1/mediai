import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const db = await getDatabase();
    const usersCollection = db.collection('users');
    const doctorApplicationsCollection = db.collection('doctor_applications');

    const { searchParams } = new URL(req.url);
    const specialization = searchParams.get('specialization');
    const minRating = searchParams.get('minRating');

    // Primary source: activated doctor accounts in users collection
    const usersDoctors = await usersCollection
      .find({
        role: 'doctor',
        is_active: { $ne: false },
      })
      .project({
        _id: 1,
        full_name: 1,
        email: 1,
        phone: 1,
        rating: 1,
        profile: 1,
        specialization: 1,
        years_of_experience: 1,
        consultation_fee: 1,
        medical_degree: 1,
        hospital_affiliations: 1,
        medical_license_number: 1,
        clinic_name: 1,
        clinic_address: 1,
        has_clinic: 1,
        medical_school: 1,
        graduation_year: 1,
        gender: 1,
        date_of_birth: 1,
      })
      .toArray();

    // Secondary source: approved application details (specialization/fee/docs)
    const approvedApplications = await doctorApplicationsCollection
      .find({ status: 'approved' })
      .toArray();

    const appByEmail = new Map(
      approvedApplications.map((app: any) => [String(app.email || '').toLowerCase(), app])
    );

    // Merge user doctor + approved application data
    const mergedFromUsers = usersDoctors.map((user: any) => {
      const emailKey = String(user.email || '').toLowerCase();
      const app = appByEmail.get(emailKey);
      const profile = user.profile || {};

      return {
        _id: user._id.toString(),
        full_name: user.full_name || user.name || app?.full_name || 'Doctor',
        email: user.email,
        phone: user.phone || profile.phone || app?.phone || '',
        date_of_birth: user.date_of_birth || profile.date_of_birth || app?.date_of_birth || '',
        gender: user.gender || profile.gender || app?.gender || '',
        medical_license_number: user.medical_license_number || profile.medical_license_number || app?.medical_license_number || '',
        specialization: user.specialization || profile.specialization || app?.specialization || 'General Physician',
        years_of_experience: user.years_of_experience || profile.years_of_experience || app?.years_of_experience || 0,
        medical_degree: user.medical_degree || profile.medical_degree || app?.medical_degree || '',
        medical_school: user.medical_school || profile.medical_school || app?.medical_school || '',
        graduation_year: user.graduation_year || profile.graduation_year || app?.graduation_year || 0,
        has_clinic: user.has_clinic ?? profile.has_clinic ?? app?.has_clinic ?? false,
        clinic_name: user.clinic_name || profile.clinic_name || app?.clinic_name || '',
        clinic_address: user.clinic_address || profile.clinic_address || app?.clinic_address || '',
        hospital_affiliations: user.hospital_affiliations || profile.hospital_affiliations || app?.hospital_affiliations || '',
        consultation_fee: user.consultation_fee || profile.consultation_fee || app?.consultation_fee || 500,
        rating: Number(user.rating ?? profile.rating ?? 4),
      };
    });

    // Include approved applications that may not yet have a role-doctor user record
    const existingEmails = new Set(
      mergedFromUsers.map((d: any) => String(d.email || '').toLowerCase())
    );
    const fromApplicationsOnly = approvedApplications
      .filter((app: any) => !existingEmails.has(String(app.email || '').toLowerCase()))
      .map((app: any) => ({
        _id: app._id.toString(),
        full_name: app.full_name || 'Doctor',
        email: app.email,
        phone: app.phone || '',
        date_of_birth: app.date_of_birth || '',
        gender: app.gender || '',
        medical_license_number: app.medical_license_number || '',
        specialization: app.specialization || 'General Physician',
        years_of_experience: app.years_of_experience || 0,
        medical_degree: app.medical_degree || '',
        medical_school: app.medical_school || '',
        graduation_year: app.graduation_year || 0,
        has_clinic: app.has_clinic || false,
        clinic_name: app.clinic_name || '',
        clinic_address: app.clinic_address || '',
        hospital_affiliations: app.hospital_affiliations || '',
        consultation_fee: app.consultation_fee || 500,
        rating: 4,
      }));

    let doctors = [...mergedFromUsers, ...fromApplicationsOnly];

    // Optional filters
    if (specialization) {
      const spec = specialization.toLowerCase();
      doctors = doctors.filter((d) =>
        String(d.specialization || '').toLowerCase().includes(spec)
      );
    }

    if (minRating) {
      const min = parseFloat(minRating);
      if (!Number.isNaN(min)) {
        doctors = doctors.filter((d) => Number(d.rating || 0) >= min);
      }
    }

    doctors.sort((a: any, b: any) =>
      Number(b.years_of_experience || 0) - Number(a.years_of_experience || 0)
    );

    return NextResponse.json({ success: true, doctors: doctors.slice(0, 20) });
  } catch (error: any) {
    console.error('Fetch doctors error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch doctors', details: error.message },
      { status: 500 }
    );
  }
}
