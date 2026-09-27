import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  const port = Number(process.env.API_PORT || 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`Athena API listening on http://localhost:${port}`);
}

void bootstrap();
