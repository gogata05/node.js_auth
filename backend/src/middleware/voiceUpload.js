import multer from 'multer';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './tmp');
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'audio/mp3',
    'audio/mp4',
    'audio/mpeg',
    'audio/mpga',
    'audio/m4a',
    'audio/wave',
    'audio/webm',
    'audio/ogg',
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only audio files are allowed.'));
  }
  cb(null, true);
};

export const voiceUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
}).single('audio');
