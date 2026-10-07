import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaveTranslationDto, TranslationMap } from './dto/translation.dto';
import { TranslationOverride } from './translation-override.entity';

@Injectable()
export class TranslationsService {
  constructor(@InjectRepository(TranslationOverride) private readonly repo: Repository<TranslationOverride>) {}

  /** { "settings.title": { ar: "...", en: "..." } } — only languages that are actually overridden. */
  async map(): Promise<TranslationMap> {
    const out: TranslationMap = {};
    for (const r of await this.repo.find()) {
      const v: { ar?: string; en?: string } = {};
      if (r.ar) v.ar = r.ar;
      if (r.en) v.en = r.en;
      if (v.ar || v.en) out[r.key] = v;
    }
    return out;
  }

  /** Upsert; when both languages end up empty the row is removed (back to the built-in text). */
  async save(dto: SaveTranslationDto, userId: number) {
    const ar = dto.ar ?? null;
    const en = dto.en ?? null;
    if (!ar && !en) return this.reset(dto.key);
    const existing = await this.repo.findOneBy({ key: dto.key });
    await this.repo.save(
      this.repo.create({ ...(existing ?? { createdById: userId }), key: dto.key, ar, en, updatedById: userId }),
    );
    return { key: dto.key, ar: ar ?? undefined, en: en ?? undefined };
  }

  async reset(key: string) {
    await this.repo.delete({ key });
    return { key, reset: true };
  }
}
