import speech from '@google-cloud/speech';
import dotenv from 'dotenv';
import HttpError from '../utils/httpError.js';
import { Storage } from '@google-cloud/storage';
import { fileTypeFromBuffer } from 'file-type';

dotenv.config();

const client = new speech.SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

async function uploadToGCS(buffer) {
  try {
    const fileType = await fileTypeFromBuffer(buffer);
    const bucketName = process.env.GOOGLE_STORAGE_BUCKET_NAME;
    const fileName = `audio-${Date.now()}.${fileType.ext}`;

    const file = storage.bucket(bucketName).file(fileName);
    await file.save(buffer, {
      metadata: { contentType: fileType.mime },
    });

    return `gs://${bucketName}/${fileName}`;
  } catch (error) {
    console.error('GCS Upload Error:', error.message);
    throw new HttpError({
      status: 500,
      message: 'Failed to upload audio to Google Cloud Storage',
    });
  }
}

export async function transcribeGoogleSTT(audioBuffer) {
  let bucketName, fileName;

  try {
    const gcsUri = await uploadToGCS(audioBuffer);

    // Extract bucket and filename from GCS URI
    [bucketName, fileName] = gcsUri.replace('gs://', '').split('/', 2);

    const fileType = await fileTypeFromBuffer(audioBuffer);

    const config = {
      encoding: fileType.mime === 'audio/ogg; codecs=opus' ? 'WEBM_OPUS' : 'LINEAR16',
      sampleRateHertz: fileType.mime === 'audio/ogg; codecs=opus' ? 48000 : 24000,
      languageCode: 'bg-BG',
      enableWordTimeOffsets: true,
      audioChannelCount: 1,
    };

    const [operation] = await client.longRunningRecognize({
      audio: { uri: gcsUri },
      config: config,
    });

    const [response] = await operation.promise();

    if (!response.results) {
      console.error('Empty STT response:', JSON.stringify(response, null, 2));
      throw new HttpError({
        status: 400,
        message: 'No transcription results',
        details: 'Google STT returned empty response. Possible audio format issue',
      });
    }

    return response.results
      .flatMap((result) => result.alternatives[0].words)
      .map((wordInfo) => ({
        word: wordInfo.word,
        startTime: parseFloat(wordInfo.startTime.seconds) + wordInfo.startTime.nanos / 1e9,
        endTime: parseFloat(wordInfo.endTime.seconds) + wordInfo.endTime.nanos / 1e9,
      }));
  } catch (error) {
    console.error('Google STT Error:', error.message);
    throw new HttpError({
      status: error.status || 500,
      message: error.message || 'Google STT transcription failed',
    });
  } finally {
    if (bucketName && fileName) {
      try {
        await storage.bucket(bucketName).file(fileName).delete();
      } catch (deleteError) {
        console.error('GCS Cleanup Error:', deleteError.message);
      }
    }
  }
}
