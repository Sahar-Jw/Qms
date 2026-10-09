import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { RoleCode } from '../common/enums';
import { Sequence } from '../quotations/sequence.entity';
import { Role } from '../roles/role.entity';
import { User } from '../users/user.entity';
import { buildDataSourceOptions } from './data-source-options';

/**
 * First-run setup, safe to run more than once:
 *   1. creates the four roles (technical_manager, general_manager, manager, employee) if missing
 *   2. creates the quotation number sequence if missing
 *   3. creates the TECHNICAL MANAGER account from SEED_ADMIN_EMAIL / SEED_ADMIN_NAME / SEED_ADMIN_PASSWORD
 *      (an existing account with that e-mail is left untouched, so re-running never resets a password)
 *
 * Run after the tables exist (DB_MIGRATIONS_RUN=true on first start, or `npm run migration:run`):
 *   dev:   npm run admin:create
 *   prod:  npm run admin:create:prod      (uses the compiled dist/ folder; no ts-node needed on the server)
 */
const ROLES: { code: RoleCode; nameAr: string; nameEn: string }[] = [
  { code: RoleCode.TECHNICAL_MANAGER, nameAr: 'المدير التقني', nameEn: 'Technical Manager' },
  { code: RoleCode.GENERAL_MANAGER, nameAr: 'المدير العام', nameEn: 'General Manager' },
  { code: RoleCode.MANAGER, nameAr: 'المدير', nameEn: 'Manager' },
  { code: RoleCode.EMPLOYEE, nameAr: 'الموظف', nameEn: 'Employee' },
];

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const name = (process.env.SEED_ADMIN_NAME || 'Technical Manager').trim();
  const password = process.env.SEED_ADMIN_PASSWORD || '';
  if (!email || !email.includes('@')) throw new Error('SEED_ADMIN_EMAIL is required (a valid e-mail address)');
  if (password.length < 10) throw new Error('SEED_ADMIN_PASSWORD is required and must be at least 10 characters');
  if (process.env.NODE_ENV === 'production' && /^(Admin@12345|change-me|replace-with)/i.test(password)) {
    throw new Error('SEED_ADMIN_PASSWORD still looks like the example value. Choose a unique strong password.');
  }

  const ds = new DataSource(buildDataSourceOptions());
  await ds.initialize();
  try {
    await ds.transaction(async (manager) => {
      const roles = new Map<RoleCode, Role>();
      for (const spec of ROLES) {
        let role = await manager.findOne(Role, { where: { code: spec.code } });
        if (!role) {
          role = await manager.save(Role, manager.create(Role, spec));
          console.log(`+ role ${spec.code}`);
        }
        roles.set(spec.code, role);
      }

      const sequences = manager.getRepository(Sequence);
      if (!(await sequences.findOneBy({ name: 'quotation' }))) {
        await sequences.save(sequences.create({ name: 'quotation', value: 0 }));
        console.log('+ quotation number sequence');
      }

      const existing = await manager.findOne(User, { where: { email } });
      if (existing) {
        console.log(`= account ${email} already exists, left unchanged`);
        return;
      }
      const user = manager.create(User);
      user.fullName = name;
      user.email = email;
      user.phone = null;
      user.passwordHash = await bcrypt.hash(password, 12);
      user.role = roles.get(RoleCode.TECHNICAL_MANAGER)!;
      user.avatar = null;
      user.issuingCompanyId = null;
      user.isActive = true;
      user.failedAttempts = 0;
      user.lockedUntil = null;
      user.lastLoginAt = null;
      await manager.save(User, user);
      console.log(`+ technical manager ${email}`);
    });
    console.log('Done. You can now sign in; then remove SEED_ADMIN_PASSWORD from .env.');
  } finally {
    await ds.destroy();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
