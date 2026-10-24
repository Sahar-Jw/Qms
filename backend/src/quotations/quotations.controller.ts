import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Header, Logger, Param, ParseIntPipe, Patch, Post, Query, ServiceUnavailableException, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MinRole } from '../common/decorators/min-role.decorator';
import { RoleCode } from '../common/enums';
import { MailService, mailErrorCode } from '../mail/mail.service';
import { PdfService } from '../pdf/pdf.service';
import { ChangeStatusDto, CreateQuotationDto, DuplicateQuotationDto, ListQuotationsDto, PrintQueryDto, SendQuotationEmailDto, UpdateQuotationDto } from './dto/quotation.dto';
import { QuotationsService } from './quotations.service';

@ApiTags('quotations')
@Controller('quotations')
export class QuotationsController {
  private readonly logger = new Logger(QuotationsController.name);

  constructor(
    private readonly quotations: QuotationsService,
    private readonly pdf: PdfService,
    private readonly mail: MailService,
  ) {}

  @Get()
  list(@Query() q: ListQuotationsDto, @CurrentUser() me: AuthUser) {
    return this.quotations.list(q, me);
  }

  @Post()
  create(@Body() dto: CreateQuotationDto, @CurrentUser() me: AuthUser) {
    return this.quotations.create(dto, me);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: AuthUser) {
    return this.quotations.findOne(id, me);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuotationDto, @CurrentUser() me: AuthUser) {
    return this.quotations.update(id, dto, me);
  }

  @Delete(':id')
  @MinRole(RoleCode.MANAGER)
  delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: AuthUser) {
    return this.quotations.delete(id, me);
  }

  /** Full copy of an existing quotation as a new draft (editable with PATCH afterwards). */
  @Post(':id/duplicate')
  duplicate(@Param('id', ParseIntPipe) id: number, @Body() dto: DuplicateQuotationDto, @CurrentUser() me: AuthUser) {
    return this.quotations.duplicate(id, dto, me);
  }

  /** Status workflow: draft / expired -> locked (cancelled) or invoiced; expiry is automatic. */
  @Post(':id/status')
  changeStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: ChangeStatusDto, @CurrentUser() me: AuthUser) {
    return this.quotations.changeStatus(id, dto, me);
  }

  /** Print-ready HTML (works on any host). Use ?autoprint=true to open the print dialog directly. */
  @Get(':id/print')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data: 'self'; font-src data:; frame-src 'self'; script-src 'unsafe-inline'")
  async print(@Param('id', ParseIntPipe) id: number, @Query() q: PrintQueryDto, @CurrentUser() me: AuthUser) {
    const view = await this.quotations.findOne(id, me);
    return this.pdf.renderHtml(view, { lang: q.lang, includeCost: this.costAllowed(q, me), autoPrint: q.autoprint, linkCatalogImages: !q.inline });
  }

  /** PDF (Chromium). Falls back to 503 PDF_ENGINE_UNAVAILABLE where Chromium cannot run - use /print there. */
  @Get(':id/pdf')
  async pdfFile(@Param('id', ParseIntPipe) id: number, @Query() q: PrintQueryDto, @CurrentUser() me: AuthUser) {
    const view = await this.quotations.findOne(id, me);
    const buf = await this.pdf.renderPdf(view, { lang: q.lang, includeCost: this.costAllowed(q, me) });
    return new StreamableFile(buf, { type: 'application/pdf', disposition: `inline; filename="${view.quotationNumber}-${q.lang}.pdf"` });
  }

  /**
   * Sends the quotation as a PDF attachment to the customer (draft or invoiced quotations only).
   * The browser sends the PDF it already built in `file` (works on hosting without Chromium); without it the server builds one.
   */
  @Post(':id/email')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 18 * 1024 * 1024, files: 1 } }))
  async email(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendQuotationEmailDto,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @CurrentUser() me: AuthUser,
  ) {
    const view = await this.quotations.findOne(id, me);
    if (!view.emailable) {
      throw new ConflictException({ code: 'QUOTATION_NOT_EMAILABLE', message: 'Only a draft or an invoiced quotation can be sent by e-mail' });
    }
    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException({ code: 'MAIL_NOT_CONFIGURED', message: 'E-mail sending is not set up on the server (MAIL_HOST / MAIL_USER / MAIL_PASS)' });
    }
    let pdf: Buffer;
    if (file?.buffer?.length) {
      if (file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
        throw new BadRequestException({ code: 'INVALID_FILE_TYPE', message: 'The attachment must be a PDF file' });
      }
      pdf = file.buffer;
    } else {
      pdf = await this.pdf.renderPdf(view, { lang: dto.lang, includeCost: !!dto.includeCost });
    }
    const ar = dto.lang === 'ar';
    const company = view.company.name ?? '';
    const subject = dto.subject?.trim() || (ar ? `عرض سعر ${view.quotationNumber}` : `Quotation ${view.quotationNumber}`);
    const message = dto.message?.trim() || (ar
      ? `السادة ${view.customer.companyName ?? ''} المحترمين،\n\nتجدون في المرفق عرض السعر رقم ${view.quotationNumber}.\n\nمع التحية،\n${company}`
      : `Dear ${view.customer.companyName ?? 'Sir / Madam'},\n\nPlease find attached quotation ${view.quotationNumber}.\n\nBest regards,\n${company}`);
    try {
      await this.mail.sendQuotation({ to: dto.to, subject, message, lang: dto.lang, filename: `${view.quotationNumber}-${dto.lang}.pdf`, pdf, replyTo: view.company.email ?? undefined });
    } catch (e) {
      const code = mailErrorCode(e);
      this.logger.error(`Quotation e-mail failed (${code}): ${(e as Error).message}`);
      throw new ServiceUnavailableException({ code, message: `The e-mail could not be sent (${code})` });
    }
    return { sent: true, to: dto.to, quotationNumber: view.quotationNumber };
  }

  private costAllowed(q: PrintQueryDto, _me: AuthUser): boolean {
    return !!q.includeCost;
  }
}
