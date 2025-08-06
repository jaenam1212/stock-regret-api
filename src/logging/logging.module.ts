import { Module } from '@nestjs/common';
import { LoggingService } from './logging.service.js';
import { LoggingController } from './logging.controller.js';
import { RedisModule } from '../redis/redis.module.js';

@Module({
  imports: [RedisModule],
  controllers: [LoggingController],
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}
