import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Global() // makes it available everywhere
@Module({
    providers: [DatabaseService],
    exports: [DatabaseService],
})
export class DatabaseModule { }