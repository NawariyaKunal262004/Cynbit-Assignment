const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const createApp = require('../src/app');

function createItemModel(items) {
  return {
    find() {
      let skip = 0;
      let limit = items.length;
      const query = {
        select() {
          return query;
        },
        sort() {
          return query;
        },
        skip(value) {
          skip = value;
          return query;
        },
        limit(value) {
          limit = value;
          return Promise.resolve(items.slice(skip, skip + limit));
        }
      };

      return query;
    },
    countDocuments() {
      return Promise.resolve(items.length);
    }
  };
}

async function startTestServer(t, itemModel) {
  const server = createApp(itemModel).listen(0);
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

test('GET /api/items returns a paginated JSON response', async (t) => {
  const items = [{ title: 'Example item' }, { title: 'Another item' }];
  const baseUrl = await startTestServer(t, createItemModel(items));

  const response = await fetch(`${baseUrl}/api/items?limit=1`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(body.data, [items[0]]);
  assert.deepEqual(body.meta, {
    currentPage: 1,
    pageSize: 1,
    totalPages: 2,
    totalItems: 2
  });
});

test('unknown routes return a JSON 404 response', async (t) => {
  const baseUrl = await startTestServer(t, createItemModel([]));

  const response = await fetch(`${baseUrl}/missing`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    success: false,
    message: 'Route not found.'
  });
});
