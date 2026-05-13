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
                  key: 'card-1',
                  type: 'clue',
                  title: 'Check the log',
                  front: 'Players inspect an error log.',
                  back: 'The timestamp points to a failed import.',
                  source: 'Incident brief',
                  allowedNext: ['card-2'],
                  isEnding: false,
                },
                {
                  key: 'card-2',
                  type: 'decision',
                  title: 'Escalate the incident',
                  front: 'The team decides whether to escalate.',
                  back: 'Escalating unlocks the recovery flow.',
                  source: 'Incident brief',
                  allowedNext: [],
                  isEnding: true,
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
          key: 'card-1',
          type: 'clue',
          title: 'Check the log',
          front: 'Players inspect an error log.',
          back: 'The timestamp points to a failed import.',
          source: 'Incident brief',
          allowedNextCardKeys: ['card-2'],
          allowedNextCardIds: [expect.any(String)],
          isEnding: false,
        },
        {
          id: expect.any(String),
          key: 'card-2',
          type: 'decision',
          title: 'Escalate the incident',
          front: 'The team decides whether to escalate.',
          back: 'Escalating unlocks the recovery flow.',
          source: 'Incident brief',
          allowedNextCardKeys: [],
          allowedNextCardIds: [],
          isEnding: true,
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

  it('falls back to the next card when the AI omits branching data', async () => {
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
                  title: 'Card one',
                  front: 'Front one',
                  back: 'Back one',
                },
                {
                  title: 'Card two',
                  front: 'Front two',
                  back: 'Back two',
                },
              ],
            }),
          },
        },
      ],
    }));

    (service as any).client = { chat: { completions: { create } } };

    const result = await service.generateCardsFromDocument('Document text');

    expect(result.cards[0]).toEqual(
      expect.objectContaining({
        key: 'card-1',
        allowedNextCardKeys: ['card-2'],
        allowedNextCardIds: [expect.any(String)],
        isEnding: false,
      }),
    );
    expect(result.cards[1]).toEqual(
      expect.objectContaining({
        key: 'card-2',
        allowedNextCardKeys: [],
        allowedNextCardIds: [],
        isEnding: true,
      }),
    );
  });

  it('summarizes long documents before generating cards', async () => {
    const service = new GroqService(
      createConfigService({
        GROQ_API_KEY: 'test-key',
        GROQ_MODEL: 'test-model',
      }),
    );
    const create = jest
      .fn()
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content:
                '- Chunk 1 summary: card 1 can go to card 2 or card 4.',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '- Chunk 2 summary: card 4 can go to card 5.',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                cards: [
                  {
                    key: 'card-1',
                    type: 'decision',
                    title: 'Start',
                    front: 'Choose a path.',
                    back: 'Two valid next moves exist.',
                    allowedNext: ['card-2', 'card-4'],
                  },
                  {
                    key: 'card-2',
                    type: 'event',
                    title: 'Path A',
                    front: 'Take the first branch.',
                    back: 'This branch ends here.',
                    allowedNext: [],
                    isEnding: true,
                  },
                  {
                    key: 'card-4',
                    type: 'event',
                    title: 'Path B',
                    front: 'Take the second branch.',
                    back: 'Continue to the follow-up.',
                    allowedNext: ['card-5'],
                  },
                  {
                    key: 'card-5',
                    type: 'event',
                    title: 'Finish',
                    front: 'Close the branch.',
                    back: 'This branch ends here.',
                    allowedNext: [],
                    isEnding: true,
                  },
                ],
              }),
            },
          },
        ],
      });

    (service as any).client = { chat: { completions: { create } } };

    const longText = `${'A'.repeat(4_500)} ${'B'.repeat(4_500)}`;
    const result = await service.generateCardsFromDocument(
      longText,
      'Preserve game flow',
    );

    expect(create).toHaveBeenCalledTimes(3);
    expect(create.mock.calls[0][0].messages[1].content).toContain(
      'Summarize chunk 1 of 2.',
    );
    expect(create.mock.calls[1][0].messages[1].content).toContain(
      'Summarize chunk 2 of 2.',
    );
    expect(create.mock.calls[2][0].messages[1].content).toContain(
      'Chunk 1 summary',
    );
    expect(create.mock.calls[2][0].messages[1].content).not.toContain(
      longText.slice(0, 500),
    );
    expect(result.cards[0]).toEqual(
      expect.objectContaining({
        key: 'card-1',
        allowedNextCardKeys: ['card-2', 'card-4'],
      }),
    );
  });
});
