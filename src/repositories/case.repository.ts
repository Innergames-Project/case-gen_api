import { Injectable } from "@nestjs/common";
import { DatabaseService } from "src/database/database.service";
import { Case } from "src/types/case.type";


@Injectable()
export class CaseRepository {
    constructor(private readonly db: DatabaseService) { }

    async findAll(): Promise<Case[]> {
        return this.db.query('SELECT * FROM cases');
    }

    async findById(id: number): Promise<Case> {
        return this.db.query('SELECT * FROM cases WHERE id = ?', [id]);
    }

}