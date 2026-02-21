import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Find user with all details
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return comprehensive user details
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.full_name,
        email: user.email,
        phone: user.profile?.phone || null,
        role: user.role,
        isBlocked: user.isBlocked || false,
        blockedAt: user.blockedAt || null,
        blockedReason: user.blockedReason || null,
        blockedBy: user.blockedBy || null,
        createdAt: user.created_at,
        
        // Profile fields
        age: user.profile?.age || null,
        gender: user.profile?.gender || null,
        allergies: user.profile?.allergies || [],
        chronicConditions: user.profile?.chronic_conditions || [],
        currentMedications: user.profile?.current_medications || [],
      },
    });
  } catch (error: any) {
    console.error('Get user details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user details', details: error.message },
      { status: 500 }
    );
  }
}
