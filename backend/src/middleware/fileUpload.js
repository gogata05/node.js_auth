import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/bmp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/heic',
    'image/heif',
    'image/jpeg',
    'application/vnd.oasis.opendocument.text',
    'application/pdf',
    'image/png',
    'text/plain',
    'image/webp',
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(
      new Error(
        'Invalid file type. The allowed types are bmp, doc, docx, heic, heif, jpeg, jpg, odt, png, pdf, txt and webp(image).',
      ),
    );
  }
  cb(null, true);
};

export const fileUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('file');
