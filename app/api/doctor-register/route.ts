import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/mongodb';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { sendNotification } from '../../../lib/notificationService';
import { uploadToCloudinary } from '../../../lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract all fields
    const doctorData = {
      // Personal
      full_name: formData.get('full_name') as string,
      email: (formData.get('email') as string).toLowerCase(),
      password: formData.get('password') as string,
      phone: formData.get('phone') as string,
      date_of_birth: formData.get('date_of_birth') as string,
      gender: formData.get('gender') as string,
      
      // Professional
      medical_license_number: formData.get('medical_license_number') as string,
      specialization: formData.get('specialization') as string,
      years_of_experience: parseInt(formData.get('years_of_experience') as string),
      medical_degree: formData.get('medical_degree') as string,
      medical_school: formData.get('medical_school') as string,
      graduation_year: parseInt(formData.get('graduation_year') as string),
      
      // Practice
      has_clinic: formData.get('has_clinic') === 'true',
      clinic_name: formData.get('clinic_name') as string || '',
      clinic_address: formData.get('clinic_address') as string || '',
      hospital_affiliations: formData.get('hospital_affiliations') as string || '',
      consultation_fee: parseInt(formData.get('consultation_fee') as string),
    };

    // Files (in real implementation, upload to cloud storage like S3/Cloudinary)
    const files = {
      medical_certificate: formData.get('medical_certificate') as File,
      license_document: formData.get('license_document') as File,
      identity_proof: formData.get('identity_proof') as File,
      clinic_registration: formData.get('clinic_registration') as File,
    };

    // Validate required fields
    if (!doctorData.full_name || !doctorData.email || !doctorData.password) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');
    const doctorApplicationsCollection = db.collection('doctor_applications');

    // Check if email already exists
    const existingUser = await usersCollection.findOne({ email: doctorData.email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(doctorData.password, 10);

    // Upload files to Cloudinary
    const documentUrls: any = {};
    const timestamp = Date.now();
    
    for (const [key, file] of Object.entries(files)) {
      if (file && file.size > 0) {
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const fileName = `${timestamp}-${key}`;
          const cloudinaryUrl = await uploadToCloudinary(
            buffer,
            'mediai/doctor-documents',
            fileName
          );
          documentUrls[key] = cloudinaryUrl;
          console.log(`✅ Uploaded ${key} to Cloudinary:`, cloudinaryUrl);
        } catch (uploadError) {
          console.error(`⚠️ Failed to upload ${key}:`, uploadError);
        }
      }
    }

    // Create doctor application document
    const application = {
      ...doctorData,
      password: hashedPassword,
      documents: documentUrls,
      status: 'pending', // pending, approved, rejected
      applied_at: new Date(),
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null,
    };

    // Insert application
    const result = await doctorApplicationsCollection.insertOne(application);

    // Send notification to admin
    try {
      console.log('📧 Sending admin notification to:', process.env.ADMIN_EMAIL);
      const adminResult = await sendNotification({
        to: process.env.ADMIN_EMAIL!,
        subject: '🩺 New Doctor Registration Request',
        type: 'email',
        templateData: {
          title: 'New Doctor Request - Action Required',
          message: `We got a new doctor request! ${doctorData.full_name} (${doctorData.email}) has applied to join MediAI as a ${doctorData.specialization}. Please review their application.`,
          doctorName: doctorData.full_name,
          doctorEmail: doctorData.email,
          specialization: doctorData.specialization,
          actionUrl: `${process.env.NEXTAUTH_URL}/admin`,
        },
      });
      console.log('✅ Admin notification result:', adminResult);
    } catch (emailError: any) {
      console.error('⚠️ Failed to send admin notification:', emailError.message);
      // Don't fail the registration if email fails
    }

    // Send confirmation EMAIL to doctor
    try {
      console.log('📧 Sending confirmation email to doctor:', doctorData.email);
      const doctorEmailResult = await sendNotification({
        to: doctorData.email,
        subject: '✅ Application Submitted - MediAI',
        type: 'email',
        templateData: {
          title: 'Application Received Successfully',
          message: `Thank you for registering, ${doctorData.full_name}! Your request has been submitted to MediAI. The team will process your details and approve/disapprove accordingly. You will receive a notification within 3-4 business days.`,
          doctorName: doctorData.full_name,
        },
      });
      console.log('✅ Doctor email result:', doctorEmailResult);
    } catch (emailError: any) {
      console.error('⚠️ Failed to send doctor confirmation email:', emailError.message);
    }

    // Send confirmation SMS to doctor
    try {
      if (doctorData.phone) {
        console.log('📱 Sending confirmation SMS to doctor:', doctorData.phone);
        const doctorSMSResult = await sendNotification({
          to: doctorData.phone,
          type: 'sms',
          message: `MediAI: Your request has been submitted successfully! The team will process your details and approve/disapprove accordingly. You'll receive updates via email and SMS.`,
        });
        console.log('✅ Doctor SMS result:', doctorSMSResult);
      }
    } catch (smsError: any) {
      console.error('⚠️ Failed to send doctor confirmation SMS:', smsError.message);
    }

    // Don't create user here - will be created on approval
    // This prevents duplicate key errors

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application_id: result.insertedId.toString(),
    });

  } catch (error: any) {
    console.error('Doctor registration error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
