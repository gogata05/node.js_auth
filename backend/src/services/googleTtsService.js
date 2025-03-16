import { TextToSpeechClient, TextToSpeechLongAudioSynthesizeClient } from '@google-cloud/text-to-speech';
import { Storage } from '@google-cloud/storage';
import HttpError from '../utils/httpError.js';
import dotenv from 'dotenv';
dotenv.config();

const client = new TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const longAudioClient = new TextToSpeechLongAudioSynthesizeClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

async function generateGoogleTTS(text, includeTimings = false) {
  console.log('Starting Google TTS generation');
  let bucketName, fileName;

  try {
    // Check text size
    const textByteSize = Buffer.byteLength(text, 'utf8');
    console.log('Text size in bytes:', textByteSize);

    if (textByteSize > 5000) {
      console.log('Using Long Audio API for text size:', textByteSize);

      bucketName = process.env.GOOGLE_STORAGE_BUCKET_NAME;
      fileName = `tts-${Date.now()}.wav`;
      const outputGcsUri = `gs://${bucketName}/${fileName}`;

      const request = {
        parent: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/global`,
        input: { text },
        voice: {
          languageCode: 'bg-BG',
          name: 'bg-BG-Standard-A',
        },
        audioConfig: {
          audioEncoding: 'LINEAR16',
          speakingRate: 1.0,
          pitch: 0,
          sampleRateHertz: 24000,
        },
        outputGcsUri,
      };

      console.log('Long audio synthesis request:', JSON.stringify(request, null, 2));

      const [operation] = await longAudioClient.synthesizeLongAudio(request);
      const [response] = await operation.promise();
      console.log('Long audio synthesis completed:', JSON.stringify(response, null, 2));

      // Download the audio file from GCS
      const [audioContent] = await storage.bucket(bucketName).file(fileName).download();

      return {
        audioBuffer: audioContent,
      };
    }

    // For short text, use standard synthesis
    const request = {
      input: { text },
      voice: {
        languageCode: 'bg-BG',
        name: 'bg-BG-Standard-A',
      },
      audioConfig: {
        audioEncoding: 'OGG_OPUS',
        speakingRate: 1.0,
        pitch: 0,
        sampleRateHertz: 24000,
      },
    };

    if (includeTimings) {
      request.enableTimePointing = ['SSML_MARK'];
    }

    const [response] = await client.synthesizeSpeech(request);
    console.log('Google TTS response received');

    const result = {
      audioBuffer: response.audioContent,
    };

    if (includeTimings && response.timepoints) {
      result.timings = response.timepoints.map((tp) => ({
        mark: tp.markName,
        time: tp.timeSeconds,
      }));
    }

    return result;
  } catch (error) {
    console.error('Google TTS Error:', error.message);
    throw new HttpError({
      status: 500,
      message: 'Google TTS generation failed',
      details: error.message,
    });
  } finally {
    // Cleanup for long audio files
    if (bucketName && fileName) {
      try {
        console.log('Attempting to delete TTS output file:', fileName);
        await storage.bucket(bucketName).file(fileName).delete();
        console.log('Successfully deleted TTS output file:', fileName);
      } catch (deleteError) {
        console.error('GCS Cleanup Error:', deleteError.message);
      }
    }
  }
}

export { generateGoogleTTS };
