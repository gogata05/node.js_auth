// Controllers extract data from the request, import the functions from the Services (the business logic) and execute them (in real cases asynchronously).

import { Router } from 'express';
import * as testService from '../services/testService.js';
import * as historyService from '../services/historyService.js';
import HttpError from '../utils/httpError.js';

const testController = Router();

testController.get('/', (req, res, next) => {
  try {
    const data = testService.getTestData();
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

testController.post('/', (req, res, next) => {
  try {
    throw new HttpError({
      status: 400,
      message: 'Bad Request',
      details: 'Test POST request is currently not supported!',
    });
  } catch (error) {
    next(error);
  }
});

testController.put('/', (req, res, next) => {
  try {
    throw new Error('Test PUT error!');
  } catch (error) {
    next(error);
  }
});

testController.patch('/', async (req, res, next) => {
  try {
    await historyService.newMessage();
  } catch (error) {
    next(error);
  }
});

export default testController;
