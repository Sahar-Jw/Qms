import { ConfigService } from '@nestjs/config';
import { HttpException, Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { RoleCode } from '../common/enums';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto';

// Used to keep response time similar when the e-mail does not exist.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Self sign-up: always an inactive Employee until an admin activates the account. */
  async register(dto: RegisterDto) {
    await this.users.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      password: dto.password,
      roleCode: RoleCode.EMPLOYEE,
      isActive: false,
    });
    return { code: 'REGISTERED_PENDING_ACTIVATION', message: 'Account created. An administrator must activate it before you can sign in.' };
  }

  async login(dto: LoginDto) {
    const maxFailed = Number(this.config.get('MAX_FAILED_LOGINS') ?? 3);
    const lockMinutes = Number(this.config.get('LOCK_MINUTES') ?? 15);
    const invalid = () => new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid e-mail or password' });

    const user = await this.users.findByEmailWithPassword(dto.email);
    if (!user) {
      await bcrypt.compare(dto.password, DUMMY_HASH);
      throw invalid();
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      throw new HttpException(
        { code: 'ACCOUNT_LOCKED', message: `Too many failed attempts. Try again after ${lockMinutes} minutes.`, lockedUntil: user.lockedUntil },
        423,
      );
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= maxFailed) {
        user.lockedUntil = new Date(now.getTime() + lockMinutes * 60_000);
        user.failedAttempts = 0;
      }
      await this.users.save(user);
      throw invalid();
    }

    // Password is correct, so telling the user about the pending state leaks nothing.
    if (!user.isActive) {
      throw new ForbiddenException({ code: 'ACCOUNT_NOT_ACTIVATED', message: 'Your account has not been activated yet' });
    }

    user.failedAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = now;
    await this.users.save(user);

    const token = await this.jwt.signAsync({ sub: user.id, role: user.role.code });
    return { token, user: this.users.toView(user) };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.users.findByIdWithPassword(userId);
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException({ code: 'WRONG_CURRENT_PASSWORD', message: 'Current password is incorrect' });
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.users.save(user);
    return { ok: true };
  }
}
