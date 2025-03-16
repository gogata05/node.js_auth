import { Router } from 'express';
import { auth } from '../middleware/authMiddleware.js';
import { getReaderCredentials } from '../services/readerService.js';

const readerController = Router();

/**
 * @swagger
 * /reader:
 *   get:
 *     tags: [Reader]
 *     summary: Provides Credentials for ImmersiveReader.
 *     description: Retrieves and sends the ImmersiveReader credentials to the Client.
 *     responses:
 *       200:
 *         description: And object with the required credential data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Temporary access token to be used with ImmersiveReader SKD.
 *                   example: "mI5ZCIsImFwcGlkYWNyIjoiMSIsImlkcCI6Imh0dHBzOi8vc3RzL..."
 *                 expires_in:
 *                   type: string
 *                   description: Time until the token expires in seconds.
 *                   example: "3599"
 *                 subdomain:
 *                   type: string
 *                   description: Required by the ImmersiveReader SKD.
 *                   example: "readertest"
 */

readerController.get('/', auth, async (req, res, next) => {
  try {
    const { token, expires_in, subdomain } = await getReaderCredentials();
    res.status(200).json({ token, expires_in, subdomain });
  } catch (error) {
    next(error);
  }
});

export default readerController;
