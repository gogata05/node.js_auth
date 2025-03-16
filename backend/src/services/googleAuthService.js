import { OAuth2Client } from 'google-auth-library';
import userModel from '../models/userModel.js';
import { generateTokens } from '../utils/jwt.js';
import HttpError from '../utils/httpError.js';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
  // 'postmessage', // Important for auth-code flow
);

export const handleGoogleLogin = async (code) => {
  try {
    const { tokens } = await client.getToken({
      code,
      redirect_uri: 'postmessage',
    });

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new HttpError({
        status: 400,
        message: 'Invalid Google token',
      });
    }

    let user = await userModel.findOne({ email: payload.email });

    if (!user) {
      user = await userModel.create({
        email: payload.email,
        fullName: payload.name,
        isEmailVerified: true,
        googleId: payload.sub,
        role: 'parent',
        imageUrl: payload.picture || 'https://i.sstatic.net/l60Hf.png',
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    return {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error('Google auth error:', error);
    throw new HttpError({
      status: 500,
      message: 'Google authentication failed',
      details: error.message,
    });
  }
};

export const getGoogleAuthURL = () => {
  const scopes = ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'];

  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
  });
};

export const handleGoogleCallback = async (code) => {
  try {
    const { tokens } = await client.getToken({
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    });

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new HttpError({
        status: 400,
        message: 'Invalid Google token',
      });
    }

    let user = await userModel.findOne({ email: payload.email });

    if (!user) {
      user = await userModel.create({
        email: payload.email,
        fullName: payload.name,
        isEmailVerified: true,
        googleId: payload.sub,
        role: 'parent',
        imageUrl: payload.picture || 'https://i.sstatic.net/l60Hf.png',
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Google callback error:', error);
    throw new HttpError({
      status: 500,
      message: 'Google authentication failed',
      details: error.message,
    });
  }
};
