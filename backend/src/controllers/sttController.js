import { Router } from 'express';
import { transcribeAudio } from '../services/sttService.js';
import { voiceUpload } from '../middleware/voiceUpload.js';

const sttController = Router();

/**
 * @swagger
 * /stt:
 *   post:
 *     tags:
 *       - STT
 *     summary: Transcribes voice audio to text in Bulgarian.
 *     description: Sends an audio file to the AI agent and receives a text transcription.
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
 *                 description: The audio recording of the user's question.
 *     responses:
 *       200:
 *         description: The text transcription as a string.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transcription:
 *                   type: string
 *                   description: Bulgarian transcription of the received audio file.
 *                   example: "Кога е създадена българската държава?"
 */

sttController.post('/', voiceUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No audio file provided',
      });
    }

    const transcription = await transcribeAudio(req.file.path);

    res.status(200).json({
      transcription,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default sttController;
