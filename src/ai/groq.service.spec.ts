import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
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
});
