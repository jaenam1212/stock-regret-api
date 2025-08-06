import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway.js';
import { RedisModule } from '../redis/redis.module.js';
import { LoggingModule } from '../logging/logging.module.js';

@Module({
  imports: [RedisModule, LoggingModule],
  providers: [ChatGateway],
})
export class ChatModule {}
