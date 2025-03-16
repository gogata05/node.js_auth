import { Upload } from '@aws-sdk/lib-storage';
import { S3, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fileModel from '../models/fileModel.js';
import userModel from '../models/userModel.js';
import HttpError from '../utils/httpError.js';
import { compressImage } from '../utils/compress.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new S3({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.AWS_S3_BUCKET_NAME;

export const uploadFileToS3 = async (file, folder) => {
  const uniqueId = crypto.randomUUID();

  if (folder !== 'files' && folder !== 'avatars') {
    throw new HttpError({
      status: 500,
      message: 'Internal server error!',
      details: 'Invalid upload folder.',
    });
  }

  const s3Params = {
    Bucket: bucket,
    Key: `${folder}/${uniqueId}_${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const uploadData = await new Upload({
      client: s3,
      params: s3Params,
    }).done();
    return uploadData;
  } catch (error) {
    throw new HttpError({
      status: 500,
      message: 'Cloud upload error!',
      details: error.message,
    });
  }
};

export const getS3Url = async (key) => {
  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const fileUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
    return fileUrl;
  } catch (error) {
    throw new HttpError({
      status: 500,
      message: 'Cloud download error!',
      details: error.message,
    });
  }
};

export const deleteFileFromS3 = async (key) => {
  try {
    const deleteCommand = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    const result = await s3.send(deleteCommand);
    return result;
  } catch (error) {
    throw new HttpError({
      status: 500,
      message: 'Cloud delete error!',
      details: error.message,
    });
  }
};

export const addFileToDb = async (fileData) => {
  const { fileName, category, size, key, owner } = fileData;

  try {
    const newFile = await fileModel.create({
      fileName,
      category,
      size,
      key,
      owner,
    });

    await userModel.findByIdAndUpdate(fileData.owner, { $push: { files: newFile._id } }, { new: true });

    return newFile;
  } catch (error) {
    throw new HttpError({
      status: 500,
      message: 'DB error on adding file.',
      details: error.message,
    });
  }
};

export const deleteFileFromDB = async (key) => {
  try {
    const fileToDelete = await fileModel.findOne({ key });
    await fileModel.deleteOne({ key });
    const updatedOwner = await userModel
      .findByIdAndUpdate(fileToDelete.owner, { $pull: { files: fileToDelete._id } }, { new: true })
      .populate('files');
    return updatedOwner.files;
  } catch (error) {
    throw new HttpError({
      status: 500,
      message: 'DB error on deleting file.',
      details: error.message,
    });
  }
};

export const checkStorageCapacity = async (userId) => {
  try {
    const maxFilesAllowed = 20; // Set max files allowed. Can be added to .env
    const user = await userModel.findById(userId);
    if (user.files.length >= maxFilesAllowed) {
      throw new HttpError({
        status: 403,
        message: 'Max storage capacity reached. Please delete a file before uploading a new one.',
      });
    }
    return;
  } catch (error) {
    if (error instanceof HttpError) throw error;

    throw new HttpError({
      status: 500,
      message: 'DB error on adding file.',
      details: error.message,
    });
  }
};

export const setAvatar = async (userId, avatar) => {
  try {
    const user = await userModel.findById(userId);
    const avatarUrl = user.imageUrl;
    const keyRegex = /avatars\/.*$/;
    const matches = avatarUrl.match(keyRegex);
    if (matches) {
      const avatarKey = matches[0];
      await deleteFileFromS3(avatarKey);
    }

    await compressImage(avatar, 600);
    const cloudFolder = 'avatars';
    const newAvatar = await uploadFileToS3(avatar, cloudFolder);
    return newAvatar.Location;
  } catch (error) {
    throw new HttpError({
      status: 500,
      message: 'An error occurred while setting the avatar.',
      details: error.message,
    });
  }
};
