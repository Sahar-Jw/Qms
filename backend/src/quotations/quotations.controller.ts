import { Body, Controller, ForbiddenException, Get, Header, Param, ParseIntPipe, Patch, Post, Query, StreamableFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MinRole } from '../common/decorators/min-role.decorator';
import { ROLE_RANK, RoleCode } from '../common/enums';
import { PdfService } from '../pdf/pdf.service';
import { ChangeStatusDto, CreateQuotationDto, DuplicateQuotationDto, ListQuotationsDto, PrintQueryDto, UpdateQuotationDto } from './dto/quotation.dto';
import { QuotationsService } from './quotations.service';

@ApiTags('quotations')
@Controller('quotations')
export class QuotationsController {
  constructor(
    private readonly quotations: QuotationsService,
    private readonly pdf: PdfService,
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

  /** Full copy of an existing quotation as a new draft (editable with PATCH afterwards). */
  @Post(':id/duplicate')
  duplicate(@Param('id', ParseIntPipe) id: number, @Body() dto: DuplicateQuotationDto, @CurrentUser() me: AuthUser) {
    return this.quotations.duplicate(id, dto, me);
  }

  /** Status workflow: draft -> issued -> expired / locked / invoiced. See TRANSITIONS in the service. */
  @Post(':id/status')
  changeStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: ChangeStatusDto, @CurrentUser() me: AuthUser) {
    return this.quotations.changeStatus(id, dto, me);
  }

  /** Print-ready HTML (works on any host). Use ?autoprint=true to open the print dialog directly. */
  @Get(':id/print')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; script-src 'unsafe-inline'")
  async print(@Param('id', ParseIntPipe) id: number, @Query() q: PrintQueryDto, @CurrentUser() me: AuthUser) {
    const view = await this.quotations.findOne(id, me);
    return this.pdf.renderHtml(view, { lang: q.lang, includeCost: this.costAllowed(q, me), autoPrint: q.autoprint });
  }

  /** PDF (Chromium). Falls back to 503 PDF_ENGINE_UNAVAILABLE where Chromium cannot run - use /print there. */
  @Get(':id/pdf')
  async pdfFile(@Param('id', ParseIntPipe) id: number, @Query() q: PrintQueryDto, @CurrentUser() me: AuthUser) {
    const view = await this.quotations.findOne(id, me);
    const buf = await this.pdf.renderPdf(view, { lang: q.lang, includeCost: this.costAllowed(q, me) });
    return new StreamableFile(buf, { type: 'application/pdf', disposition: `inline; filename="${view.quotationNumber}-${q.lang}.pdf"` });
  }

  private costAllowed(q: PrintQueryDto, me: AuthUser): boolean {
    if (!q.includeCost) return false;
    if (ROLE_RANK[me.role] < ROLE_RANK[RoleCode.MANAGER]) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Only managers can print cost lines' });
    }
    return true;
  }
}
