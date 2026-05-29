import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import type {
  Aspect,
  CaseDifficulty,
  Condition,
  ConsequenceCard,
  GeneratedCardsResult,
  InterventionFormality,
  InterventionScope,
  InterventionTag,
  SocialValue,
  StepCard,
} from './types/game-card.type';
import {
  ALL_ASPECT_KEYS,
  ALL_CONDITIONS,
  ALL_VALUES,
  CONDITION_VALUE_MAP,
  aspectKey,
} from './types/game-card.type';

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

If the input is sparse, invent realistic and consistent details that fit the social work context. Treat all generated people as explicitly fictional. Never contradict information provided by the user.

You must respond with valid JSON only. No markdown, no code fences, no explanation — just the raw JSON object:
{"title":"Short descriptive case title (max 8 words)","description":"Rich narrative description (400–700 words)"}`;

const CARD_GENERATION_SYSTEM_PROMPT = `You generate card sets for the Sociality social work educational card game, which teaches the Social Quality (Sociale Kwaliteit) model.

GAME OVERVIEW:
Players work through a realistic social work case as a branching path of cards. Starting at card 1, they read the situation, discuss, and choose between intervention options (1A, 1B, ...). Each choice leads to one consequence card explaining the theory behind it and what happens in practice, then presents the next set of choices. This branching repeats until the path reaches an ending.

THE MODEL — FOUR CONDITIONS, EACH WITH A VALUE:
The Social Quality model has FOUR conditions that must be in order for people to be able to participate in society. Behind each condition sits a VALUE that forms the social worker's moral compass:
1. Socio-economic security — value: Social justice (the experience of "meedoen", taking part)
2. Social inclusion — value: Equality (gelijkwaardigheid; the experience of "mattering")
3. Social cohesion — value: Solidarity (the feeling of belonging)
4. Social empowerment — value: Human dignity (the room to be yourself)

THE 8 ASPECTS (these are the 8 squares on the board that must all be filled to win the theoretical goal):
The 4 conditions AND their 4 values together make 8 aspects:
- Conditions: Socio-economic security, Social inclusion, Social cohesion, Social empowerment
- Values: Social justice, Equality, Solidarity, Human dignity

THE TWO DIMENSIONS (every intervention sits on both axes):
- Dimension 1 — SCOPE: "individual" (micro: the person and their network) vs "collective" (meso/macro: groups, communities, organisations, policy)
- Dimension 2 — FORMALITY: "formal" (working via established methods, rules, procedures, protocols, professional codes) vs "informal" (flexible, free, close-by; outside the beaten paths)

CARD STRUCTURE:
- Step cards present the case situation at each point along the path.
- Each step card has 2–3 labelled choices (A, B, C).
- Each choice leads to exactly one consequence card (e.g. "1A", "3C").
- Each consequence card lays down exactly 3 "kaartjes": one ASPECT, plus a SCOPE and a FORMALITY.
- A consequence card either points to the next step OR is an ending.

WINNING — TWO CONDITIONS MUST BOTH BE MET:
- PRACTICAL: the path must successfully play out the case to a completing ending (the pawn reaches the finish line).
- THEORETICAL: across the chosen path, all 8 aspects must have been collected (all 8 board squares filled).
- A consequence card with isWin:true marks a completing ending whose path satisfies BOTH.
- MULTIPLE win endings are allowed and encouraged — there are several ways to win. Do not force a single winning path.
- Paths that reach an ending without covering all 8 aspects are "learning endings": isEnding:true, isWin:false. They are not wrong, just incomplete.

DESIGN RULES:
- At least one full path from card 1 to a win ending must collect all 8 aspects (each of the 8 at least once).
- A winning path should aim to cover the 8 aspects without wasteful gaps; learning paths may miss or repeat aspects.
- Every consequenceCardKey in a step card's choices must match a key in consequenceCards.
- nextStep must be null when isEnding is true, and a valid later step number otherwise.
- At least one consequence card must have isWin:true; there may be more than one.
- Win cards must have isEnding:true.

DIFFICULTY:
- easy: the path that covers all 8 aspects is intuitive from common sense.
- medium: identifying the covering path requires basic knowledge of Social Quality theory.
- hard: requires deep understanding of all 8 aspects, the two dimensions, and their interplay.

You must respond with valid JSON only. No markdown, no code fences, no explanation — just the raw JSON object matching this exact schema:
{
  "difficulty": "easy|medium|hard",
  "stepCards": [
    {
      "step": 1,
      "scenarioText": "Narrative description of the situation at this point (2–4 sentences)",
      "choices": [
        { "key": "A", "text": "Short description of this intervention choice (1–2 sentences)", "consequenceCardKey": "1A" }
      ]
    }
  ],
  "consequenceCards": [
    {
      "key": "1A",
      "step": 1,
      "consequenceText": "What this choice means theoretically and what happens in practice (2–3 sentences)",
      "interventions": [
        { "aspect": { "kind": "condition", "condition": "Social cohesion", "label": "Social cohesion" }, "scope": "collective", "formality": "informal" },
        { "aspect": { "kind": "value", "condition": "Social cohesion", "label": "Solidarity" }, "scope": "individual", "formality": "formal" },
        { "aspect": { "kind": "value", "condition": "Social inclusion", "label": "Equality" }, "scope": "collective", "formality": "informal" }
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
      console.error(
        '[GroqService] generateCaseDescription raw response:',
        content,
      );
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

  private async parseCardsResult(
    content: string,
  ): Promise<GeneratedCardsResult> {
    let parsed = this.parseJson(content);

    const needsRepair =
      !parsed ||
      !Array.isArray(parsed.stepCards) ||
      parsed.stepCards.length === 0;
    if (needsRepair) {
      parsed = this.parseJson(await this.repairCardsPayload(content)) ?? parsed;
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new BadRequestException('AI did not return a valid card set');
    }

    const difficulty = this.readDifficulty(parsed.difficulty);
    const stepCards = this.normalizeStepCards(parsed.stepCards);
    const consequenceCards = this.normalizeConsequenceCards(
      parsed.consequenceCards,
    );

    this.validateCardLinks(stepCards, consequenceCards);
    this.validateWinConditions(stepCards, consequenceCards);

    return { model: this.model, difficulty, stepCards, consequenceCards };
  }

  private readDifficulty(value: unknown): CaseDifficulty {
    if (
      typeof value === 'string' &&
      CASE_DIFFICULTIES.includes(value as CaseDifficulty)
    ) {
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
      const step = this.readNumber(record.step) ?? index + 1;
      const scenarioText = this.requireString(
        record.scenarioText,
        `step ${step} scenarioText`,
      );
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
        throw new BadRequestException(
          `Choice ${index} in step ${step} is invalid`,
        );
      }

      const record = item as Record<string, unknown>;
      return {
        key: this.requireString(record.key, `step ${step} choice key`),
        text: this.requireString(record.text, `step ${step} choice text`),
        consequenceCardKey: this.requireString(
          record.consequenceCardKey,
          `step ${step} consequenceCardKey`,
        ),
      };
    });
  }

  private normalizeConsequenceCards(raw: unknown): ConsequenceCard[] {
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new BadRequestException('AI returned no consequence cards');
    }

    return raw.map((item: unknown, index: number) => {
      if (!item || typeof item !== 'object') {
        throw new BadRequestException(
          `Consequence card at index ${index} is invalid`,
        );
      }

      const record = item as Record<string, unknown>;
      const key = this.requireString(record.key, `consequence card ${index} key`);
      const step = this.readNumber(record.step) ?? 1;
      const consequenceText = this.requireString(
        record.consequenceText,
        `${key} consequenceText`,
      );
      const interventions = this.normalizeInterventions(
        record.interventions,
        key,
      );
      const isEnding = Boolean(record.isEnding);
      const isWin = Boolean(record.isWin);
      const nextStep = isEnding
        ? null
        : typeof record.nextStep === 'number'
          ? record.nextStep
          : null;

      return {
        key,
        step,
        consequenceText,
        interventions,
        nextStep,
        isEnding,
        isWin,
      };
    });
  }

  private normalizeInterventions(
    raw: unknown,
    cardKey: string,
  ): InterventionTag[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((item: unknown) => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const aspect = this.readAspect(record.aspect);
        if (!aspect) return null;
        const scope = this.readScope(record.scope);
        const formality = this.readFormality(record.formality);
        return { aspect, scope, formality } satisfies InterventionTag;
      })
      .filter((tag): tag is InterventionTag => tag !== null)
      .slice(0, 3);
  }

  // Reads and validates an aspect, enforcing the condition<->value mapping.
  private readAspect(value: unknown): Aspect | null {
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;

    const kind = record.kind;
    const condition = record.condition;
    const label = record.label;

    if (kind !== 'condition' && kind !== 'value') return null;
    if (
      typeof condition !== 'string' ||
      !ALL_CONDITIONS.includes(condition as Condition)
    ) {
      return null;
    }
    const cond = condition as Condition;

    if (kind === 'condition') {
      // For a condition aspect, the label must equal the condition.
      if (label !== cond) return null;
      return { kind: 'condition', condition: cond, label: cond };
    }

    // kind === 'value': label must be the value mapped to this condition.
    const expectedValue: SocialValue = CONDITION_VALUE_MAP[cond];
    if (
      typeof label !== 'string' ||
      !ALL_VALUES.includes(label as SocialValue) ||
      label !== expectedValue
    ) {
      return null;
    }
    return { kind: 'value', condition: cond, label: expectedValue };
  }

  private readFormality(value: unknown): InterventionFormality {
    return value === 'formal' || value === 'informal' ? value : 'formal';
  }

  private readScope(value: unknown): InterventionScope {
    return value === 'individual' || value === 'collective'
      ? value
      : 'individual';
  }

  private validateCardLinks(
    stepCards: StepCard[],
    consequenceCards: ConsequenceCard[],
  ): void {
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

    // Non-ending cards must point at a step that exists.
    const stepNumbers = new Set(stepCards.map((s) => s.step));
    for (const card of consequenceCards) {
      if (!card.isEnding) {
        if (card.nextStep === null || !stepNumbers.has(card.nextStep)) {
          throw new BadRequestException(
            `Consequence card "${card.key}" is not an ending but has an invalid nextStep`,
          );
        }
      }
    }
  }

  // Enforces the booklet's dual win condition and 8-aspect coverage.
  private validateWinConditions(
    stepCards: StepCard[],
    consequenceCards: ConsequenceCard[],
  ): void {
    const winCards = consequenceCards.filter((c) => c.isWin);

    if (winCards.length === 0) {
      throw new BadRequestException(
        'No winning ending found: at least one consequence card must have isWin:true',
      );
    }

    for (const win of winCards) {
      if (!win.isEnding) {
        throw new BadRequestException(
          `Win card "${win.key}" must also be an ending (isEnding:true)`,
        );
      }
    }

    // Theoretical goal: at least one path from card 1 to a win card must
    // collect all 8 aspects. We walk every path through the branching tree.
    const stepByNumber = new Map(stepCards.map((s) => [s.step, s]));
    const cardByKey = new Map(consequenceCards.map((c) => [c.key, c]));

    const startStep = stepCards.reduce(
      (min, s) => (s.step < min ? s.step : min),
      stepCards[0].step,
    );

    if (!this.someWinningPathCoversAllAspects(startStep, stepByNumber, cardByKey)) {
      throw new BadRequestException(
        'No winning path collects all 8 aspects: the theoretical goal is unreachable',
      );
    }
  }

  // Depth-first search over the card tree. Returns true if some path reaches a
  // win ending while having covered all 8 aspect keys. Guards against cycles.
  private someWinningPathCoversAllAspects(
    step: number,
    stepByNumber: Map<number, StepCard>,
    cardByKey: Map<string, ConsequenceCard>,
  ): boolean {
    const target = new Set(ALL_ASPECT_KEYS);

    const walk = (
      currentStep: number,
      covered: Set<string>,
      visitedSteps: Set<number>,
    ): boolean => {
      if (visitedSteps.has(currentStep)) return false; // cycle guard
      const stepCard = stepByNumber.get(currentStep);
      if (!stepCard) return false;

      const nextVisited = new Set(visitedSteps).add(currentStep);

      for (const choice of stepCard.choices) {
        const card = cardByKey.get(choice.consequenceCardKey);
        if (!card) continue;

        const nextCovered = new Set(covered);
        for (const tag of card.interventions) {
          nextCovered.add(aspectKey(tag.aspect));
        }

        if (card.isEnding) {
          if (
            card.isWin &&
            [...target].every((k) => nextCovered.has(k))
          ) {
            return true;
          }
          continue; // learning ending, or win that didn't cover all 8
        }

        if (card.nextStep !== null) {
          if (walk(card.nextStep, nextCovered, nextVisited)) return true;
        }
      }
      return false;
    };

    return walk(step, new Set<string>(), new Set<number>());
  }

  private requireString(value: unknown, field: string): string {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    throw new BadRequestException(`AI returned invalid or missing "${field}"`);
  }

  private async repairCaseDescriptionPayload(
    content: string,
  ): Promise<string> {
    if (!content.trim()) return '';

    const response = await this.createChatCompletion(
      [
        {
          role: 'system',
          content:
            'Extract or reformat the following content into this exact JSON: {"title":"short case title","description":"full narrative description"}. Return only valid JSON, no markdown, no extra text.',
        },
        { role: 'user', content },
      ],
      0.1,
    );

    return response.choices[0]?.message?.content?.trim() ?? '';
  }

  private async repairCardsPayload(content: string): Promise<string> {
    if (!content.trim()) {
      return '';
    }

    const schema = `{"difficulty":"easy|medium|hard","stepCards":[{"step":1,"scenarioText":"...","choices":[{"key":"A","text":"...","consequenceCardKey":"1A"}]}],"consequenceCards":[{"key":"1A","step":1,"consequenceText":"...","interventions":[{"aspect":{"kind":"condition","condition":"Social cohesion","label":"Social cohesion"},"scope":"individual","formality":"formal"}],"nextStep":2,"isEnding":false,"isWin":false}]}`;

    const response = await this.createChatCompletion(
      [
        {
          role: 'system',
          content: [
            'You convert card game content into a specific JSON schema.',
            'Return only valid JSON. No markdown, no explanation.',
            `Required schema: ${schema}`,
            'The 4 conditions are: Socio-economic security, Social inclusion, Social cohesion, Social empowerment.',
            'Each condition has one value behind it: Socio-economic security->Social justice, Social inclusion->Equality, Social cohesion->Solidarity, Social empowerment->Human dignity.',
            'An aspect is either kind:"condition" (label equals the condition) or kind:"value" (label is that condition\'s value).',
            'scope must be "individual" or "collective". formality must be "formal" or "informal".',
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

  // Tolerantly read a number that may arrive as a number or a numeric string.
  private readNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }
}