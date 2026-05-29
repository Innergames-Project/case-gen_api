// ---------------------------------------------------------------------------
// Sociality — Social Quality (Sociale Kwaliteit) card game types
//
// Grounded in the official booklet:
//   - FOUR CONDITIONS ("de vier condities") that must be in order for people
//     to be able to participate: socio-economic security, social inclusion,
//     social cohesion, social empowerment.
//   - Behind EACH condition sits a VALUE ("waarde") that forms the social
//     worker's moral compass:
//        socio-economic security -> social justice / "meedoen"
//        social inclusion        -> equality ("gelijkwaardigheid")
//        social cohesion         -> solidarity
//        social empowerment      -> human dignity
//   - Together the 4 conditions + 4 values = the 8 ASPECTS of the theory,
//     which are the 8 squares ("vakjes") on the board.
//   - TWO DIMENSIONS frame every action:
//        dimension 1 (scope):     individual (micro) vs collective (meso/macro)
//        dimension 2 (formality):  formal vs informal
// ---------------------------------------------------------------------------

export type CaseDifficulty = 'easy' | 'medium' | 'hard';

// The four conditions ("condities").
export const ALL_CONDITIONS = [
  'Socio-economic security',
  'Social inclusion',
  'Social cohesion',
  'Social empowerment',
] as const;
export type Condition = (typeof ALL_CONDITIONS)[number];

// The four values ("waarden") that sit behind the conditions.
export const ALL_VALUES = [
  'Social justice',
  'Equality',
  'Solidarity',
  'Human dignity',
] as const;
export type SocialValue = (typeof ALL_VALUES)[number];

// Fixed mapping condition -> its underlying value (per the booklet).
export const CONDITION_VALUE_MAP: Record<Condition, SocialValue> = {
  'Socio-economic security': 'Social justice',
  'Social inclusion': 'Equality',
  'Social cohesion': 'Solidarity',
  'Social empowerment': 'Human dignity',
};

// An "aspect" is one of the 8 board squares: either a condition or a value.
export type AspectKind = 'condition' | 'value';

export interface Aspect {
  kind: AspectKind;
  // The condition this aspect belongs to. For a value aspect this is the
  // condition the value sits behind; for a condition aspect it is itself.
  condition: Condition;
  // The concrete label of this aspect (a Condition or a SocialValue string).
  label: Condition | SocialValue;
}

// The canonical list of all 8 aspects (4 conditions + 4 values).
export const ALL_ASPECTS: Aspect[] = [
  ...ALL_CONDITIONS.map(
    (c): Aspect => ({ kind: 'condition', condition: c, label: c }),
  ),
  ...ALL_CONDITIONS.map(
    (c): Aspect => ({
      kind: 'value',
      condition: c,
      label: CONDITION_VALUE_MAP[c],
    }),
  ),
];

// A stable key for an aspect, used for set-membership / coverage checks.
export function aspectKey(aspect: Aspect): string {
  return `${aspect.kind}:${aspect.label}`;
}

export const ALL_ASPECT_KEYS: string[] = ALL_ASPECTS.map(aspectKey);

// ---------------------------------------------------------------------------
// The two dimensions.
// ---------------------------------------------------------------------------

export type InterventionScope = 'individual' | 'collective';
export type InterventionFormality = 'formal' | 'informal';

// Each card lays down THREE "sociale kwaliteit kaartjes":
//   one aspect, plus a position on each of the two dimension axes.
export interface InterventionTag {
  aspect: Aspect;
  scope: InterventionScope;
  formality: InterventionFormality;
}

// ---------------------------------------------------------------------------
// Cards.
// ---------------------------------------------------------------------------

export interface StepChoice {
  key: string; // 'A', 'B', 'C' ...
  text: string;
  consequenceCardKey: string; // e.g. '1A'
}

export interface StepCard {
  // The card number along the branching path. NOT capped at 6 — the booklet
  // describes a branching tree that "keeps repeating", not a fixed 6-stage model.
  step: number;
  scenarioText: string;
  choices: StepChoice[]; // 2-3 per the booklet
}

export interface ConsequenceCard {
  key: string; // e.g. '1A'
  step: number;
  consequenceText: string;
  // The three kaartjes laid on the board for this choice.
  interventions: InterventionTag[];
  // null when this card is an ending.
  nextStep: number | null;
  isEnding: boolean;
  // A win requires BOTH the practical case finished (reaching an ending that
  // completes the case) AND the theoretical goal (all 8 aspects covered on the
  // path). Multiple win endings are allowed — the booklet says there are
  // several ways to win.
  isWin: boolean;
}

export interface GeneratedCardsResult {
  model: string;
  difficulty: CaseDifficulty;
  stepCards: StepCard[];
  consequenceCards: ConsequenceCard[];
}

export interface UploadedDocument {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}