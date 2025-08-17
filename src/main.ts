import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  const originsEnv = process.env.CORS_ORIGINS || '';
  const parsedOrigins = originsEnv
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'https://stock-regret.vercel.app',
    'https://stock-regret-rcoktizzu-jaenam1212s-projects.vercel.app',
    'https://asalggul.kr',
    'https://www.asalggul.kr',
  ];
  const origins = parsedOrigins.length > 0 ? parsedOrigins : defaultOrigins;

  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Stock Regret API is running on: http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
}
void bootstrap();
