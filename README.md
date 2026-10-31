# Cynbit Backend Technical Audit

## Executive summary

This assessment reviews the publicly observable response from the Cynbit homepage and documents the limits of that evidence. The available check supports a small number of response-header and caching observations; it does not establish how Cynbit's private APIs, authentication, data stores, or internal services work.

This repository also contains a small, independently implemented Express and MongoDB items API. It demonstrates practical backend patterns and is documented separately below. It is not Cynbit source code and is not evidence of Cynbit's production architecture.

## Scope and method

- **Target:** `https://www.cynbit.in/`
- **Method:** One passive HTTP `HEAD` request to the public homepage; no forms, accounts, private endpoints, or authenticated flows were accessed.
- **Not performed:** Scanning, enumeration, exploitation, load testing, or API probing.

Findings distinguish direct observations from interpretation and recommendations. Header behavior may differ across routes, services, or deployments.

## 1. Backend technical audit

### Directly observed

| Area | Observation | Evidence and limits |
| --- | --- | --- |
| Homepage delivery | The homepage returned `200 OK`; the response identified Vercel and HTML content. | One response on 31 October 2026. This does not identify the origin application or its internal services. |
| Caching and rendering | The response included `Cache-Control: public, max-age=0, must-revalidate`, `X-Vercel-Cache: HIT`, an `Age` value, and `X-Nextjs-Prerender: 1`. | Consistent with a cached, prerendered homepage response at the edge. No latency, availability, or origin performance measurements were taken. |
| Cross-origin header | The homepage response included `Access-Control-Allow-Origin: *`. | Observed on the homepage only. It does not show that an API, private data, or credentialed requests are available cross-origin. |
| API structure and payloads | No public API request or API payload was inspected. | The homepage-header check did not establish API routes, methods, schemas, pagination, or response data. These remain unverified. |

### Architecture interpretation

The public response is served through Vercel and indicates a prerendered/cached homepage. A single response cannot establish the application framework, backend topology, database, API gateway, or whether the homepage consumes a separate API.

No evidence was collected about Cynbit's data model, input validation, authentication, authorization, or error handling. Those areas are **not assessed**, rather than confirmed present or absent.

## 2. Security and performance findings

These are evidence-based hardening observations, not confirmed vulnerabilities.

| Category | Observation and evidence | Potential impact | Recommended improvement | Priority |
| --- | --- | --- | --- | --- |
| Security headers | The checked homepage response did not include `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, or `Referrer-Policy`. | Without these defenses, browser protections against some content injection, MIME sniffing, framing, or referrer disclosure scenarios may be less explicit. No exploitability was tested or demonstrated. | Review the site's resource and embedding requirements, then configure suitable headers consistently at the edge or application layer. | Low |
| CORS | `Access-Control-Allow-Origin: *` was present on the homepage response. | This may be appropriate for public content. If the same policy applies to sensitive API responses, it could permit cross-origin reads of public responses; this check did not establish that it does. | Inspect API response policies separately. Allow only required origins for APIs that return non-public data; do not combine wildcard origins with credentials. | Low |
| Performance | The response showed an edge cache hit, a nonzero `Age`, and a prerender indicator. | This is positive evidence of caching for this response, but says nothing about dynamic endpoints, cache correctness, latency, or load capacity. | Preserve the observed static-page caching where appropriate. Validate cache keys, freshness, and invalidation for any dynamic or user-specific responses before caching them. | Informational |
| Data handling | Only homepage response metadata was examined; response data flows and stored records were not assessed. | Exposure, retention, minimization, and access controls cannot be evaluated from this evidence. | Review API payloads and data handling only when an authorized, public interface or approved access is available. Minimize returned fields and apply authorization server-side. | Not assessed |
| Validation | No user input or API parameters were submitted or tested. | Input-validation behavior and error handling are unknown. | For any confirmed API, document accepted inputs and verify boundary cases through an authorized test scope. | Not assessed |
| Authentication | No accounts or authenticated endpoints were accessed. | Authentication and authorization controls cannot be inferred from the public homepage response. | Assess these controls only with explicit authorization and suitable test accounts. | Not assessed |

### Areas not assessed

Private APIs and payloads, database or storage configuration, authentication and authorization flows, input-validation behavior, application error handling, and performance under load were not assessed. No claim is made that these areas are vulnerable or that controls are absent.

## 3. Recommended improvements

Apply changes only after confirming the relevant behavior on the service being changed. For example, an Express service could set explicit browser-security headers after checking the site's scripts, styles, and embedding needs:

```js
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  );
  next();
});
```

The CSP is an example, not a drop-in policy: inventory required third-party resources and test the policy before enforcing it. A restrictive policy can break legitimate page functionality.

If an authorized review confirms that a service exposes a list endpoint, validate pagination inputs, cap page size, select only response fields, and keep the result query and count together:

```js
const pageValue = req.query.page ?? '1';
const limitValue = req.query.limit ?? '10';
const isDecimal = (value) =>
  typeof value === 'string' && /^\d+$/.test(value);

if (!isDecimal(pageValue) || !isDecimal(limitValue)) {
  return res.status(400).json({ success: false, message: 'Invalid pagination.' });
}

const page = Number(pageValue);
const limit = Number(limitValue);
const skip = (page - 1) * limit;

if (
  !Number.isSafeInteger(page) || page < 1 ||
  !Number.isSafeInteger(limit) || limit < 1 || limit > 100 ||
  !Number.isSafeInteger(skip)
) {
  return res.status(400).json({ success: false, message: 'Invalid pagination.' });
}

const [items, totalItems] = await Promise.all([
  Item.find({})
    .select('title summary thumbnail createdAt')
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit),
  Item.countDocuments({})
]);
```

This pattern bounds the requested result size, rejects unsafe offsets, limits returned fields, and provides a stable sort. Use an equivalent approach only if the service actually exposes this type of endpoint.

## Repository implementation

This separate sample API uses Express routes and a controller, a Mongoose `Item` model, small security and error-handling middleware, and Node's built-in test runner. It is intentionally limited to a read-only list endpoint; it does not implement Cynbit's backend.

### API contract

`GET /api/items` accepts optional `page` (default `1`) and `limit` (default `10`, maximum `100`). It returns items ordered by creation time, newest first, with a stable `_id` tie-breaker. Invalid pagination returns `400`; unknown routes return `404`; unexpected errors return a generic `500` response.

Example request:

```http
GET /api/items?page=3&limit=5
```

Example success response:

```json
{
  "success": true,
  "data": [
    {
      "_id": "672000000000000000000001",
      "title": "Example item",
      "summary": "A short summary",
      "thumbnail": "https://example.com/image.jpg",
      "createdAt": "2026-10-30T12:00:00.000Z"
    }
  ],
  "meta": {
    "currentPage": 3,
    "pageSize": 5,
    "totalPages": 3,
    "totalItems": 11
  }
}
```

The sample model defines `title`, `summary`, and `thumbnail` fields and timestamps. There are no create/update routes, authentication middleware, or seed script; documents must already exist in the configured MongoDB collection.

## Run and verify

Requires Node.js 18 or later and a reachable MongoDB instance to start the API.

```bash
npm install
```

Copy `.env.example` to `.env` and set the connection string for the MongoDB instance:

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `PORT` | No | `3000` | HTTP port |

Start the API with `npm start`. Run `npm test` for the automated suite; tests use a fake Mongoose model and do not require a database.

## Project structure

```text
src/
  app.js
  server.js
  controllers/
    itemsController.js
  middleware/
    errorHandler.js
    security.js
  models/
    item.js
  routes/
    itemsRoutes.js
test/
  app.test.js
  errorHandler.test.js
  itemsController.test.js
  security.test.js
```
