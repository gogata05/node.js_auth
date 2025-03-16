import { Router } from 'express';
import { generateTTS, generateTtsUri } from '../services/ttsService.js';
import HttpError from '../utils/httpError.js';
import { generateGoogleTTS } from '../services/googleTtsServiceNoTimestamp.js';
import { auth } from '../middleware/authMiddleware.js';

const ttsController = Router();
/**
 * @swagger
 * /tts/buffer:
 *   post:
 *     tags:
 *       - TTS
 *     summary: Generate Text-to-Speech (TTS) Audio
 *     security:
 *       - bearerAuth: []
 *     description: Converts the provided text into audio using the OpenAI API and returns the audio as a file (buffer).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: The text to be converted into audio.
 *                 example: "Този текст е за тест."
 *     responses:
 *       200:
 *         description: The generated audio file as a buffer.
 *         content:
 *           audio/ogg:
 *             schema:
 *               type: Buffer
 *               format: binary
 */

ttsController.post('/buffer', auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      throw new HttpError({
        status: 400,
        message: 'Invalid TTS input.',
        details: 'TTS input must be a string.',
      });
    }

    if (text.length > 4096) {
      throw new HttpError({
        status: 400,
        message: 'TTS input is too long.',
        details: 'The maximum length is 4096 characters.',
      });
    }

    const audioBuffer = await generateTTS(text);

    res.set({
      'Content-Type': 'audio/ogg',
      'Content-Disposition': 'inline',
    });
    res.end(audioBuffer, 'binary');
  } catch (error) {
    console.error('Error in TTS generation:', error.message);
    res.status(500).json({ error: 'Failed to generate TTS audio' });
  }
});

/**
 * @swagger
 * /tts/uri:
 *   post:
 *     tags:
 *       - TTS
 *     summary: Generate Text-to-Speech (TTS) Audio
 *     security:
 *       - bearerAuth: []
 *     description: Converts the provided text into audio using the OpenAI API and returns a dynamic URI of one-time audio stream which can be directly passed to the Audio constructor.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: The text to be converted into audio.
 *                 example: "Този текст е за тест."
 *     responses:
 *       200:
 *         description: A dynamic URI on which generated audio is streamed. Can be directly passed to the Audio constructor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 streamUri:
 *                   type: string
 *                   description: The dynamic URI of the one-time audio stream which can be directly passed to the Audio constructor.
 *                   example: "http://localhost:3000/api/audio/a9e47f31-b791-4f9d-b7c5-19c76fa9f609"
 */

ttsController.post('/uri', auth, async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      throw new HttpError({
        status: 400,
        message: 'Invalid TTS input.',
        details: 'TTS input must be a string.',
      });
    }

    if (text.length > 4096) {
      throw new HttpError({
        status: 400,
        message: 'TTS input is too long.',
        details: 'The maximum length is 4096 characters.',
      });
    }

    const audioStreamPath = await generateTtsUri(text);

    res.status(200).json({ streamUri: audioStreamPath });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /tts/google/buffer:
 *   post:
 *     tags: [TTS]
 *     summary: Google TTS Audio Buffer
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
 *                 example: "Този текст е за тест."
 *     responses:
 *       200:
 *         content:
 *           audio/ogg:
 *             schema:
 *               type: string
 *               format: binary
 */
ttsController.post('/google/buffer', auth, async (req, res) => {
  try {
    const { text } = req.body;
    // ... existing validation logic ...

    const audioBuffer = await generateGoogleTTS(text);
    res.set({
      'Content-Type': 'audio/ogg',
      'Content-Disposition': 'inline',
    });
    res.end(audioBuffer, 'binary');
  } catch (error) {
    console.error('Google TTS Buffer Error:', error.message);
    res.status(error.status || 500).json({
      error: error.message,
      details: error.details,
    });
  }
});

export default ttsController;
