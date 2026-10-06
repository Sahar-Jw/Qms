import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { HttpException, Injectable, Logger, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { RoleCode } from '../common/enums';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';
import { PasswordReset } from './password-reset.entity';

// Used to keep response time similar when the e-mail does not exist.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    @InjectRepository(PasswordReset) private readonly resets: Repository<PasswordReset>,
  ) {}

  private readonly log = new Logger(AuthService.name);

  signToken(userId: number, role: string) {
    return this.jwt.signAsync({ sub: userId, role });
  }

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

    const token = await this.signToken(user.id, user.role.code);
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

  /** Always answers the same way, so it cannot be used to find out which e-mails are registered. */
  async forgotPassword(dto: ForgotPasswordDto) {
    const ok = { ok: true };
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.isActive) return ok;

    const minutes = Number(this.config.get('RESET_TOKEN_MINUTES')) || 60;
    const token = crypto.randomBytes(32).toString('hex');
    await this.resets.delete({ userId: user.id, usedAt: IsNull() });
    await this.resets.save(
      this.resets.create({ userId: user.id, tokenHash: this.hash(token), expiresAt: new Date(Date.now() + minutes * 60_000), usedAt: null }),
    );

    const base = (this.config.get<string>('APP_URL') || (this.config.get<string>('FRONTEND_URLS') || 'http://localhost:3000').split(',')[0]).trim().replace(/\/+$/, '');
    const link = `${base}/reset-password?token=${token}`;
    // Not awaited: response time must not reveal whether the account exists.
    this.mail.sendPasswordReset(user.email, user.fullName, link, minutes).catch((e) => this.log.error(`Reset e-mail to ${user.email} failed: ${e?.message ?? e}`));
    return ok;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const row = await this.resets.findOne({ where: { tokenHash: this.hash(dto.token), usedAt: IsNull(), expiresAt: MoreThan(new Date()) } });
    if (!row) throw new BadRequestException({ code: 'INVALID_RESET_TOKEN', message: 'This reset link is invalid or has expired' });
    const user = await this.users.findByIdWithPassword(row.userId);
    if (!user) throw new BadRequestException({ code: 'INVALID_RESET_TOKEN', message: 'This reset link is invalid or has expired' });

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    user.failedAttempts = 0;
    user.lockedUntil = null;
    await this.users.save(user);
    await this.resets.update({ id: row.id }, { usedAt: new Date() });
    await this.resets.delete({ userId: user.id, usedAt: IsNull() }); // any other pending links
    return { ok: true };
  }

  private hash(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
