import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

dotenv.config();
const PORT = process.env.API_PORT;

const corsOptions = {
  origin: process.env.FRONTEND_SERVER,
  methods: 'GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie'],
  credentials: true,
};

const expressConfig = async (app) => {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(cors(corsOptions));

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`API Docs available at http://localhost:${PORT}/api/docs`);
  });
};

export default expressConfig;
