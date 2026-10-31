# Items API

A small REST API that returns items stored in MongoDB. The list endpoint supports bounded pagination and returns only the fields used by the response.

## Features

- Paginated item listing with a maximum page size of 100
- Mongoose schema with `title`, `summary`, and `thumbnail` fields
- Consistent JSON responses for invalid requests, missing routes, and server errors
- Basic response security headers

## Tech stack

Node.js, Express, MongoDB, and Mongoose.

## Setup

Requires Node.js 18 or later and a running MongoDB instance.

```bash
npm install
```

Copy `.env.example` to `.env` and set the connection string for your MongoDB instance.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `PORT` | No | `3000` | HTTP port |

## Run

```bash
npm start
```

Run the test suite with `npm test`. Tests use a fake Mongoose model and do not require a database.

## API

### `GET /api/items`

Returns items ordered by creation time, newest first. Query parameters are optional:

| Parameter | Default | Description |
| --- | --- | --- |
| `page` | `1` | Positive page number |
| `limit` | `10` | Number of items per page, from 1 to 100 |

Example request:

```http
GET /api/items?page=2&limit=5
```

Successful response:

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
    "currentPage": 2,
    "pageSize": 5,
    "totalPages": 3,
    "totalItems": 11
  }
}
```

Invalid pagination returns `400 Bad Request`. Unexpected errors return a generic `500 Internal Server Error`.

## Project structure

```text
src/
  app.js
  server.js
  controllers/
  middleware/
  models/
  routes/
test/
```

## Scope

This project exposes a read-only list endpoint. It does not create or update items, authenticate callers, or include a database seed script; item documents must already exist in the configured MongoDB collection.

## Public website audit

Target: `https://www.cynbit.in/`  
Checked: 31 October 2026  
Method: Passive request to the public homepage response headers. No forms were submitted, accounts used, or private/API endpoints tested.

The homepage returned `200 OK` from Vercel. The response included HSTS, an ETag, and cache-related headers. The following are hardening observations from this homepage response, not confirmed vulnerabilities:

| Observation | Assessment |
| --- | --- |
| `Content-Security-Policy` was not present. | Consider a policy appropriate to the site's scripts, styles, and other resources. This check did not test for cross-site scripting. |
| `X-Content-Type-Options` was not present. | Consider setting it to `nosniff` to prevent MIME-type sniffing. |
| `X-Frame-Options` was not present. | Consider a framing restriction if the site is not intended to be embedded. A CSP `frame-ancestors` policy is an alternative. |
| `Referrer-Policy` was not present. | Consider setting an explicit policy so referrer behavior is deliberate. |
| `Access-Control-Allow-Origin: *` was present. | This was observed on the public homepage only. It does not demonstrate that an API or private data is accessible cross-origin; check API responses separately before changing CORS configuration. |

These results describe one public homepage response and do not establish that the same headers are absent on other pages or services. No API behavior, authentication, authorization, input handling, or data exposure was assessed.
