import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import connectDB from '../../../../lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    console.log('🔍 Admin Doctor Details Request');
    console.log('Session user email:', session?.user?.email);
    console.log('Required admin email:', process.env.ADMIN_EMAIL);
    console.log('NEXT_PUBLIC_ADMIN_EMAIL:', process.env.NEXT_PUBLIC_ADMIN_EMAIL);

    // Check if user is admin - use NEXT_PUBLIC_ADMIN_EMAIL or default to mediai.health26@gmail.com
    const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'mediai.health26@gmail.com';
    
    if (!session?.user?.email || session.user.email !== adminEmail) {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = await connectDB;
    const db = client.db();
    const usersCollection = db.collection('users');
    const doctorApplicationsCollection = db.collection('doctor_applications');
    const { ObjectId } = require('mongodb');

    console.log('🔍 Looking for user with ID:', userId);
    console.log('🔍 Is valid ObjectId format?', ObjectId.isValid(userId));

    // First, try to find the user
    let user = null;
    try {
      user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      console.log('🔍 User found in users collection:', !!user);
    } catch (error: any) {
      console.error('❌ Error finding user:', error.message);
    }
    
    // If user not found in users collection, try finding in doctor_applications by ID
    if (!user) {
      console.log('🔍 User not in users collection, checking doctor_applications...');
      try {
        const application = await doctorApplicationsCollection.findOne({ _id: new ObjectId(userId) });
        console.log('🔍 Application found:', !!application);
        
        if (application) {
          // Create user object from application data
          user = application;
          console.log('✅ Using application data as user');
        }
      } catch (error: any) {
        console.error('❌ Error finding application:', error.message);
      }
    }
    
    if (!user) {
      console.error('❌ User not found in either collection');
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // ALWAYS search doctor_applications by email (not by doctor_application_id)
    const applicationData = await doctorApplicationsCollection.findOne({ 
      email: user.email 
    });
    
    console.log('✅ Found user:', user.email);
    console.log('✅ Found application data:', !!applicationData);
    
    // Merge user data with application data (application data takes priority)
    let doctorData = applicationData ? { ...user, ...applicationData } : { ...user };

    // Remove sensitive data
    delete doctorData.password;

    // Handle profile object - data can be in profile sub-object OR at root level
    const profile = doctorData.profile || {};

    // Return all data directly from the database
    return NextResponse.json({
      success: true,
      doctor: {
        _id: doctorData._id.toString(),
        full_name: doctorData.full_name,
        email: doctorData.email,
        phone: doctorData.phone || profile.phone,
        date_of_birth: doctorData.date_of_birth || profile.date_of_birth,
        gender: doctorData.gender || profile.gender,
        role: doctorData.role,
        is_active: doctorData.is_active !== undefined ? doctorData.is_active : true,
        created_at: doctorData.created_at,
        
        // Professional info - check both root and profile object
        medical_license_number: doctorData.medical_license_number || profile.medical_license_number,
        specialization: doctorData.specialization || profile.specialization,
        years_of_experience: doctorData.years_of_experience || profile.years_of_experience,
        medical_degree: doctorData.medical_degree || profile.medical_degree,
        medical_school: doctorData.medical_school || profile.medical_school,
        graduation_year: doctorData.graduation_year || profile.graduation_year,
        
        // Practice info
        has_clinic: doctorData.has_clinic || profile.has_clinic,
        clinic_name: doctorData.clinic_name || profile.clinic_name,
        clinic_address: doctorData.clinic_address || profile.clinic_address,
        hospital_affiliations: doctorData.hospital_affiliations || profile.hospital_affiliations,
        consultation_fee: doctorData.consultation_fee || profile.consultation_fee,
        
        // Documents - return as is from DB
        documents: doctorData.documents || profile.documents || {},
        
        // Application specific
        status: doctorData.status || (doctorData.role === 'pending_doctor' ? 'pending' : 'approved'),
        applied_at: doctorData.applied_at,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching doctor details:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch doctor details' },
      { status: 500 }
    );
  }
}
