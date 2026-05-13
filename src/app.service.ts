import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHello() {
    // Root endpoint works as a quick architecture/status descriptor.
    return {
      name: 'case-gen_api',
      auth: this.configService.get<string>('API_ACCESS_TOKEN')
        ? 'api-key'
        : 'disabled',
      database: 'in-memory',
      ai: 'groq',
    };
  }
}
