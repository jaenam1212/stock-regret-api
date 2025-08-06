import { Controller, Get, Query } from '@nestjs/common';
import { StockService } from './stock.service';

@Controller('api/stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('data')
  async getStockData(@Query('symbol') symbol: string = 'AAPL'): Promise<any> {
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
