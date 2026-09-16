import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: false });
  const port = Number(process.env.PORT || 3402);
  await app.listen(port, '0.0.0.0');
  console.log(`OSS Business Rules PoC API listening on ${port}`);
}
bootstrap();
