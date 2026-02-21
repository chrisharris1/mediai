import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, email, full_name, oauth_id } = body;

    if (!provider || !email || !oauth_id) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Try to connect to MongoDB with retry logic
    let client;
    let retries = 3;
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        client = await clientPromise;
        break; // Connection successful
      } catch (error: any) {
        console.error(`MongoDB connection attempt ${i + 1} failed:`, error.message);
        lastError = error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
    }

    if (!client) {
      console.error('Failed to connect to MongoDB after retries');
      // Return success anyway but log the error
      // User can still authenticate, just won't be in DB yet
      const tempToken = jwt.sign(
        { 
          user_id: oauth_id, 
          email: email,
          role: 'patient',
          provider: provider
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return NextResponse.json({
        success: true,
        access_token: tempToken,
        user: {
          id: oauth_id,
          email: email,
          full_name: full_name || email.split('@')[0],
          role: 'patient'
        },
        warning: 'User authenticated but not persisted to database'
      });
    }

    const db = client.db('mediai');
    const usersCollection = db.collection('users');

    // Check if user exists by email or oauth_id
    let user = await usersCollection.findOne({
      $or: [
        { email: email },
        { oauth_id: oauth_id, oauth_provider: provider }
      ]
    });

    if (user) {
      // User exists - update OAuth info if needed
      if (!user.oauth_id || !user.oauth_provider) {
        await usersCollection.updateOne(
          { _id: user._id },
          { 
            $set: { 
              oauth_id: oauth_id,
              oauth_provider: provider,
              updated_at: new Date()
            } 
          }
        );
        user.oauth_id = oauth_id;
        user.oauth_provider = provider;
      }
      
      console.log('Existing OAuth user logged in:', {
        id: user._id.toString(),
        email: user.email,
        provider: provider
      });
    } else {
      // Create new user from OAuth data
      const newUser = {
        email: email,
        full_name: full_name || email.split('@')[0],
        oauth_provider: provider,
        oauth_id: oauth_id,
        role: 'patient',
        created_at: new Date(),
        updated_at: new Date(),
        profile: {
          age: null,
          gender: null,
          phone: null,
          allergies: [],
          chronic_conditions: [],
          current_medications: []
        }
      };

      const result = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
      
      console.log('✅ New OAuth user created in MongoDB:', {
        id: result.insertedId.toString(),
        email: email,
        provider: provider
      });
    }

    // Generate JWT token
    const access_token = jwt.sign(
      { 
        user_id: user._id.toString(), 
        email: user.email,
        role: user.role || 'patient'
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      success: true,
      access_token: access_token,
      user: {
        id: user._id.toString(),
        email: user.email,
        full_name: user.full_name,
        role: user.role || 'patient'
      }
    });

  } catch (error: any) {
    console.error('OAuth endpoint error:', error);
    
    // Return a temporary auth token even if database fails
    try {
      const body = await request.json();
      const { provider, email, full_name, oauth_id } = body;
      
      const tempToken = jwt.sign(
        { 
          user_id: oauth_id || 'temp', 
          email: email || 'unknown',
          role: 'patient',
          provider: provider || 'unknown'
        },
        JWT_SECRET,
        { expiresIn: '7d' } // Shorter expiry for fallback tokens
      );

      return NextResponse.json({
        success: true,
        access_token: tempToken,
        user: {
          id: oauth_id || 'temp',
          email: email || 'unknown',
          full_name: full_name || 'User',
          role: 'patient'
        },
        warning: 'Temporary authentication - database unavailable'
      });
    } catch {
      return NextResponse.json(
        { success: false, message: 'OAuth authentication failed' },
        { status: 500 }
      );
    }
  }
}
