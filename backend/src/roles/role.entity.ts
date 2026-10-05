import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  code: string; // admin | manager | employee

  @Column({ type: 'varchar', length: 100 })
  nameAr: string;

  @Column({ type: 'varchar', length: 100 })
  nameEn: string;
}
