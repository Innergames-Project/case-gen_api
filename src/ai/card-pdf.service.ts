import { Injectable } from '@nestjs/common';
import type { GameCard } from './types/game-card.type';

@Injectable()
export class CardPdfService {
  createCardsPdf(cards: GameCard[], title = 'Game Cards'): Buffer {
    const safeTitle = this.toPdfText(title);
    const objects: string[] = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    const pageObjectIds: number[] = [];

    cards.forEach((card, index) => {
      const pageObjectId = objects.length + 1;
      const contentObjectId = pageObjectId + 1;
      pageObjectIds.push(pageObjectId);

      const content = this.renderCardPage(card, index + 1, safeTitle);
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
        `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
      );
    });

    objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;

    return this.buildPdf(objects);
  }

  private renderCardPage(
    card: GameCard,
    cardNumber: number,
    deckTitle: string,
  ) {
    const lines = [
      { size: 18, text: deckTitle },
      { size: 10, text: `Card ${cardNumber} - ${this.toPdfText(card.type)}` },
      { size: 16, text: this.toPdfText(card.title) },
      { size: 12, text: 'Front' },
      ...this.wrap(this.toPdfText(card.front), 82).map((text) => ({
        size: 11,
        text,
      })),
      { size: 12, text: 'Back' },
      ...this.wrap(this.toPdfText(card.back), 82).map((text) => ({
        size: 11,
        text,
      })),
    ];
    let y = 742;
    const commands = ['BT'];

    for (const line of lines) {
      commands.push(
        `/F1 ${line.size} Tf`,
        `1 0 0 1 50 ${y} Tm`,
        `(${this.escapePdfText(line.text)}) Tj`,
      );
      y -= line.size + 8;
    }

    commands.push('ET');
    return commands.join('\n');
  }

  private buildPdf(objects: string[]): Buffer {
    const chunks: string[] = ['%PDF-1.4\n'];
    const offsets = [0];

    objects.forEach((object, index) => {
      offsets.push(Buffer.byteLength(chunks.join(''), 'latin1'));
      chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
    });

    const xrefOffset = Buffer.byteLength(chunks.join(''), 'latin1');
    chunks.push(
      `xref\n0 ${objects.length + 1}\n`,
      '0000000000 65535 f \n',
      ...offsets
        .slice(1)
        .map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`),
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
    );

    return Buffer.from(chunks.join(''), 'latin1');
  }

  private wrap(value: string, maxLength: number): string[] {
    const words = value.split(/\s+/);
    const lines: string[] = [];
    let line = '';

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;

      if (next.length > maxLength && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }

    if (line) {
      lines.push(line);
    }

    return lines.slice(0, 24);
  }

  private escapePdfText(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  private toPdfText(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7e]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
