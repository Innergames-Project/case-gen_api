# Quick Guide for Frontend

This document is for the frontend team. It explains how to run the backend locally, which URL to use, and what the API exposes.

## What this backend does

* Provides a REST API to create, list, edit, retrieve, and delete `cases`.
* Stores `cases` in memory. If you restart the server, the data is lost.
* Includes AI endpoints using Groq to generate a case draft from a prompt.
* Can generate game cards from an uploaded document and return them as JSON with a base64 PDF.
* Can return a PDF directly with the generated cards.
* No authentication yet. All endpoints are public to simplify frontend integration.
* CORS is enabled so it can be called from the browser.

## Requirements

* Node.js installed
* npm installed
* A Groq API key only if you want to test the real AI endpoints

## Installation

From the backend folder:

```bash
npm install
```

## Environment variables

Create a `.env` file at the root of the project.

Example:

```env
PORT=3000
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-20b
```

Notes:

* `PORT` is optional. Default is `3000`.
* `GROQ_API_KEY` is only required for AI endpoints.
* If you don’t have a Groq key, `/ai/health` will work but `/ai/generate-case` and `/ai/generate-cards` will return a configuration error.

## Run the backend

Development mode:

```bash
npm run start:dev
```

Default URL:

```text
http://localhost:3000
```

If port `3000` is already in use:

```bash
PORT=3001 npm run start:dev
```

Then the URL will be:

```text
http://localhost:3001
```

## Check if it works

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "name": "case-gen_api",
  "auth": "disabled",
  "database": "in-memory",
  "ai": "groq"
}
```

## Base URL for the frontend

Configure the frontend with:

```ts
const API_BASE_URL = 'http://localhost:3000';
```

If the backend runs on `PORT=3001`:

```ts
const API_BASE_URL = 'http://localhost:3001';
```

## Main endpoints

### Health

```http
GET /health
GET /
```

Used to check if the backend is running.

### Cases

```http
GET /cases
POST /cases
GET /cases/:id
PATCH /cases/:id
DELETE /cases/:id
```

Create a case:

```ts
await fetch(`${API_BASE_URL}/cases`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Frontend case',
    description: 'Case created from the frontend',
  }),
});
```

Response:

```json
{
  "id": "uuid",
  "title": "Frontend case",
  "description": "Case created from the frontend",
  "cardIds": [],
  "createdAt": "2026-04-22T07:37:49.508Z",
  "updatedAt": "2026-04-22T07:37:49.508Z"
}
```

List cases:

```ts
const response = await fetch(`${API_BASE_URL}/cases`);
const cases = await response.json();
```

Update a case:

```ts
await fetch(`${API_BASE_URL}/cases/${caseId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'New title',
  }),
});
```

Delete a case:

```ts
await fetch(`${API_BASE_URL}/cases/${caseId}`, {
  method: 'DELETE',
});
```

### AI health

```http
GET /ai/health
```

Response:

```json
{
  "provider": "groq",
  "configured": true
}
```

`configured: false` means `GROQ_API_KEY` is missing.

### Generate a case with AI

```http
POST /ai/generate-case
```

```ts
await fetch(`${API_BASE_URL}/ai/generate-case`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'Generate a signup troubleshooting case',
  }),
});
```

Response:

```json
{
  "model": "openai/gpt-oss-20b",
  "text": "..."
}
```

### Generate cards from a document

```http
POST /ai/generate-cards
```

This endpoint receives `multipart/form-data`.

Required field:

* `document`: PDF, TXT, MD, CSV, or JSON file

Optional field:

* `prompt`: additional generation instructions

Example:

```ts
const formData = new FormData();
formData.append('document', file);
formData.append('prompt', 'Create concise study cards');

const response = await fetch(`${API_BASE_URL}/ai/generate-cards`, {
  method: 'POST',
  body: formData,
});

const result = await response.json();
```

Simplified response:

```json
{
  "model": "openai/gpt-oss-20b",
  "cards": [
    {
      "id": "uuid",
      "type": "challenge",
      "title": "Card title",
      "front": "Player-facing text",
      "back": "Answer or notes",
      "source": "Source reference"
    }
  ],
  "sourceTextLength": 1200,
  "pdf": {
    "filename": "game-cards.pdf",
    "contentType": "application/pdf",
    "base64": "..."
  }
}
```

### Generate only the cards PDF

```http
POST /ai/generate-cards/pdf
```

Also receives `multipart/form-data` with `document` and optional `prompt`.

```ts
const formData = new FormData();
formData.append('document', file);

const response = await fetch(`${API_BASE_URL}/ai/generate-cards/pdf`, {
  method: 'POST',
  body: formData,
});

const pdfBlob = await response.blob();
```

## Error format

Errors follow this format:

```json
{
  "statusCode": 400,
  "message": "description is required",
  "path": "/cases",
  "timestamp": "2026-04-22T07:37:49.508Z"
}
```

Common status codes:

* `400`: missing field or invalid body
* `404`: case not found
* `503`: Groq not configured

## Important limitations

* No login or tokens
* No database yet
* `/cases` data is temporary and lost on restart
* AI endpoints require `GROQ_API_KEY`
* Readable PDFs work best if they contain text (not scanned images)

## Useful commands

```bash
npm run start:dev
npm run build
npm run test -- --runInBand
npm run test:e2e -- --runInBand
```
