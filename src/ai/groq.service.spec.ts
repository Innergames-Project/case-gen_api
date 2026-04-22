import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GroqService } from './groq.service';

describe('GroqService', () => {
  const createConfigService = (values: Record<string, string | undefined>) =>
    ({
      get: jest.fn((key: string) => values[key]),
    }) as unknown as ConfigService;

  it('reports not configured without an API key', () => {
    const service = new GroqService(
      createConfigService({ GROQ_API_KEY: undefined }),
    );

    expect(service.isConfigured()).toBe(false);
  });

  it('rejects blank prompts before trying to call Groq', async () => {
    const service = new GroqService(
      createConfigService({ GROQ_API_KEY: undefined }),
    );

    await expect(service.generateCaseDraft('   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('fails clearly when Groq is not configured', async () => {
    const service = new GroqService(
      createConfigService({ GROQ_API_KEY: undefined }),
    );

    await expect(
      service.generateCaseDraft('Generate a customer support case'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects blank document text before generating cards', async () => {
    const service = new GroqService(
      createConfigService({ GROQ_API_KEY: undefined }),
    );

    await expect(
      service.generateCardsFromDocument('   '),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('normalizes AI JSON into game cards', async () => {
    const service = new GroqService(
      createConfigService({
        GROQ_API_KEY: 'test-key',
        GROQ_MODEL: 'test-model',
      }),
    );
    const create = jest.fn(async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              cards: [
                {
                  type: 'clue',
                  title: 'Check the log',
                  front: 'Players inspect an error log.',
                  back: 'The timestamp points to a failed import.',
                  source: 'Incident brief',
                },
              ],
            }),
          },
        },
      ],
    }));

    (service as any).client = { chat: { completions: { create } } };

    await expect(
      service.generateCardsFromDocument('Source document text', 'Make clues'),
    ).resolves.toEqual({
      model: 'test-model',
      sourceTextLength: 'Source document text'.length,
      cards: [
        {
          id: expect.any(String),
          type: 'clue',
          title: 'Check the log',
          front: 'Players inspect an error log.',
          back: 'The timestamp points to a failed import.',
          source: 'Incident brief',
        },
      ],
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test-model',
        temperature: 0.35,
      }),
    );
  });
});
