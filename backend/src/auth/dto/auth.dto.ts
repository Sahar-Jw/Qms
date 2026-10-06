import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { TrimOptional } from '../../common/decorators/validators';
import { PASSWORD_MSG, PASSWORD_RE } from '../../users/dto/user.dto';

const lower = () => Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));

export class RegisterDto {
  @TrimOptional() @IsString() @IsNotEmpty() @MaxLength(150)
  fullName: string;

  @lower() @IsEmail() @MaxLength(190)
  email: string;

  @IsOptional() @TrimOptional() @IsString() @MaxLength(40)
  phone?: string;

  @Matches(PASSWORD_RE, { message: PASSWORD_MSG })
  password: string;
}

export class LoginDto {
  @lower() @IsEmail()
  email: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  password: string;
}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty()
  currentPassword: string;

  @Matches(PASSWORD_RE, { message: PASSWORD_MSG })
  newPassword: string;
}

export class ForgotPasswordDto {
  @lower() @IsEmail() @MaxLength(190)
  email: string;
}

export class ResetPasswordDto {
  @IsString() @IsNotEmpty() @MaxLength(128)
  token: string;

  @Matches(PASSWORD_RE, { message: PASSWORD_MSG })
  newPassword: string;
}

export class UpdateProfileDto {
  @TrimOptional() @IsString() @IsNotEmpty() @MaxLength(150)
  fullName: string;

  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;
}
