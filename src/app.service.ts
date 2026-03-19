import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    // Root endpoint works as a quick architecture/status descriptor.
    return {
      name: 'case-gen_api',
      auth: 'disabled',
      database: 'in-memory',
      ai: 'groq',
    };
  }
}
