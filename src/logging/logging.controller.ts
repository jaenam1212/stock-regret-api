import { Controller, Get, Query } from '@nestjs/common';
import { LoggingService } from './logging.service.js';

@Controller('api/stats')
export class LoggingController {
  constructor(private readonly loggingService: LoggingService) {}

  @Get('daily')
  async getDailyStats(@Query('date') date: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.loggingService.getDailyStats(targetDate);
  }

  @Get('weekly')
  async getWeeklyStats(@Query('startDate') startDate: string) {
    const targetStartDate = startDate || new Date().toISOString().split('T')[0];
    return this.loggingService.getWeeklyStats(targetStartDate);
  }

  @Get('monthly')
  async getMonthlyStats(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;
    return this.loggingService.getMonthlyStats(targetYear, targetMonth);
  }
}
