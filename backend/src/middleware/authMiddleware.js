import HttpError from '../utils/httpError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import userModel from '../models/userModel.js';
import fileModel from '../models/fileModel.js';
import { setLastActivity } from '../services/authService.js';

export const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError({
        status: 401,
        message: 'Invalid token!',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    req.user = { userId: decoded.userId };
    await setLastActivity(decoded.userId);
    next();
  } catch (error) {
    next(
      new HttpError({
        status: 401,
        message: 'Invalid token!',
        details: error.message,
      }),
    );
  }
};

export const checkRole = (roles) => {
  return async (req, res, next) => {
    try {
      const user = await userModel.findById(req.user.userId);

      if (!user) {
        throw new HttpError({
          status: 404,
          message: 'User not found!',
        });
      }

      if (!roles.includes(user.role)) {
        throw new HttpError({
          status: 403,
          message: 'You do not have access to this resource!',
        });
      }

      req.user.role = user.role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const checkFileAccess = async (req, res, next) => {
  try {
    const { key } = req.body;

    const file = await fileModel.findOne({ key }).populate('owner', '_id parent');

    if (!file) {
      throw new HttpError({
        status: 404,
        message: 'File not found!',
      });
    }

    if (file.owner._id != req.user.userId && file.owner.parent != req.user.userId) {
      throw new HttpError({
        status: 403,
        message: 'You do not have access to this resource!',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
