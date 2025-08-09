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
  const defaultOrigins = ['http://localhost:3000', 'http://localhost:3001'];
  const origins = parsedOrigins.length > 0 ? parsedOrigins : defaultOrigins;

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Stock Regret API is running on: http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
}
void bootstrap();
