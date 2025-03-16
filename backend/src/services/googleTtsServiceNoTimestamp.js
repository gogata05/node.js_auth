import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import HttpError from '../utils/httpError.js';
import dotenv from 'dotenv';
dotenv.config();

const client = new TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

async function generateGoogleTTS(text) {
  try {
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: 'bg-BG',
        name: 'bg-BG-Standard-A',
      },
      audioConfig: {
        audioEncoding: 'OGG_OPUS',
        speakingRate: 1.0,
        pitch: 0,
      },
    });

    return response.audioContent;
  } catch (error) {
    console.error('Google TTS Error:', error.message);
    throw new HttpError({
      status: 500,
      message: 'Google TTS generation failed',
      details: error.message,
    });
  }
}

export { generateGoogleTTS };
