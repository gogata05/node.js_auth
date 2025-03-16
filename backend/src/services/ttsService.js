import OpenAI from 'openai';
import dotenv from 'dotenv';
import { generateStreamEndpoint } from '../utils/streamEndpointGenerator.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateTTS(text) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid input text for TTS');
    }
    if (text.length > 4096) {
      throw new Error('Input text for TTS is too long');
    }

    const audioResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      speed: 0.9,
      input: text,
      response_format: 'opus',
    });

    const buffer = Buffer.from(await audioResponse.arrayBuffer());

    return buffer;
  } catch (error) {
    console.error('An error occurred during TTS generation:', error.message);
    throw new Error('Failed to generate TTS audio');
  }
}

async function generateTtsUri(text) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid input text for TTS');
    }
    if (text.length > 4096) {
      throw new Error('Input text for TTS is too long');
    }

    const audioResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      speed: 0.9,
      input: text,
      response_format: 'opus',
    });

    const stream = audioResponse.body;

    const streamUri = generateStreamEndpoint(stream);

    return streamUri;
  } catch (error) {
    console.error('An error occurred during TTS generation:', error.message);
    throw new Error('Failed to generate TTS audio');
  }
}

export { generateTTS, generateTtsUri };
