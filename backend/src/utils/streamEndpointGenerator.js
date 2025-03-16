import { Router } from 'express';
import HttpError from '../utils/httpError.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
const PORT = process.env.API_PORT;

let dynamicAudioRouter = null;

function generateStreamEndpoint(stream) {
  const uniqueId = crypto.randomUUID();
  const streamUri = `http://localhost:${PORT}/api/audio/${uniqueId}`;
  dynamicAudioRouter = Router();
  dynamicAudioRouter.get(`/${uniqueId}`, (req, res, next) => {
    try {
      res.set({
        'Content-Type': 'audio/ogg',
      });
      stream
        .on('error', (err) => {
          throw new HttpError({
            status: 502,
            message: 'Error while streaming.',
            details: err.message || 'OpenAI API stream error.',
          });
        })
        .pipe(res);
    } catch (error) {
      next(error);
    }
  });

  return streamUri;
}

export { dynamicAudioRouter, generateStreamEndpoint };
