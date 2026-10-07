import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AuditBase } from '../common/entities/audit-base';

/**
 * A manager's replacement for one static UI text. `key` is the i18n key (e.g. "settings.tabs.audit").
 * A NULL language column means "keep the built-in text for that language".
 */
@Entity('translation_overrides')
export class TranslationOverride extends AuditBase {
  @PrimaryColumn({ type: 'varchar', length: 190 })
  key: string;

  @Column({ type: 'text', nullable: true })
  ar: string | null;

  @Column({ type: 'text', nullable: true })
  en: string | null;
}
