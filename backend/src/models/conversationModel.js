import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    messages: [
      {
        type: mongoose.Types.ObjectId,
        ref: 'Message',
      },
    ],
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

const conversationModel = mongoose.model('Conversation', conversationSchema);

export default conversationModel;
