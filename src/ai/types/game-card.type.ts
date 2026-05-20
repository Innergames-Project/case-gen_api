export type InterventionDomain =
  | 'Socioeconomic security'
  | 'Justice'
  | 'Social cohesion'
  | 'Solidarity'
  | 'Social inclusion'
  | 'Equality'
  | 'Social empowerment'
  | 'Human dignity';

export const ALL_INTERVENTION_DOMAINS: InterventionDomain[] = [
  'Socioeconomic security',
  'Justice',
  'Social cohesion',
  'Solidarity',
  'Social inclusion',
  'Equality',
  'Social empowerment',
  'Human dignity',
];

export type InterventionFormality = 'formal' | 'informal';
export type InterventionScope = 'individual' | 'collective';
export type CaseDifficulty = 'easy' | 'medium' | 'hard';

export interface InterventionTag {
  domain: InterventionDomain;
  formality: InterventionFormality;
  scope: InterventionScope;
}

export interface CaseChoice {
  key: string;
  text: string;
  consequenceCardKey: string;
}

export interface StepCard {
  step: number;
  scenarioText: string;
  choices: CaseChoice[];
}

export interface ConsequenceCard {
  key: string;
  step: number;
  consequenceText: string;
  interventions: InterventionTag[];
  nextStep: number | null;
  isEnding: boolean;
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
