// The router handles the main '/api' route by importing and using the controllers for each sub-route.

import { Router } from 'express';
import authController from './controllers/authController.js';
import chatController from './controllers/chatController.js';
import ttsController from './controllers/ttsController.js';
import fileController from './controllers/fileController.js';
import readerController from './controllers/readerController.js';
import errorHandler from './middleware/errorHandler.js';
import emailController from './controllers/emailController.js';
import { dynamicAudioRouter } from './utils/streamEndpointGenerator.js';

import swaggerRouter from './utils/swagger.js';

const router = Router();

// Assign controllers to subroutes
router.use('/auth', authController);
router.use('/chat', chatController);
router.use('/tts', ttsController);
router.use('/audio', (req, res, next) => dynamicAudioRouter(req, res, next));
router.use('/files', fileController);
router.use('/email', emailController);
router.use('/reader', readerController);

// Swagger docs route
router.use(swaggerRouter);

router.use((err, req, res, next) => {
  errorHandler(err, req, res, next);
});

export default router;
