import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import crypto from 'crypto';
import { sendNotification } from '@/lib/notificationService';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');

    // Check if user exists
    const user = await usersCollection.findOne({ 
      email: email.toLowerCase() 
    });

    // Return error if user doesn't exist
    if (!user) {
      return NextResponse.json({
        error: 'No account found with this email. Please sign up to get started.',
      }, { status: 404 });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Token expires in 1 hour
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    // Store reset token in database
    await usersCollection.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          reset_password_token: resetTokenHash,
          reset_password_expires: resetTokenExpiry,
        },
      }
    );

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    // Send email with reset link
    await sendNotification({
      to: email,
      subject: '🔐 Password Reset Request - MediAI',
      type: 'password-reset',
      templateData: {
        title: 'Password Reset Request',
        message: `You requested to reset your password. Click the link below to reset your password. This link will expire in 1 hour.`,
        resetUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    );
  }
}
