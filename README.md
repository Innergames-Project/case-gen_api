<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
--------------

# case-gen_api

Backend API built with NestJS for a case generation product.

This version of the backend has been simplified on purpose to make frontend integration easier: Firebase has been removed for now, authentication is disabled, Groq handles AI generation, and cases are stored in memory until the data model is stable enough to move into MySQL.

Current stack:
- NestJS
- GroqCloud for AI generation
- In-memory storage for `cases`
- No authentication for now

The backend is intentionally simple so the frontend team can integrate fast without waiting for auth or a database migration.

## Requirements

- [Node.js](https://nodejs.org/en)
- [NestJS](https://nestjs.com/)
- Groq API key for real AI generation

MySQL is not used yet in the current version. Cases are stored in memory until the data model is stable enough to move into a real database.

## API structure

The API follows a modular NestJS structure and is split into small domains with clear responsibilities.

### `src/cases`

This module follows the controller -> service -> repository flow:

- `cases.controller.ts`
  Receives HTTP requests for `/cases` and forwards them to the service.
- `cases.service.ts`
  Holds the business layer for cases.
- `case.repository.ts`
  Handles persistence, currently using an in-memory array.
- `cases.module.ts`
  Registers controller and providers for this domain.

### `src/ai`

This module exposes AI endpoints and isolates the Groq integration:

- `ai.controller.ts`
  Exposes `/ai/health`, `/ai/generate-case`, `/ai/generate-cards`, and `/ai/generate-cards/pdf`.
- `groq.service.ts`
  Validates input, checks configuration, performs the Groq request, and normalizes generated game cards.
- `document-text.service.ts`
  Extracts readable text from uploaded documents before AI processing.
- `card-pdf.service.ts`
  Renders generated game cards into a downloadable PDF.
- `ai.module.ts`
  Registers the AI controller and service.

### Shared app setup

- `app.module.ts`
  Loads global config, registers the `cases` and `ai` modules, and installs the global HTTP exception filter.
- `main.ts`
  Boots the Nest app and logs startup failures.
- `common/filters/http-exception.filter.ts`
  Returns a consistent error response shape and logs HTTP errors.
- `app.controller.ts` + `app.service.ts`
  Expose `GET /` as a quick backend status endpoint.

## How the program works

### Cases flow

`Client -> CasesController -> CasesService -> CaseRepository`

The mobile app sends an HTTP request to `/cases`. The controller receives the request and forwards it to the service. The service keeps the business layer separate from persistence details, and the repository creates or returns case records from the in-memory store.

### AI flow

`Client -> AiController -> GroqService -> Groq API`

The mobile app sends an HTTP request to `/ai/generate-case`. The controller forwards the prompt to `GroqService`, which validates the prompt, checks whether `GROQ_API_KEY` is configured, sends the request to Groq, and returns the generated text.

Document-to-cards flow:

`Client document upload -> AiController -> DocumentTextService -> GroqService -> CardPdfService`

The frontend uploads a document as `multipart/form-data`. The API extracts readable text, asks Groq for structured game cards, and returns the cards plus a PDF version of the deck.

## Implementation examples

### Controller example

```ts
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  async findAll() {
    return this.casesService.findAll();
  }

  @Post()
  async create(@Body() input: CreateCaseDto) {
    return this.casesService.create(input);
  }
}
```

### Service example

```ts
@Injectable()
export class CasesService {
  constructor(private readonly caseRepository: CaseRepository) {}

  async create(input: CreateCaseDto) {
    return this.caseRepository.create(input);
  }

  async findAll() {
    return this.caseRepository.findAll();
  }
}
```

### Repository example

```ts
@Injectable()
export class CaseRepository {
  private readonly cases: CaseDocument[] = [];

  async create(input: CreateCaseDto): Promise<CaseDocument> {
    const now = new Date().toISOString();
    const caseDocument: CaseDocument = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description,
      cardIds: [],
      createdAt: now,
      updatedAt: now,
    };

    this.cases.unshift(caseDocument);
    return caseDocument;
  }
}
```

### AI service example

```ts
@Injectable()
export class GroqService {
  async generateCaseDraft(prompt: string) {
    if (!prompt.trim()) {
      throw new BadRequestException('Prompt is required');
    }

    if (!this.client) {
      throw new ServiceUnavailableException(
        'Groq is not configured. Set GROQ_API_KEY first.',
      );
    }

    return this.client.chat.completions.create(...);
  }
}
```

## Environment variables

Create a `.env` file in the project root.

Example:

```env
PORT=3000
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-20b
```

Notes:

- `GROQ_API_KEY` is required for the real AI call.
- `GROQ_MODEL` is optional. Default: `openai/gpt-oss-20b`
- `.env` is ignored by git.

## Install and run

```bash
npm install
npm run start:dev
```

The API starts on:

```text
http://localhost:3000
```

Frontend apps can call the backend directly from the browser. CORS is enabled by default for local integration. To restrict it, set `CORS_ORIGIN`:

```env
CORS_ORIGIN=http://localhost:5173,http://localhost:3001
```

## API endpoints

### `GET /`

Returns a quick backend status object:

```json
{
  "name": "case-gen_api",
  "auth": "disabled",
  "database": "in-memory",
  "ai": "groq"
}
```

### `GET /health`

Returns the same backend status object as `GET /`. This is useful for frontend smoke tests and deployment health checks.

### `GET /cases`

Returns all created cases.

Example response:

```json
[
  {
    "id": "uuid",
    "title": "Frontend case",
    "description": "Used for integration testing",
    "cardIds": [],
    "createdAt": "2026-03-19T10:00:00.000Z",
    "updatedAt": "2026-03-19T10:00:00.000Z"
  }
]
```

### `POST /cases`

Creates a new case.

Request body:

```json
{
  "title": "Frontend case",
  "description": "Used for integration testing"
}
```

Response:

```json
{
  "id": "uuid",
  "title": "Frontend case",
  "description": "Used for integration testing",
  "cardIds": [],
  "createdAt": "2026-03-19T10:00:00.000Z",
  "updatedAt": "2026-03-19T10:00:00.000Z"
}
```

Validation errors:

```json
{
  "statusCode": 400,
  "message": "description is required",
  "path": "/cases",
  "timestamp": "2026-03-19T10:00:00.000Z"
}
```

### `GET /cases/:id`

Returns one case by id.

Example:

```bash
curl http://localhost:3000/cases/{id}
```

### `PATCH /cases/:id`

Updates a case title, description, or both.

Request body:

```json
{
  "title": "Updated frontend case"
}
```

Response:

```json
{
  "id": "uuid",
  "title": "Updated frontend case",
  "description": "Used for integration testing",
  "cardIds": [],
  "createdAt": "2026-03-19T10:00:00.000Z",
  "updatedAt": "2026-03-19T10:05:00.000Z"
}
```

### `DELETE /cases/:id`

Deletes one case by id.

Response:

```json
{
  "deleted": true,
  "id": "uuid"
}
```

### `GET /ai/health`

Returns whether Groq is configured:

```json
{
  "provider": "groq",
  "configured": true
}
```

### `POST /ai/generate-case`

Generates a draft from a prompt.

Request body:

```json
{
  "prompt": "Generate a signup troubleshooting case"
}
```

Success response:

```json
{
  "model": "openai/gpt-oss-20b",
  "text": "..."
}
```

Error response format:

```json
{
  "statusCode": 400,
  "message": "Prompt is required",
  "path": "/ai/generate-case",
  "timestamp": "2026-03-19T10:00:00.000Z"
}
```

### `POST /ai/generate-cards`

Accepts an uploaded source document, processes it with AI, and returns game cards plus a base64 PDF.

Request type: `multipart/form-data`

Fields:

- `document`: required file. Supported: PDF, TXT, MD, CSV, JSON.
- `prompt`: optional instruction for the card style or game format.

Example:

```bash
curl -X POST http://localhost:3000/ai/generate-cards \
  -F "document=@./brief.pdf" \
  -F "prompt=Create investigation clue cards"
```

Success response:

```json
{
  "model": "openai/gpt-oss-20b",
  "sourceTextLength": 1200,
  "cards": [
    {
      "id": "uuid",
      "type": "clue",
      "title": "Suspicious login",
      "front": "Players find a login entry outside business hours.",
      "back": "The timestamp links the action to the compromised account.",
      "source": "Incident brief"
    }
  ],
  "pdf": {
    "filename": "game-cards.pdf",
    "contentType": "application/pdf",
    "base64": "JVBERi0xLjQK..."
  }
}
```

### `POST /ai/generate-cards/pdf`

Accepts the same `multipart/form-data` fields as `/ai/generate-cards`, but returns the generated cards directly as `application/pdf`.

Example:

```bash
curl -X POST http://localhost:3000/ai/generate-cards/pdf \
  -F "document=@./brief.pdf" \
  -F "prompt=Create investigation clue cards" \
  --output game-cards.pdf
```

## Logging and error handling

The backend logs:

- startup success in `src/main.ts`
- startup failure in `src/main.ts`
- HTTP errors through the global exception filter

Example terminal log:

```text
[HttpExceptionFilter] POST /ai/generate-case -> 400 Prompt is required
```

## Tests

Run all unit tests:

```bash
npm run test -- --runInBand
```

Run e2e tests:

```bash
npm run test:e2e -- --runInBand
```

Current coverage focus:

- `GroqService` validation behavior
- `CaseRepository` create/list behavior
- HTTP contract for:
  - `GET /`
  - `GET /health`
  - `GET /cases`
  - `POST /cases`
  - `GET /cases/:id`
  - `PATCH /cases/:id`
  - `DELETE /cases/:id`
  - `GET /ai/health`
  - `POST /ai/generate-case`
  - `POST /ai/generate-cards`
  - `POST /ai/generate-cards/pdf`

The e2e suite mocks Groq so tests do not depend on external network calls.

## Known limitations

- Cases are not persisted yet. Restarting the server clears them.
- There is no auth layer yet.
- DTOs are currently TypeScript interfaces only. Validation decorators can be added later.
- PDF text extraction works best with text-based PDFs. Scanned image PDFs need OCR before upload.

## Next recommended steps

1. Move `cases` from in-memory storage to MySQL.
2. Add DTO validation with `class-validator`.
3. Persist generated cards and PDFs.
4. Add OCR support for scanned PDFs.
