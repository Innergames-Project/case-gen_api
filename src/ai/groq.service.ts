import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

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

  async generateCaseDraft(prompt: string) {
    if (!prompt.trim()) {
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
          content: prompt,
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
}
