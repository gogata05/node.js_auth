import express from 'express';
import expressConfig from './config/expressConfig.js';
import { connectDB } from './config/dbConfig.js';
import router from './router.js';

const app = express();
connectDB();
expressConfig(app);
app.use('/api', router);
