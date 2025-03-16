import conversationModel from '../models/conversationModel.js';
import messageModel from '../models/messageModel.js';
import * as time from '../utils/time.js';

function newConversation(userId) {
  return conversationModel.create({
    messages: [],
    owner: userId,
  });
}

function newMessage(role, input, conversationId) {
  const content = [
    {
      type: 'text',
      text: input,
    },
  ];

  return messageModel.create({
    role,
    content,
    conversation: conversationId,
  });
}

function updateConversation(conversationId, messageId) {
  return conversationModel
    .findByIdAndUpdate({ _id: conversationId }, { $addToSet: { messages: messageId } }, { new: true })
    .populate({ path: 'messages', options: { sort: { created_at: 1 } } });
}

async function getKidStats(kidId, timezoneOffset) {
  const currentWeekStart = await time.getStartOfCurrentWeekUTC(timezoneOffset);
  const previousWeekStart = await time.getStartOfPreviousWeekUTC(timezoneOffset);
  const todayStart = await time.getStartOfTodayUTC(timezoneOffset);
  const yesterdayStart = await time.getStartOfYesterdayUTC(timezoneOffset);

  const currentWeekChats = await conversationModel.find({
    owner: kidId,
    created_at: { $gte: currentWeekStart },
    // This will include only chats with at least 3 questions and 3 answers (6 messages overall):
    $expr: { $gt: [{ $size: '$messages' }, 5] },
  });

  const previousWeekChats = await conversationModel.find({
    owner: kidId,
    created_at: {
      $gte: previousWeekStart,
      $lt: currentWeekStart,
    },
    $expr: { $gt: [{ $size: '$messages' }, 5] },
  });

  const todayChats = await conversationModel.find({
    owner: kidId,
    created_at: {
      $gte: todayStart,
    },
    $expr: { $gt: [{ $size: '$messages' }, 5] },
  });

  const yesterdayChats = await conversationModel.find({
    owner: kidId,
    created_at: {
      $gte: yesterdayStart,
      $lt: todayStart,
    },
    $expr: { $gt: [{ $size: '$messages' }, 5] },
  });

  const currentWeekStats = currentWeekChats.length;
  const previousWeekStats = previousWeekChats.length;
  const todayStats = todayChats.length;
  const yesterdayStats = yesterdayChats.length;

  return { currentWeekStats, previousWeekStats, todayStats, yesterdayStats };
}

async function deleteOlderThan(kidId, timezoneOffset, daysBefore) {
  const daysBeforeDateUTC = await time.getDaysBeforeUTC(timezoneOffset, daysBefore);

  await conversationModel.deleteMany({
    owner: kidId,
    created_at: { $lt: daysBeforeDateUTC },
  });
}

export { newConversation, newMessage, updateConversation, getKidStats, deleteOlderThan };
