export interface GameCard {
  id: string;
  type: string;
  title: string;
  front: string;
  back: string;
  source?: string;
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
