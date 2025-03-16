import { Router } from 'express';
import { fileUpload } from '../middleware/fileUpload.js';
import { uploadFileToS3, getS3Url } from '../services/storageService.js';
import {
  processWithOpenAI,
  extractTextFromPdf,
  extractTextFromWord,
  extractTextFromTxt,
  extractTextFromOdt,
} from '../services/ocrService.js';

import HttpError from '../utils/httpError.js';

const ocrController = Router();

/**
 * @swagger
 * /ocr:
 *   post:
 *     tags:
 *       - OCR
 *     summary: Uploads a file (PDF, .doc, .docx, .odt, .txt, or image), stores it on S3, and processes it for text extraction.
 *     description: Upload a PDF, Word document (.doc, .docx), OpenDocument file (.odt), or image file. The file will be stored in AWS S3, and text will be extracted either using specific libraries for each file type or OpenAI OCR for image files.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file (PDF, .doc, .docx, .odt, .txt, or image) to be uploaded and processed.
 *     responses:
 *       200:
 *         description: Successfully processed the file and returned the extracted text.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 text:
 *                   type: string
 *                   description: Extracted text from the uploaded file (PDF, .doc, .docx, .odt, .txt, or image).
 *                   example: "This is the extracted text from the uploaded file."
 *       400:
 *         description: Bad request, no file provided or unsupported file type.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No file provided or unsupported file type."
 *       500:
 *         description: Internal server error during processing.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Error extracting text from the file!"
 */

ocrController.post('/', fileUpload, async (req, res, next) => {
  try {
    if (!req.file) {
      throw new HttpError({
        status: 400,
        message: 'No file provided.',
      });
    }

    // Step 1: Upload the file to S3
    const cloudFolder = 'files';
    const uploadData = await uploadFileToS3(req.file, cloudFolder);

    const fileType = req.file.mimetype;
    let extractedText = '';

    // Step 2: Process PDF, docx or Image
    if (fileType === 'application/pdf') {
      // Extract text from PDF
      extractedText = await extractTextFromPdf(req.file.buffer);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword'
    ) {
      // Extract text from .docx or .doc
      extractedText = await extractTextFromWord(req.file.buffer);
    } else if (fileType === 'text/plain') {
      // Extract text from .txt
      extractedText = await extractTextFromTxt(req.file.buffer);
    } else if (fileType === 'application/vnd.oasis.opendocument.text') {
      // Extract text from .odt
      extractedText = await extractTextFromOdt(req.file.buffer);
    } else {
      // For image files, get the URL and use OpenAI for OCR
      const imageUrl = await getS3Url(uploadData.Key);
      extractedText = await processWithOpenAI(imageUrl);
    }

    res.status(200).json({ text: extractedText });
    extractedText = '';
  } catch (error) {
    next(error);
  }
});

export default ocrController;
