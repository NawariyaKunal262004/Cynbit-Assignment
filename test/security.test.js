const test = require('node:test');
const assert = require('node:assert/strict');
const configureSecurity = require('../src/middleware/security');

test('disables the Express powered-by header and adds basic response headers', () => {
  const headers = {};
  let securityMiddleware;
  let disabledSetting;
  const app = {
    disable(setting) {
      disabledSetting = setting;
    },
    use(middleware) {
      securityMiddleware = middleware;
    }
  };

  configureSecurity(app);
  let continued = false;
  securityMiddleware(
    {},
    {
      setHeader(name, value) {
        headers[name] = value;
      }
    },
    () => {
      continued = true;
    }
  );

  assert.equal(disabledSetting, 'x-powered-by');
  assert.deepEqual(headers, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  assert.equal(continued, true);
});
