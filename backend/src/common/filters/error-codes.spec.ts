import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { mailErrorCode } from '../../mail/mail.service';
import { AllExceptionsFilter } from './all-exceptions.filter';

function run(exception: unknown) {
  let out: { status?: number; body?: any } = {};
  const res = { status: (s: number) => ({ json: (b: any) => { out = { status: s, body: b }; } }) };
  const host = { switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({}) }) } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return out;
}
const sql = (code: string, sqlMessage: string) => Object.assign(new QueryFailedError('q', [], Object.assign(new Error(sqlMessage), { code, sqlMessage })), { code, sqlMessage });

describe('error codes the screen can explain', () => {
  it('duplicate entry says which value', () => {
    const r = run(sql('ER_DUP_ENTRY', "Duplicate entry 'RI 53' for key 'materials.IDX_x'"));
    expect(r.status).toBe(HttpStatus.CONFLICT);
    expect(r.body).toMatchObject({ code: 'DUPLICATE_ENTRY', value: 'RI 53' });
  });
  it('too long / out of range name the column in camelCase', () => {
    expect(run(sql('ER_DATA_TOO_LONG', "Data too long for column 'bank_name' at row 1")).body).toMatchObject({ code: 'VALUE_TOO_LONG', field: 'bankName' });
    expect(run(sql('ER_WARN_DATA_OUT_OF_RANGE', "Out of range value for column 'unit_price' at row 1")).body).toMatchObject({ code: 'NUMBER_OUT_OF_RANGE', field: 'unitPrice' });
  });
  it('a database that is down is a 503, not a generic 500', () => {
    const r = run(Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }));
    expect(r.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(r.body.code).toBe('DATABASE_UNAVAILABLE');
  });
  it('mail failures are told apart', () => {
    expect(mailErrorCode({ code: 'EAUTH', responseCode: 535 })).toBe('MAIL_AUTH_FAILED');
    expect(mailErrorCode({ code: 'ETIMEDOUT' })).toBe('MAIL_CONNECTION_FAILED');
    expect(mailErrorCode({ code: 'EENVELOPE' })).toBe('MAIL_RECIPIENT_REJECTED');
    expect(mailErrorCode({ responseCode: 552 })).toBe('MAIL_TOO_LARGE');
    expect(mailErrorCode(new Error('boom'))).toBe('MAIL_SEND_FAILED');
  });
});
