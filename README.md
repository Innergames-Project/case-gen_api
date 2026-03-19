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

## Current architecture

The project is split into two main domains:

- `src/cases`
  Stores and returns cases. Right now this uses an in-memory repository, so data resets when the server restarts.
- `src/ai`
  Connects to Groq and exposes an endpoint to generate a case draft from a prompt.

Shared app setup:

- `src/main.ts`
  Starts the Nest app and logs startup failures.
- `src/common/filters/http-exception.filter.ts`
  Logs backend errors and returns a consistent error response shape.
- `src/app.service.ts`
  Exposes the current backend status at `GET /`.

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
  - `GET /cases`
  - `POST /cases`
  - `GET /ai/health`
  - `POST /ai/generate-case`

The e2e suite mocks Groq so tests do not depend on external network calls.

## Known limitations

- Cases are not persisted yet. Restarting the server clears them.
- There is no auth layer yet.
- DTOs are currently TypeScript interfaces only. Validation decorators can be added later.
- The AI response is raw text for now, not structured JSON.

## Next recommended steps

1. Move `cases` from in-memory storage to MySQL.
2. Add DTO validation with `class-validator`.
3. Define a structured AI response format for frontend consumption.
4. Add `cards` generation and persistence.
