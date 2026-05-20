import type {
  CaseDifficulty,
  ConsequenceCard,
  StepCard,
} from '../../ai/types/game-card.type';

export interface CaseDocument {
  id: string;
  title: string;
  description: string;
  difficulty: CaseDifficulty | null;
  stepCards: StepCard[];
  consequenceCards: ConsequenceCard[];
  createdAt: string;
  updatedAt: string;
}
