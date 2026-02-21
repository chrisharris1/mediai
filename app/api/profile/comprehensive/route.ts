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
    const profilesCollection = db.collection('health_profiles');
    
    const profile = await profilesCollection.findOne({ email: session.user.email });

    if (profile) {
      return NextResponse.json({ success: true, profile });
    }

    return NextResponse.json({ success: true, profile: null });
  } catch (error) {
    console.error('Error fetching comprehensive profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      full_name,
      phone,
      date_of_birth,
      gender,
      address,
      occupation,
      profile_photo_url,
      emergency_contact_name,
      emergency_contact_number,
      blood_type,
      height,
      weight,
      insurance_provider,
      insurance_policy_number,
      allergies,
      current_medications,
      family_medical_history,
      past_medical_history,
      identification_type,
      identification_number,
      identification_document_url,
      consent_treatment,
      consent_privacy,
      consent_disclosure
    } = body;

    // Validation
    if (!consent_treatment || !consent_privacy || !consent_disclosure) {
      return NextResponse.json({ error: 'All consent checkboxes must be checked' }, { status: 400 });
    }

    const client = await connectDB;
    const db = client.db();
    const profilesCollection = db.collection('health_profiles');
    const usersCollection = db.collection('users');

    // Check if profile exists to preserve timestamps
    const existingProfile = await profilesCollection.findOne({ email: session.user.email });
    
    // Process allergies with timestamps
    const processedAllergies = (allergies || []).map((allergy: string | { name: string; added_at: Date }) => {
      if (typeof allergy === 'string') {
        // New allergy or old format - check if it existed before
        const existingAllergy = existingProfile?.medical_info?.allergies?.find(
          (a: any) => (typeof a === 'string' ? a : a.name) === allergy
        );
        return {
          name: allergy,
          added_at: existingAllergy?.added_at || new Date(),
          updated_at: new Date()
        };
      }
      // Already has timestamp format
      return { ...allergy, updated_at: new Date() };
    });

    // Process medications with timestamps
    const processedMedications = (current_medications || []).map((med: string | { name: string; added_at: Date }) => {
      if (typeof med === 'string') {
        // New medication or old format - check if it existed before
        const existingMed = existingProfile?.medical_info?.current_medications?.find(
          (m: any) => (typeof m === 'string' ? m : m.name) === med
        );
        return {
          name: med,
          added_at: existingMed?.added_at || new Date(),
          updated_at: new Date()
        };
      }
      // Already has timestamp format
      return { ...med, updated_at: new Date() };
    });

    const profileData = {
      email: session.user.email,
      full_name,
      phone,
      date_of_birth,
      gender,
      address,
      occupation,
      profile_photo_url: profile_photo_url || '',
      emergency_contact_name,
      emergency_contact_number,
      medical_info: {
        blood_type,
        height,
        weight,
        insurance_provider,
        insurance_policy_number,
        allergies: processedAllergies,
        current_medications: processedMedications,
        family_medical_history: family_medical_history || '',
        past_medical_history: past_medical_history || '',
        chronic_conditions: [] // Will be added by doctors
      },
      identification: {
        type: identification_type,
        number: identification_number,
        document: identification_document_url || ''
      },
      consent: {
        treatment: consent_treatment,
        privacy: consent_privacy,
        disclosure: consent_disclosure,
        timestamp: new Date()
      },
      created_at: new Date(),
      updated_at: new Date()
    };

    if (existingProfile) {
      // Update existing profile
      profileData.created_at = existingProfile.created_at; // Keep original creation date
      await profilesCollection.updateOne(
        { email: session.user.email },
        { $set: profileData }
      );
    } else {
      // Insert new profile
      await profilesCollection.insertOne(profileData);
    }

    // Also update user's profile field for backward compatibility
    await usersCollection.updateOne(
      { email: session.user.email },
      { 
        $set: { 
          profile: {
            phone,
            date_of_birth,
            gender,
            blood_type,
            height,
            weight,
            allergies: processedAllergies,
            current_medications: processedMedications,
            emergency_contact_name,
            emergency_contact_phone: emergency_contact_number,
          },
          updated_at: new Date()
        } 
      }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Profile saved successfully',
      profile: profileData
    });
  } catch (error) {
    console.error('Error saving comprehensive profile:', error);
    return NextResponse.json({ error: 'Failed to save profile', details: (error as Error).message }, { status: 500 });
  }
}
