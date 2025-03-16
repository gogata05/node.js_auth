import OpenAI from 'openai';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI();

export const transcribeAudio = async (audioPath) => {
  try {
    // Get the transcription from the OpenAI API
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      language: 'bg',
      temperature: 0.2,
    });

    return response.text;
  } catch (error) {
    console.error('Error processing audio:', error.message);
    throw error;
  } finally {
    //Delete the file from the tmp folder
    fs.unlinkSync(audioPath);
  }
};
