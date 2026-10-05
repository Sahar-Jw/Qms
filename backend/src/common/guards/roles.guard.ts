import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MIN_ROLE_KEY } from '../decorators/min-role.decorator';
import { ROLE_RANK, RoleCode } from '../enums';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const min = this.reflector.getAllAndOverride<RoleCode | undefined>(MIN_ROLE_KEY, [context.getHandler(), context.getClass()]);
    if (!min) return true;
    const user = context.switchToHttp().getRequest().user;
    if (!user || ROLE_RANK[user.role as RoleCode] < ROLE_RANK[min]) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You do not have permission to perform this action' });
    }
    return true;
  }
}
