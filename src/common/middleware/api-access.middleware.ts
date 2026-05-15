import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class ApiAccessMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(request: Request, _response: Response, next: NextFunction) {
    const configuredToken =
      this.configService.get<string>('API_ACCESS_TOKEN')?.trim() ?? '';

    if (!configuredToken || this.isPublicRequest(request)) {
      next();
      return;
    }

    const apiKey = this.readHeaderValue(request.headers['x-api-key']);
    const bearerToken = this.readBearerToken(
      this.readHeaderValue(request.headers.authorization),
    );

    if (apiKey === configuredToken || bearerToken === configuredToken) {
      next();
      return;
    }

    throw new UnauthorizedException('Missing or invalid API access token');
  }

  private isPublicRequest(request: Request): boolean {
    const method = request.method.toUpperCase();
    const path = request.path || request.url || '/';

    return (
      (method === 'GET' || method === 'HEAD') &&
      (path === '/' || path === '/health')
    );
  }

  private readHeaderValue(value: string | string[] | undefined): string {
    if (Array.isArray(value)) {
      return value[0] ?? '';
    }

    return value ?? '';
  }

  private readBearerToken(value: string): string {
    const match = value.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() ?? '';
  }
}
