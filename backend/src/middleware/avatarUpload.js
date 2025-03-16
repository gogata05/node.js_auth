import multer from 'multer';

const storage = multer.memoryStorage();

const avatarFilter = (req, file, cb) => {
  const allowedTypes = ['image/bmp', 'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file format. The allowed formats are bmp, heic, heif, jpeg, jpg, png and webp.'));
  }
  cb(null, true);
};

export const avatarUpload = multer({
  storage,
  avatarFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('avatar');
