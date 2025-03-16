import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: [true, 'A file name is required!'],
    },
    category: {
      type: String,
      default: '',
    },
    size: {
      type: Number,
    },
    key: {
      type: String,
      unique: true,
      required: [true, 'A file key is required!'],
    },
    owner: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

const fileModel = mongoose.model('File', fileSchema);

export default fileModel;
