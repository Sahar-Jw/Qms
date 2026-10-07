import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { DataSource, EntityManager } from 'typeorm';
import { CalcService } from '../calc/calc.service';
import { QuotationStatus, RoleCode } from '../common/enums';
import { Company } from '../companies/company.entity';
import { Customer } from '../customers/customer.entity';
import { Material } from '../materials/material.entity';
import { QuotationItemAmount } from '../quotations/quotation-item-amount.entity';
import { QuotationItem } from '../quotations/quotation-item.entity';
import { Quotation } from '../quotations/quotation.entity';
import { Sequence } from '../quotations/sequence.entity';
import { Role } from '../roles/role.entity';
import { AppSetting } from '../settings/app-setting.entity';
import { User } from '../users/user.entity';
import { buildDataSourceOptions } from './data-source-options';

const DEMO_PASSWORD = 'DemoQms2026';
const calc = new CalcService();

const roleUsers = [
  { role: RoleCode.TECHNICAL_MANAGER, email: 'demo-technical@qms.test', name: 'Demo Technical Manager', nameAr: 'مدير تقني تجريبي', nameEn: 'Technical Manager' },
  { role: RoleCode.GENERAL_MANAGER, email: 'demo-general@qms.test', name: 'Demo General Manager', nameAr: 'مدير عام تجريبي', nameEn: 'General Manager' },
  { role: RoleCode.MANAGER, email: 'demo-manager@qms.test', name: 'Demo Manager', nameAr: 'مدير تجريبي', nameEn: 'Manager' },
  { role: RoleCode.EMPLOYEE, email: 'demo-employee@qms.test', name: 'Demo Employee', nameAr: 'موظف تجريبي', nameEn: 'Employee' },
] as const;

const companySeeds = [
  { name: 'Demo Sanabil Trading', address: 'Damascus, Syria', phone: '+963 11 555 0100', email: 'info@sanabil.demo', website: 'https://sanabil.demo', active: true },
  { name: 'Demo Horizon Supplies', address: 'Aleppo, Syria', phone: '+963 21 555 0200', email: 'info@horizon.demo', website: 'https://horizon.demo', active: true },
  { name: 'Demo Inactive Company', address: 'Latakia, Syria', phone: '+963 41 555 0300', email: 'info@inactive.demo', website: null, active: false },
] as const;

const customerSeeds = [
  { key: 'nour', companyName: 'Al Nour Contracting', email: 'office@nour.demo', phone: ['+963 11 222 3300', '+963 944 100 200'], country: 'Syria', managerName: 'Ali Hassan', businessNature: 'Construction', active: true },
  { key: 'rafidain', companyName: 'Al Rafidain Establishment', email: 'sales@rafidain.demo', phone: ['+964 1 555 0101'], country: 'Iraq', managerName: 'Zaid Karim', businessNature: 'General trading', active: true },
  { key: 'gulf', companyName: 'Gulf Machinery LLC', email: 'sales@gulfmachinery.demo', phone: ['+971 4 555 0100'], country: 'UAE', managerName: 'John Mathew', businessNature: 'Industrial machinery', active: true },
  { key: 'modern', companyName: 'Modern Build Company', email: 'contact@modernbuild.demo', phone: ['+962 6 555 0103'], country: 'Jordan', managerName: 'Huda Saleh', businessNature: 'Construction', active: true },
  { key: 'east', companyName: 'East Group Import Export', email: 'office@eastgroup.demo', phone: ['+90 212 555 0100'], country: 'Turkey', managerName: 'Murat Yilmaz', businessNature: 'Import and export', active: true },
  { key: 'manar', companyName: 'Al Manar Electrical', email: 'rami@manar.demo', phone: ['+961 1 555 0105'], country: 'Lebanon', managerName: 'Rami Daher', businessNature: 'Electrical supplies', active: true },
  { key: 'energy', companyName: 'Gulf Energy Projects', email: 'projects@gulfenergy.demo', phone: ['+966 11 555 0100'], country: 'Saudi Arabia', managerName: 'Fahad Otaibi', businessNature: 'Renewable energy', active: true },
  { key: 'inactive', companyName: 'Inactive Demo Customer', email: 'inactive@customer.demo', phone: ['+963 933 555 111'], country: 'Syria', managerName: 'Demo Contact', businessNature: 'Inactive example', active: false },
] as const;

const materialSeeds = [
  { code: 'DEMO-PMP-100', name: 'Water pump 2HP', source: 'Pedrollo', stock: '1000', price: '1250', unit: 'pcs', currency: 'USD', origin: 'Italy', catalogue: 'PMP-2026', model: 'JSWm 2AX', active: true },
  { code: 'DEMO-PMP-210', name: 'Submersible pump 5HP', source: 'Pedrollo', stock: '500', price: '2890', unit: 'pcs', currency: 'USD', origin: 'Italy', catalogue: 'PMP-2026', model: '4SR 5/13', active: true },
  { code: 'DEMO-PIP-200', name: 'Copper pipe 22mm', source: 'Wieland', stock: '5000', price: '18.5', unit: 'm', currency: 'EUR', origin: 'Germany', catalogue: 'COPPER-22', model: 'W22', active: true },
  { code: 'DEMO-PIP-310', name: 'PVC pipe 110mm', source: 'AquaPipe', stock: '6000', price: '4.25', unit: 'm', currency: 'USD', origin: 'Turkey', catalogue: 'PVC-110', model: 'PN16', active: true },
  { code: 'DEMO-GEN-500', name: 'Diesel generator 50kW', source: 'Perkins', stock: '30', price: '18400', unit: 'pcs', currency: 'USD', origin: 'United Kingdom', catalogue: 'PK-2026', model: '404D-22G', active: true },
  { code: 'DEMO-GEN-250', name: 'Petrol generator 5kW', source: 'PowerPro', stock: '120', price: '950', unit: 'pcs', currency: 'USD', origin: 'Japan', catalogue: 'PP-5000', model: 'GX390', active: true },
  { code: 'DEMO-CBL-035', name: 'Power cable 35mm', source: 'CableTech', stock: '10000', price: '7.8', unit: 'm', currency: 'USD', origin: 'Syria', catalogue: 'CB-35', model: 'CU-XLPE', active: true },
  { code: 'DEMO-FLT-077', name: 'Industrial water filter', source: 'PureFlow', stock: '700', price: '13.5', unit: 'pcs', currency: 'USD', origin: 'Germany', catalogue: 'PF-77', model: 'PF-077', active: true },
  { code: 'DEMO-TNK-900', name: 'Water storage tank 900L', source: 'AquaStore', stock: '250', price: '420', unit: 'pcs', currency: 'USD', origin: 'Turkey', catalogue: 'AS-900', model: 'ST-900', active: true },
  { code: 'DEMO-VAL-010', name: 'Brass control valve', source: 'ValveWorks', stock: '1800', price: '32', unit: 'pcs', currency: 'EUR', origin: 'Italy', catalogue: 'VW-10', model: 'BV-10', active: true },
  { code: 'DEMO-PNL-120', name: 'Solar panel 550W', source: 'SunPeak', stock: '900', price: '145', unit: 'pcs', currency: 'USD', origin: 'China', catalogue: 'SP-550', model: 'SP550-M10', active: true },
  { code: 'DEMO-LGT-008', name: 'LED floodlight 200W', source: 'BrightWorks', stock: '2000', price: '68', unit: 'pcs', currency: 'USD', origin: 'China', catalogue: 'BW-200', model: 'FL-200', active: true },
  { code: 'DEMO-OFF-001', name: 'Inactive demo material', source: 'Demo supplier', stock: '0', price: '10', unit: 'pcs', currency: 'USD', origin: 'Syria', catalogue: null, model: null, active: false },
] as const;

type ItemSeed = { code: string; quantity: string; unitCost?: string; shipping?: string; shippingCurrency?: string; customs?: string; customsCurrency?: string; commission?: string; notes?: string };
type QuoteSeed = {
  number: string; status: QuotationStatus; creator: RoleCode; company: number; customer: string; daysAgo: number; validityDays: number | null;
  bank?: string; payment?: string; delivery?: string; notes?: string; responsible?: RoleCode; items: ItemSeed[];
};

const quoteSeeds: QuoteSeed[] = [
  { number: 'DEMO-000001', status: QuotationStatus.DRAFT, creator: RoleCode.TECHNICAL_MANAGER, company: 0, customer: 'nour', daysAgo: 1, validityDays: 30, bank: 'Demo Commercial Bank', payment: '30% advance, balance on delivery', delivery: '2 weeks', items: [{ code: 'DEMO-PMP-100', quantity: '4', unitCost: '900', shipping: '120', customs: '45' }, { code: 'DEMO-PIP-200', quantity: '80', unitCost: '11', commission: '2.5' }] },
  { number: 'DEMO-000002', status: QuotationStatus.DRAFT, creator: RoleCode.GENERAL_MANAGER, company: 1, customer: 'gulf', daysAgo: 0, validityDays: 14, payment: 'Letter of credit', delivery: '4 weeks', items: [{ code: 'DEMO-GEN-500', quantity: '1', unitCost: '15200', shipping: '850', customs: '1200', notes: 'Includes standard commissioning kit' }] },
  { number: 'DEMO-000003', status: QuotationStatus.EXPIRED, creator: RoleCode.MANAGER, company: 0, customer: 'rafidain', daysAgo: 45, validityDays: -31, bank: 'Rafidain Partner Bank', payment: 'Bank transfer', delivery: '3 weeks', items: [{ code: 'DEMO-CBL-035', quantity: '250', unitCost: '5.2' }, { code: 'DEMO-FLT-077', quantity: '20', unitCost: '8' }] },
  { number: 'DEMO-000004', status: QuotationStatus.EXPIRED, creator: RoleCode.EMPLOYEE, company: 1, customer: 'modern', daysAgo: 60, validityDays: -39, payment: 'Cash on delivery', delivery: 'Ex-stock', items: [{ code: 'DEMO-TNK-900', quantity: '2', unitCost: '300', shipping: '75' }] },
  { number: 'DEMO-000005', status: QuotationStatus.LOCKED, creator: RoleCode.MANAGER, company: 0, customer: 'east', daysAgo: 8, validityDays: 30, notes: 'Cancelled after customer postponed the project.', items: [{ code: 'DEMO-PNL-120', quantity: '40', unitCost: '110' }, { code: 'DEMO-VAL-010', quantity: '25', unitCost: '18', customs: '60', customsCurrency: 'EUR' }] },
  { number: 'DEMO-000006', status: QuotationStatus.LOCKED, creator: RoleCode.EMPLOYEE, company: 1, customer: 'manar', daysAgo: 12, validityDays: 10, notes: 'Cancelled at the customer request.', items: [{ code: 'DEMO-LGT-008', quantity: '16', unitCost: '48', shipping: '35' }] },
  { number: 'DEMO-000007', status: QuotationStatus.INVOICED, creator: RoleCode.GENERAL_MANAGER, company: 0, customer: 'energy', daysAgo: 20, validityDays: 14, bank: 'Demo International Bank', payment: '40% advance, 60% on delivery', delivery: '5 weeks', items: [{ code: 'DEMO-PNL-120', quantity: '8', unitCost: '108', shipping: '210', customs: '80' }, { code: 'DEMO-PIP-200', quantity: '120', unitCost: '12', customs: '35', customsCurrency: 'USD' }] },
  { number: 'DEMO-000008', status: QuotationStatus.INVOICED, creator: RoleCode.EMPLOYEE, company: 1, customer: 'nour', daysAgo: 5, validityDays: 30, payment: 'Full payment on delivery', delivery: '1 week', items: [{ code: 'DEMO-PMP-210', quantity: '2', unitCost: '2100', shipping: '95' }] },
];

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
const daysFromToday = (days: number) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return dateOnly(date);
};

async function saveFixture(manager: EntityManager) {
  const roleRepo = manager.getRepository(Role);
  const userRepo = manager.getRepository(User);
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = new Map<RoleCode, User>();
  for (const spec of roleUsers) {
    let role = await roleRepo.findOneBy({ code: spec.role });
    if (!role) role = await roleRepo.save(roleRepo.create({ code: spec.role, nameAr: spec.nameAr, nameEn: spec.nameEn }));
    let user = await userRepo.findOneBy({ email: spec.email });
    if (!user) user = userRepo.create();
    Object.assign(user, {
      fullName: spec.name, email: spec.email, phone: null, passwordHash: hash, role,
      avatar: null, issuingCompanyId: null, isActive: true, failedAttempts: 0, lockedUntil: null, lastLoginAt: null,
    });
    users.set(spec.role, await userRepo.save(user));
  }

  const technicalManager = users.get(RoleCode.TECHNICAL_MANAGER);
  if (!technicalManager) throw new Error('Test technical manager could not be created');

  const companyRepo = manager.getRepository(Company);
  const companies: Company[] = [];
  for (const spec of companySeeds) {
    let company = await companyRepo.findOneBy({ name: spec.name });
    if (!company) company = companyRepo.create();
    Object.assign(company, {
      name: spec.name, logo: null, address: spec.address, phone: spec.phone, email: spec.email, website: spec.website,
      isActive: spec.active, createdById: technicalManager.id, updatedById: technicalManager.id,
    });
    companies.push(await companyRepo.save(company));
  }
  for (const [index, spec] of roleUsers.entries()) {
    const user = users.get(spec.role);
    if (user) await userRepo.update({ id: user.id }, { issuingCompanyId: companies[index % 2].id });
  }

  const customerRepo = manager.getRepository(Customer);
  const customers = new Map<string, Customer>();
  for (const spec of customerSeeds) {
    let customer = await customerRepo.findOneBy({ companyName: spec.companyName });
    if (!customer) customer = customerRepo.create();
    Object.assign(customer, {
      companyName: spec.companyName, email: spec.email, phone: [...spec.phone], country: spec.country,
      website: null, managerName: spec.managerName, businessNature: spec.businessNature, notes: `Demo record: ${spec.key}`,
      isActive: spec.active, createdById: technicalManager.id, updatedById: technicalManager.id,
    });
    customers.set(spec.key, await customerRepo.save(customer));
  }

  const materialRepo = manager.getRepository(Material);
  const materials = new Map<string, Material>();
  for (const spec of materialSeeds) {
    let material = await materialRepo.findOneBy({ materialCode: spec.code });
    if (!material) material = materialRepo.create();
    Object.assign(material, {
      materialCode: spec.code, name: spec.name, source: spec.source, stockQuantity: spec.stock,
      unitPrice: spec.price, unit: spec.unit, currency: spec.currency, countryOfOrigin: spec.origin,
      catalogue: spec.catalogue, modelNumber: spec.model, catalogueNumber: null, isActive: spec.active,
      createdById: technicalManager.id, updatedById: technicalManager.id,
    });
    materials.set(spec.code, await materialRepo.save(material));
  }

  await manager.query("DELETE FROM quotations WHERE quotation_number LIKE 'DEMO-%'");
  await manager.query(
    `UPDATE sequences SET value = GREATEST(value, 0) WHERE name = 'quotation'`,
  );

  const quoteRepo = manager.getRepository(Quotation);
  const itemRepo = manager.getRepository(QuotationItem);
  const amountRepo = manager.getRepository(QuotationItemAmount);
  for (const spec of quoteSeeds) {
    const creator = users.get(spec.creator);
    const customer = customers.get(spec.customer);
    if (!creator || !customer) throw new Error(`Missing test owner or customer for ${spec.number}`);
    const responsible = users.get(spec.responsible ?? spec.creator);
    const quotation = await quoteRepo.save(quoteRepo.create({
      quotationNumber: spec.number,
      quotationDate: daysFromToday(-spec.daysAgo),
      status: spec.status,
      companyId: companies[spec.company].id,
      customerId: customer.id,
      responsibleUserId: responsible?.id ?? creator.id,
      customerPaymentMethod: spec.payment ?? null,
      bankName: spec.bank ?? null,
      validity: spec.validityDays === null ? null : daysFromToday(spec.validityDays),
      deliveryTime: spec.delivery ?? null,
      paymentMethod: spec.payment ?? null,
      paymentLocation: 'As agreed with the customer',
      deliveryMethod: 'Road freight',
      taxPercentage: '5',
      notes: spec.notes ?? null,
      createdById: creator.id,
      updatedById: creator.id,
    }));

    for (const [sortOrder, line] of spec.items.entries()) {
      const material = materials.get(line.code);
      if (!material) throw new Error(`Missing test material ${line.code}`);
      const item = await itemRepo.save(itemRepo.create({
        quotationId: quotation.id,
        materialId: material.id,
        materialCode: material.materialCode,
        materialName: material.name,
        unit: material.unit,
        sortOrder,
        quantity: line.quantity,
        unitPrice: material.unitPrice,
        priceCurrency: material.currency ?? 'USD',
        unitCost: line.unitCost ?? null,
        costCurrency: line.unitCost ? material.currency : null,
        shippingCost: line.shipping ?? null,
        shippingCurrency: line.shipping ? line.shippingCurrency ?? material.currency : null,
        customsCost: line.customs ?? null,
        customsCurrency: line.customs ? line.customsCurrency ?? material.currency : null,
        commissionPercentage: line.commission ?? null,
        notes: line.notes ?? null,
      }));
      const { amounts } = calc.calcItem(item);
      if (amounts.length) {
        await amountRepo.insert(amounts.map((amount) => ({ itemId: item.id, ...amount })));
      }
    }
  }

  for (const spec of materialSeeds) {
    const material = materials.get(spec.code);
    if (!material) throw new Error(`Missing test material ${spec.code}`);
    let invoicedQuantity = 0;
    for (const q of quoteSeeds.filter((quote) => quote.status === QuotationStatus.INVOICED)) {
      for (const line of q.items.filter((item) => item.code === spec.code)) invoicedQuantity += Number(line.quantity);
    }
    if (invoicedQuantity) {
      material.stockQuantity = (Number(spec.stock) - invoicedQuantity).toFixed(3);
      material.updatedById = technicalManager.id;
      await materialRepo.save(material);
    }
  }

  const sequenceRepo = manager.getRepository(Sequence);
  if (!(await sequenceRepo.findOneBy({ name: 'quotation' }))) {
    await sequenceRepo.save(sequenceRepo.create({ name: 'quotation', value: 0 }));
  }
  const settingRepo = manager.getRepository(AppSetting);
  await settingRepo.save({ key: 'theme', value: { ink: '#291C0E', cocoa: '#6E473B', clay: '#A78D78', stone: '#BEB5A9', sand: '#E1D4C2' }, updatedById: technicalManager.id });
  await settingRepo.save({
    key: 'brand',
    value: { websiteName: 'QMS Demo', tagline: 'Complete quotation testing workspace', logo: null, icon: null },
    updatedById: technicalManager.id,
  });
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed demo data in production');
  const ds = new DataSource(buildDataSourceOptions());
  await ds.initialize();
  try {
    await ds.transaction(saveFixture);
    console.log(`Demo dataset seeded in database "${process.env.DB_NAME || '(DB_NAME not set)'}".`);
    console.log(`Accounts (shared password: ${DEMO_PASSWORD}):`);
    for (const spec of roleUsers) console.log(`  ${spec.role}: ${spec.email}`);
    console.log(`Created/updated ${companySeeds.length} companies, ${customerSeeds.length} customers, ${materialSeeds.length} materials, and ${quoteSeeds.length} quotations.`);
    console.log('Running the command again rebuilds only the DEMO-* quotations and updates the named demo records.');
  } finally {
    await ds.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
