export interface GameCardOption {
  nextCardId: string;
  nextCardKey: string;
}

export interface GameCard {
  id: string;
  key: string;
  type: string;
  title: string;
  front: string;
  back: string;
  source?: string;
  allowedNextCardIds: string[];
  allowedNextCardKeys: string[];
  isEnding: boolean;
}

export interface GeneratedCardsResult {
  model: string;
  cards: GameCard[];
  sourceTextLength: number;
}

export interface UploadedDocument {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
