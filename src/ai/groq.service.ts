import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import type { GeneratedCardsResult, GameCard } from './types/game-card.type';

const MAX_DIRECT_SOURCE_CHARS = 6_000;
const SUMMARY_CHUNK_CHARS = 4_000;
const MAX_SUMMARY_PASSES = 3;

@Injectable()
export class GroqService {
  private readonly model: string;
  // Null means the API key is missing, so the AI endpoints can fail explicitly.
  private readonly client: Groq | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    this.model =
      this.configService.get<string>('GROQ_MODEL') ?? 'openai/gpt-oss-20b';
    this.client = apiKey ? new Groq({ apiKey }) : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async generateCaseDraft(prompt: unknown) {
    if (typeof prompt !== 'string' || !prompt.trim()) {
      throw new BadRequestException('Prompt is required');
    }

    if (!this.client) {
      throw new ServiceUnavailableException(
        'Groq is not configured. Set GROQ_API_KEY first.',
      );
    }

    // All provider-specific prompting stays in one place so it can evolve independently.
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'You generate structured case drafts for a case generation product.',
        },
        {
          role: 'user',
          content: prompt.trim(),
        },
      ],
      temperature: 0.4,
    });

    return {
      model: this.model,
      // Return raw generated text for now; later this can become structured JSON.
      text: response.choices[0]?.message?.content ?? '',
    };
  }

  async generateCardsFromDocument(
    documentText: unknown,
    prompt?: unknown,
  ): Promise<GeneratedCardsResult> {
    const sourceText = this.readRequiredText(documentText, 'Document text');
    const instruction =
      typeof prompt === 'string' && prompt.trim()
        ? prompt.trim()
        : 'Create a balanced set of game cards from this document.';

    if (!this.client) {
      throw new ServiceUnavailableException(
        'Groq is not configured. Set GROQ_API_KEY first.',
      );
    }

    const preparedSource = await this.prepareSourceForCardGeneration(
      sourceText,
      instruction,
    );
    const response = await this.createChatCompletion([
      {
        role: 'system',
        content: [
          'You convert source documents into playable game cards.',
          'Return only valid JSON.',
          'Preserve the game logic from the source, especially branching, prerequisites, and valid next moves.',
          'The JSON shape must be {"cards":[{"key":"card-1","type":"challenge|clue|event|decision","title":"short title","front":"player-facing text","back":"answer, resolution, or facilitator notes","source":"short source reference","allowedNext":["card-2","card-5"],"isEnding":false}]}.',
          'Use stable card keys such as card-1, card-2, card-3 so links between cards are explicit.',
          'If a card can lead to multiple valid next cards, list only those allowed cards in allowedNext.',
          'If a card is an ending, return an empty allowedNext array and set isEnding to true.',
          'Create between 6 and 12 concise cards unless the source is very short.',
        ].join(' '),
      },
      {
        role: 'user',
        content: `${instruction}\n\nSOURCE DOCUMENT:\n${preparedSource}`,
      },
    ]);

    const content = response.choices[0]?.message?.content ?? '';
    const cards = await this.parseCards(content);

    return {
      model: this.model,
      cards,
      sourceTextLength: sourceText.length,
    };
  }

  private readRequiredText(value: unknown, field: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} is required`);
    }

    return value.trim();
  }

  private async prepareSourceForCardGeneration(
    sourceText: string,
    instruction: string,
  ): Promise<string> {
    if (sourceText.length <= MAX_DIRECT_SOURCE_CHARS) {
      return sourceText;
    }

    let workingText = sourceText;

    for (let pass = 0; pass < MAX_SUMMARY_PASSES; pass += 1) {
      const chunks = this.splitTextIntoChunks(workingText, SUMMARY_CHUNK_CHARS);

      if (chunks.length <= 1 && workingText.length <= MAX_DIRECT_SOURCE_CHARS) {
        return workingText;
      }

      const summaries: string[] = [];

      for (let index = 0; index < chunks.length; index += 1) {
        const summary = await this.summarizeChunkForCards(
          chunks[index],
          index,
          chunks.length,
          instruction,
        );
        summaries.push(summary);
      }

      workingText = this.cleanSummaryText(summaries.join('\n\n'));

      if (workingText.length <= MAX_DIRECT_SOURCE_CHARS) {
        return workingText;
      }
    }

    return workingText.slice(0, MAX_DIRECT_SOURCE_CHARS);
  }

  private splitTextIntoChunks(value: string, maxChars: number): string[] {
    const text = value.trim();

    if (text.length <= maxChars) {
      return [text];
    }

    const chunks: string[] = [];
    let cursor = 0;

    while (cursor < text.length) {
      let end = Math.min(cursor + maxChars, text.length);

      if (end < text.length) {
        const paragraphBreak = text.lastIndexOf('\n\n', end);
        const lineBreak = text.lastIndexOf('\n', end);
        const sentenceBreak = text.lastIndexOf('. ', end);
        const spaceBreak = text.lastIndexOf(' ', end);
        const candidateBreaks = [
          paragraphBreak,
          lineBreak,
          sentenceBreak >= cursor ? sentenceBreak + 1 : -1,
          spaceBreak,
        ].filter((point) => point > cursor + Math.floor(maxChars * 0.6));

        if (candidateBreaks.length > 0) {
          end = Math.max(...candidateBreaks);
        }
      }

      chunks.push(text.slice(cursor, end).trim());
      cursor = end;
    }

    return chunks.filter(Boolean);
  }

  private async summarizeChunkForCards(
    chunk: string,
    index: number,
    totalChunks: number,
    instruction: string,
  ): Promise<string> {
    const response = await this.createChatCompletion(
      [
        {
          role: 'system',
          content: [
            'You condense long source documents for a branching card game generator.',
            'Return plain text only.',
            'Keep only gameplay-relevant facts, sequence, branches, prerequisites, actors, consequences, and endings.',
            'Preserve explicit next-step logic and allowed transitions whenever they appear.',
            'Use at most 8 short bullet points.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            `Original generation instruction: ${instruction}`,
            `Summarize chunk ${index + 1} of ${totalChunks}.`,
            'Focus on decisions, branching paths, valid next moves, and end states.',
            'SOURCE CHUNK:',
            chunk,
          ].join('\n\n'),
        },
      ],
      0.2,
    );

    return response.choices[0]?.message?.content?.trim() ?? '';
  }

  private cleanSummaryText(value: string): string {
    return value.replace(/\n{3,}/g, '\n\n').trim();
  }

  private async createChatCompletion(
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    temperature = 0.35,
  ) {
    return this.client!.chat.completions.create({
      model: this.model,
      messages,
      temperature,
    });
  }

  private async parseCards(content: string): Promise<GameCard[]> {
    const parsed =
      this.parseJson(content) ??
      this.parseJson(await this.repairCardsPayload(content));
    const rawCards = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.cards)
        ? parsed.cards
        : [];

    return this.normalizeCards(rawCards);
  }

  private normalizeCards(rawCards: unknown[]): GameCard[] {
    const normalizedCards = rawCards
      .map((card: unknown, index: number) => this.toDraftGameCard(card, index))
      .filter((card): card is DraftGameCard => card !== null);
    const cards = this.resolveCardLinks(normalizedCards);

    if (cards.length === 0) {
      throw new BadRequestException(
        'AI response did not include any valid game cards',
      );
    }

    return cards;
  }

  private async repairCardsPayload(content: string): Promise<string> {
    if (!content.trim()) {
      return '';
    }

    const response = await this.createChatCompletion(
      [
        {
          role: 'system',
          content: [
            'You repair malformed card-generation responses.',
            'Return only valid JSON.',
            'The JSON shape must be {"cards":[{"key":"card-1","type":"challenge|clue|event|decision","title":"short title","front":"player-facing text","back":"answer, resolution, or facilitator notes","source":"short source reference","allowedNext":["card-2"],"isEnding":false}]}.',
            'If the source already contains card content, preserve it and only normalize the structure.',
          ].join(' '),
        },
        {
          role: 'user',
          content: `Convert this response into valid card JSON:\n\n${content}`,
        },
      ],
      0.1,
    );

    return response.choices[0]?.message?.content?.trim() ?? '';
  }

  private parseJson(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);

      if (!jsonMatch) {
        return null;
      }

      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
  }

  private toDraftGameCard(
    value: unknown,
    index: number,
  ): DraftGameCard | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const record = value as Record<string, unknown>;
    const key = this.readCardKey(record.key) || `card-${index + 1}`;
    const title = this.readCardText(record.title);
    const front = this.readCardText(record.front);
    const back = this.readCardText(record.back);

    if (!title || !front || !back) {
      return null;
    }

    return {
      key,
      type: this.readCardText(record.type) || `card-${index + 1}`,
      title,
      front,
      back,
      source: this.readCardText(record.source),
      allowedNextCardKeys: this.readAllowedNextCardKeys(record),
      isEnding:
        this.readBoolean(record.isEnding) ??
        this.readBoolean(record.ending) ??
        false,
    };
  }

  private readCardText(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private readCardKey(value: unknown): string | undefined {
    const text = this.readCardText(value);

    return text?.replace(/\s+/g, '-').toLowerCase();
  }

  private readAllowedNextCardKeys(record: Record<string, unknown>): string[] {
    const candidate =
      record.allowedNext ??
      record.allowedNextCardKeys ??
      record.nextCards ??
      record.nextCardKeys;

    if (!Array.isArray(candidate)) {
      return [];
    }

    return candidate
      .map((value) => this.readCardKey(value))
      .filter((value): value is string => Boolean(value));
  }

  private readBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
  }

  private resolveCardLinks(cards: DraftGameCard[]): GameCard[] {
    const keyToId = new Map<string, string>();

    cards.forEach((card) => {
      keyToId.set(card.key, crypto.randomUUID());
    });

    return cards.map((card, index) => {
      const fallbackNextKey =
        !card.isEnding && index < cards.length - 1 ? cards[index + 1].key : null;
      const requestedNextKeys =
        card.allowedNextCardKeys.length > 0
          ? card.allowedNextCardKeys
          : fallbackNextKey
            ? [fallbackNextKey]
            : [];
      const validNextKeys = Array.from(
        new Set(
          requestedNextKeys.filter(
            (nextKey) => nextKey !== card.key && keyToId.has(nextKey),
          ),
        ),
      );

      return {
        id: keyToId.get(card.key)!,
        key: card.key,
        type: card.type,
        title: card.title,
        front: card.front,
        back: card.back,
        source: card.source,
        allowedNextCardKeys: validNextKeys,
        allowedNextCardIds: validNextKeys
          .map((nextKey) => keyToId.get(nextKey))
          .filter((nextId): nextId is string => Boolean(nextId)),
        isEnding: card.isEnding || validNextKeys.length === 0,
      };
    });
  }
}

interface DraftGameCard {
  key: string;
  type: string;
  title: string;
  front: string;
  back: string;
  source?: string;
  allowedNextCardKeys: string[];
  isEnding: boolean;
}
