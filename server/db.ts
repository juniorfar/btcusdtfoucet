import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer: MongoMemoryServer | null = null;

export async function connectDB(): Promise<string> {
  const customUri = process.env.MONGODB_URI;

  try {
    if (customUri && customUri.trim() !== '') {
      console.log('Connecting to MongoDB via MONGODB_URI...');
      await mongoose.connect(customUri, {
        serverSelectionTimeoutMS: 8000,
      });
      console.log('Successfully connected to external MongoDB');
      return 'Connected to external MongoDB';
    } else {
      console.log('No MONGODB_URI set. Initializing in-memory MongoDB server...');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memoryUri = mongoMemoryServer.getUri();
      await mongoose.connect(memoryUri);
      console.log('Successfully connected to in-memory MongoDB server');
      return 'Connected to In-Memory MongoDB Server';
    }
  } catch (err: any) {
    console.error('Failed to connect to primary MongoDB, falling back to In-Memory MongoDB:', err.message);
    try {
      if (!mongoMemoryServer) {
        mongoMemoryServer = await MongoMemoryServer.create();
      }
      const memoryUri = mongoMemoryServer.getUri();
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(memoryUri);
      }
      console.log('Fallback to in-memory MongoDB succeeded');
      return 'Connected to Fallback In-Memory MongoDB';
    } catch (fallbackErr: any) {
      console.error('In-memory MongoDB fallback also failed:', fallbackErr);
      throw fallbackErr;
    }
  }
}

export function getDBStatus(): { isConnected: boolean; mode: string } {
  const readyState = mongoose.connection.readyState;
  const isConnected = readyState === 1;
  const mode = mongoMemoryServer ? 'In-Memory DB' : (process.env.MONGODB_URI ? 'External MongoDB' : 'Disconnected');
  return { isConnected, mode };
}
