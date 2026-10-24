import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger, Optional } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { requestInfo } from '../../audit/request-info';

/** Failures that go in the audit log besides every 403 (permission denied): the error code -> the action name. */
const AUDITED_FAILURES: Record<string, string> = {
  WRONG_CURRENT_PASSWORD: 'change_password_failed',
  INVALID_RESET_TOKEN: 'reset_password_failed',
};

/**
 * Uniform error body: { statusCode, code, message, details? }.
 * The frontend maps `code` to a localized message (Arabic/English).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  constructor(@Optional() private readonly audit?: AuditService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown;
    let extra: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = HttpStatus[status] ?? 'ERROR';
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const b = body as Record<string, any>;
        if (b.code) code = b.code;
        const { statusCode: _s, code: _c, message: _m, error: _e, ...rest } = b;
        extra = rest;
        if (Array.isArray(b.message)) {
          code = 'VALIDATION_FAILED';
          message = 'Validation failed';
          details = b.message;
        } else {
          message = b.message ?? exception.message;
        }
      }
    } else if (exception instanceof QueryFailedError) {
      const err = exception as any;
      const mysqlCode = err.code ?? err.driverError?.code;
      const sqlMessage = String(err.sqlMessage ?? err.driverError?.sqlMessage ?? err.message ?? '');
      const camel = (c: string) => c.replace(/_([a-z])/g, (_m, ch: string) => ch.toUpperCase());
      if (mysqlCode === 'ER_DUP_ENTRY') {
        status = HttpStatus.CONFLICT;
        code = 'DUPLICATE_ENTRY';
        message = 'A record with the same unique value already exists';
        extra = { value: /Duplicate entry '(.*)' for key/.exec(sqlMessage)?.[1] ?? '' };
      } else if (mysqlCode === 'ER_DATA_TOO_LONG') {
        status = HttpStatus.BAD_REQUEST;
        code = 'VALUE_TOO_LONG';
        message = 'A value is too long';
        extra = { field: camel(/column '(\w+)'/.exec(sqlMessage)?.[1] ?? '') };
      } else if (mysqlCode === 'ER_WARN_DATA_OUT_OF_RANGE' || mysqlCode === 'ER_DATA_OUT_OF_RANGE' || mysqlCode === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || mysqlCode === 'ER_TRUNCATED_WRONG_VALUE') {
        status = HttpStatus.BAD_REQUEST;
        code = 'NUMBER_OUT_OF_RANGE';
        message = 'A number or value is outside the allowed range';
        extra = { field: camel(/column '(\w+)'/.exec(sqlMessage)?.[1] ?? '') };
      } else if (mysqlCode === 'ER_BAD_NULL_ERROR') {
        status = HttpStatus.BAD_REQUEST;
        code = 'REQUIRED_VALUE_MISSING';
        message = 'A required value is missing';
        extra = { field: camel(/Column '(\w+)'/.exec(sqlMessage)?.[1] ?? '') };
      } else if (mysqlCode === 'ER_LOCK_DEADLOCK' || mysqlCode === 'ER_LOCK_WAIT_TIMEOUT') {
        status = HttpStatus.CONFLICT;
        code = 'TRY_AGAIN';
        message = 'The record is busy, try again';
      } else if (mysqlCode === 'ER_ROW_IS_REFERENCED_2' || mysqlCode === 'ER_NO_REFERENCED_ROW_2') {
        status = HttpStatus.CONFLICT;
        code = 'REFERENCE_CONFLICT';
        message = 'The record is referenced by other data';
      } else {
        this.logger.error(err.message, err.stack);
      }
    } else {
      const sysCode = (exception as { code?: string })?.code;
      if (sysCode && ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'ER_CON_COUNT_ERROR', 'ENOTFOUND'].includes(sysCode)) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        code = 'DATABASE_UNAVAILABLE';
        message = 'The database is not reachable right now';
      }
      this.logger.error((exception as Error)?.message, (exception as Error)?.stack);
    }

    if (exception instanceof HttpException) this.auditFailure(host.switchToHttp().getRequest<Request>(), status, code);
    res.status(status).json({ statusCode: status, code, message, ...extra, ...(details ? { details } : {}) });
  }

  /** Permission denied (403) and failed password changes / resets. Fire and forget: logging must never change the answer. */
  private auditFailure(req: Request | undefined, status: number, code: string) {
    if (!this.audit || !req?.path) return;
    const action = status === HttpStatus.FORBIDDEN ? 'denied' : AUDITED_FAILURES[code];
    if (!action) return;
    const info = requestInfo(req as any);
    // a failed sign-in is already recorded (as login_failed) by the audit interceptor
    if (info.entity === 'auth' && info.segs[1] === 'login') return;
    void this.audit.record({
      userId: info.userId, userName: info.userName, userRole: info.userRole,
      action, entity: info.entity, entityId: info.entityId, entityLabel: null,
      method: info.method, path: info.path, ip: info.ip,
      details: { request: `${info.method} ${info.path}`, code, status },
    });
  }
}
