import { ObjectId } from 'mongodb'; // Keep this
import { getDatabase } from '../lib/mongodb'; // This is correct
import bcrypt from 'bcryptjs';

export interface IUser {
  _id?: ObjectId;
  email: string;
  password?: string;
  full_name: string;
  role: 'patient' | 'doctor' | 'pending_doctor' | 'admin';
  created_at: Date;
  is_active: boolean;
  oauth_provider?: string;
  oauth_id?: string;
  doctor_application_id?: ObjectId;
  // Block functionality
  isBlocked: boolean;
  blockedAt?: Date;
  blockedReason?: string;
  blockedBy?: ObjectId; // Admin who blocked this user
  profile: {
    age?: number;
    gender?: string;
    phone?: string;
    allergies: string[];
    chronic_conditions: string[];
    current_medications: string[];
  };
}

export class User {
  static async findById(userId: string): Promise<IUser | null> {
    const db = await getDatabase();
    const objectId = new ObjectId(userId);
    const user = await db.collection<IUser>('users').findOne({ _id: objectId });
    return user;
  }
  static async createUser(
    email: string,
    password: string,
    fullName: string,
    role: 'patient' | 'doctor' | 'pending_doctor' | 'admin' = 'patient',
    oauthProvider?: string,
    oauthId?: string
  ) {
    const db = await getDatabase();
    const collection = db.collection<IUser>('users');

    // Check if user exists by email or OAuth ID
    const query = oauthId && oauthProvider
      ? { $or: [{ email: email.toLowerCase() }, { oauth_id: oauthId, oauth_provider: oauthProvider }] }
      : { email: email.toLowerCase() };
    
    const existingUser = await collection.findOne(query);
    if (existingUser) {
      // If OAuth user already exists, return their info
      return {
        success: true,
        message: 'User already exists',
        user_id: existingUser._id!.toString(),
        user: {
          id: existingUser._id!.toString(),
          email: existingUser.email,
          full_name: existingUser.full_name,
          role: existingUser.role
        }
      };
    }

    // Hash password (only if not OAuth or a password is provided)
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    // Create user document
    const userDoc: IUser = {
      email: email.toLowerCase(),
      password: hashedPassword,
      full_name: fullName,
      role,
      created_at: new Date(),
      is_active: true,
      isBlocked: false, // Default to not blocked
      oauth_provider: oauthProvider,
      oauth_id: oauthId,
      profile: {
        age: undefined,
        gender: undefined,
        phone: undefined,
        allergies: [],
        chronic_conditions: [],
        current_medications: [],
      },
    };

    const result = await collection.insertOne(userDoc);
    return {
      success: true,
      message: 'User created successfully',
      user_id: result.insertedId.toString(),
      user: {
        id: result.insertedId.toString(),
        email: userDoc.email,
        full_name: userDoc.full_name,
        role: userDoc.role
      }
    };
  }

  static async verifyPassword(email: string, password: string) {
    const db = await getDatabase();
    const collection = db.collection<IUser>('users');

    const user = await collection.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error('Email not found. Please check your email address or register.');
    }

    if (!user.is_active) {
      throw new Error('Account is deactivated. Please contact support.');
    }

    const isValid = await bcrypt.compare(password, user.password!);
    if (!isValid) {
      throw new Error('Incorrect password. Please try again.');
    }

    // Remove password from returned user
    const { password: _, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      _id: user._id!.toString(),
    };
  }

  static async getUserById(userId: string) {
    const db = await getDatabase();
    const collection = db.collection<IUser>('users');

    const user = await collection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      throw new Error('User not found');
    }

    const { password: _, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      _id: user._id!.toString(),
    };
  }

  static async getUserByEmail(email: string) {
    const db = await getDatabase();
    const collection = db.collection<IUser>('users');

    const user = await collection.findOne({ email: email.toLowerCase() });
    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      _id: user._id!.toString(),
    };
  }

  static async blockUser(userId: string, blockReason: string, adminId: string) {
    const db = await getDatabase();
    const collection = db.collection<IUser>('users');

    const result = await collection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          isBlocked: true,
          blockedAt: new Date(),
          blockedReason: blockReason,
          blockedBy: new ObjectId(adminId),
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error('User not found');
    }

    return { success: true };
  }

  static async unblockUser(userId: string) {
    const db = await getDatabase();
    const collection = db.collection<IUser>('users');

    const result = await collection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          isBlocked: false,
        },
        $unset: {
          blockedAt: '',
          blockedReason: '',
          blockedBy: '',
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error('User not found');
    }

    return { success: true };
  }
}