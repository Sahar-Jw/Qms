import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
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
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';

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
