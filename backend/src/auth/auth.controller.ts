import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Patch, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { uploadsRoot } from '../config/uploads';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CookieOptions, Response } from 'express';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { sessionHours } from '../config/session';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, UpdateProfileDto } from './dto/auth.dto';

const AVATAR_TYPES: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

const avatarUpload = FileInterceptor('file', {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(uploadsRoot(), 'avatars');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => cb(null, randomBytes(16).toString('hex') + AVATAR_TYPES[file.mimetype]),
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  // SVG is deliberately not allowed (script injection risk).
  fileFilter: (_req, file, cb) =>
    AVATAR_TYPES[file.mimetype] ? cb(null, true) : cb(new BadRequestException({ code: 'INVALID_FILE_TYPE', message: 'Only PNG, JPEG or WEBP images are allowed' }), false),
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieName: string;

  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {
    this.cookieName = config.get<string>('COOKIE_NAME') || 'qms_token';
  }

  private cookieOptions(): CookieOptions {
    const hours = sessionHours(this.config);
    const domain = this.config.get<string>('COOKIE_DOMAIN');
    return {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE') === 'true',
      sameSite: (this.config.get<string>('COOKIE_SAMESITE') as 'lax' | 'strict' | 'none') || 'lax',
      path: '/',
      maxAge: hours * 3600 * 1000,
      ...(domain ? { domain } : {}),
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.login(dto);
    res.cookie(this.cookieName, token, this.cookieOptions());
    return { user };
  }

  @HttpCode(200)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    const { maxAge, ...opts } = this.cookieOptions();
    res.clearCookie(this.cookieName, opts);
    return { ok: true };
  }

  /** Also renews the session cookie, so you stay signed in as long as you open the site within the session window. */
  @Get('me')
  async me(@CurrentUser() me: AuthUser, @Res({ passthrough: true }) res: Response) {
    res.cookie(this.cookieName, await this.auth.signToken(me.id, me.role), this.cookieOptions());
    return this.users.get(me.id);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() me: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(me.id, dto);
  }

  @Post('avatar')
  @UseInterceptors(avatarUpload)
  uploadAvatar(@CurrentUser() me: AuthUser, @UploadedFile() file: Express.Multer.File) {
    return this.auth.setAvatar(me.id, file);
  }

  @Delete('avatar')
  removeAvatar(@CurrentUser() me: AuthUser) {
    return this.auth.removeAvatar(me.id);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @HttpCode(200)
  @Post('change-password')
  changePassword(@CurrentUser() me: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(me.id, dto);
  }
}
