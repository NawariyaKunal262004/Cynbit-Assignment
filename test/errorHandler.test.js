const test = require('node:test');
const assert = require('node:assert/strict');
const errorHandler = require('../src/middleware/errorHandler');

function createResponse() {
  return {
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test('returns a generic 500 response for an unexpected error', () => {
  const res = createResponse();
  const req = { method: 'GET', path: '/api/items' };
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    errorHandler(new Error('database connection failed'), req, res, () => {});
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    success: false,
    message: 'Something went wrong. Please try again later.'
  });
  assert.equal(JSON.stringify(res.body).includes('database connection failed'), false);
});

test('returns the message for a known client error', () => {
  const res = createResponse();
  const req = { method: 'GET', path: '/api/items', originalUrl: '/api/items?page=0' };
  const error = new Error('page must be a positive integer');
  error.statusCode = 400;

  errorHandler(error, req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    success: false,
    message: 'page must be a positive integer'
  });
});
