import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET - Fetch user profile
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Calculate age from date_of_birth if it exists
    let profile = user.profile || null;
    if (profile && profile.date_of_birth) {
      const birthDate = new Date(profile.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      profile = { ...profile, age };
    }

    return NextResponse.json({ 
      profile 
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or update user profile
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { profile } = body;

    if (!profile) {
      return NextResponse.json({ message: 'Profile data is required' }, { status: 400 });
    }

    // Validate required fields
    if (!profile.age || !profile.gender || !profile.phone || !profile.blood_type) {
      return NextResponse.json({ message: 'Required fields are missing' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Update user profile
    const result = await db.collection('users').updateOne(
      { email: session.user.email },
      {
        $set: {
          profile: {
            age: parseInt(profile.age),
            gender: profile.gender,
            phone: profile.phone,
            blood_type: profile.blood_type,
            height: parseInt(profile.height) || 0,
            weight: parseInt(profile.weight) || 0,
            current_medications: profile.current_medications || [],
            allergies: profile.allergies || [],
            chronic_conditions: profile.chronic_conditions || [],
            medical_history: profile.medical_history || '',
            emergency_contact_name: profile.emergency_contact_name || '',
            emergency_contact_phone: profile.emergency_contact_phone || '',
            updated_at: new Date()
          }
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      profile: profile 
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
