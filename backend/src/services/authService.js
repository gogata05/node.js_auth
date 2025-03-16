import userModel from '../models/userModel.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import HttpError from '../utils/httpError.js';
import * as emailService from './emailService.js';
import * as storageService from '../services/storageService.js';
import mongoose from 'mongoose';

export const register = async (fullName, email, password) => {
  const existingUser = await userModel.findOne({ email });

  if (existingUser) {
    throw new HttpError({
      status: 409,
      message: 'Email already registered!',
    });
  }

  const user = await userModel.create({
    fullName,
    email,
    password,
  });

  return user;
};

export const login = async (email, password) => {
  const user = await userModel.findOne({ email });

  if (!user) {
    throw new HttpError({
      status: 401,
      message: 'Invalid email or password!',
    });
  }

  if (!user.isEmailVerified) {
    throw new HttpError({
      status: 403,
      message: 'Please verify your email before logging in!',
    });
  }

  const isValidPassword = await user.comparePassword(password);

  if (!isValidPassword) {
    throw new HttpError({
      status: 401,
      message: 'Invalid email or password!',
    });
  }

  const { accessToken, refreshToken } = generateTokens(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  return { user, accessToken, refreshToken };
};

export const refresh = async (refreshToken) => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await userModel.findById(decoded.userId);

    if (!user || user.refreshToken !== refreshToken) {
      throw new HttpError({
        status: 401,
        message: 'Invalid refresh token!',
      });
    }

    const tokens = generateTokens(user._id);

    user.refreshToken = tokens.refreshToken;
    await user.save();

    return tokens;
  } catch (error) {
    throw new HttpError({
      status: 401,
      message: 'Invalid refresh token!',
      details: error.message,
    });
  }
};

export const getUserById = async (userId) => {
  const user = await userModel.findById(userId);

  if (!user) {
    throw new HttpError({
      status: 404,
      message: 'User not found!',
    });
  }

  return user;
};

export const getChildInfoById = async (userId) => {
  const user = await userModel.findById(userId, {
    fullName: 1,
    years: 1,
    class: 1,
    city: 1,
  });

  if (!user) {
    throw new HttpError({
      status: 404,
      message: 'User not found!',
    });
  }

  return user;
};

export const logout = async (userId) => {
  const user = await userModel.findById(userId);

  if (!user) {
    throw new HttpError({
      status: 404,
      message: 'User not found!',
    });
  }

  user.refreshToken = null;
  await user.save();
};

export const getAllUsers = async () => {
  const users = await userModel.find(
    {},
    {
      password: 0,
      refreshToken: 0,
      googleId: 0,
    },
  );

  return users;
};

export const getUserDetails = async (userId) => {
  try {
    const user = await userModel
      .findById(userId, {
        password: 0,
        refreshToken: 0,
        googleId: 0,
        __v: 0,
      })
      .populate('kids', 'fullName email city years')
      .populate('files')
      .lean();

    if (!user) {
      throw new HttpError({
        status: 404,
        message: 'User not found!',
        details: `No user found with ID: ${userId}`,
      });
    }

    return {
      ...user,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      isActive: true,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;

    throw new HttpError({
      status: 500,
      message: 'Error fetching user data!',
      details: error.message,
    });
  }
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await userModel.findById(userId);

  if (!user) {
    throw new HttpError({
      status: 404,
      message: 'User not found!',
    });
  }

  const isValidPassword = await user.comparePassword(currentPassword);

  if (!isValidPassword) {
    throw new HttpError({
      status: 401,
      message: 'Current password is incorrect!',
    });
  }

  if (currentPassword === newPassword) {
    throw new HttpError({
      status: 400,
      message: 'New password must be different from the current one!',
    });
  }

  user.password = newPassword;
  await user.save();

  return true;
};

export const updateProfile = async (userId, profileData) => {
  const user = await userModel.findById(userId);

  if (!user) {
    throw new HttpError({
      status: 404,
      message: 'User not found!',
    });
  }

  // Validate fullName
  if (!profileData.fullName || profileData.fullName.length < 2) {
    throw new HttpError({
      status: 400,
      message: 'Invalid name!',
      details: 'Name must be at least 2 characters!',
    });
  }

  // Validate city
  if (!profileData.city || profileData.city.length < 2) {
    throw new HttpError({
      status: 400,
      message: 'Invalid city!',
      details: 'City must be at least 2 characters!',
    });
  }

  // Validate years
  if (!profileData.years || profileData.years < 1 || profileData.years > 120) {
    throw new HttpError({
      status: 400,
      message: 'Invalid years!',
      details: 'Years must be between 1 and 120!',
    });
  }

  // Update basic fields
  user.fullName = profileData.fullName;
  user.city = profileData.city;
  user.years = profileData.years;
  user.phone = profileData.phone;

  if (profileData.email !== undefined) {
    // Check if email is already taken by another user
    if (profileData.email !== user.email) {
      const existingUser = await userModel.findOne({ email: profileData.email });
      if (existingUser) {
        throw new HttpError({
          status: 409,
          message: 'Email already taken!',
        });
      }
      user.email = profileData.email;
      user.isEmailVerified = false; // Reset email verification status

      // Generate and send new verification email
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();
      await emailService.sendVerificationEmail(profileData.email, verificationToken);
    }
  }

  await user.save();

  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    city: user.city,
    years: user.years,
    phone: user.phone,
    isEmailVerified: user.isEmailVerified,
  };
};

export const createUser = async (userData) => {
  const existingUser = await userModel.findOne({ email: userData.email });

  if (existingUser) {
    throw new HttpError({
      status: 409,
      message: 'Email already registered!',
    });
  }

  const user = await userModel.create(userData);

  return user;
};

export const changeKidPassword = async (parentId, kidId, parentPassword, newKidPassword) => {
  // Check if parent exists
  const parent = await userModel.findById(parentId);
  if (!parent) {
    throw new HttpError({
      status: 404,
      message: 'Parent not found!',
    });
  }

  // Check if parent password is valid
  const isValidParentPassword = await parent.comparePassword(parentPassword);
  if (!isValidParentPassword) {
    throw new HttpError({
      status: 401,
      message: 'Invalid parent password!',
    });
  }

  // Find the kid
  const kid = await userModel.findById(kidId);
  if (!kid) {
    throw new HttpError({
      status: 404,
      message: 'Kid not found!',
    });
  }

  // Check if the user is a kid
  if (kid.role !== 'kid') {
    throw new HttpError({
      status: 400,
      message: 'Selected user is not a kid!',
    });
  }

  // Change the password
  kid.password = newKidPassword;
  await kid.save();

  return true;
};

export const updateParentProfile = async (userId, profileData, avatar) => {
  const user = await userModel.findById(userId);

  if (!user) {
    throw new HttpError({
      status: 404,
      message: 'User not found!',
    });
  }

  if (user.role !== 'parent') {
    throw new HttpError({
      status: 403,
      message: 'Access denied! Only parents can use this endpoint.',
    });
  }

  if (avatar) {
    const avatarUrl = await storageService.setAvatar(userId, avatar);
    profileData.imageUrl = avatarUrl;
  }

  // Validate fullName
  if (!profileData.fullName || profileData.fullName.length < 2) {
    throw new HttpError({
      status: 400,
      message: 'Invalid name!',
      details: 'Name must be at least 2 characters!',
    });
  }

  // Validate city
  // if (profileData.city) {
  //   const trimmedInput = profileData.city.trim();
  //   if (trimmedInput.length < 2) {
  //     throw new HttpError({
  //       status: 400,
  //       message: 'Invalid city!',
  //       details: 'City must be at least 2 characters!',
  //     });
  //   }
  // }

  // Validate years
  if (profileData.years) {
    const trimmedInput = profileData.years.trim();

    if (trimmedInput != '') {
      if (isNaN(trimmedInput) || trimmedInput < 1 || profileData.years > 120) {
        throw new HttpError({
          status: 400,
          message: 'Invalid age!',
          details: 'Age must be a number between 1 and 120!',
        });
      }
    }
  }

  // Update basic fields
  user.fullName = profileData.fullName;
  user.city = profileData.city || null;
  user.years = profileData.years || null;
  user.phone = profileData.phone;
  if (profileData.imageUrl) {
    user.imageUrl = profileData.imageUrl;
  }

  if (profileData.email && profileData.email !== user.email) {
    throw new HttpError({
      status: 403,
      message: 'Access denied! Email cannot be modified.',
    });
  }

  await user.save();

  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    city: user.city,
    years: user.years,
    phone: user.phone,
    imageUrl: user.imageUrl,
    isEmailVerified: user.isEmailVerified,
  };
};

export const updateKidProfile = async (userId, profileData, avatar) => {
  const reqUser = await userModel.findById(userId);

  if (reqUser.role !== 'kid') {
    if (!reqUser.isParentOf(profileData.kidId)) {
      throw new HttpError({
        status: 403,
        message: 'Access denied! You can only edit your own kids.',
      });
    }
  }

  if (reqUser.role === 'kid') {
    if (userId != profileData.kidId) {
      throw new HttpError({
        status: 403,
        message: 'Access denied! You can only edit your own profile.',
      });
    }
  }

  const user = await userModel.findById(profileData.kidId);

  if (!user) {
    throw new HttpError({
      status: 404,
      message: 'Kid ID not found.',
    });
  }

  if (avatar) {
    const avatarUrl = await storageService.setAvatar(profileData.kidId, avatar);
    profileData.imageUrl = avatarUrl;
  }

  // Validate fullName
  if (!profileData.fullName || profileData.fullName.length < 2) {
    throw new HttpError({
      status: 400,
      message: 'Invalid name!',
      details: 'Name must be at least 2 characters!',
    });
  }

  // Validate city
  // if (profileData.city) {
  //   const trimmedInput = profileData.city.trim();
  //   if (trimmedInput.length < 2) {
  //     throw new HttpError({
  //       status: 400,
  //       message: 'Invalid city!',
  //       details: 'City must be at least 2 characters!',
  //     });
  //   }
  // }

  // Validate years
  if (profileData.age) {
    const trimmedInput = profileData.age.trim();

    if (trimmedInput != '') {
      if (isNaN(trimmedInput) || trimmedInput < 1 || profileData.years > 120) {
        throw new HttpError({
          status: 400,
          message: 'Invalid age!',
          details: 'Age must be a number between 1 and 120!',
        });
      }
    }
  }

  // Update basic fields
  user.fullName = profileData.fullName;
  user.city = profileData.city || null;
  user.years = profileData.age || null; // Map age to years in the model
  user.class = profileData.class || null;
  if (profileData.imageUrl) {
    user.imageUrl = profileData.imageUrl;
  }

  if (profileData.email && profileData.email !== user.email) {
    throw new HttpError({
      status: 403,
      message: 'Access denied! Email cannot be modified.',
    });
  }

  await user.save();

  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    city: user.city,
    age: user.years, // Return years as age in the response
    class: user.class,
    imageUrl: user.imageUrl,
  };
};

export const createKid = async (kidData) => {
  // Validate email if provided
  if (kidData.email) {
    const existingUser = await userModel.findOne({ email: kidData.email });
    if (existingUser) {
      throw new HttpError({
        status: 409,
        message: 'Email already registered!',
      });
    }
  }

  // Create the kid user with only required fields
  const kid = await userModel.create({
    fullName: kidData.fullName,
    email: kidData.email,
    password: kidData.password,
    city: kidData.city || null,
    years: kidData.years || null,
    class: kidData.class || null,
    role: 'kid',
    isEmailVerified: true,
    parent: kidData.parent,
  });

  // Update parent's kids array
  await userModel.findByIdAndUpdate(kidData.parent, { $push: { kids: kid._id } }, { new: true });

  return {
    _id: kid._id,
    fullName: kid.fullName,
    email: kid.email,
    city: kid.city,
    years: kid.years,
    class: kid.class,
    role: kid.role,
    parent: kid.parent,
  };
};

export const getKidById = async (parentId, kidId) => {
  // Validate IDs format
  if (!mongoose.Types.ObjectId.isValid(parentId) || !mongoose.Types.ObjectId.isValid(kidId)) {
    throw new HttpError({
      status: 400,
      message: 'Invalid ID format!',
    });
  }

  const parent = await userModel.findById(parentId);
  if (!parent) {
    throw new HttpError({
      status: 404,
      message: 'Parent not found!',
    });
  }

  // Check if parent has access to this kid
  if (!parent.isParentOf(kidId)) {
    throw new HttpError({
      status: 403,
      message: 'Access denied! You can only view your own kids.',
    });
  }

  const kid = await userModel
    .findById(kidId, {
      password: 0,
      refreshToken: 0,
      googleId: 0,
      __v: 0,
    })
    .populate('files')
    .lean();

  if (!kid) {
    throw new HttpError({
      status: 404,
      message: 'Kid not found!',
    });
  }

  return kid;
};

export const setKidTargets = async (parentId, kidId, newDailyTarget, newWeeklyTarget) => {
  const parent = await userModel.findById(parentId);
  if (!parent) {
    throw new HttpError({
      status: 404,
      message: 'Parent not found.',
    });
  }

  if (!parent.isParentOf(kidId)) {
    throw new HttpError({
      status: 403,
      message: 'Access denied.',
    });
  }

  const kid = await userModel.findById(kidId);

  if (!kid) {
    throw new HttpError({
      status: 404,
      message: 'Kid not found.',
    });
  }

  if (newDailyTarget) {
    kid.dailyTarget = newDailyTarget;
  }

  if (newWeeklyTarget) {
    kid.weeklyTarget = newWeeklyTarget;
  }

  await kid.save();
  const newTargets = { dailyTarget: kid.dailyTarget, weeklyTarget: kid.weeklyTarget };
  return { newTargets };
};

export const getKidTargets = async (requestUserId, kidId) => {
  if (requestUserId != kidId) {
    const requestUser = await userModel.findById(requestUserId);

    if (!requestUser) {
      throw new HttpError({
        status: 404,
        message: 'Request user not found.',
      });
    }

    if (!requestUser.isParentOf(kidId)) {
      throw new HttpError({
        status: 403,
        message: 'Access denied.',
      });
    }
  }

  const kid = await userModel.findById(kidId);

  if (!kid) {
    throw new HttpError({
      status: 404,
      message: 'Kid not found.',
    });
  }

  return { dailyTarget: kid.dailyTarget, weeklyTarget: kid.weeklyTarget };
};

export const setLastActivity = async (userId) => {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new HttpError({
      status: 404,
      message: 'Invalid user.',
    });
  }

  user.lastActive = Date.now();
  await user.save();
};
