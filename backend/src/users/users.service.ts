import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Paginated, paginated } from '../common/dto/pagination.dto';
import { RoleCode } from '../common/enums';
import { canAssignRole, canChangeRoleOf, canManageAccount, isTopTier } from '../common/policy';
import { RolesService } from '../roles/roles.service';
import { AuthUser } from '../common/auth-user';
import { ForbiddenException } from '@nestjs/common';
import { ListUsersDto, UpdateUserDto } from './dto/user.dto';
import { User } from './user.entity';

export interface UserView {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly roles: RolesService,
  ) {}

  toView(u: User): UserView {
    return {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      avatar: u.avatar ?? null,
      role: u.role?.code,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    };
  }

  findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  /** passwordHash is `select: false`, so it has to be requested explicitly. */
  findByEmailWithPassword(email: string) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .leftJoinAndSelect('u.role', 'role')
      .where('u.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  findByIdWithPassword(id: number) {
    return this.repo.createQueryBuilder('u').addSelect('u.passwordHash').leftJoinAndSelect('u.role', 'role').where('u.id = :id', { id }).getOne();
  }

  async create(dto: { fullName: string; email: string; phone?: string; password: string; roleCode: RoleCode; isActive: boolean }): Promise<User> {
    if (await this.findByEmail(dto.email)) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email is already registered' });
    }
    const role = await this.roles.findByCode(dto.roleCode);
    if (!role) throw new BadRequestException({ code: 'ROLE_NOT_FOUND', message: 'Role not found (did you run the seed?)' });
    const user = this.repo.create({
      fullName: dto.fullName,
      email: dto.email.toLowerCase(),
      phone: dto.phone ?? null,
      passwordHash: await bcrypt.hash(dto.password, 12),
      role,
      isActive: dto.isActive,
    });
    return this.repo.save(user);
  }

  async list(q: ListUsersDto): Promise<Paginated<UserView>> {
    const qb = this.repo.createQueryBuilder('u').leftJoinAndSelect('u.role', 'role');
    if (q.q) qb.andWhere('(u.fullName LIKE :s OR u.email LIKE :s OR u.phone LIKE :s)', { s: `%${q.q}%` });
    if (q.roleCode) qb.andWhere('role.code = :rc', { rc: q.roleCode });
    switch (q.status) {
      case 'active': qb.andWhere('u.isActive = 1'); break;
      case 'inactive': qb.andWhere('u.isActive = 0'); break;
      case 'pending': qb.andWhere('u.isActive = 0 AND u.lastLoginAt IS NULL'); break; // awaiting first activation
      default: break;
    }
    const [rows, total] = await qb.orderBy('u.createdAt', 'DESC').skip((q.page - 1) * q.limit).take(q.limit).getManyAndCount();
    return paginated(rows.map((u) => this.toView(u)), total, q.page, q.limit);
  }

  /** Minimal active-user list for "responsible person" dropdowns (any authenticated user). */
  async lookup() {
    const rows = await this.repo.find({ where: { isActive: true }, order: { fullName: 'ASC' } });
    return rows.map((u) => ({ id: u.id, fullName: u.fullName }));
  }

  async get(id: number) {
    const u = await this.findById(id);
    if (!u) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    return this.toView(u);
  }

  /**
   * Technical and general managers can manage every manager / employee account, but not each other
   * (nobody can "cancel" another top-tier account). Role rules: only the technical manager can hand out the
   * technical_manager role, and only the technical manager can change the general manager's role.
   */
  private assertCanManage(target: User, actor: AuthUser) {
    if (!isTopTier(actor.role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You do not have permission to perform this action' });
    }
    if (!canManageAccount(actor, { id: target.id, role: target.role.code as RoleCode })) {
      throw new ForbiddenException({ code: 'PROTECTED_ACCOUNT', message: 'Technical and general manager accounts cannot be changed by each other' });
    }
  }

  async update(id: number, dto: UpdateUserDto, actor: AuthUser) {
    const u = await this.findById(id);
    if (!u) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    const roleChange = !!dto.roleCode && dto.roleCode !== u.role.code;
    const profileChange = dto.fullName !== undefined || dto.phone !== undefined;
    if (!isTopTier(actor.role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You do not have permission to perform this action' });
    }
    // Name / phone of another top-tier account stays protected; a role change follows its own rules below.
    if ((profileChange || !roleChange) && !canManageAccount(actor, { id: u.id, role: u.role.code as RoleCode })) {
      throw new ForbiddenException({ code: 'PROTECTED_ACCOUNT', message: 'Technical and general manager accounts cannot be changed by each other' });
    }
    if (roleChange) {
      if (u.id === actor.id) throw new BadRequestException({ code: 'CANNOT_CHANGE_OWN_ROLE', message: 'You cannot change your own role' });
      if (!canAssignRole(actor, dto.roleCode!)) {
        throw new ForbiddenException({ code: 'ROLE_NOT_ASSIGNABLE', message: 'Only the technical manager can assign the technical manager role' });
      }
      if (!canChangeRoleOf(actor, { id: u.id, role: u.role.code as RoleCode })) {
        throw new ForbiddenException({ code: 'PROTECTED_ACCOUNT', message: 'Technical and general manager accounts cannot be changed by each other' });
      }
      const role = await this.roles.findByCode(dto.roleCode!);
      if (!role) throw new BadRequestException({ code: 'ROLE_NOT_FOUND', message: 'Role not found' });
      u.role = role;
    }
    if (dto.fullName !== undefined) u.fullName = dto.fullName;
    if (dto.phone !== undefined) u.phone = dto.phone;
    await this.repo.save(u);
    return this.toView((await this.findById(id))!);
  }

  /** Activation = the general manager approving a self-registered account (SRS). */
  async setActive(id: number, isActive: boolean, actor: AuthUser) {
    const u = await this.findById(id);
    if (!u) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    this.assertCanManage(u, actor);
    if (!isActive && u.id === actor.id) throw new BadRequestException({ code: 'CANNOT_DEACTIVATE_SELF', message: 'You cannot deactivate your own account' });
    u.isActive = isActive;
    if (isActive) {
      u.failedAttempts = 0;
      u.lockedUntil = null;
    }
    await this.repo.save(u);
    return this.toView(u);
  }

  save(u: User) {
    return this.repo.save(u);
  }
}
