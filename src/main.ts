import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://stock-regret-8thaihnqm-jaenam1212s-projects.vercel.app',
    ],
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Stock Regret API is running on: http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
}
void bootstrap();
