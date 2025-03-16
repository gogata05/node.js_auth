import { Router } from 'express';
import * as chatService from '../services/chatService.js';
import * as historyService from '../services/historyService.js';
import HttpError from '../utils/httpError.js';
import { voiceUpload } from '../middleware/voiceUpload.js';
import { transcribeAudio } from '../services/sttService.js';
import { generateTTS, generateTtsUri } from '../services/ttsService.js';
import { auth, checkRole } from '../middleware/authMiddleware.js';
import { getChildInfoById } from '../services/authService.js';

const chatController = Router();

/**
 * @swagger
 * /chat/start:
 *   get:
 *     tags:
 *       - Chat
 *     summary: Gets an ID of a new conversation.
 *     description: Sets a new conversation in the DB where a chat context will be kept and used with AI chat functions.
 *     responses:
 *       200:
 *         description: The ID of the newly started conversation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversationId:
 *                   type: string
 *                   description: The ID of the conversation.
 *                   example: "675d955c980d685673d4bb60"
 */

chatController.get('/start', auth, checkRole(['kid']), async (req, res, next) => {
  let conversationId;

  try {
    const conversation = await historyService.newConversation(req.user.userId);
    conversationId = conversation._id;
    res.status(200).json({ conversationId });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /chat/text:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Text interaction with the AI chatbot.
 *     description: Sends a text user input to the AI chatbot with the ID of the conversation and receives a text reply in Bulgarian.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userInput:
 *                 type: string
 *                 description: The user's question.
 *                 example: "Кога е създадена Българската държава?"
 *               conversationId:
 *                 type: string
 *                 description: The ID of the ongoing conversation. Needed to provide context to the AI chatbot.
 *                 example: "675d955c980d685673d4bb60"
 *     responses:
 *       200:
 *         description: Lexi's reply.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer:
 *                   type: string
 *                   description: Lexi's response message.
 *                   example: "Българската държава е създадена през шестстотин осемдесет и първа година (681г.) от Хан Аспарух."
 */

chatController.post('/text', auth, checkRole(['kid']), async (req, res, next) => {
  const { userInput, conversationId } = req.body;

  try {
    if (!conversationId) {
      throw new HttpError({
        status: 400,
        message: 'Conversation ID is not provided.',
      });
    }

    if (typeof userInput !== 'string' || userInput === '') {
      throw new HttpError({
        status: 400,
        message: 'Bad Request',
        details: 'Invalid user input',
      });
    }

    if (userInput.length > 4096) {
      throw new HttpError({
        status: 400,
        message: 'User input is too long.',
        details: 'The maximum length is 4096 characters.',
      });
    }

    const user = await getChildInfoById(req.user.userId);

    const textChatResponse = await chatService.chatWithLexi(userInput, conversationId, user);

    res.status(200).json({
      answer: textChatResponse.message.content,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /chat/voice:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Voice interaction with the AI chatbot.
 *     description: Expects an audio file and the ID of the conversation and returns the answer as text.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: The audio recording of the user's question.
 *               conversationId:
 *                 type: string
 *                 description: The ID of the ongoing conversation. Needed to provide context to the AI chatbot.
 *                 example: "675d955c980d685673d4bb60"
 *     responses:
 *       200:
 *         description: Question and answer as text.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 question:
 *                   type: string
 *                   description: The asked question as text.
 *                   example: "Кога е създадена българската държава?"
 *                 answer:
 *                   type: string
 *                   description: AI agent's answer as text.
 *                   example: "Българската държава е създадена през 861 година от хан Аспарух."
 */

chatController.post('/voice', auth, checkRole(['kid']), voiceUpload, async (req, res, next) => {
  const { conversationId } = req.body;

  try {
    if (!conversationId) {
      throw new HttpError({
        status: 400,
        message: 'Conversation ID is not provided.',
      });
    }

    if (!req.file) {
      throw new HttpError({
        status: 400,
        message: 'No audio file provided.',
      });
    }

    const textUserInput = await transcribeAudio(req.file.path);

    if (typeof textUserInput !== 'string' || textUserInput === '') {
      throw new HttpError({
        status: 400,
        message: 'Invalid voice content.',
        details: 'Voice input was not properly recognized.',
      });
    }

    if (typeof textUserInput.length > 1000) {
      throw new HttpError({
        status: 400,
        message: 'User question is too long.',
        details: 'The question text content is limited to 1000 characters.',
      });
    }

    const user = await getChildInfoById(req.user.userId);
    const textChatResponse = await chatService.chatWithLexi(textUserInput, conversationId, user);

    if (!textChatResponse.message.content || typeof textChatResponse.message.content !== 'string') {
      throw new HttpError({
        status: 400,
        message: 'Invalid AI response.',
        details: 'AI returned an invalid response.',
      });
    }

    res.status(200).json({ question: textUserInput, answer: textChatResponse.message.content });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /chat/buffer:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Voice interaction with the AI chatbot.
 *     description: Sends an audio file with the ID of the conversation and receives an audio file reply in Bulgarian.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: The audio recording of the user's question.
 *               conversationId:
 *                 type: string
 *                 description: The ID of the ongoing conversation. Needed to provide context to the AI chatbot.
 *                 example: "675d955c980d685673d4bb60"
 *     responses:
 *       200:
 *         description: The AI agent response as an audio file (buffer).
 *         content:
 *           audio/ogg:
 *             schema:
 *               type: Buffer
 *               format: binary
 */

chatController.post('/buffer', auth, checkRole(['kid']), voiceUpload, async (req, res, next) => {
  const { conversationId } = req.body;

  try {
    if (!conversationId) {
      throw new HttpError({
        status: 400,
        message: 'Conversation ID is not provided.',
      });
    }

    if (!req.file) {
      throw new HttpError({
        status: 400,
        message: 'No audio file provided.',
      });
    }

    const textUserInput = await transcribeAudio(req.file.path);

    if (typeof textUserInput !== 'string' || textUserInput === '') {
      throw new HttpError({
        status: 400,
        message: 'Bad Request',
        details: 'Invalid user input',
      });
    }

    const user = await getChildInfoById(req.user.userId);
    const textChatResponse = await chatService.chatWithLexi(textUserInput, conversationId, user);

    if (!textChatResponse.message.content || typeof textChatResponse.message.content !== 'string') {
      throw new HttpError({
        status: 400,
        message: 'Invalid TTS input.',
        details: 'TTS input must be a string.',
      });
    }

    if (textChatResponse.message.content.length > 4096) {
      throw new HttpError({
        status: 400,
        message: 'TTS input is too long.',
        details: 'The maximum length is 4096 characters.',
      });
    }

    const audioResponse = await generateTTS(textChatResponse.message.content);

    res.set({
      'Content-Type': 'audio/ogg',
      'Content-Disposition': 'inline',
    });
    res.end(audioResponse, 'binary');
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /chat/uri:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Voice interaction with the AI chatbot.
 *     description: Sends an audio file with the ID of the conversation and receives a dynamic on-time URI on which the audio answer is streamed. The received URI can be directly passed to the Audio constructor.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: The audio recording of the user's question.
 *               conversationId:
 *                 type: string
 *                 description: The ID of the ongoing conversation. Needed to provide context to the AI chatbot.
 *                 example: "675d955c980d685673d4bb60"
 *     responses:
 *       200:
 *         description: Question, answer and a dynamic URI on which the audio anser is streamed. Can be directly passed to the Audio constructor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 question:
 *                   type: string
 *                   description: The asked question as text.
 *                   example: "Кога е създадена българската държава?"
 *                 answer:
 *                   type: string
 *                   description: Lexi's answer as text.
 *                   example: "През 861 година, от хан Аспарух."
 *                 streamUri:
 *                   type: string
 *                   description: The dynamic URI of the one-time audio stream which can be directly passed to the Audio constructor.
 *                   example: "http://localhost:3000/api/audio/a9e47f31-b791-4f9d-b7c5-19c76fa9f609"
 */

chatController.post('/uri', auth, checkRole(['kid']), voiceUpload, async (req, res, next) => {
  const { conversationId } = req.body;

  try {
    if (!conversationId) {
      throw new HttpError({
        status: 400,
        message: 'Conversation ID is not provided.',
      });
    }

    if (!req.file) {
      throw new HttpError({
        status: 400,
        message: 'No audio file provided.',
      });
    }

    const textUserInput = await transcribeAudio(req.file.path);

    if (typeof textUserInput !== 'string' || textUserInput === '') {
      throw new HttpError({
        status: 400,
        message: 'Bad Request',
        details: 'Invalid user input',
      });
    }

    const user = await getChildInfoById(req.user.userId);
    const textChatResponse = await chatService.chatWithLexi(textUserInput, conversationId, user);

    if (!textChatResponse.message.content || typeof textChatResponse.message.content !== 'string') {
      throw new HttpError({
        status: 400,
        message: 'Invalid TTS input.',
        details: 'TTS input must be a string.',
      });
    }

    if (textChatResponse.message.content.length > 4096) {
      throw new HttpError({
        status: 400,
        message: 'TTS input is too long.',
        details: 'The maximum length is 4096 characters.',
      });
    }

    const audioStreamPath = await generateTtsUri(textChatResponse.message.content);

    res
      .status(200)
      .json({ question: textUserInput, answer: textChatResponse.message.content, streamUri: audioStreamPath });
  } catch (error) {
    next(error);
  }
});

export default chatController;
