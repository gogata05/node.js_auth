import { Router } from 'express';
import { generateTTS } from '../services/ttsService.js';
import { transcribeGoogleSTT } from '../services/googleSttService.js';
import HttpError from '../utils/httpError.js';
import { auth } from '../middleware/authMiddleware.js';

const openaiTtsGoogleSttController = Router();

/**
 * @swagger
 * /openai-tts-and-google-stt:
 *   post:
 *     tags: [TTS]
 *     summary: Combined OpenAI TTS and Google STT processing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: "България е основана през 681 година"
 *     responses:
 *       200:
 *         description: Returns audio and word timings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 audioBase64:
 *                   type: string
 *                 words:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       word:
 *                         type: string
 *                       startTime:
 *                         type: number
 *                       endTime:
 *                         type: number
 */
openaiTtsGoogleSttController.post('/', auth, async (req, res, next) => {
  try {
    const { text } = req.body;

    // Validate input
    if (!text || typeof text !== 'string') {
      throw new HttpError({
        status: 400,
        message: 'Invalid input',
        details: 'Text must be a non-empty string',
      });
    }

    if (text.length > 4096) {
      throw new HttpError({
        status: 400,
        message: 'Text too long',
        details: 'Maximum 4096 characters allowed',
      });
    }

    // Generate OpenAI TTS
    const audioBuffer = await generateTTS(text);

    // Convert audio to Base64
    const audioBase64 = audioBuffer.toString('base64');

    // Process Google STT
    const words = await transcribeGoogleSTT(audioBuffer);

    res.status(200).json({
      audioBase64,
      words,
    });
  } catch (error) {
    console.error('OpenAI-TTS-and-Google-STT Error:', error.message);
    next(error);
  }
});

export default openaiTtsGoogleSttController;
