import { Router } from 'express';

import { validateContactForm } from '../utils/validation.js';
import * as emailService from '../services/emailService.js';

const emailController = Router();

/**
 * @swagger
 * /email:
 *   post:
 *     tags: [Email]
 *     summary: Sends user message form Contact page to project email.
 *     description: Compiles and sends an email from Contact page form.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - subject
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name is required and should be at least 3 characters.
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email is required and should have a valid email format.
 *                 example: "john@example.com"
 *               subject:
 *                 type: string
 *                 description: Subject is required and should be at least 5 characters.
 *                 example: "Payment question"
 *               message:
 *                 type: string
 *                 description: Message is required and should be at least 10 characters.
 *                 example: "I have the following question:..."
 *     responses:
 *       200:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */

emailController.post('/', async (req, res, next) => {
  const { name, email, subject, message } = req.body;

  try {
    validateContactForm(name, email, subject, message);
    await emailService.sendContactEmail(name, email, subject, message);

    res.status(200).json({ message: 'Contact email sent successfully.' });
  } catch (error) {
    next(error);
  }
});

export default emailController;
