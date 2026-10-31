const test = require('node:test');
const assert = require('node:assert/strict');
const { createItemsController } = require('../src/controllers/itemsController');

function createItemModel({ items = [], totalItems = items.length } = {}) {
  const calls = {};
  const query = {
    select(value) {
      calls.projection = value;
      return this;
    },
    sort(value) {
      calls.sort = value;
      return this;
    },
    skip(value) {
      calls.skip = value;
      return this;
    },
    limit(value) {
      calls.limit = value;
      return Promise.resolve(items);
    }
  };

  return {
    calls,
    find(filter) {
      calls.filter = filter;
      return query;
    },
    countDocuments(filter) {
      calls.countFilter = filter;
      return Promise.resolve(totalItems);
    }
  };
}

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

test('returns projected items with bounded pagination metadata', async () => {
  const Item = createItemModel({ items: [{ title: 'Example' }], totalItems: 21 });
  const req = { query: { page: '2', limit: '10' } };
  const res = createResponse();
  let passedError;

  await createItemsController(Item)(req, res, (error) => {
    passedError = error;
  });

  assert.equal(passedError, undefined);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data, [{ title: 'Example' }]);
  assert.deepEqual(res.body.meta, {
    currentPage: 2,
    pageSize: 10,
    totalPages: 3,
    totalItems: 21
  });
  assert.equal(Item.calls.skip, 10);
  assert.equal(Item.calls.limit, 10);
  assert.equal(Item.calls.projection, 'title summary thumbnail createdAt');
  assert.deepEqual(Item.calls.sort, { createdAt: -1, _id: -1 });
});

test('returns a 400 response for invalid pagination', async () => {
  const Item = createItemModel();
  const req = { query: { page: '0', limit: '10' } };
  const res = createResponse();

  await createItemsController(Item)(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Page/);
});

test('rejects non-decimal pagination values', async () => {
  const Item = createItemModel();
  const req = { query: { page: '1e2', limit: '10' } };
  const res = createResponse();

  await createItemsController(Item)(req, res, () => {});

  assert.equal(res.statusCode, 400);
});

test('returns a 400 response when the requested limit is over 100', async () => {
  const Item = createItemModel();
  const req = { query: { page: '1', limit: '101' } };
  const res = createResponse();

  await createItemsController(Item)(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(Item.calls.filter, undefined);
});

test('returns a 400 response when the page offset is too large', async () => {
  const Item = createItemModel();
  const req = { query: { page: '900719925474100', limit: '100' } };
  const res = createResponse();

  await createItemsController(Item)(req, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(Item.calls.filter, undefined);
});

test('passes database errors to the error handler', async () => {
  const error = new Error('database connection failed');
  const Item = {
    find() {
      return {
        select() {
          return this;
        },
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        limit() {
          return Promise.reject(error);
        }
      };
    },
    countDocuments() {
      return Promise.resolve(0);
    }
  };
  let passedError;

  await createItemsController(Item)(
    { query: {} },
    createResponse(),
    (caughtError) => {
      passedError = caughtError;
    }
  );

  assert.equal(passedError, error);
});
