import HttpError from '../utils/httpError.js';

export const validateContactForm = (name, email, subject, message) => {
  const emailRegEx = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

  if (!name || name.length < 3 || name.length > 30) {
    throw new HttpError({
      status: 400,
      message: 'Name is required and should be between 3 and 30 characters.',
    });
  }

  if (!email) {
    throw new HttpError({
      status: 400,
      message: 'Email is required.',
    });
  }

  if (!email.match(emailRegEx)) {
    throw new HttpError({
      status: 400,
      message: 'Invalid email format.',
    });
  }

  if (email.length > 30) {
    throw new HttpError({
      status: 400,
      message: 'Email should be less than 30 characters.',
    });
  }

  if (!subject || subject.length < 5 || subject.length > 30) {
    throw new HttpError({
      status: 400,
      message: 'Subject is required and should be between 5 and 50 characters.',
    });
  }

  if (!message || message.length < 10 || message.length > 400) {
    throw new HttpError({
      status: 400,
      message: 'Message is required and should be at between 10 and 400 characters.',
    });
  }
};
