import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import { notificationService } from '@/lib/notificationService';

// Smart auto-assign: Map concern types to doctor specializations
const CONCERN_TO_SPECIALTY_MAP: Record<string, string[]> = {
  'Drug Interactions': ['General Physician', 'Clinical Pharmacology', 'Internal Medicine'],
  'Side Effects': ['General Physician', 'Clinical Pharmacology', 'Internal Medicine'],
  'Dosage Question': ['General Physician', 'Clinical Pharmacology'],
  'Allergy Concerns': ['Allergist', 'Immunology', 'General Physician'],
  'Pregnancy/Breastfeeding': ['Obstetrician', 'Gynecology', 'General Physician'],
  'Alternative Medicines': ['Ayurveda', 'Homeopathy', 'Naturopathy', 'General Physician'],
  'Other': ['General Physician', 'Internal Medicine']
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      medicine_name, 
      concern_type, 
      description, 
      patient_name,
      preferred_doctor_email,
      share_health_data = false,
      auto_assign = true,
      preferred_datetime
    } = body;

    if (!medicine_name || !concern_type || !description || !patient_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate patient
    const client = await connectDB;
    const db = client.db();
    const usersCollection = db.collection('users');
    const patient = await usersCollection.findOne({ email: session.user.email });

    if (!patient || patient.role !== 'patient') {
      return NextResponse.json({ error: 'Only patients can request consultations' }, { status: 403 });
    }

    // Smart Doctor Assignment
    let doctor;
    
    if (!auto_assign && preferred_doctor_email) {
      // User selected specific doctor
      doctor = await usersCollection.findOne({ 
        email: preferred_doctor_email,
        role: 'doctor',
        is_active: true
      });
    }

    if (!doctor) {
      // Smart auto-assign based on concern type
      const preferredSpecialties = CONCERN_TO_SPECIALTY_MAP[concern_type] || ['General Physician'];
      
      // Get approved doctor applications with matching specializations
      const doctorApplicationsCollection = db.collection('doctor_applications');
      const matchingDoctors = await doctorApplicationsCollection.find({
        status: 'approved',
        specialization: { $in: preferredSpecialties }
      }).toArray();

      if (matchingDoctors.length > 0) {
        // Pick randomly from matching doctors (simple load balancing)
        const randomIndex = Math.floor(Math.random() * matchingDoctors.length);
        const selectedDoctorApp = matchingDoctors[randomIndex];
        doctor = await usersCollection.findOne({ 
          email: selectedDoctorApp.email,
          role: 'doctor',
          is_active: true
        });
      }

      // Fallback: Get any available doctor
      if (!doctor) {
        const doctors = await usersCollection.find({ 
          role: 'doctor',
          is_active: true
        }).toArray();

        if (doctors.length === 0) {
          return NextResponse.json({ 
            error: 'No doctors available at the moment. Please try again later.' 
          }, { status: 404 });
        }

        doctor = doctors[0];
      }
    }

    // Get doctor's application details
    const doctorApplicationsCollection = db.collection('doctor_applications');
    const doctorApp = await doctorApplicationsCollection.findOne({ 
      email: doctor.email,
      status: 'approved'
    });

    const consultation_fee = doctorApp?.consultation_fee || 500;

    // Get patient health data if sharing is enabled
    let patient_health_data = null;
    if (share_health_data) {
      console.log('🔍 Medicine Tracker Debug - share_health_data is TRUE');
      
      // Fetch medicine tracker
      const medicineTrackerCollection = db.collection('medicine_trackers');
      const medicines = await medicineTrackerCollection.find({
        user_id: patient._id.toString()
      }).toArray();
      
      console.log('📊 Medicine Tracker Debug - Found medicines:', medicines.length);
      console.log('📋 Medicine Tracker Debug - Patient ID:', patient._id.toString());
      console.log('💊 Medicine Tracker Debug - Medicines data:', JSON.stringify(medicines, null, 2));

      // Fetch health profile data
      const healthProfilesCollection = db.collection('health_profiles');
      const healthProfile = await healthProfilesCollection.findOne({ email: patient.email });

      // Fetch consultation history
      const consultationsCollection = db.collection('consultations');
      const pastConsultations = await consultationsCollection
        .find({ patient_email: patient.email, status: 'completed' })
        .sort({ created_at: -1 })
        .limit(5)
        .toArray();

      // Calculate age from date of birth
      const calculateAge = (dob: string) => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      // Fetch patient profile with comprehensive data
      patient_health_data = {
        profile: {
          age: healthProfile?.date_of_birth ? calculateAge(healthProfile.date_of_birth) : patient.profile?.age,
          gender: healthProfile?.gender || patient.profile?.gender,
          blood_type: healthProfile?.medical_info?.blood_type || patient.profile?.blood_type,
          height: healthProfile?.medical_info?.height || patient.profile?.height,
          weight: healthProfile?.medical_info?.weight || patient.profile?.weight,
          phone: healthProfile?.phone || patient.profile?.phone,
          allergies: healthProfile?.medical_info?.allergies || patient.profile?.allergies || [],
          chronic_conditions: healthProfile?.medical_info?.chronic_conditions || patient.profile?.chronic_conditions || [],
          current_medications: healthProfile?.medical_info?.current_medications || patient.profile?.current_medications || [],
          past_medical_history: healthProfile?.medical_info?.past_medical_history || patient.profile?.medical_history,
          family_medical_history: healthProfile?.medical_info?.family_medical_history
        },
        emergency_contact: {
          name: healthProfile?.emergency_contact_name || patient.profile?.emergency_contact_name,
          phone: healthProfile?.emergency_contact_number || patient.profile?.emergency_contact_phone
        },
        medicine_tracker: medicines.map(m => ({
          medicine_name: m.medicine_name,
          dosage: m.dosage,
          frequency: m.frequency,
          adherence_rate: m.adherence_rate,
          start_date: m.start_date,
          status: m.status
        })),
        consultation_history: pastConsultations.map(c => ({
          date: c.created_at,
          doctor_name: c.doctor_name,
          concern_type: c.concern_type,
          medicine_name: c.medicine_name,
          status: c.status
        }))
      };
      
      console.log('✅ Medicine Tracker Debug - patient_health_data constructed');
      console.log('📦 Medicine Tracker Debug - medicine_tracker length:', patient_health_data.medicine_tracker.length);
    }

    // Create consultation request
    const consultationsCollection = db.collection('consultations');
    const consultation = {
      patient_email: session.user.email,
      patient_name,
      patient_id: patient._id.toString(),
      doctor_email: doctor.email,
      doctor_name: doctor.full_name || doctor.name || 'Doctor',
      doctor_id: doctorApp?._id?.toString() || doctor._id.toString(),
      medicine_name,
      concern_type,
      description,
      status: 'pending',
      consultation_fee,
      payment_status: 'pending',
      share_health_data,
      patient_health_data,
      preferred_datetime: preferred_datetime ? new Date(preferred_datetime) : null,
      meeting_link: null,
      scheduled_time: null,
      doctor_response: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    console.log('🚀 Medicine Tracker Debug - About to insert consultation');
    console.log('✔️ Medicine Tracker Debug - share_health_data in doc:', consultation.share_health_data);
    console.log('✔️ Medicine Tracker Debug - patient_health_data exists:', !!consultation.patient_health_data);
    if (consultation.patient_health_data) {
      console.log('✔️ Medicine Tracker Debug - medicine_tracker in patient_health_data:', consultation.patient_health_data.medicine_tracker?.length || 0);
    }

    const result = await consultationsCollection.insertOne(consultation);

    // Send notifications
    try {
      // Email to patient
      await notificationService.sendEmail({
        to: session.user.email!,
        subject: 'Consultation Request Submitted - MediAI',
        html: `
          <h2>Consultation Request Submitted</h2>
          <p>Dear ${patient_name},</p>
          <p>Your consultation request has been successfully submitted and assigned to <strong>Dr. ${doctor.full_name || doctor.name}</strong>.</p>
          <h3>Details:</h3>
          <ul>
            <li><strong>Medicine:</strong> ${medicine_name}</li>
            <li><strong>Concern:</strong> ${concern_type}</li>
            <li><strong>Doctor:</strong> ${doctor.full_name || doctor.name} (${doctorApp?.specialization || 'General Physician'})</li>
            <li><strong>Consultation Fee:</strong> ₹${consultation_fee}</li>
            <li><strong>Status:</strong> Pending Review</li>
          </ul>
          <p>The doctor will review your case within 24-48 hours and respond accordingly.</p>
          <p>You will receive updates via email and in-app notifications.</p>
          <p>Best regards,<br/>MediAI Team</p>
        `
      });

      // In-app notification to patient
      await notificationService.createInAppNotification({
        userId: patient._id.toString(),
        type: 'consultation_request',
        title: 'Consultation Request Submitted',
        message: `Your consultation request for ${medicine_name} has been assigned to Dr. ${doctor.full_name || doctor.name}.`,
        link: '/patient-consultations'
      });

      // Email to doctor
      await notificationService.sendEmail({
        to: doctor.email,
        subject: 'New Consultation Request - MediAI',
        html: `
          <h2>New Consultation Request</h2>
          <p>Dear Dr. ${doctor.full_name || doctor.name},</p>
          <p>You have received a new consultation request.</p>
          <h3>Patient Details:</h3>
          <ul>
            <li><strong>Name:</strong> ${patient_name}</li>
            <li><strong>Medicine:</strong> ${medicine_name}</li>
            <li><strong>Concern Type:</strong> ${concern_type}</li>
            <li><strong>Description:</strong> ${description}</li>
          </ul>
          ${share_health_data ? '<p><strong>Note:</strong> Patient has shared their complete health profile and medicine tracker data with you.</p>' : '<p><strong>Note:</strong> Patient has not shared additional health details.</p>'}
          <p>Please log in to your dashboard to review and respond to this consultation request.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/doctor-dashboard" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Request</a></p>
          <p>Best regards,<br/>MediAI Team</p>
        `
      });

      // In-app notification to doctor
      await notificationService.createInAppNotification({
        userId: doctor._id.toString(),
        type: 'consultation_request',
        title: 'New Consultation Request',
        message: `You have a new consultation request from ${patient_name} regarding ${medicine_name}.`,
        link: '/doctor-dashboard'
      });
    } catch (emailError) {
      console.error('Notification error:', emailError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Consultation request submitted successfully',
      consultation_id: result.insertedId.toString(),
      doctor_name: doctor.full_name || doctor.name,
      doctor_specialization: doctorApp?.specialization || 'General Physician',
      consultation_fee,
      payment_required: true
    });

  } catch (error: any) {
    console.error('Error creating consultation request:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
