import { Router } from 'express';
import { transcribeGoogleSTT } from '../services/googleSttService.js';
import HttpError from '../utils/httpError.js';
import { voiceUpload } from '../middleware/voiceUpload.js';
import { auth } from '../middleware/authMiddleware.js';
import fs from 'fs';

const googleSttController = Router();

/**
 * @swagger
 * /google-stt:
 *   post:
 *     tags: [STT]
 *     summary: Google Speech-to-Text with timestamps
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio file to transcribe
 *     responses:
 *       200:
 *         description: Transcription result with timestamps
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 text:
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
googleSttController.post('/', auth, voiceUpload, async (req, res, next) => {
  try {
    if (!req.file) {
      throw new HttpError({
        status: 400,
        message: 'No audio file provided',
      });
    }

    const audioBuffer = fs.readFileSync(req.file.path);
    const words = await transcribeGoogleSTT(audioBuffer);

    // Cleanup temporary file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      text: words.map((w) => w.word).join(' '),
      words,
    });
  } catch (error) {
    console.error('Google STT Error:', error.message);
    next(error);
  }
});

export default googleSttController;
