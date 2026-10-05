import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';

@Injectable()
export class RolesService {
  constructor(@InjectRepository(Role) private readonly repo: Repository<Role>) {}

  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  findByCode(code: string) {
    return this.repo.findOneBy({ code });
  }
}
