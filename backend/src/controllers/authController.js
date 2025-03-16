import { Router } from 'express';
import mongoose from 'mongoose';

import HttpError from '../utils/httpError.js';
import { generateTokens } from '../utils/jwt.js';
import { auth, checkRole } from '../middleware/authMiddleware.js';
import { avatarUpload } from '../middleware/avatarUpload.js';
import userModel from '../models/userModel.js';
import * as authService from '../services/authService.js';
import * as googleAuthService from '../services/googleAuthService.js';
import * as emailService from '../services/emailService.js';
import * as historyService from '../services/historyService.js';

const authController = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the user
 *         fullName:
 *           type: string
 *           description: User's full name
 *         email:
 *           type: string
 *           description: User's email
 *         city:
 *           type: string
 *           description: User's city
 *         years:
 *           type: number
 *           description: User's age
 *         role:
 *           type: string
 *           enum: [parent, kid]
 *           description: User's role
 *         parent:
 *           type: string
 *           description: User's parent
 *         kids:
 *           type: array
 *           description: User's children
 *           items:
 *             type: object
 *         files:
 *           type: array
 *           description: User's files
 *           items:
 *             type: object
 *         imageUrl:
 *           type: string
 *           description: URL to user's profile image
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and management endpoints
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates a new user account and sends verification email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *               - repeatPassword
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "strongPassword123"
 *               repeatPassword:
 *                 type: string
 *                 format: password
 *                 example: "strongPassword123"
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Email already exists
 */
authController.post('/register', async (req, res, next) => {
  const { fullName, email, password, repeatPassword } = req.body;

  try {
    if (password !== repeatPassword) {
      throw new HttpError({
        status: 400,
        message: 'Passwords do not match!',
      });
    }

    const user = await authService.register(fullName, email, password);

    // Generate verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for confirmation.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     description: Authenticates user and returns tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "parentParentov@gmail.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "Parent123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 fullName:
 *                   type: string
 *                 email:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
authController.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const { user, accessToken, refreshToken } = await authService.login(email, password);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      imageUrl: user.imageUrl,
      city: user.city,
      years: user.years,
      phone: user.phone,
      role: user.role,
      parent: user.parent,
      kids: user.kids,
      isEmailVerified: user.isEmailVerified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: Uses refresh token to generate new access token
 *     responses:
 *       200:
 *         description: New access token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Invalid refresh token
 */
authController.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new HttpError({
        status: 401,
        message: 'Invalid refresh token!',
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/check:
 *   get:
 *     tags: [Auth]
 *     summary: Check authentication status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User is authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 */
authController.get('/check', auth, async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.userId);

    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 *       401:
 *         description: Not authenticated
 */
authController.post('/logout', auth, async (req, res, next) => {
  try {
    await authService.logout(req.user.userId);

    res.clearCookie('refreshToken');
    res.json({ message: 'Logout successful!' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Google Sign In
 *     description: Authenticate user with Google OAuth2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Google OAuth2 authorization code
 *     responses:
 *       200:
 *         description: Successfully authenticated with Google
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 fullName:
 *                   type: string
 *                 email:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Invalid authorization code
 *       500:
 *         description: Google authentication error
 */
authController.post('/google', async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new HttpError({
        status: 400,
        message: 'No authorization code provided',
        details: 'Authorization code is required',
      });
    }

    const userData = await googleAuthService.handleGoogleLogin(code);

    res.cookie('refreshToken', userData.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      _id: userData._id,
      fullName: userData.fullName,
      email: userData.email,
      accessToken: userData.accessToken,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    next(error);
  }
});

/**
 * @swagger
 * /auth/google/url:
 *   get:
 *     tags: [Auth]
 *     summary: Get Google OAuth URL
 *     responses:
 *       200:
 *         description: Google OAuth URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: Google OAuth URL
 */
authController.get('/google/url', (req, res, next) => {
  try {
    const url = googleAuthService.getGoogleAuthURL();
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Handle Google OAuth callback
 */
authController.get('/google/callback', async (req, res, next) => {
  try {
    const { code } = req.query;

    if (!code) {
      throw new HttpError({
        status: 400,
        message: 'Missing Google code!',
      });
    }

    const { accessToken, refreshToken } = await googleAuthService.handleGoogleCallback(code);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_SERVER}/auth/callback?token=${accessToken}`);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/users:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get all users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 */
authController.get('/users', auth, checkRole(['admin']), async (req, res, next) => {
  try {
    const users = await authService.getAllUsers();

    res.json(users);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/my-profile:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get user profile data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
authController.get('/my-profile', auth, async (req, res, next) => {
  try {
    const id = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError({
        status: 400,
        message: 'Invalid ID format!',
        details: 'Provided ID is not a valid MongoDB ObjectId.',
      });
    }

    const user = await authService.getUserDetails(id);

    if (!user) {
      throw new HttpError({
        status: 404,
        message: 'User not found!',
        details: `No user found with ID: ${id}`,
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Error in get user details:', error);
    next(error);
  }
});

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   get:
 *     tags: [Auth]
 *     summary: Verify email address
 *     description: Verifies user's email using the token sent to their email
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
authController.get('/verify-email/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await userModel.findOne({
      emailVerificationToken: token,
    });

    if (!user) {
      throw new HttpError({
        status: 400,
        message: 'Invalid verification token!',
      });
    }

    if (Date.now() > user.emailVerificationExpires) {
      throw new HttpError({
        status: 400,
        message: 'Expired verification token!',
        details: `Email: ${user.email}`,
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Generate new tokens using the imported function
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      imageUrl: user.imageUrl,
      city: user.city,
      years: user.years,
      phone: user.phone,
      role: user.role,
      parent: user.parent,
      kids: user.kids,
      isEmailVerified: user.isEmailVerified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Resend verification email
 *     description: Sends a new verification email to the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "parentParentov@gmail.com"
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests - wait before requesting new email
 */
authController.post('/resend-verification', async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      throw new HttpError({
        status: 404,
        message: 'User with this email does not exist!',
      });
    }

    if (user.isEmailVerified) {
      throw new HttpError({
        status: 400,
        message: 'Email already verified!',
      });
    }

    // Check if too little time has passed since the last email was sent
    const lastEmailSent = user.emailVerificationExpires
      ? new Date(user.emailVerificationExpires).getTime() - 24 * 60 * 60 * 1000
      : null;

    if (lastEmailSent && Date.now() - lastEmailSent < 5 * 60 * 1000) {
      // 5 minutes
      throw new HttpError({
        status: 429,
        message: 'Please wait 5 minutes before requesting a new email!',
      });
    }

    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    await emailService.sendVerificationEmail(email, verificationToken);

    res.json({
      success: true,
      message: 'New verification email sent!',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Request password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "parentParentov@gmail.com"
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *       404:
 *         description: User not found
 */

authController.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      throw new HttpError({
        status: 404,
        message: 'User with this email does not exist!',
      });
    }

    // Generate password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send email for password reset
    await emailService.sendPasswordResetEmail(email, resetToken);

    res.json({
      success: true,
      message: 'Email with password reset instructions sent!',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Check password reset token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token
 *     responses:
 *       200:
 *         description: Token is valid
 *       400:
 *         description: Invalid or expired password reset token
 */
authController.get('/reset-password/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new HttpError({
        status: 400,
        message: 'Invalid or expired password reset token!',
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Reset password
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *               repeatPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Passwords don't match or invalid format
 *       401:
 *         description: Current password is incorrect
 */
authController.post('/reset-password/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, repeatPassword } = req.body;

    if (password !== repeatPassword) {
      throw new HttpError({
        status: 400,
        message: 'Passwords do not match!',
      });
    }

    const user = await userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new HttpError({
        status: 400,
        message: 'Invalid or expired password reset token!',
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully!',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change user password
 *     security:
 *       - bearerAuth: []
 *     description: Allows authenticated user to change their password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - repeatPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: "Parent123!"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "Parent1234!"
 *               repeatPassword:
 *                 type: string
 *                 format: password
 *                 example: "Parent1234!"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Passwords don't match or invalid format
 *       401:
 *         description: Current password is incorrect
 */
authController.post('/change-password', auth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, repeatPassword } = req.body;

    if (newPassword !== repeatPassword) {
      throw new HttpError({
        status: 400,
        message: 'New passwords do not match!',
      });
    }

    await authService.changePassword(req.user.userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully!',
    });
  } catch (error) {
    next(error);
  }
});

// /**
//  * @swagger
//  * /auth/profile:
//  *   put:
//  *     tags: [Auth]
//  *     summary: Update user profile
//  *     security:
//  *       - bearerAuth: []
//  *     description: Update authenticated user's profile information
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               fullName:
//  *                 type: string
//  *                 minLength: 2
//  *               city:
//  *                 type: string
//  *                 minLength: 2
//  *               years:
//  *                 type: number
//  *                 minimum: 1
//  *                 maximum: 120
//  *               phone:
//  *                 type: string
//  *                 pattern: ^[\d\s+()-]{8,20}$
//  *               email:
//  *                 type: string
//  *                 format: email
//  *               imageUrl:
//  *                 type: string
//  *                 format: url
//  *                 example: "https://imgur.com/QKnGjmY"
//  *     responses:
//  *       200:
//  *         description: Profile updated successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/User'
//  *       400:
//  *         description: Invalid input data
//  *       401:
//  *         description: Not authenticated
//  */

//For future admin

// authController.put('/profile', auth, async (req, res, next) => {
//   try {
//     const updatedUser = await authService.updateProfile(req.user.userId, req.body);
//     res.json(updatedUser);
//   } catch (error) {
//     next(error);
//   }
// });

/**
 * @swagger
 * /auth/create-kid:
 *   post:
 *     tags: [Auth]
 *     summary: Create kid account (Parent only)
 *     security:
 *       - bearerAuth: []
 *     description: Creates a new kid account (Parent only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - password
 *               - repeatPassword
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Kid Name"
 *               city:
 *                 type: string
 *                 example: "Sofia"
 *               age:
 *                 type: number
 *                 example: 5
 *               class:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 12
 *                 example: 1
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "testkid1@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "testkid123!"
 *               repeatPassword:
 *                 type: string
 *                 format: password
 *                 example: "testkid123!"
 *     responses:
 *       201:
 *         description: Kid created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 fullName:
 *                   type: string
 *                 email:
 *                   type: string
 *                 city:
 *                   type: string
 *                 years:
 *                   type: string
 *                 class:
 *                   type: string
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Email already registered!
 */
authController.post('/create-kid', auth, checkRole(['parent']), async (req, res, next) => {
  try {
    const { fullName, email, password, repeatPassword, city, age, class: kidClass } = req.body;
    const parentId = req.user.userId;

    if (password !== repeatPassword) {
      throw new HttpError({
        status: 400,
        message: 'Passwords do not match!',
      });
    }

    const kidData = {
      fullName,
      email,
      password,
      city,
      years: age,
      class: kidClass,
      parent: parentId,
    };

    const kid = await authService.createKid(kidData);

    res.status(201).json(kid);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/change-kid-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Change kid's password (Parent only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kidId:
 *                 type: string
 *               parentPassword:
 *                 type: string
 *                 example: "Parent123!"
 *               newKidPassword:
 *                 type: string
 *                 example: "testkid123!"
 *               repeatNewKidPassword:
 *                 type: string
 *                 example: "testkid123!"
 *     responses:
 *       200:
 *         description: Kid's password changed successfully
 *       400:
 *         description: Passwords don't match or invalid format
 *       401:
 *         description: Parent password incorrect
 *       403:
 *         description: Not authorized (not a parent)
 *       404:
 *         description: Kid not found
 */
authController.post('/change-kid-password', auth, checkRole(['parent']), async (req, res, next) => {
  try {
    const { kidId, parentPassword, newKidPassword, repeatNewKidPassword } = req.body;

    if (newKidPassword !== repeatNewKidPassword) {
      throw new HttpError({
        status: 400,
        message: 'Passwords do not match!',
      });
    }

    const parent = await userModel.findById(req.user.userId);

    if (!parent.isParentOf(kidId)) {
      throw new HttpError({
        status: 403,
        message: 'Access denied! You can only change password for your own kids.',
      });
    }

    await authService.changeKidPassword(req.user.userId, kidId, parentPassword, newKidPassword);

    res.json({
      success: true,
      message: 'Kid password changed successfully!',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/parent-profile:
 *   put:
 *     tags:
 *       - Auth
 *     summary: Update parent profile (Parent only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Changed Parent Name"
 *               city:
 *                 type: string
 *                 example: "Changed City"
 *               years:
 *                 type: number
 *                 example: 30
 *               phone:
 *                 type: string
 *                 example: "+359 888 888 888"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "changedParent@example.com"
 *               imageUrl:
 *                 type: string
 *                 format: url
 *                 example: "https://imgur.com/QKnGjmY"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 */
authController.put('/parent-profile', auth, checkRole(['parent']), avatarUpload, async (req, res, next) => {
  try {
    const updatedUser = await authService.updateParentProfile(req.user.userId, req.body, req.file);
    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/kid-profile:
 *   put:
 *     tags:
 *       - Auth
 *     summary: Update kid profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               kidId:
 *                 type: string
 *               fullName:
 *                 type: string
 *                 example: "Changed Kid Name"
 *               city:
 *                 type: string
 *                 example: "Changed City"
 *               years:
 *                 type: number
 *                 example: 5
 *               imageUrl:
 *                 type: string
 *                 format: url
 *                 example: "https://imgur.com/QKnGjmY"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 */
authController.put('/kid-profile', auth, avatarUpload, async (req, res, next) => {
  try {
    const updatedUser = await authService.updateKidProfile(req.user.userId, req.body, req.file);
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/my-kids:
 *   get:
 *     tags: [Auth]
 *     summary: Get parent's kids (Parent only)
 *     security:
 *       - bearerAuth: []
 *     description: Retrieves list of kids for authenticated parent
 *     responses:
 *       200:
 *         description: List of kids retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 kids:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (not a parent)
 */
authController.get('/my-kids', auth, checkRole(['parent']), async (req, res, next) => {
  try {
    const parent = await userModel
      .findById(req.user.userId)
      .populate('kids', 'fullName email imageUrl city years class');

    res.json(parent.kids);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/change-kid-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change kid's password (Parent only)
 *     security:
 *       - bearerAuth: []
 *     description: Allows parent to change their kid's password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - kidId
 *               - parentPassword
 *               - newKidPassword
 *               - repeatNewKidPassword
 *             properties:
 *               kidId:
 *                 type: string
 *                 description: MongoDB ID of the kid
 *               parentPassword:
 *                 type: string
 *                 format: password
 *                 example: "Parent123!"
 *               newKidPassword:
 *                 type: string
 *                 format: password
 *                 example: "testkid123!"
 *               repeatNewKidPassword:
 *                 type: string
 *                 format: password
 *                 example: "testkid123!"
 *     responses:
 *       200:
 *         description: Kid's password changed successfully
 *       400:
 *         description: Invalid input or passwords don't match
 *       401:
 *         description: Parent password incorrect
 *       403:
 *         description: Not authorized (not a parent)
 *       404:
 *         description: Kid not found
 */
authController.post('/change-kid-password', auth, checkRole(['parent']), async (req, res, next) => {
  try {
    const { kidId, parentPassword, newKidPassword, repeatNewKidPassword } = req.body;

    if (newKidPassword !== repeatNewKidPassword) {
      throw new HttpError({
        status: 400,
        message: 'Passwords do not match!',
      });
    }

    const parent = await userModel.findById(req.user.userId);

    if (!parent.isParentOf(kidId)) {
      throw new HttpError({
        status: 403,
        message: 'Access denied! You can only change password for your own kids.',
      });
    }

    await authService.changeKidPassword(req.user.userId, kidId, parentPassword, newKidPassword);

    res.json({
      success: true,
      message: 'Kid password changed successfully!',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/my-kids/{kidId}:
 *   get:
 *     tags: [Auth]
 *     summary: Get kid by ID (Parent only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: kidId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the kid
 *     responses:
 *       200:
 *         description: Kid details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       403:
 *         description: Access denied to this kid
 *       404:
 *         description: Kid not found
 */
authController.get('/my-kids/:kidId', auth, checkRole(['parent']), async (req, res, next) => {
  try {
    const kidId = req.params.kidId;
    const parentId = req.user.userId;

    const kid = await authService.getKidById(parentId, kidId);
    res.json(kid);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/set-targets/{kidId}:
 *   post:
 *     tags: [Auth]
 *     summary: Set learning targets by kid ID (Parent only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: kidId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the kid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dailyTarget
 *               - weeklyTarget
 *             properties:
 *               dailyTarget:
 *                 type: number
 *                 example: 2
 *                 description: Learning sessions with Lexi per day. Between 1 and 20.
 *               weeklyTarget:
 *                 type: number
 *                 example: 10
 *                 description: Learning sessions with Lexi per week. Between 1 and 100.
 *     responses:
 *       200:
 *         description: Kid targets set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dailyTarget:
 *                   type: number
 *                   example: 2
 *                   description: Learning sessions with Lexi per day. Between 1 and 20.
 *                 weeklyTarget:
 *                   type: number
 *                   example: 10
 *                   description: Learning sessions with Lexi per week. Between 1 and 100.
 *       400:
 *         description: Validation failed.
 *       403:
 *         description: Access denied.
 *       404:
 *         description: Parent not found/Kid not found
 */
authController.post('/set-targets/:kidId', auth, checkRole(['parent']), async (req, res, next) => {
  try {
    const kidId = req.params.kidId;
    const parentId = req.user.userId;
    const { dailyTarget, weeklyTarget } = req.body;

    const newTargets = await authService.setKidTargets(parentId, kidId, dailyTarget, weeklyTarget);
    res.json(newTargets);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/get-stats/{kidId}:
 *   post:
 *     tags: [Auth]
 *     summary: Get learning stats by kid ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: kidId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the kid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - timezoneOffset
 *             properties:
 *               timezoneOffset:
 *                 type: string
 *                 example: -120
 *                 description: Offset between user's local time and UCT. Easy to retrieve with new Date().getTimezoneOffset().
 *     responses:
 *       200:
 *         description: Kid stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 targets:
 *                   type: object
 *                   properties:
 *                     dailyTarget:
 *                       type: number
 *                       example: 2
 *                       description: Learning sessions with Lexi per day. Between 1 and 20.
 *                     weeklyTarget:
 *                       type: number
 *                       example: 10
 *                       description: Learning sessions with Lexi per week. Between 1 and 100.
 *                 stats:
 *                   type: object
 *                   properties:
 *                     currentWeekStats:
 *                       type: number
 *                       example: 2
 *                       description: The kid's chats so far this week.
 *                     previousWeekStats:
 *                       type: number
 *                       example: 4
 *                       description: The kid's chats last week.
 *                     todayStats:
 *                       type: number
 *                       example: 1
 *                       description: The kid's chats so far today.
 *                     yesterdayStats:
 *                       type: number
 *                       example: 1
 *                       description: The kid's chats yesterday.
 *       400:
 *         description: timezoneOffset not provided.
 *       403:
 *         description: Access denied.
 *       404:
 *         description: Request user not found/Kid not found
 */
authController.post('/get-stats/:kidId', auth, async (req, res, next) => {
  try {
    const kidId = req.params.kidId;
    const requestUserId = req.user.userId;
    const { timezoneOffset } = req.body;

    if (!timezoneOffset) {
      throw new HttpError({
        status: 400,
        message: 'timezoneOffset not provided.',
      });
    }

    const targets = await authService.getKidTargets(requestUserId, kidId);
    const stats = await historyService.getKidStats(kidId, timezoneOffset);
    await historyService.deleteOlderThan(kidId, timezoneOffset, 15); // Chats older than the passed number in days and owned by the passed kid will be deleted from the DB.

    res.status(200).json({ targets, stats });
  } catch (error) {
    next(error);
  }
});

export default authController;
