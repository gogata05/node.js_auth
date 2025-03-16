import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
// MongoDB connection string
const DB_URL = process.env.DB_URL;

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(DB_URL);
    console.log('MongoDB Connected!');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1); // Exit process with failure
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected!');
  } catch (err) {
    console.error('Error disconnecting MongoDB:', err.message);
  }
};

export { connectDB, disconnectDB };
