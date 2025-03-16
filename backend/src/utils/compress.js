import sharp from 'sharp';
import convert from 'heic-convert';
import HttpError from './httpError.js';

export const compressImage = async (file, size = 2048) => {
  try {
    if (file.mimetype === 'image/heic' || file.mimetype === 'image/heif') {
      const inputBuffer = file.buffer;
      const outputBuffer = await convert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 1,
      });

      file.buffer = outputBuffer;
    }

    const compressedBuffer = await sharp(file.buffer)
      .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    file.buffer = compressedBuffer;
    file.mimetype = 'image/webp';
    file.size = compressedBuffer.length;
    file.originalname = file.originalname.replace(/\.[^.]+$/, '.webp');
  } catch (error) {
    throw new HttpError({
      status: 400,
      message: 'Conversion error.',
      details: error.message,
    });
  }
};
