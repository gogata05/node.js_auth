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
// router.use('/test', testController);
router.use('/auth', authController);
router.use('/chat', chatController);
// router.use('/stt', sttController);
router.use('/tts', ttsController);
// router.use('/ocr', ocrController);
router.use('/audio', (req, res, next) => dynamicAudioRouter(req, res, next));
router.use('/files', fileController);
// router.use('/tts-and-stt', ttsSttController);
// router.use('/openai-tts-and-google-stt', openaiTtsGoogleSttController);
// router.use('/google-stt', googleSttController);
router.use('/email', emailController);
router.use('/reader', readerController);

// Swagger docs route
router.use(swaggerRouter);

router.use((err, req, res, next) => {
  errorHandler(err, req, res, next);
});

export default router;
