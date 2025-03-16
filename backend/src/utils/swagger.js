import swaggerJsdoc from 'swagger-jsdoc';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

// Handle __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Talking Letters API',
    version: '1.0.0',
    description: 'API documentation for Talking Letters project',
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: [
    path.resolve(__dirname, '../controllers/chatController.js'),
    path.resolve(__dirname, '../controllers/ttsController.js'),
    // path.resolve(__dirname, '../controllers/sttController.js'),
    path.resolve(__dirname, '../controllers/authController.js'),
    // path.resolve(__dirname, '../controllers/testController.js'),
    path.resolve(__dirname, '../controllers/fileController.js'),
    // path.resolve(__dirname, '../controllers/ttsSttController.js'),
    // path.resolve(__dirname, '../controllers/openaiTtsGoogleSttController.js'),
    // path.resolve(__dirname, '../controllers/googleSttController.js'),
    // path.resolve(__dirname, '../controllers/ocrController.js'),
    path.resolve(__dirname, '../controllers/emailController.js'),
    path.resolve(__dirname, '../controllers/readerController.js'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

const swaggerRouter = Router();

// JSON export endpoint at: http://localhost:3000/api/json
swaggerRouter.get('/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

swaggerRouter.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default swaggerRouter;
