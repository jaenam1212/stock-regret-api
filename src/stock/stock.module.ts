import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [ConfigModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
