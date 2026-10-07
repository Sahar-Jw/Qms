import 'dotenv/config';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { RoleCode } from '../common/enums';
import { Role } from '../roles/role.entity';
import { Sequence } from '../quotations/sequence.entity';
import { User } from '../users/user.entity';
import { buildDataSourceOptions } from './data-source-options';

const TEST_USERS = [
  { role: RoleCode.TECHNICAL_MANAGER, email: 'test-technical-manager@qms.test', name: 'Test Technical Manager', nameAr: 'مدير تقني للاختبار', nameEn: 'Technical Manager' },
  { role: RoleCode.GENERAL_MANAGER, email: 'test-general-manager@qms.test', name: 'Test General Manager', nameAr: 'مدير عام للاختبار', nameEn: 'General Manager' },
  { role: RoleCode.MANAGER, email: 'test-manager@qms.test', name: 'Test Manager', nameAr: 'مدير للاختبار', nameEn: 'Manager' },
  { role: RoleCode.EMPLOYEE, email: 'test-employee@qms.test', name: 'Test Employee', nameAr: 'موظف للاختبار', nameEn: 'Employee' },
] as const;

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to create test accounts in production');
  }

  const ds = new DataSource(buildDataSourceOptions());
  await ds.initialize();
  try {
    const password = `QmsTest-${randomBytes(16).toString('hex')}`;
    const passwordHash = await bcrypt.hash(password, 12);
    await ds.transaction(async (manager) => {
      const roles = new Map<RoleCode, Role>();
      for (const spec of TEST_USERS) {
        let role = await manager.findOne(Role, { where: { code: spec.role } });
        if (!role) role = await manager.save(Role, manager.create(Role, { code: spec.role, nameAr: spec.nameAr, nameEn: spec.nameEn }));
        roles.set(spec.role, role);
      }

      const sequenceRepo = manager.getRepository(Sequence);
      if (!(await sequenceRepo.findOneBy({ name: 'quotation' }))) {
        await sequenceRepo.save(sequenceRepo.create({ name: 'quotation', value: 0 }));
      }

      for (const spec of TEST_USERS) {
        const role = roles.get(spec.role);
        if (!role) throw new Error(`Missing role record: ${spec.role}`);
        let user = await manager.findOne(User, { where: { email: spec.email } });
        if (!user) user = manager.create(User);
        user.fullName = spec.name;
        user.email = spec.email;
        user.phone = null;
        user.passwordHash = passwordHash;
        user.role = role;
        user.avatar = null;
        user.issuingCompanyId = null;
        user.isActive = true;
        user.failedAttempts = 0;
        user.lockedUntil = null;
        user.lastLoginAt = null;
        await manager.save(User, user);
      }
    });

    console.log('Test accounts created/updated in database:', process.env.DB_NAME || '(DB_NAME not set)');
    for (const spec of TEST_USERS) console.log(`${spec.role}: ${spec.email}`);
    console.log(`Password for all four accounts: ${password}`);
    console.log('This generated password is shown only for this run; rerunning resets it.');
  } finally {
    await ds.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
