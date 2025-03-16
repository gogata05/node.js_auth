import { Router } from 'express';
import { fileUpload } from '../middleware/fileUpload.js';
import { auth, checkFileAccess, checkRole } from '../middleware/authMiddleware.js';
import * as storageService from '../services/storageService.js';
import * as chatService from '../services/chatService.js';
import { getChildInfoById } from '../services/authService.js';
import HttpError from '../utils/httpError.js';
import { compressImage } from '../utils/compress.js';
import { prompts } from '../utils/aiPrompts.js';
import {
  processWithOpenAI,
  extractTextFromPdf,
  extractTextFromWord,
  extractTextFromTxt,
  extractTextFromOdt,
} from '../services/ocrService.js';

const fileController = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       properties:
 *         fileName:
 *           type: string
 *           description: The display name of the file
 *         category:
 *           type: string
 *           description: Category of the file
 *         size:
 *           type: string
 *           description: File size in bytes
 *         key:
 *           type: string
 *           description: Unique key to identify the file on the Cloud
 *         _id:
 *           type: string
 *           description: Unique id of the DB entry
 *         created_at:
 *           type: string
 *           description: Time of creation
 *         updated_at:
 *           type: string
 *           description: Time of the last change
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /files:
 *   post:
 *     tags:
 *       - Files
 *     summary: Uploads a file for storage.
 *     description: Stores the uploaded file in the cloud and creates a database entry.
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
 *                 description: The file to be uploaded.
 *     responses:
 *       200:
 *         description: The new file DB entry
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 */

fileController.post('/', auth, fileUpload, async (req, res, next) => {
  try {
    if (!req.file) {
      throw new HttpError({
        status: 400,
        message: 'No file provided.',
      });
    }

    await storageService.checkStorageCapacity(req.user.userId);

    const file = req.file;
    if (file.mimetype.startsWith('image/')) {
      await compressImage(file);
    }

    const cloudFolder = 'files';
    const uploadData = await storageService.uploadFileToS3(file, cloudFolder);

    const fileData = {
      fileName: file.originalname,
      category: 'Upload',
      size: file.size,
      key: uploadData.Key,
      owner: req.user.userId,
    };

    const newFile = await storageService.addFileToDb(fileData);

    res.status(200).json(newFile);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /files/get-url:
 *   get:
 *     tags:
 *       - Files
 *     summary: Gets an URL to the requested file.
 *     description: Generate and return a presigned URL to temporary access a private file.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *                 description: The unique key of the file.
 *                 example: "files/545b5b96-a612-4d24-8232-108853895e22_Test.txt"
 *     responses:
 *       200:
 *         description: An active presigned URL.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fileUrl:
 *                   type: string
 *                   description: The ID of the file.
 *                   example: "https://latters.s3.us-east-1.amazonaws.com/Test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ADFGQ5LPRT3IZTPVYIL%2F20250121%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250121T043651Z&X-Amz-Expires=60&X-Amz-Signature=cb722da5df92d79a8205ae71467e06615c449471999e687004406baca2fe28ee&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject"
 */

fileController.post('/get-url', auth, checkFileAccess, async (req, res, next) => {
  const { key } = req.body;

  try {
    if (!key) {
      throw new HttpError({
        status: 400,
        message: 'No key provided!',
      });
    }

    const fileUrl = await storageService.getS3Url(key);
    res.status(200).json({ fileUrl });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /files:
 *   delete:
 *     tags:
 *       - Files
 *     summary: Deletes a file.
 *     description: Deletes the file from the Cloud bucket and removes the DB entry.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *                 description: The unique key of the file.
 *                 example: "files/545b5b96-a612-4d24-8232-108853895e22_Test.txt"
 *     responses:
 *       200:
 *         description: Success message.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message.
 *                   example: "File deleted successfully."
 *                 userFiles:
 *                   type: array
 *                   description: The updated user files after deletion.
 *                   items:
 *                     $ref: '#/components/schemas/File'
 */

fileController.delete('/', auth, checkFileAccess, async (req, res, next) => {
  const { key } = req.body;

  try {
    if (!key) {
      throw new HttpError({
        status: 400,
        message: 'No key provided!',
      });
    }

    await storageService.deleteFileFromS3(key);
    const userFiles = await storageService.deleteFileFromDB(key);
    res.status(200).json({
      message: 'File deleted successfully.',
      userFiles: userFiles,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /files/process:
 *   post:
 *     tags:
 *       - Files
 *     summary: Processes a user file depending on the selected mode.
 *     description: Saves the file. Extract its contents and uses the AI features to provide the requested help.
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
 *                 description: The file to be uploaded.
 *               mode:
 *                 type: string
 *                 description: The selected mode by the user. Can be one of 'homework', 'lesson', 'summary' and 'reading'.
 *                 example: "homework"
 *               conversationId:
 *                 type: string
 *                 description: The ID of the ongoing conversation. Needed to provide context to the AI chatbot.
 *                 example: "675d955c980d685673d4bb60"
 *     responses:
 *       200:
 *         description: File process response.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 question:
 *                   type: string
 *                   description: The name of of the sent file.
 *                   example: Test.txt
 *                 answer:
 *                   type: string
 *                   description: Lexi's answer as text or the file content in reading mode.
 *                   example: "Тази задача се решава като първо..."
 *                 fileKey:
 *                   type: string
 *                   description: Unique file key to access the file on the cloud.
 *                   example: "files/7f1efbae-bff8-40a3-9dbf-902963b076df_IMG_20241202_220503.webp"
 */

fileController.post('/process', auth, checkRole(['kid']), fileUpload, async (req, res, next) => {
  const validModes = ['homework', 'lesson', 'summary', 'reading'];

  try {
    const { mode, conversationId } = req.body;

    if (!mode) {
      throw new HttpError({
        status: 400,
        message: 'No mode specified.',
      });
    }

    if (!validModes.includes(mode)) {
      throw new HttpError({
        status: 400,
        message: 'Invalid mode!',
      });
    }

    if (!conversationId) {
      throw new HttpError({
        status: 400,
        message: 'Conversation ID is not provided.',
      });
    }

    if (!req.file) {
      throw new HttpError({
        status: 400,
        message: 'No file provided.',
      });
    }

    await storageService.checkStorageCapacity(req.user.userId); // TODO: Remove this check if 'File delete' FE is not ready before deadline.
    const file = req.file;
    const originalFileName = file.originalname;

    if (file.mimetype.startsWith('image/')) {
      await compressImage(file);
    }

    const cloudFolder = 'files';
    const uploadData = await storageService.uploadFileToS3(file, cloudFolder);
    const category = mode.charAt(0).toUpperCase() + mode.slice(1);

    const fileData = {
      fileName: file.originalname,
      category,
      size: file.size,
      key: uploadData.Key,
      owner: req.user.userId,
    };

    await storageService.addFileToDb(fileData);

    let fileTextContent = '';

    if (!file.mimetype.startsWith('image/')) {
      const docType = file.mimetype;
      switch (docType) {
        case 'application/pdf':
          fileTextContent = await extractTextFromPdf(file.buffer);
          break;
        case 'application/vnd.oasis.opendocument.text':
          fileTextContent = await extractTextFromOdt(file.buffer);
          break;
        case 'text/plain':
          fileTextContent = await extractTextFromTxt(file.buffer);
          break;
        default: // Handles doc and docx files. Other formats are omitted by the fileUpload middleware.
          fileTextContent = await extractTextFromWord(file.buffer);
          break;
      }
    }

    if (file.mimetype.startsWith('image/')) {
      const imageUrl = await storageService.getS3Url(uploadData.Key);
      fileTextContent = await processWithOpenAI(imageUrl);
    }

    if (typeof fileTextContent !== 'string' || fileTextContent === '') {
      throw new HttpError({
        status: 400,
        message: 'Invalid file content',
      });
    }

    let response = {
      question: originalFileName,
      answer: '',
      fileKey: uploadData.Key,
    };

    switch (mode) {
      case 'reading':
        {
          if (fileTextContent.length > 4096) {
            throw new HttpError({
              status: 400,
              message: 'File content is too long.',
              details: 'The maximum length for reading assistance currently is 4096 characters.',
            });
          }

          response.answer = fileTextContent;
        }
        break;
      default:
        {
          // Handles both homework, lesson and summary modes. Invalid modes are already handled.
          const aiInput = `${prompts[mode]} ${fileTextContent}`;
          if (aiInput.length > 4096) {
            throw new HttpError({
              status: 400,
              message: 'File content is too long.',
              details: `The max file length for ${mode} mode is ${4096 - prompts[mode].length} characters.`,
            });
          }

          const user = await getChildInfoById(req.user.userId);
          const textChatResponse = await chatService.chatWithLexi(aiInput, conversationId, user);
          if (!textChatResponse.message.content || typeof textChatResponse.message.content !== 'string') {
            throw new HttpError({
              status: 400,
              message: 'Invalid Chatbot response',
            });
          }

          response.answer = textChatResponse.message.content;
        }
        break;
    }

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

export default fileController;
