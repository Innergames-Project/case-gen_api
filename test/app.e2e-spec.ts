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
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({
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
});
