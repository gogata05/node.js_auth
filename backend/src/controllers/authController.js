import { Router } from 'express';
import mongoose from 'mongoose';

import HttpError from '../utils/httpError.js';
import { generateTokens } from '../utils/jwt.js';
import { auth, checkRole } from '../middleware/authMiddleware.js';
import userModel from '../models/userModel.js';
import * as authService from '../services/authService.js';
import * as googleAuthService from '../services/googleAuthService.js';
import * as emailService from '../services/emailService.js';

const authController = Router();
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
      phone: user.phone,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
});

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

authController.post('/logout', auth, async (req, res, next) => {
  try {
    await authService.logout(req.user.userId);

    res.clearCookie('refreshToken');
    res.json({ message: 'Logout successful!' });
  } catch (error) {
    next(error);
  }
});

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

authController.get('/google/url', (req, res, next) => {
  try {
    const url = googleAuthService.getGoogleAuthURL();
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

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

authController.get('/users', auth, checkRole(['admin']), async (req, res, next) => {
  try {
    const users = await authService.getAllUsers();

    res.json(users);
  } catch (error) {
    next(error);
  }
});

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
      phone: user.phone,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
});

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

export default authController;
