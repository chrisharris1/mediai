import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import { User } from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if this is the admin trying to login
    if (email === process.env.ADMIN_EMAIL) {
      if (password === process.env.ADMIN_PASSWORD) {
        // Admin login successful
        const token = jwt.sign(
          {
            userId: 'admin',
            email: email,
            role: 'admin',
          },
          process.env.JWT_SECRET!,
          { expiresIn: '7d' }
        );

        return NextResponse.json({
          success: true,
          message: 'Admin login successful',
          access_token: token,
          user: {
            id: 'admin',
            email: email,
            full_name: 'System Administrator',
            role: 'admin',
          },
        });
      } else {
        return NextResponse.json(
          { success: false, message: 'Invalid admin credentials' },
          { status: 401 }
        );
      }
    }

    // Regular user login - verify from database
    const user = await User.verifyPassword(email, password);

    // Check if user is blocked
    if (user.isBlocked) {
      return NextResponse.json(
        {
          success: false,
          message: `Your account has been suspended. ${
            user.blockedReason
              ? `Reason: ${user.blockedReason}.`
              : ''
          } Please contact support at ${process.env.ADMIN_EMAIL} for assistance.`,
        },
        { status: 403 }
      );
    }

    // Ensure JWT secret is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json(
        { success: false, message: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      access_token: token,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Login failed' },
      { status: 401 }
    );
  }
}