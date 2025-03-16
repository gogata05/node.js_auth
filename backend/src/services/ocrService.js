import OpenAI from 'openai';
import HttpError from '../utils/httpError.js';
import dotenv from 'dotenv';

import fs from 'fs';
import tmp from 'tmp';
import { PDFExtract } from 'pdf.js-extract';
import WordExtractor from 'word-extractor';
import OfficeParser from 'officeparser';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Process OCR using OpenAI
 * @param {string} imageUrl - URL of the image to process
 * @returns {Promise<string>} - Extracted text
 */
async function processWithOpenAI(imageUrl) {
  try {
    // Send the image URL to OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract only the text from this image. Do not include any additional messages, explanations, or formatting. Return only the raw text:',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl, // Pass the URL directly
              },
            },
          ],
        },
      ],
    });

    // Extract the text from OpenAI's response
    const extractedText = response.choices[0].message.content.trim();
    return extractedText;
  } catch (error) {
    throw new HttpError({
      status: 500,
      message: 'OpenAI OCR failed.',
      details: error.message,
    });
  }
}

const extractTextFromPdf = async (pdfBuffer) => {
  const tempFile = tmp.fileSync({ postfix: '.pdf' });

  try {
    await fs.promises.writeFile(tempFile.name, pdfBuffer);

    const pdfExtract = new PDFExtract();
    const data = await pdfExtract.extract(tempFile.name, {});

    const result = data.pages
      .map((page) => {
        return page.content
          .map((item) => item.str) // Extract text
          .join(' ') // Preserve spaces
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim();
      })
      .join('\n');
    return result;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Error extracting text from PDF');
  } finally {
    tempFile.removeCallback();
  }
};

const extractTextFromWord = async (buffer) => {
  try {
    const wordExtractor = new WordExtractor();
    const extracted = await wordExtractor.extract(buffer);

    const result = extracted.getBody();
    return result;
  } catch (error) {
    console.error('Error extracting text from .docx or .doc:', error);
    throw new Error('Error extracting text from .docx or .doc');
  }
};

const extractTextFromOdt = async (buffer) => {
  try {
    const result = await OfficeParser.parseOfficeAsync(buffer); // Call it directly as a function
    return result;
  } catch (error) {
    console.error('Error extracting text from ODT file:', error.message);
    throw new Error('Error extracting text from ODT file');
  }
};

const extractTextFromTxt = async (buffer) => {
  try {
    const text = buffer.toString('utf8');
    return text;
  } catch (error) {
    console.error('Error extracting text from .txt:', error);
    throw new Error('Error extracting text from .txt');
  }
};
export { processWithOpenAI, extractTextFromPdf, extractTextFromWord, extractTextFromTxt, extractTextFromOdt };
