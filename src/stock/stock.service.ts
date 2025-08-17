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

  private CRYPTO_KEYWORDS = [
    // 영어 이름
    'bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana', 'polkadot', 'dogecoin',
    'avalanche', 'polygon', 'chainlink', 'cosmos', 'fantom', 'near', 'algorand',
    'flow', 'apecoin', 'tezos', 'elrond', 'axie-infinity', 'decentraland', 'sandbox',
    'enjincoin', 'gala', 'chromaway', 'litecoin', 'ripple', 'tether',
    // 영어 심볼
    'btc', 'eth', 'bnb', 'ada', 'sol', 'dot', 'doge', 'avax', 'matic', 'link',
    'atom', 'ftm', 'near', 'algo', 'flow', 'ape', 'xtz', 'egld', 'axs', 'mana',
    'sand', 'enj', 'gala', 'chr', 'ltc', 'xrp', 'usdt', 'usdc',
    // 한글 이름
    '비트코인', '이더리움', '바이낸스코인', '에이다', '솔라나', '폴카닷', '도지코인',
    '아발란체', '폴리곤', '체인링크', '코스모스', '팬텀', '니어', '알고랜드',
    '플로우', '에이프코인', '테조스', '디센트럴랜드', '샌드박스', '엔진코인',
    '갈라', '라이트코인', '리플', '테더'
  ];

  private isKoreanStock(symbol: string): boolean {
    // 6자리 숫자인 경우 한국 주식으로 판단
    return /^\d{6}$/.test(symbol);
  }

  private isCrypto(symbol: string): boolean {
    const normalizedSymbol = symbol.toLowerCase().trim();
    return this.CRYPTO_KEYWORDS.includes(normalizedSymbol);
  }

  private formatSymbolForYahoo(symbol: string): string {
    // 한국 주식인 경우 .KS 접미사 추가
    if (this.isKoreanStock(symbol)) {
      return `${symbol}.KS`;
    }
    // 암호화폐인 경우 -USD 접미사 추가 (Yahoo Finance 암호화폐 형식)
    if (this.isCrypto(symbol)) {
      return `${symbol.toUpperCase()}-USD`;
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
      const isCrypto = this.isCrypto(symbol);
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
          companyName: result.meta?.longName || `${symbol.toUpperCase()} ${isCrypto ? '' : 'Inc.'}`,
          currency: isKorean ? 'KRW' : (result.meta?.currency || 'USD'),
          exchangeName: isKorean ? 'KRX' : (isCrypto ? 'Crypto' : (result.meta?.exchangeName || 'NASDAQ')),
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
