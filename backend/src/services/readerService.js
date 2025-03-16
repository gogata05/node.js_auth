import axios from 'axios';
import * as qs from 'qs';
import HttpError from '../utils/httpError.js';
import dotenv from 'dotenv';

dotenv.config();

export const getReaderCredentials = async () => {
  try {
    const config = {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
    };
    const data = {
      grant_type: 'client_credentials',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      resource: 'https://cognitiveservices.azure.com/',
    };

    const url = `https://login.windows.net/${process.env.TENANT_ID}/oauth2/token`;

    let response = null;

    try {
      response = await axios.post(url, qs.stringify(data), config);
    } catch (error) {
      throw new HttpError({
        status: 400,
        message: error.message || 'Azure ImmersiveReader request failed!',
      });
    }

    const token = response.data.access_token;
    const expires_in = response.data.expires_in;
    const subdomain = process.env.SUBDOMAIN;

    return { token, expires_in, subdomain };
  } catch (error) {
    throw new HttpError({
      status: 401,
      message: 'Getting ImmersiveReader credentials failed!',
      details: error.message,
    });
  }
};
