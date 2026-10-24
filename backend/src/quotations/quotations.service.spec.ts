import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CalcService } from '../calc/calc.service';
import { AuthUser } from '../common/auth-user';
import { RoleCode, QuotationStatus } from '../common/enums';
import { Quotation } from './quotation.entity';
import { QuotationsService } from './quotations.service';

describe('QuotationsService.delete', () => {
  const quotation = { id: 1, quotationNumber: 'Q-001', status: QuotationStatus.LOCKED } as Quotation;
  const manager = {
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const transaction = jest.fn(async (work: (manager: EntityManager) => Promise<unknown>) =>
    work(manager as unknown as EntityManager));
  const dataSource = { transaction } as unknown as DataSource;
  const service = new QuotationsService(
    {} as Repository<Quotation>,
    dataSource,
    {} as CalcService,
    {} as ConfigService,
  );
  const managerUser: AuthUser = { id: 2, email: 'manager@example.test', fullName: 'Manager', role: RoleCode.MANAGER };
  const employeeUser: AuthUser = { ...managerUser, role: RoleCode.EMPLOYEE };

  beforeEach(() => {
    jest.clearAllMocks();
    manager.findOne.mockResolvedValue(quotation);
    manager.remove.mockResolvedValue(quotation);
  });

  it('deletes a cancelled quotation and returns its audit label', async () => {
    await expect(service.delete(1, managerUser)).resolves.toEqual({ id: 1, quotationNumber: 'Q-001' });
    expect(manager.findOne).toHaveBeenCalledWith(Quotation, { where: { id: 1 }, lock: { mode: 'pessimistic_write' } });
    expect(manager.remove).toHaveBeenCalledWith(Quotation, quotation);
  });

  it('refuses employees even when the service is called directly', async () => {
    await expect(service.delete(1, employeeUser)).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('does not delete a quotation that is not cancelled', async () => {
    manager.findOne.mockResolvedValue({ ...quotation, status: QuotationStatus.DRAFT });
    await expect(service.delete(1, managerUser)).rejects.toBeInstanceOf(ConflictException);
    expect(manager.remove).not.toHaveBeenCalled();
  });

  it('reports a missing quotation', async () => {
    manager.findOne.mockResolvedValue(null);
    await expect(service.delete(1, managerUser)).rejects.toBeInstanceOf(NotFoundException);
    expect(manager.remove).not.toHaveBeenCalled();
  });
});
