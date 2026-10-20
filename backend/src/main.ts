import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import * as fs from 'fs';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { uploadsRoot } from './config/uploads';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const prod = process.env.NODE_ENV === 'production';

  app.set('trust proxy', 1); // behind cPanel / Passenger / nginx: correct client IP for rate limiting
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // allow the frontend origin to show uploaded logos
  app.use(compression()); // gzip JSON and the /print pages (skipped for already-compressed images / PDFs)
  app.use(cookieParser());

  const origins = (process.env.FRONTEND_URLS || 'http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  fs.mkdirSync(uploadsRoot(), { recursive: true });
  app.useStaticAssets(uploadsRoot(), {
    prefix: '/uploads/',
    // Catalog files are named catalog-<random hex>.<ext> and never change under that name: the browser may keep them for a year.
    // Everything else (logos, avatars, header / footer pictures) keeps the default so a replaced picture shows at once.
    setHeaders: (res, filePath) => {
      if (/[\\/]materials[\\/]catalog-[a-f0-9]{32}\.(png|jpg|webp|pdf|docx)$/.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  });

  if (!prod) {
    const cfg = new DocumentBuilder().setTitle('QMS API').setDescription('Quotation Management System').setVersion('1.0').addCookieAuth(process.env.COOKIE_NAME || 'qms_token').build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, cfg));
  }

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  new Logger('Bootstrap').log(`QMS API listening on :${port} (${prod ? 'production' : 'development'})`);
}

bootstrap();
