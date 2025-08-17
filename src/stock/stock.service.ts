import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface StockDataItem {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface YahooFinanceResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
        adjclose: Array<{
          adjclose: number[];
        }>;
      };
      meta: {
        longName?: string;
        currency?: string;
        exchangeName?: string;
      };
    }>;
  };
}

interface ExchangeRateResponse {
  result: string;
  rates: Record<string, number>;
}

@Injectable()
export class StockService {
  constructor(private configService: ConfigService) {}

  private isKoreanStock(symbol: string): boolean {
    // 6자리 숫자인 경우 한국 주식으로 판단
    return /^\d{6}$/.test(symbol);
  }

  private formatSymbolForYahoo(symbol: string): string {
    // 한국 주식인 경우 .KS 접미사 추가
    if (this.isKoreanStock(symbol)) {
      return `${symbol}.KS`;
    }
    return symbol;
  }

  async getStockData(symbol: string) {
    try {
      const yahooSymbol = this.formatSymbolForYahoo(symbol);
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=0&period2=9999999999&interval=1d`;

      const response = await axios.get<YahooFinanceResponse>(yahooUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const data = response.data;

      if (!data.chart?.result?.[0]) {
        throw new HttpException(
          'No data found for symbol',
          HttpStatus.NOT_FOUND,
        );
      }

      const result = data.chart.result[0];
      const timestamps = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0] || {};
      const adjclose = result.indicators?.adjclose?.[0]?.adjclose || [];

      const isKorean = this.isKoreanStock(symbol);
      const formattedData: StockDataItem[] = timestamps
        .map((timestamp: number, index: number) => ({
          time: String(timestamp),
          open: Number((quotes.open?.[index] || 0).toFixed(isKorean ? 0 : 2)),
          high: Number((quotes.high?.[index] || 0).toFixed(isKorean ? 0 : 2)),
          low: Number((quotes.low?.[index] || 0).toFixed(isKorean ? 0 : 2)),
          close: Number(
            (adjclose[index] || quotes.close?.[index] || 0).toFixed(isKorean ? 0 : 2),
          ),
          volume: quotes.volume?.[index] || 0,
        }))
        .filter(
          (item: StockDataItem) =>
            item.open > 0 && item.high > 0 && item.low > 0 && item.close > 0,
        );

      const currentPrice = formattedData[formattedData.length - 1]?.close || 0;
      const previousPrice = formattedData[formattedData.length - 2]?.close || 0;
      const change = currentPrice - previousPrice;
      const changePercent =
        previousPrice > 0 ? (change / previousPrice) * 100 : 0;

      return {
        symbol: symbol.toUpperCase(),
        currentPrice,
        change,
        changePercent,
        data: formattedData,
        meta: {
          companyName: result.meta?.longName || `${symbol.toUpperCase()} Inc.`,
          currency: this.isKoreanStock(symbol) ? 'KRW' : (result.meta?.currency || 'USD'),
          exchangeName: this.isKoreanStock(symbol) ? 'KRX' : (result.meta?.exchangeName || 'NASDAQ'),
          lastUpdated: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Yahoo Finance API Error:', error);
      throw new HttpException(
        'Failed to fetch stock data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getExchangeRate(from: string, to: string) {
    try {
      const url = `https://open.er-api.com/v6/latest/${from}`;

      const response = await axios.get<ExchangeRateResponse>(url);

      if (!response.data.result || response.data.result !== 'success') {
        throw new Error('Failed to fetch exchange rate');
      }

      const rate = response.data.rates[to];
      if (!rate) {
        throw new Error('Currency not found');
      }

      // 환율 변환: 1 USD = ? KRW 형태로 변환
      const convertedRate = 1 / rate;

      return {
        fromCurrency: from,
        toCurrency: to,
        rate: convertedRate,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Exchange Rate API Error:', error);

      // API 실패 시 기본값 반환
      return {
        fromCurrency: from,
        toCurrency: to,
        rate: 1350,
        lastUpdated: new Date().toISOString(),
        isFallback: true,
      };
    }
  }
}
