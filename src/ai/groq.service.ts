import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import type { GeneratedCardsResult, GameCard } from './types/game-card.type';

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

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: [
            'You convert source documents into playable game cards.',
            'Return only valid JSON.',
            'The JSON shape must be {"cards":[{"type":"challenge|clue|event|decision","title":"short title","front":"player-facing text","back":"answer, resolution, or facilitator notes","source":"short source reference"}]}.',
            'Create between 6 and 12 concise cards unless the source is very short.',
          ].join(' '),
        },
        {
          role: 'user',
          content: `${instruction}\n\nSOURCE DOCUMENT:\n${sourceText}`,
        },
      ],
      temperature: 0.35,
    });

    const content = response.choices[0]?.message?.content ?? '';
    const cards = this.parseCards(content);

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

  private parseCards(content: string): GameCard[] {
    const parsed = this.parseJson(content);
    const rawCards = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.cards)
        ? parsed.cards
        : [];

    const cards = rawCards
      .map((card: unknown, index: number) => this.toGameCard(card, index))
      .filter((card): card is GameCard => card !== null);

    if (cards.length === 0) {
      throw new BadRequestException(
        'AI response did not include any valid game cards',
      );
    }

    return cards;
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

  private toGameCard(value: unknown, index: number): GameCard | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const record = value as Record<string, unknown>;
    const title = this.readCardText(record.title);
    const front = this.readCardText(record.front);
    const back = this.readCardText(record.back);

    if (!title || !front || !back) {
      return null;
    }

    return {
      id: crypto.randomUUID(),
      type: this.readCardText(record.type) || `card-${index + 1}`,
      title,
      front,
      back,
      source: this.readCardText(record.source),
    };
  }

  private readCardText(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
}
