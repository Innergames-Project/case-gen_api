import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private pool: mysql.Pool;
    
    constructor(private readonly configService: ConfigService) { }

    async onModuleInit() {
        this.pool = mysql.createPool({
            host: this.configService.get<string>('DB_HOST'),
            port: this.configService.get<number>('DB_PORT'),
            user: this.configService.get<string>('DB_USER'),
            password: this.configService.get<string>('DB_PASSWORD'),
            database: this.configService.get<string>('DB_NAME'),
            connectionLimit: 10,
        });

        console.log('MySQL Connected');
    }

    async query<T = any>(sql: string, params?: any[]): Promise<T> {
        const [rows] = await this.pool.execute(sql, params);
        return rows as T;
    }

    async onModuleDestroy() {
        await this.pool.end();
    }
}