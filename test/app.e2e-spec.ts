import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { GroqService } from './../src/ai/groq.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const groqServiceMock = {
    isConfigured: jest.fn(() => true),
    generateCaseDraft: jest.fn(async (prompt: string) => {
      if (!prompt?.trim()) {
        throw new BadRequestException('Prompt is required');
      }

      return {
        model: 'test-model',
        text: `draft:${prompt}`,
      };
    }),
    generateCardsFromDocument: jest.fn(async (documentText: string) => ({
      model: 'test-model',
      sourceTextLength: documentText.length,
      cards: [
        {
          id: 'card-1',
          type: 'clue',
          title: 'Read the document',
          front: 'What does the source document ask players to notice?',
          back: 'The document describes a playable investigation clue.',
          source: 'brief.txt',
        },
      ],
    })),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GroqService)
      .useValue(groqServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect({
      name: 'case-gen_api',
      auth: 'disabled',
      database: 'in-memory',
      ai: 'groq',
    });
  });

  it('/cases (GET) returns an empty list initially', () => {
    return request(app.getHttpServer()).get('/cases').expect(200).expect([]);
  });

  it('/cases (POST) creates a case that can be fetched later', async () => {
    const payload = {
      title: 'Frontend case',
      description: 'Used for integration testing',
    };

    const createResponse = await request(app.getHttpServer())
      .post('/cases')
      .send(payload)
      .expect(201);

    expect(createResponse.body).toEqual({
      id: expect.any(String),
      title: payload.title,
      description: payload.description,
      cardIds: [],
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    const listResponse = await request(app.getHttpServer())
      .get('/cases')
      .expect(200);

    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0]).toEqual(createResponse.body);
  });

  it('/cases/:id (GET) returns one case', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/cases')
      .send({
        title: 'Single case',
        description: 'Fetched by id',
      })
      .expect(201);

    return request(app.getHttpServer())
      .get(`/cases/${createResponse.body.id}`)
      .expect(200)
      .expect(createResponse.body);
  });

  it('/cases/:id (PATCH) updates a case', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/cases')
      .send({
        title: 'Before update',
        description: 'Original description',
      })
      .expect(201);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/cases/${createResponse.body.id}`)
      .send({ title: 'After update' })
      .expect(200);

    expect(updateResponse.body).toEqual({
      ...createResponse.body,
      title: 'After update',
      updatedAt: expect.any(String),
    });
  });

  it('/cases/:id (DELETE) removes a case', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/cases')
      .send({
        title: 'Delete me',
        description: 'Temporary case',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/cases/${createResponse.body.id}`)
      .expect(200)
      .expect({
        deleted: true,
        id: createResponse.body.id,
      });

    return request(app.getHttpServer())
      .get(`/cases/${createResponse.body.id}`)
      .expect(404);
  });

  it('/cases (POST) validates required fields', () => {
    return request(app.getHttpServer())
      .post('/cases')
      .send({ title: 'Missing description' })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('description is required');
      });
  });

  it('/ai/health (GET) exposes provider readiness', () => {
    return request(app.getHttpServer()).get('/ai/health').expect(200).expect({
      provider: 'groq',
      configured: true,
    });
  });

  it('/ai/generate-case (POST) returns the Groq draft response', async () => {
    const response = await request(app.getHttpServer())
      .post('/ai/generate-case')
      .send({ prompt: 'Generate a signup troubleshooting case' })
      .expect(201);

    expect(response.body).toEqual({
      model: 'test-model',
      text: 'draft:Generate a signup troubleshooting case',
    });
    expect(groqServiceMock.generateCaseDraft).toHaveBeenCalledWith(
      'Generate a signup troubleshooting case',
    );
  });

  it('/ai/generate-case (POST) rejects an empty prompt', () => {
    return request(app.getHttpServer())
      .post('/ai/generate-case')
      .send({ prompt: '   ' })
      .expect(400)
      .expect((response) => {
        expect(response.body).toEqual({
          statusCode: 400,
          message: 'Prompt is required',
          path: '/ai/generate-case',
          timestamp: expect.any(String),
        });
      });
  });

  it('/ai/generate-cards (POST) accepts a document and returns cards with PDF data', async () => {
    const response = await request(app.getHttpServer())
      .post('/ai/generate-cards')
      .field('prompt', 'Turn this into clue cards')
      .attach(
        'document',
        Buffer.from('Players need to inspect a suspicious login report.'),
        {
          filename: 'brief.txt',
          contentType: 'text/plain',
        },
      )
      .expect(201);

    expect(response.body).toEqual({
      model: 'test-model',
      sourceTextLength: 50,
      cards: [
        {
          id: 'card-1',
          type: 'clue',
          title: 'Read the document',
          front: 'What does the source document ask players to notice?',
          back: 'The document describes a playable investigation clue.',
          source: 'brief.txt',
        },
      ],
      pdf: {
        filename: 'game-cards.pdf',
        contentType: 'application/pdf',
        base64: expect.any(String),
      },
    });
    expect(
      Buffer.from(response.body.pdf.base64, 'base64').toString('latin1'),
    ).toContain('%PDF-1.4');
    expect(groqServiceMock.generateCardsFromDocument).toHaveBeenCalledWith(
      'Players need to inspect a suspicious login report.',
      'Turn this into clue cards',
    );
  });

  it('/ai/generate-cards/pdf (POST) returns a PDF file', async () => {
    const response = await request(app.getHttpServer())
      .post('/ai/generate-cards/pdf')
      .attach('document', Buffer.from('Create a short game card deck.'), {
        filename: 'brief.txt',
        contentType: 'text/plain',
      })
      .expect(201);

    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="game-cards.pdf"',
    );
    expect(response.body.toString('latin1')).toContain('%PDF-1.4');
  });

  it('/health (GET) mirrors backend status for load balancers', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({
      name: 'case-gen_api',
      auth: 'disabled',
      database: 'in-memory',
      ai: 'groq',
    });
  });
});
