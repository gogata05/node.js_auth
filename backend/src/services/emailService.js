import nodemailer from 'nodemailer';
import sanitizeHtml from 'sanitize-html';
import HttpError from '../utils/httpError.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  },
});

const htmlSanitizer = (input) => sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new HttpError({
      status: 500,
      message: 'Error sending email!',
      details: error.message,
    });
  }
};

export const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.FRONTEND_SERVER}/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: 'Потвърдете вашия имейл',
    text: `Моля, потвърдете вашия имейл като кликнете на следния линк: ${verificationUrl}`,
    html: `
      <h1>Добре дошли в Lexi Magic!</h1>
      <p style="display: block;">Моля, потвърдете вашия имейл като кликнете на бутона по-долу:</p>
      <a href="${verificationUrl}" style="display: block; width: fit-content; background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">
        Потвърди имейл
      </a>
    `,
  });
};

export const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_SERVER}/reset-password?token=${token}`;

  await sendEmail({
    to: email,
    subject: 'Възстановяване на парола',
    text: `За да възстановите паролата си, моля кликнете на следния линк: ${resetUrl}`,
    html: `
      <h1>Възстановяване на парола</h1>
      <p>Получихме заявка за възстановяване на вашата парола.</p>
      <p>Ако вие сте направили тази заявка, моля кликнете на бутона по-долу:</p>
      <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">
        Възстанови парола
      </a>
      <p>Ако не сте правили тази заявка, можете да игнорирате този имейл.</p>
    `,
  });
};

export const sendContactEmail = async (name, email, subject, message) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_USER,
      subject: `LexiMagic: ${subject}`,
      text: message,
      html: `
      <h1>Получено запитване от контактната форма на LexiMagic!</h1>
      <p>Получихме запитване от ${htmlSanitizer(name)}, с имейл: ${email}</p>
      <p>Относно: ${htmlSanitizer(subject)}</p>
      <p>Въпрос: ${htmlSanitizer(message)}</p>
    `,
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new HttpError({
      status: 500,
      message: 'Error sending email!',
      details: error.message,
    });
  }
};
