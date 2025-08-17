import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StockModule } from './stock/stock.module.js';
import { ChatModule } from './chat/chat.module.js';
import { LoggingModule } from './logging/logging.module.js';
import { SecurityMiddleware } from './common/middleware/security.middleware.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    StockModule,
    ChatModule,
    LoggingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*');
  }
}
