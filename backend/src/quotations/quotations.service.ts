import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { DataSource, EntityManager, In, ObjectLiteral, Repository } from 'typeorm';
import { CalcService } from '../calc/calc.service';
import { AuthUser } from '../common/auth-user';
import { Paginated, paginated } from '../common/dto/pagination.dto';
import { QuotationStatus } from '../common/enums';
import { canEditQuotation, canSeeLocked, isTopTier } from '../common/policy';
import { Company } from '../companies/company.entity';
import { Customer } from '../customers/customer.entity';
import { Material } from '../materials/material.entity';
import { User } from '../users/user.entity';
import { ChangeStatusDto, CreateQuotationDto, DuplicateQuotationDto, ListQuotationsDto, QuotationItemDto, UpdateQuotationDto } from './dto/quotation.dto';
import { QuotationItemAmount } from './quotation-item-amount.entity';
import { QuotationItem } from './quotation-item.entity';
import { Quotation } from './quotation.entity';
import { ItemView, QuotationView } from './quotation-view';
import { Sequence } from './sequence.entity';

const NEXT_STATUSES: Record<QuotationStatus, QuotationStatus[]> = {
  [QuotationStatus.DRAFT]: [QuotationStatus.LOCKED, QuotationStatus.INVOICED],
  [QuotationStatus.EXPIRED]: [QuotationStatus.LOCKED, QuotationStatus.INVOICED],
  [QuotationStatus.LOCKED]: [],
  [QuotationStatus.INVOICED]: [],
};

const EDITABLE = new Set([QuotationStatus.DRAFT, QuotationStatus.EXPIRED]);

@Injectable()
export class QuotationsService {
  constructor(
    @InjectRepository(Quotation) private readonly repo: Repository<Quotation>,
    private readonly dataSource: DataSource,
    private readonly calc: CalcService,
    private readonly config: ConfigService,
  ) {}

  // ------------------------------------------------------------------ helpers

  /** Employees must not even know that a locked quotation exists. */
  private hideLockedFrom(user: AuthUser, status: QuotationStatus) {
    if (status === QuotationStatus.LOCKED && !canSeeLocked(user.role)) {
      throw new NotFoundException({ code: 'QUOTATION_NOT_FOUND', message: 'Quotation not found' });
    }
  }

  /** Cost is open to every role (employees included). */
  private canEditCost(_user: AuthUser) {
    return true;
  }

  allowedStatuses(status: QuotationStatus, canUseStatus: boolean): QuotationStatus[] {
    if (!canUseStatus) return [];
    return NEXT_STATUSES[status];
  }

  /** Expiration follows the offer-validity date; expired quotes can return to draft if their validity is extended. */
  private async refreshExpiryStatuses() {
    await this.dataSource.query(
      `UPDATE quotations
          SET status = CASE
            WHEN validity IS NOT NULL AND validity < CURRENT_DATE THEN ?
            ELSE ?
          END
        WHERE status = 'issued'
           OR (status = ? AND validity IS NOT NULL AND validity < CURRENT_DATE)
           OR (status = ? AND (validity IS NULL OR validity >= CURRENT_DATE))`,
      [
        QuotationStatus.EXPIRED,
        QuotationStatus.DRAFT,
        QuotationStatus.DRAFT,
        QuotationStatus.EXPIRED,
      ],
    );
  }

  private assertPercent(v: string | null | undefined, field: string) {
    if (v !== undefined && v !== null && new Decimal(v).gt(100)) {
      throw new BadRequestException({ code: 'INVALID_PERCENTAGE', message: `${field} must be between 0 and 100` });
    }
  }

  private assertValidityDate(quotationDate: string | null | undefined, validity: string | null | undefined) {
    if (quotationDate && validity && validity < quotationDate) {
      throw new BadRequestException({
        code: 'VALIDITY_BEFORE_QUOTATION_DATE',
        message: 'The validity date cannot be before the quotation date',
      });
    }
  }

  private async assertActive(m: EntityManager, entity: new () => ObjectLiteral, id: number, code: string, label: string) {
    const row = await m.findOne(entity as any, { where: { id } as any });
    if (!row) throw new BadRequestException({ code: `${code}_NOT_FOUND`, message: `${label} not found` });
    if ((row as any).isActive === false) throw new BadRequestException({ code: `${code}_INACTIVE`, message: `${label} is inactive` });
  }

  /** The company comes from the user's settings, never from the request. */
  private async resolveIssuingCompanyId(m: EntityManager, userId: number): Promise<number> {
    const u = await m.findOne(User, { where: { id: userId } });
    let companyId = u?.issuingCompanyId ?? null;
    if (!companyId) {
      const active = await m.find(Company, { where: { isActive: true }, take: 2 });
      if (active.length === 1) companyId = active[0].id; // only one company exists: use it
      else throw new BadRequestException({ code: 'ISSUING_COMPANY_NOT_SET', message: 'Choose the issuing company in the settings first' });
    }
    await this.assertActive(m, Company, companyId, 'ISSUING_COMPANY', 'Issuing company');
    return companyId;
  }

  private async nextNumber(m: EntityManager): Promise<string> {
    const repo = m.getRepository(Sequence);
    const lock = () => repo.findOne({ where: { name: 'quotation' }, lock: { mode: 'pessimistic_write' } });
    let seq = await lock();
    if (!seq) {
      await m.query('INSERT IGNORE INTO sequences (name, value) VALUES (?, 0)', ['quotation']);
      seq = (await lock())!;
    }
    seq.value += 1;
    await repo.save(seq);
    const prefix = this.config.get<string>('QUOTATION_PREFIX') ?? 'QT-';
    return `${prefix}${String(seq.value).padStart(6, '0')}`;
  }

  // ------------------------------------------------------------------ items

  /**
   * Diff-sync the item list: lines with a known id are updated, lines without id are created,
   * existing lines missing from the payload are deleted. Amounts are recalculated per currency.
   * Material snapshots (code / names) are kept for unchanged lines so history never changes.
   */
  private async syncItems(m: EntityManager, quotationId: number, incoming: QuotationItemDto[], user: AuthUser) {
    const canCost = this.canEditCost(user);
    const existing = await m.find(QuotationItem, { where: { quotationId } });
    const existingMap = new Map(existing.map((i) => [i.id, i]));

    for (const inc of incoming) {
      if (inc.id !== undefined && !existingMap.has(inc.id)) {
        throw new BadRequestException({ code: 'ITEM_NOT_IN_QUOTATION', message: `Item ${inc.id} does not belong to this quotation` });
      }
    }

    const keep = new Set(incoming.filter((i) => i.id !== undefined).map((i) => i.id!));
    const removed = existing.filter((e) => !keep.has(e.id)).map((e) => e.id);
    if (removed.length) {
      await m.delete(QuotationItemAmount, { itemId: In(removed) });
      await m.delete(QuotationItem, { id: In(removed) });
    }

    const materialIds = [...new Set(incoming.map((i) => i.materialId))];
    const materials = await m.find(Material, { where: { id: In(materialIds) } });
    const matMap = new Map(materials.map((x) => [x.id, x]));

    for (let idx = 0; idx < incoming.length; idx++) {
      const inc = incoming[idx];
      const prev = inc.id !== undefined ? existingMap.get(inc.id) : undefined;
      const mat = matMap.get(inc.materialId);
      if (!mat) throw new BadRequestException({ code: 'MATERIAL_NOT_FOUND', message: `Material ${inc.materialId} not found` });
      const materialChanged = !prev || prev.materialId !== mat.id;
      if (materialChanged && !mat.isActive) {
        throw new BadRequestException({ code: 'MATERIAL_INACTIVE', message: `Material ${mat.materialCode} is inactive` });
      }

      const item = prev ?? m.create(QuotationItem, { quotationId });
      if (materialChanged) {
        item.materialCode = mat.materialCode;
        item.materialName = mat.name;
      }
      item.materialId = mat.id;
      item.sortOrder = idx;
      item.unit = inc.unit ?? (materialChanged ? mat.unit : prev!.unit);
      item.quantity = inc.quantity;

      item.unitPrice = inc.unitPrice ?? (materialChanged ? mat.unitPrice : prev!.unitPrice);
      const priceCur = inc.priceCurrency ?? (materialChanged ? mat.currency : prev!.priceCurrency);
      if (!priceCur) {
        throw new BadRequestException({ code: 'PRICE_CURRENCY_REQUIRED', message: `Price currency is required for material ${mat.materialCode}` });
      }
      item.priceCurrency = priceCur;

      // Cost: Manager/Admin only. Employees cannot set or change it (existing values are preserved).
      if (canCost) {
        item.unitCost = inc.unitCost ?? null;
        item.costCurrency = inc.unitCost != null ? inc.costCurrency! : null;
      } else if (!prev) {
        item.unitCost = null;
        item.costCurrency = null;
      }

      item.shippingCost = inc.shippingCost ?? null;
      item.shippingCurrency = inc.shippingCost != null ? inc.shippingCurrency! : null;
      item.customsCost = inc.customsCost ?? null;
      item.customsCurrency = inc.customsCost != null ? inc.customsCurrency! : null;

      this.assertPercent(inc.commissionPercentage, 'commissionPercentage');
      item.commissionPercentage = inc.commissionPercentage ?? null;
      this.assertPercent(inc.taxPercentage, 'taxPercentage');
      item.taxPercentage = inc.taxPercentage;
      item.notes = inc.notes ?? null;

      const saved = await m.save(QuotationItem, item);
      const { amounts } = this.calc.calcItem(saved);
      await m.delete(QuotationItemAmount, { itemId: saved.id });
      await m.insert(QuotationItemAmount, amounts.map((a) => ({ itemId: saved.id, ...a })));
    }
  }

  // ------------------------------------------------------------------ create / update

  async create(dto: CreateQuotationDto, user: AuthUser): Promise<QuotationView> {
    const id = await this.dataSource.transaction(async (m) => {
      const companyId = await this.resolveIssuingCompanyId(m, user.id);
      if (dto.companyId !== undefined && dto.companyId !== companyId) {
        throw new BadRequestException({ code: 'COMPANY_MISMATCH', message: 'Quotations are issued from the company chosen in the settings' });
      }
      await this.assertActive(m, Customer, dto.customerId, 'CUSTOMER', 'Customer');
      const quotationDate = dto.quotationDate ?? new Date().toISOString().slice(0, 10);
      this.assertValidityDate(quotationDate, dto.validity);
      const responsibleId = user.id;
      await this.assertActive(m, User, responsibleId, 'USER', 'Responsible user');

      const { items, ...header } = dto;
      const q = m.create(Quotation, {
        ...header,
        companyId,
        quotationNumber: await this.nextNumber(m),
        quotationDate,
        status: QuotationStatus.DRAFT,
        responsibleUserId: responsibleId,
        createdById: user.id,
        updatedById: user.id,
      });
      const saved = await m.save(Quotation, q);
      await this.syncItems(m, saved.id, items, user);
      return saved.id;
    });
    return this.findOne(id, user);
  }

  async update(id: number, dto: UpdateQuotationDto, user: AuthUser): Promise<QuotationView> {
    await this.dataSource.transaction(async (m) => {
      // Lock the row so two concurrent edits / status changes cannot interleave.
      const q = await m.findOne(Quotation, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!q) throw new NotFoundException({ code: 'QUOTATION_NOT_FOUND', message: 'Quotation not found' });
      this.hideLockedFrom(user, q.status);
      if (!canEditQuotation(user, q.createdById)) {
        throw new ForbiddenException({ code: 'NOT_OWNER', message: 'You can only edit the quotations you created' });
      }
      if (!EDITABLE.has(q.status)) {
        throw new ConflictException({ code: 'QUOTATION_READ_ONLY', message: `A ${q.status} quotation cannot be edited` });
      }

      const { items, ...header } = dto;
      for (const key of ['customerId', 'quotationDate'] as const) {
        if (header[key] === null) throw new BadRequestException({ code: 'FIELD_REQUIRED', message: `${key} cannot be cleared` });
      }
      this.assertValidityDate(
        header.quotationDate === undefined ? q.quotationDate : header.quotationDate,
        header.validity === undefined ? q.validity : header.validity,
      );
      if (header.customerId !== undefined && header.customerId !== q.customerId) await this.assertActive(m, Customer, header.customerId, 'CUSTOMER', 'Customer');
      if (header.responsibleUserId && header.responsibleUserId !== q.responsibleUserId) {
        await this.assertActive(m, User, header.responsibleUserId, 'USER', 'Responsible user');
      }

      if (header.companyId !== undefined && header.companyId !== q.companyId) {
        throw new BadRequestException({ code: 'COMPANY_CANNOT_CHANGE', message: 'The issuing company of an existing quotation cannot be changed' });
      }
      delete (header as Record<string, unknown>).companyId;
      for (const [k, v] of Object.entries(header)) {
        if (v !== undefined) (q as any)[k] = v;
      }
      q.updatedById = user.id;
      await m.save(Quotation, q);
      if (items) await this.syncItems(m, id, items, user);
    });
    return this.findOne(id, user);
  }


  // ------------------------------------------------------------------ duplicate

  /**
   * "Full copy of a previous quotation, editable afterwards" (SRS boss note).
   * New number, today's date, status draft. Items, amounts, costs and snapshots are copied as-is.
   */
  async duplicate(id: number, dto: DuplicateQuotationDto, user: AuthUser): Promise<QuotationView> {
    const newId = await this.dataSource.transaction(async (m) => {
      const src = await m.findOne(Quotation, { where: { id } });
      if (!src) throw new NotFoundException({ code: 'QUOTATION_NOT_FOUND', message: 'Quotation not found' });
      this.hideLockedFrom(user, src.status);

      const companyId = await this.resolveIssuingCompanyId(m, user.id);
      const customerId = dto.customerId ?? src.customerId;
      await this.assertActive(m, Customer, customerId, 'CUSTOMER', 'Customer');
      const resp = src.responsibleUserId ? await m.findOne(User, { where: { id: src.responsibleUserId } }) : null;

      const copy = m.create(Quotation, {
        quotationNumber: await this.nextNumber(m),
        quotationDate: new Date().toISOString().slice(0, 10),
        status: QuotationStatus.DRAFT,
        companyId,
        customerId,
        responsibleUserId: resp?.isActive ? resp.id : user.id,
        customerPaymentMethod: src.customerPaymentMethod,
        bankName: src.bankName,
        validity: src.validity,
        deliveryTime: src.deliveryTime,
        paymentMethod: src.paymentMethod,
        paymentLocation: src.paymentLocation,
        deliveryMethod: src.deliveryMethod,
        notes: src.notes,
        createdById: user.id,
        updatedById: user.id,
      });
      const saved = await m.save(Quotation, copy);

      const items = await m.find(QuotationItem, { where: { quotationId: id }, order: { sortOrder: 'ASC', id: 'ASC' } });
      for (const it of items) {
        const { id: _id, quotationId: _q, ...rest } = it as QuotationItem & { amounts?: unknown };
        delete (rest as { amounts?: unknown }).amounts;
        const clone = await m.save(QuotationItem, m.create(QuotationItem, { ...rest, quotationId: saved.id }));
        const { amounts } = this.calc.calcItem(clone);
        await m.insert(QuotationItemAmount, amounts.map((a) => ({ itemId: clone.id, ...a })));
      }
      return saved.id;
    });
    return this.findOne(newId, user);
  }

  // ------------------------------------------------------------------ status

  async changeStatus(id: number, dto: ChangeStatusDto, user: AuthUser): Promise<QuotationView> {
    await this.refreshExpiryStatuses();
    await this.dataSource.transaction(async (m) => {
      const q = await m.findOne(Quotation, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!q) throw new NotFoundException({ code: 'QUOTATION_NOT_FOUND', message: 'Quotation not found' });
      this.hideLockedFrom(user, q.status);
      const ownsQuotation = q.createdById === user.id;
      const canUseStatus = isTopTier(user.role) || ownsQuotation;
      if (!canUseStatus) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only change the status of quotations you created' });
      }
      if (!NEXT_STATUSES[q.status].includes(dto.status)) {
        throw new ConflictException({ code: 'INVALID_STATUS_TRANSITION', message: `Cannot change status from ${q.status} to ${dto.status}` });
      }

      const prevStatus = q.status;
      q.status = dto.status;
      q.updatedById = user.id;
      await m.save(Quotation, q);

      if (dto.status === QuotationStatus.INVOICED && prevStatus !== QuotationStatus.INVOICED) {
        const items = await m.find(QuotationItem, { where: { quotationId: id } });
        for (const item of items) {
          if (!item.materialId) continue;
          const material = await m.findOne(Material, { where: { id: item.materialId } });
          if (!material) continue;
          const quantity = new Decimal(item.quantity || '0');
          const stock = new Decimal(material.stockQuantity || '0');
          if (stock.minus(quantity).lt(0)) {
            throw new ConflictException({
              code: 'INSUFFICIENT_STOCK',
              message: `Material ${material.materialCode} does not have enough stock to invoice this quotation`,
            });
          }
          material.stockQuantity = stock.minus(quantity).toFixed(3);
          await m.save(Material, material);
        }
      }
    });
    return this.findOne(id, user);
  }

  // ------------------------------------------------------------------ read

  async findOne(id: number, user: AuthUser): Promise<QuotationView> {
    await this.refreshExpiryStatuses();
    const q = await this.repo.findOne({
      where: { id },
      relations: { company: true, customer: true, responsibleUser: true, items: { amounts: true } },
    });
    if (!q) throw new NotFoundException({ code: 'QUOTATION_NOT_FOUND', message: 'Quotation not found' });
    this.hideLockedFrom(user, q.status);
    return this.toView(q, user);
  }

  private toView(q: Quotation, user: AuthUser): QuotationView {
    const items: ItemView[] = [...(q.items ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
      .map((i) => ({
        id: i.id,
        materialId: i.materialId,
        materialCode: i.materialCode,
        materialName: i.materialName,
        unit: i.unit,
        sortOrder: i.sortOrder,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        priceCurrency: i.priceCurrency,
        unitCost: i.unitCost,
        costCurrency: i.costCurrency,
        shippingCost: i.shippingCost,
        shippingCurrency: i.shippingCurrency,
        customsCost: i.customsCost,
        customsCurrency: i.customsCurrency,
        commissionPercentage: i.commissionPercentage,
        taxPercentage: i.taxPercentage,
        notes: i.notes,
        amounts: [...(i.amounts ?? [])]
          .sort((a, b) => a.currency.localeCompare(b.currency))
          .map((a) => ({ currency: a.currency, value: a.value, cost: a.cost, shipping: a.shipping, customs: a.customs, required: a.required })),
      }));

    const co = q.company;
    const cu = q.customer;
    return {
      id: q.id,
      quotationNumber: q.quotationNumber,
      quotationDate: q.quotationDate,
      status: q.status,
      company: {
        id: co.id, name: co.name, logo: co.logo,
        address: co.address, phone: co.phone, email: co.email, website: co.website,
      },
      customer: {
        id: cu.id, companyName: cu.companyName,
        managerName: cu.managerName, phone: cu.phone ?? [], email: cu.email, country: cu.country,
      },
      responsibleUser: q.responsibleUser ? { id: q.responsibleUser.id, fullName: q.responsibleUser.fullName } : null,
      customerPaymentMethod: q.customerPaymentMethod,
      bankName: q.bankName,
      validity: q.validity,
      deliveryTime: q.deliveryTime,
      paymentMethod: q.paymentMethod,
      paymentLocation: q.paymentLocation,
      deliveryMethod: q.deliveryMethod,
      notes: q.notes,
      items,
      totals: this.calc.aggregate(items.map((i) => i.amounts)),
      createdById: q.createdById,
      editable: EDITABLE.has(q.status) && canEditQuotation(user, q.createdById),
      readOnlyReason: !EDITABLE.has(q.status) ? 'status' : !canEditQuotation(user, q.createdById) ? 'not_owner' : null,
      allowedStatuses: this.allowedStatuses(q.status, isTopTier(user.role) || q.createdById === user.id),
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    };
  }

  async list(q: ListQuotationsDto, user: AuthUser): Promise<Paginated<unknown>> {
    await this.refreshExpiryStatuses();
    const seesLocked = canSeeLocked(user.role);
    // Employees never get locked quotations: asking for them returns an empty page.
    if (!seesLocked && (q.status === QuotationStatus.LOCKED || q.archived === true)) return paginated([], 0, q.page, q.limit);

    const qb = this.repo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.company', 'co')
      .leftJoinAndSelect('q.customer', 'cu')
      .leftJoinAndSelect('q.responsibleUser', 'ru');

    if (q.q) {
      // "Full search" (SRS boss note): header fields, company, customer, responsible user AND the item lines.
      qb.andWhere(
        `(q.quotationNumber LIKE :s OR q.quotationDate LIKE :s OR q.bankName LIKE :s OR q.validity LIKE :s OR q.deliveryTime LIKE :s
          OR q.paymentMethod LIKE :s OR q.customerPaymentMethod LIKE :s OR q.paymentLocation LIKE :s OR q.deliveryMethod LIKE :s OR q.notes LIKE :s
          OR co.name LIKE :s
          OR cu.companyName LIKE :s OR cu.managerName LIKE :s OR cu.phone LIKE :s OR cu.country LIKE :s
          OR ru.fullName LIKE :s
          OR EXISTS (SELECT 1 FROM quotation_items qi WHERE qi.quotation_id = q.id
               AND (qi.material_code LIKE :s OR qi.material_name LIKE :s OR qi.notes LIKE :s)))`,
        { s: `%${q.q}%` },
      );
    }
    if (!seesLocked) qb.andWhere('q.status <> :hiddenLocked', { hiddenLocked: QuotationStatus.LOCKED });
    if (q.status) qb.andWhere('q.status = :st', { st: q.status });
    if (q.archived === true) qb.andWhere('q.status = :lk', { lk: QuotationStatus.LOCKED });
    if (q.archived === false) qb.andWhere('q.status <> :lk', { lk: QuotationStatus.LOCKED });
    if (q.companyId) qb.andWhere('q.companyId = :co', { co: q.companyId });
    if (q.customerId) qb.andWhere('q.customerId = :cu', { cu: q.customerId });
    if (q.responsibleUserId) qb.andWhere('q.responsibleUserId = :ru', { ru: q.responsibleUserId });
    if (q.from) qb.andWhere('q.quotationDate >= :from', { from: q.from });
    if (q.to) qb.andWhere('q.quotationDate <= :to', { to: q.to });

    const [rows, total] = await qb
      .orderBy('q.quotationDate', 'DESC')
      .addOrderBy('q.id', 'DESC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit)
      .getManyAndCount();

    // Per-currency totals for the rows on this page (single grouped query).
    const totalsByQ = new Map<number, { currency: string; value: string; required: string }[]>();
    if (rows.length) {
      const raw: { qid: number; currency: string; value: string; required: string }[] = await this.dataSource.query(
        `SELECT qi.quotation_id AS qid, a.currency AS currency, SUM(a.value) AS value, SUM(a.required) AS required
           FROM quotation_item_amounts a JOIN quotation_items qi ON qi.id = a.item_id
          WHERE qi.quotation_id IN (${rows.map(() => '?').join(',')})
          GROUP BY qi.quotation_id, a.currency ORDER BY a.currency`,
        rows.map((r) => r.id),
      );
      for (const r of raw) {
        const list = totalsByQ.get(Number(r.qid)) ?? [];
        list.push({ currency: r.currency, value: new Decimal(r.value).toFixed(4), required: new Decimal(r.required).toFixed(4) });
        totalsByQ.set(Number(r.qid), list);
      }
    }

    const data = rows.map((r) => ({
      id: r.id,
      quotationNumber: r.quotationNumber,
      quotationDate: r.quotationDate,
      status: r.status,
      company: { id: r.company.id, name: r.company.name },
      customer: { id: r.customer.id, companyName: r.customer.companyName },
      responsibleUser: r.responsibleUser ? { id: r.responsibleUser.id, fullName: r.responsibleUser.fullName } : null,
      totals: totalsByQ.get(r.id) ?? [],
    }));
    return paginated(data, total, q.page, q.limit);
  }
}
