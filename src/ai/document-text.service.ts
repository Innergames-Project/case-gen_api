import { BadRequestException, Injectable } from '@nestjs/common';
import type { UploadedDocument } from './types/game-card.type';

const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 24_000;

@Injectable()
export class DocumentTextService {
  extractText(file: UploadedDocument | undefined): string {
    if (!file) {
      throw new BadRequestException('Document is required');
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('Document cannot be empty');
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      throw new BadRequestException('Document must be 8MB or smaller');
    }

    const filename = file.originalname.toLowerCase();
    const mimetype = file.mimetype.toLowerCase();

    if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
      return this.limitText(
        this.extractPdfText(file.buffer),
        file.originalname,
      );
    }

    if (
      mimetype.startsWith('text/') ||
      mimetype === 'application/json' ||
      filename.endsWith('.txt') ||
      filename.endsWith('.md') ||
      filename.endsWith('.csv') ||
      filename.endsWith('.json')
    ) {
      return this.limitText(file.buffer.toString('utf8'), file.originalname);
    }

    throw new BadRequestException(
      'Unsupported document type. Upload a PDF, TXT, MD, CSV, or JSON file.',
    );
  }

  private extractPdfText(buffer: Buffer): string {
    const raw = buffer.toString('latin1');
    const textParts: string[] = [];
    const literalStringPattern = /\((?:\\.|[^\\()])*\)/g;
    let match: RegExpExecArray | null;

    while ((match = literalStringPattern.exec(raw)) !== null) {
      textParts.push(this.decodePdfLiteral(match[0].slice(1, -1)));
    }

    const text = this.cleanText(textParts.join(' '));

    if (text.length < 20) {
      throw new BadRequestException(
        'Could not read text from this PDF. Upload a text-based PDF or a TXT/MD/CSV/JSON document.',
      );
    }

    return text;
  }

  private decodePdfLiteral(value: string): string {
    return value
      .replace(/\\([nrtbf()\\])/g, (_, escaped: string) => {
        const replacements: Record<string, string> = {
          n: '\n',
          r: '\r',
          t: '\t',
          b: '\b',
          f: '\f',
          '(': '(',
          ')': ')',
          '\\': '\\',
        };

        return replacements[escaped] ?? escaped;
      })
      .replace(/\\([0-7]{1,3})/g, (_, octal: string) =>
        String.fromCharCode(parseInt(octal, 8)),
      );
  }

  private limitText(value: string, filename: string): string {
    const text = this.cleanText(value);

    if (!text) {
      throw new BadRequestException(`No readable text found in ${filename}`);
    }

    return text.slice(0, MAX_TEXT_CHARS);
  }

  private cleanText(value: string): string {
    return value
      .replace(/\u0000/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
