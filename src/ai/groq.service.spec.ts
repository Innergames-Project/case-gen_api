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

  describe('generateCaseDescription', () => {
    it('fails clearly when Groq is not configured', async () => {
      const service = new GroqService(
        createConfigService({ GROQ_API_KEY: undefined }),
      );

      await expect(
        service.generateCaseDescription('Mary has a drug addiction'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('returns title and description from valid AI response', async () => {
      const service = new GroqService(
        createConfigService({ GROQ_API_KEY: 'test-key', GROQ_MODEL: 'test-model' }),
      );

      const create = jest.fn(async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: 'Mary and the Road to Recovery',
                description: 'Mary is a 34-year-old woman living in Amsterdam...',
              }),
            },
          },
        ],
      }));

      (service as any).client = { chat: { completions: { create } } };

      const result = await service.generateCaseDescription('Mary has a drug addiction');

      expect(result).toEqual({
        title: 'Mary and the Road to Recovery',
        description: 'Mary is a 34-year-old woman living in Amsterdam...',
      });
    });

    it('throws when AI returns unexpected format', async () => {
      const service = new GroqService(
        createConfigService({ GROQ_API_KEY: 'test-key', GROQ_MODEL: 'test-model' }),
      );

      const create = jest.fn(async () => ({
        choices: [{ message: { content: '{"wrong": "shape"}' } }],
      }));

      (service as any).client = { chat: { completions: { create } } };

      await expect(
        service.generateCaseDescription('some input'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('generateCaseCards', () => {
    it('fails clearly when Groq is not configured', async () => {
      const service = new GroqService(
        createConfigService({ GROQ_API_KEY: undefined }),
      );

      await expect(
        service.generateCaseCards('Mary is a 34-year-old...'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('normalizes valid AI card response', async () => {
      const service = new GroqService(
        createConfigService({ GROQ_API_KEY: 'test-key', GROQ_MODEL: 'test-model' }),
      );

      const validPayload = {
        difficulty: 'easy',
        stepCards: [
          {
            step: 1,
            scenarioText: 'Mary arrives at the social services office.',
            choices: [
              { key: 'A', text: 'Listen to her story first.', consequenceCardKey: '1A' },
              { key: 'B', text: 'Ask about housing immediately.', consequenceCardKey: '1B' },
            ],
          },
        ],
        consequenceCards: [
          {
            key: '1A',
            step: 1,
            consequenceText: 'You take time to understand the full situation.',
            interventions: [
              { domain: 'Social cohesion', formality: 'informal', scope: 'individual' },
              { domain: 'Human dignity', formality: 'formal', scope: 'individual' },
              { domain: 'Social empowerment', formality: 'informal', scope: 'collective' },
            ],
            nextStep: 2,
            isEnding: false,
            isWin: false,
          },
          {
            key: '1B',
            step: 1,
            consequenceText: 'Focusing on housing skips important rapport-building.',
            interventions: [
              { domain: 'Socioeconomic security', formality: 'formal', scope: 'individual' },
              { domain: 'Justice', formality: 'formal', scope: 'collective' },
              { domain: 'Equality', formality: 'informal', scope: 'individual' },
            ],
            nextStep: 2,
            isEnding: false,
            isWin: false,
          },
        ],
      };

      const create = jest.fn(async () => ({
        choices: [{ message: { content: JSON.stringify(validPayload) } }],
      }));

      (service as any).client = { chat: { completions: { create } } };

      const result = await service.generateCaseCards('Mary is a 34-year-old...');

      expect(result.difficulty).toBe('easy');
      expect(result.stepCards).toHaveLength(1);
      expect(result.stepCards[0].choices).toHaveLength(2);
      expect(result.consequenceCards).toHaveLength(2);
      expect(result.consequenceCards[0].interventions).toHaveLength(3);
    });

    it('falls back to medium difficulty when AI returns unknown value', async () => {
      const service = new GroqService(
        createConfigService({ GROQ_API_KEY: 'test-key', GROQ_MODEL: 'test-model' }),
      );

      const payload = {
        difficulty: 'unknown-value',
        stepCards: [
          {
            step: 1,
            scenarioText: 'Scenario.',
            choices: [{ key: 'A', text: 'Choice A', consequenceCardKey: '1A' }],
          },
        ],
        consequenceCards: [
          {
            key: '1A',
            step: 1,
            consequenceText: 'Consequence.',
            interventions: [
              { domain: 'Social cohesion', formality: 'informal', scope: 'individual' },
              { domain: 'Solidarity', formality: 'formal', scope: 'collective' },
              { domain: 'Equality', formality: 'informal', scope: 'individual' },
            ],
            nextStep: null,
            isEnding: true,
            isWin: true,
          },
        ],
      };

      const create = jest.fn(async () => ({
        choices: [{ message: { content: JSON.stringify(payload) } }],
      }));

      (service as any).client = { chat: { completions: { create } } };

      const result = await service.generateCaseCards('Some case description');
      expect(result.difficulty).toBe('medium');
    });

    it('throws when a choice references a missing consequence card', async () => {
      const service = new GroqService(
        createConfigService({ GROQ_API_KEY: 'test-key', GROQ_MODEL: 'test-model' }),
      );

      const brokenPayload = {
        difficulty: 'easy',
        stepCards: [
          {
            step: 1,
            scenarioText: 'Scenario.',
            choices: [
              { key: 'A', text: 'Choice A', consequenceCardKey: 'MISSING' },
            ],
          },
        ],
        consequenceCards: [],
      };

      // First call: malformed payload. Second call: repair still returns same broken JSON.
      const create = jest.fn(async () => ({
        choices: [{ message: { content: JSON.stringify(brokenPayload) } }],
      }));

      (service as any).client = { chat: { completions: { create } } };

      await expect(
        service.generateCaseCards('Some case'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
