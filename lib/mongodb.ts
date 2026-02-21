import { MongoClient, MongoClientOptions } from 'mongodb';
import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri: string = process.env.MONGODB_URI;

// Production-ready options that work on both Windows and Linux
const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 20000,
  retryWrites: true,
  retryReads: true,
  // SSL options - these work across platforms
  ...(process.env.NODE_ENV === 'development' && {
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
  }),
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable to prevent hot reload issues
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect()
      .then(client => {
        console.log('✅ MongoDB Connected Successfully');
        return client;
      })
      .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
        throw err;
      });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new client
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// ✅ ADD THIS FUNCTION → This was missing
export const getDatabase = async () => {
  const client = await clientPromise;
  return client.db(); // default DB from your Mongo URI
};

export const connectToDatabase = async () => {
  const client = await clientPromise;
  return { db: client.db(), client };
};

// Mongoose connection function for all API routes
export const dbConnect = async () => {
  try {
    // If already connected, return
    if (mongoose.connection.readyState >= 1) {
      return mongoose.connection.db;
    }

    // Connect Mongoose
    await mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Mongoose Connected Successfully');
    return mongoose.connection.db;
  } catch (error) {
    console.error('❌ Mongoose Connection Error:', error);
    throw error;
  }
};

export default clientPromise;
