import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models/User';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  console.log('📝 Register API called');
  
  try {
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { email, password, full_name, role = 'patient', oauth_provider, oauth_id } = body;

    // Validation
    if (!email || !full_name) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { success: false, message: 'Email and full name are required' },
        { status: 400 }
      );
    }

    // Password is optional for OAuth users
    if (!oauth_provider && (!password || password.length < 6)) {
      console.log('❌ Password required or too short');
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    console.log('🔧 Creating user...');
    // Create user with OAuth support
    const result = await User.createUser(
      email, 
      password || `oauth_${oauth_id}_${Date.now()}`, // Generate random password for OAuth users
      full_name, 
      role || 'patient',
      oauth_provider,
      oauth_id
    );
    console.log('✅ User created result:', result);

    // Generate JWT token for auto-login after registration
    if (result.success && process.env.JWT_SECRET) {
      const token = jwt.sign(
        {
          userId: result.user_id,
          email: email,
          role: role || 'patient',
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('🎫 Token generated');
      return NextResponse.json({
        ...result,
        access_token: token,
      }, { status: 201 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('🔥 Registration error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Registration failed' },
      { status: 400 }
    );
  }
}