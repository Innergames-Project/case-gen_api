import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import type {
  CaseDifficulty,
  ConsequenceCard,
  GeneratedCardsResult,
  InterventionDomain,
  InterventionFormality,
  InterventionScope,
  InterventionTag,
  StepCard,
} from './types/game-card.type';
import { ALL_INTERVENTION_DOMAINS } from './types/game-card.type';

const MAX_DIRECT_SOURCE_CHARS = 6_000;
const SUMMARY_CHUNK_CHARS = 4_000;
const MAX_SUMMARY_PASSES = 3;

const CASE_DIFFICULTIES: CaseDifficulty[] = ['easy', 'medium', 'hard'];

const CASE_DESCRIPTION_SYSTEM_PROMPT = `You are an expert social work case author for the Sociality educational card game.

Given raw input about a person or situation, produce a detailed, realistic case profile that social work students can engage with.

The profile must cover:
- Full personal background: name, age, gender, family composition, living situation
- School or professional context: school name, grade or job, daily schedule, relationship with teachers or colleagues
- Social network: close friends (named), family relationships, neighbours, community ties
- Daily routine and habits
- Hobbies, interests, and strengths
- The presenting problem(s) in detail
- Emotional state and inner world: feelings, fears, hopes, self-image
- Relevant history: past events that shaped the current situation
- Neighbourhood or community context: where they live, what resources exist or are lacking

If the input is sparse, invent realistic and consistent details that fit the social work context. Never contradict information provided by the user.

You must respond with valid JSON only. No markdown, no code fences, no explanation — just the raw JSON object:
{"title":"Short descriptive case title (max 8 words)","description":"Rich narrative description (400–700 words)"}`;

const CARD_GENERATION_SYSTEM_PROMPT = `You generate card sets for the Sociality social work educational card game.

GAME OVERVIEW:
Players work through a real social work case across 6 steps. They make choices at each step, collect intervention cards, and must reach the final step having collected all 8 intervention domains to win.

CARD STRUCTURE:
- 6 step cards (step 1 through 6), each presenting the case situation at that point
- Each step card has 2–5 labelled choices (A, B, C, D, E)
- Each choice leads to exactly one consequence card (e.g. "1A", "3C")
- Each consequence card assigns exactly 3 intervention tags and points to the next step (or ends the game)

THE 8 INTERVENTION DOMAINS (these are the domains players collect):
1. Socioeconomic security
2. Justice
3. Social cohesion
4. Solidarity
5. Social inclusion
6. Equality
7. Social empowerment
8. Human dignity

Each intervention tag has exactly 3 properties:
- domain: one of the 8 above
- formality: "formal" or "informal"
- scope: "individual" or "collective"

THE SIX-STEP SOCIAL WORK MODEL (structure each step around this):
1. Situation Analysis — understanding the case
2. Problem Definition — naming the core issue
3. Goal Setting — agreeing on what to work toward
4. Intervention Planning — choosing an approach
5. Implementation — carrying out the intervention
6. Evaluation & Reflection — assessing what happened

WINNING CONDITIONS:
- Players win by reaching step 6 AND having collected all 8 domains across their chosen path
- There is one "perfect path": a sequence of choices that covers all 8 domains
- Other paths lead to "learning endings" (dead paths) — they are not wrong, just incomplete
- Some cases may have multiple win endings at step 6 (6A, 6B, etc.) if multiple paths converge on a win

DIFFICULTY:
- easy: correct choices are intuitive, obvious from common sense
- medium: requires basic knowledge of Social Quality theory to identify optimal choices
- hard: requires deep understanding of all 8 domains and their interplay

DESIGN RULES:
- The perfect path must collect all 8 domains exactly once with no duplicates
- Non-perfect paths may repeat domains or miss some, causing a learning ending
- Every consequenceCardKey in a step card's choices must match a key in consequenceCards
- nextStep must be null when isEnding is true
- Exactly one consequence card must have isWin: true (the final win card)
- Learning ending cards have isEnding: true, isWin: false
- All non-ending consequence cards must have a valid nextStep (2–6)

You must respond with valid JSON only. No markdown, no code fences, no explanation — just the raw JSON object matching this exact schema:
{
  "difficulty": "easy|medium|hard",
  "stepCards": [
    {
      "step": 1,
      "scenarioText": "Narrative description of the situation at this point in the case (2–4 sentences)",
      "choices": [
        {
          "key": "A",
          "text": "Short description of this intervention choice (1–2 sentences)",
          "consequenceCardKey": "1A"
        }
      ]
    }
  ],
  "consequenceCards": [
    {
      "key": "1A",
      "step": 1,
      "consequenceText": "Explanation of what this choice means theoretically and what happens in practice as a result (2–3 sentences)",
      "interventions": [
        { "domain": "Social cohesion", "formality": "informal", "scope": "collective" },
        { "domain": "Solidarity", "formality": "formal", "scope": "individual" },
        { "domain": "Equality", "formality": "informal", "scope": "collective" }
      ],
      "nextStep": 2,
      "isEnding": false,
      "isWin": false
    }
  ]
}`;

@Injectable()
export class GroqService {
  private readonly model: string;
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

  async generateCaseDescription(
    userInput: string,
  ): Promise<{ title: string; description: string }> {
    this.requireClient();

    const response = await this.createChatCompletion(
      [
        { role: 'system', content: CASE_DESCRIPTION_SYSTEM_PROMPT },
        { role: 'user', content: userInput.trim() },
      ],
      0.7,
    );

    const content = response.choices[0]?.message?.content ?? '';
    let parsed = this.parseJson(content);

    const isValidShape = (p: any) =>
      p && typeof p.title === 'string' && typeof p.description === 'string';

    if (!isValidShape(parsed)) {
      const repaired = await this.repairCaseDescriptionPayload(content);
      parsed = this.parseJson(repaired);
    }

    if (!isValidShape(parsed)) {
      console.error('[GroqService] generateCaseDescription raw response:', content);
      throw new BadRequestException(
        'AI returned an unexpected format for the case description',
      );
    }

    return {
      title: parsed.title.trim(),
      description: parsed.description.trim(),
    };
  }

  async generateCaseCards(
    caseDescription: string,
    difficulty?: CaseDifficulty,
  ): Promise<GeneratedCardsResult> {
    this.requireClient();

    const difficultyInstruction = difficulty
      ? `Generate a ${difficulty} difficulty case.`
      : 'Choose an appropriate difficulty for this case.';

    const response = await this.createChatCompletion(
      [
        { role: 'system', content: CARD_GENERATION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${difficultyInstruction}\n\nCASE:\n${caseDescription.trim()}`,
        },
      ],
      0.4,
    );

    const content = response.choices[0]?.message?.content ?? '';
    return this.parseCardsResult(content);
  }

  private async parseCardsResult(content: string): Promise<GeneratedCardsResult> {
    let parsed = this.parseJson(content);

    // Attempt repair if: JSON is invalid OR valid but missing the expected keys.
    const needsRepair = !parsed || !Array.isArray(parsed.stepCards) || parsed.stepCards.length === 0;
    if (needsRepair) {
      parsed = this.parseJson(await this.repairCardsPayload(content)) ?? parsed;
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new BadRequestException('AI did not return a valid card set');
    }

    const difficulty = this.readDifficulty(parsed.difficulty);
    const stepCards = this.normalizeStepCards(parsed.stepCards);
    const consequenceCards = this.normalizeConsequenceCards(parsed.consequenceCards);

    this.validateCardLinks(stepCards, consequenceCards);

    return { model: this.model, difficulty, stepCards, consequenceCards };
  }

  private readDifficulty(value: unknown): CaseDifficulty {
    if (typeof value === 'string' && CASE_DIFFICULTIES.includes(value as CaseDifficulty)) {
      return value as CaseDifficulty;
    }
    return 'medium';
  }

  private normalizeStepCards(raw: unknown): StepCard[] {
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new BadRequestException('AI returned no step cards');
    }

    return raw.map((item: unknown, index: number) => {
      if (!item || typeof item !== 'object') {
        throw new BadRequestException(`Step card at index ${index} is invalid`);
      }

      const record = item as Record<string, unknown>;
      const step = typeof record.step === 'number' ? record.step : index + 1;
      const scenarioText = this.requireString(record.scenarioText, `step ${step} scenarioText`);
      const choices = this.normalizeChoices(record.choices, step);

      return { step, scenarioText, choices };
    });
  }

  private normalizeChoices(raw: unknown, step: number): StepCard['choices'] {
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new BadRequestException(`Step ${step} has no choices`);
    }

    return raw.map((item: unknown, index: number) => {
      if (!item || typeof item !== 'object') {
        throw new BadRequestException(`Choice ${index} in step ${step} is invalid`);
      }

      const record = item as Record<string, unknown>;
      return {
        key: this.requireString(record.key, `step ${step} choice key`),
        text: this.requireString(record.text, `step ${step} choice text`),
        consequenceCardKey: this.requireString(record.consequenceCardKey, `step ${step} consequenceCardKey`),
      };
    });
  }

  private normalizeConsequenceCards(raw: unknown): ConsequenceCard[] {
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new BadRequestException('AI returned no consequence cards');
    }

    return raw.map((item: unknown, index: number) => {
      if (!item || typeof item !== 'object') {
        throw new BadRequestException(`Consequence card at index ${index} is invalid`);
      }

      const record = item as Record<string, unknown>;
      const key = this.requireString(record.key, `consequence card ${index} key`);
      const step = typeof record.step === 'number' ? record.step : 1;
      const consequenceText = this.requireString(record.consequenceText, `${key} consequenceText`);
      const interventions = this.normalizeInterventions(record.interventions, key);
      const isEnding = Boolean(record.isEnding);
      const isWin = Boolean(record.isWin);
      const nextStep = isEnding ? null : (typeof record.nextStep === 'number' ? record.nextStep : null);

      return { key, step, consequenceText, interventions, nextStep, isEnding, isWin };
    });
  }

  private normalizeInterventions(raw: unknown, cardKey: string): InterventionTag[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((item: unknown) => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const domain = this.readDomain(record.domain);
        const formality = this.readFormality(record.formality);
        const scope = this.readScope(record.scope);
        if (!domain) return null;
        return { domain, formality, scope } satisfies InterventionTag;
      })
      .filter((tag): tag is InterventionTag => tag !== null)
      .slice(0, 3);
  }

  private readDomain(value: unknown): InterventionDomain | null {
    if (typeof value === 'string' && ALL_INTERVENTION_DOMAINS.includes(value as InterventionDomain)) {
      return value as InterventionDomain;
    }
    return null;
  }

  private readFormality(value: unknown): InterventionFormality {
    return value === 'formal' || value === 'informal' ? value : 'formal';
  }

  private readScope(value: unknown): InterventionScope {
    return value === 'individual' || value === 'collective' ? value : 'individual';
  }

  private validateCardLinks(stepCards: StepCard[], consequenceCards: ConsequenceCard[]): void {
    const consequenceKeys = new Set(consequenceCards.map((c) => c.key));

    for (const step of stepCards) {
      for (const choice of step.choices) {
        if (!consequenceKeys.has(choice.consequenceCardKey)) {
          throw new BadRequestException(
            `Choice ${choice.key} in step ${step.step} references missing consequence card "${choice.consequenceCardKey}"`,
          );
        }
      }
    }
  }

  private requireString(value: unknown, field: string): string {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    throw new BadRequestException(`AI returned invalid or missing "${field}"`);
  }

  private async repairCaseDescriptionPayload(content: string): Promise<string> {
    if (!content.trim()) return '';

    const response = await this.createChatCompletion(
      [
        {
          role: 'system',
          content: 'Extract or reformat the following content into this exact JSON: {"title":"short case title","description":"full narrative description"}. Return only valid JSON, no markdown, no extra text.',
        },
        {
          role: 'user',
          content,
        },
      ],
      0.1,
    );

    return response.choices[0]?.message?.content?.trim() ?? '';
  }

  private async repairCardsPayload(content: string): Promise<string> {
    if (!content.trim()) {
      return '';
    }

    const schema = `{"difficulty":"easy|medium|hard","stepCards":[{"step":1,"scenarioText":"...","choices":[{"key":"A","text":"...","consequenceCardKey":"1A"}]}],"consequenceCards":[{"key":"1A","step":1,"consequenceText":"...","interventions":[{"domain":"Social cohesion","formality":"formal","scope":"individual"}],"nextStep":2,"isEnding":false,"isWin":false}]}`;

    const response = await this.createChatCompletion(
      [
        {
          role: 'system',
          content: [
            'You convert card game content into a specific JSON schema.',
            'Return only valid JSON. No markdown, no explanation.',
            `Required schema: ${schema}`,
            'The 8 valid domains are: Socioeconomic security, Justice, Social cohesion, Solidarity, Social inclusion, Equality, Social empowerment, Human dignity.',
            'formality must be "formal" or "informal". scope must be "individual" or "collective".',
            'Preserve all narrative content from the source, only restructure the format.',
          ].join(' '),
        },
        {
          role: 'user',
          content: `Convert this into the required schema:\n\n${content}`,
        },
      ],
      0.1,
    );

    return response.choices[0]?.message?.content?.trim() ?? '';
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
            'You condense long source documents for a social work case generator.',
            'Return plain text only.',
            'Keep all facts about the person: background, problems, relationships, and context.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            `Original instruction: ${instruction}`,
            `Summarize chunk ${index + 1} of ${totalChunks}.`,
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

  private requireClient(): void {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Groq is not configured. Set GROQ_API_KEY first.',
      );
    }
  }
}
