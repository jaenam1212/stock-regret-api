import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StockService } from './stock.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';

@Controller('api/stock')
@UseGuards(RateLimitGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('data')
  async getStockData(@Query('symbol') symbol: string = 'NVDA'): Promise<any> {
    return this.stockService.getStockData(symbol);
  }

  @Get('exchange-rate')
  async getExchangeRate(
    @Query('from') from: string = 'KRW',
    @Query('to') to: string = 'USD',
  ) {
    return this.stockService.getExchangeRate(from, to);
  }
}
