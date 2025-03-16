import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: [true, "'Role' is required!"],
    },
    content: [
      {
        type: {
          type: String,
          required: [true, "'Type' is required!"],
        },
        text: {
          type: String,
          required: [true, "'Text' is required!"],
        },
      },
    ],
    conversation: {
      type: mongoose.Types.ObjectId,
      ref: 'Conversation',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
);

const messageModel = mongoose.model('Message', messageSchema);

export default messageModel;
