import userModel from '../models/userModel.js';
import { connectDB, disconnectDB } from '../config/dbConfig.js';
import dotenv from 'dotenv';

dotenv.config();

const seedUsers = [
  // Parent 1
  {
    fullName: 'Parent Parentov',
    email: 'parentParentov@gmail.com',
    password: 'Parent123!',
    role: 'parent',
    isEmailVerified: true,
    years: 'age 39',
    phone: '+359888333444',
    imageUrl: 'https://i.sstatic.net/l60Hf.png',
  },
  {
    fullName: 'Kid Kidov',
    email: 'kidKidov@gmail.com',
    password: 'Kid123!',
    role: 'kid',
    isEmailVerified: true,
    years: 'age 8',
    class: '10th grade',
    imageUrl: 'https://i.sstatic.net/l60Hf.png',
  },
  {
    fullName: 'Parent Parentov 1',
    email: 'parentParentov1@gmail.com',
    password: 'Parent123!',
    role: 'parent',
    isEmailVerified: true,
    years: 'age 37',
    phone: '+359888333444',
    imageUrl: 'https://i.sstatic.net/l60Hf.png',
  },
  {
    fullName: 'Kid Kidov 1',
    email: 'kidKidov1@gmail.com',
    password: 'Kid123!',
    role: 'kid',
    isEmailVerified: true,
    years: 'age 9',
    class: '10th grade',
    imageUrl: 'https://i.sstatic.net/l60Hf.png',
  },
  {
    fullName: 'Parent Parentov 2',
    email: 'parentParentov2@gmail.com',
    password: 'Parent123!',
    role: 'parent',
    isEmailVerified: true,
    years: 'age 35',
    phone: '+359888333444',
    imageUrl: 'https://i.sstatic.net/l60Hf.png',
  },
  {
    fullName: 'Kid Kidov 2',
    email: 'kidKidov2@gmail.com',
    password: 'Kid123!',
    role: 'kid',
    isEmailVerified: true,
    years: 'age 7',
    class: '10th grade',
    imageUrl: 'https://i.sstatic.net/l60Hf.png',
  },
];

const seedDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('Clearing existing users...');
    await userModel.deleteMany({});

    console.log('Seeding users...');
    for (const userData of seedUsers) {
      const user = new userModel(userData);
      await user.save();
      console.log(`Created user: ${userData.email}`);
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await disconnectDB();
  }
};

// Run seeder
seedDatabase();
