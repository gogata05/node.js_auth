import OpenAI from 'openai';
import * as historyService from '../services/historyService.js';
import HttpError from '../utils/httpError.js';
import { setSystemPrompt } from '../utils/aiPrompts.js';

async function chatWithLexi(textUserInput, conversationId, user) {
  try {
    const { fullName, years, city } = user;
    const grade = user['class'];
    const systemPrompt = setSystemPrompt(fullName, years, grade, city);

    const newUserMessage = await historyService.newMessage('user', textUserInput, conversationId);
    const updatedConversation = await historyService.updateConversation(conversationId, newUserMessage._id);

    let currentConversation = updatedConversation.messages.map((message) => ({
      role: message.role,
      content: [
        {
          type: message.content[0].type,
          text: message.content[0].text,
        },
      ],
    }));

    // Set max size of messages (both questions and replies) to be sent to the AI agent. -20 = The last 10 questions discussed.
    currentConversation = currentConversation.slice(-20);

    // TODO: Check if the max context size of 128K tokens is reached. Use 'tiktoken' library.
    // Currently the context max size is controlled by the input limit (4069 chars), output limit (750 tokens) and max messages count (20).

    const openai = new OpenAI();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: [
            {
              type: 'text',
              text: systemPrompt,
            },
          ],
        },
        ...currentConversation,
      ],
      max_completion_tokens: 750,
      temperature: 0.2,
    });

    const response = {
      message: completion.choices[0].message,
      conversationId,
    };

    const newAssistantMessage = await historyService.newMessage(
      response.message.role,
      response.message.content,
      conversationId,
    );

    await historyService.updateConversation(conversationId, newAssistantMessage._id);
    return response;
  } catch (error) {
    throw new HttpError({
      status: 500,
      message: 'Error during AI response generation.',
      details: error.message || 'OpenAI API error.',
    });
  }
}

export { chatWithLexi };
