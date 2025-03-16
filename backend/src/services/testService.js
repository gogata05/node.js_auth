// Service should import models and set the functions that communicate to the DB or to external APIs.

const testData = {
  testMessage: 'API test successful!',
};

function getTestData() {
  return testData;
}

export { getTestData };
