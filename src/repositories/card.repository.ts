import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Card } from 'src/types/card.type';

@Injectable()
export class CardRepository {
    constructor(private readonly db: DatabaseService) { }

    async findAllByCaseId(caseId: number): Promise<Card[]> {
        return this.db.query('SELECT * FROM cards WHERE case_id = ?', [caseId]);
    }

    async saveAll(cards: Card[]): Promise<Card[]> {
        const result = await this.db.query('INSERT INTO cards (title, description, case_id) VALUES ?', [cards.map(card => [card.title, card.description, card.case_id])]);
        return result;
    }
}