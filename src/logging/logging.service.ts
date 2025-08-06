import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';

interface UserActivity {
  userId: string;
  action: string;
  symbol?: string;
  timestamp: number;
  ip?: string;
  userAgent?: string;
}

export interface DailyStats {
  date: string;
  uniqueUsers: number;
  totalVisits: number;
  popularSymbols: string[];
  chatMessages: number;
}

@Injectable()
export class LoggingService {
  constructor(private readonly redisService: RedisService) {}

  async logUserActivity(activity: UserActivity): Promise<void> {
    // 로깅 비활성화 옵션 (환경변수로 제어 가능)
    if (process.env.DISABLE_LOGGING === 'true') {
      return;
    }

    const date = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();

    // Redis 파이프라인으로 배치 처리
    const pipeline = this.redisService.pipeline;

    // 일별 사용자 활동 로그 (최대 1000개만 보관)
    const dailyKey = `logs:daily:${date}`;
    pipeline.lpush(dailyKey, JSON.stringify(activity));
    pipeline.ltrim(dailyKey, 0, 999); // 최대 1000개만 유지
    pipeline.expire(dailyKey, 7 * 24 * 60 * 60); // 7일만 보관

    // 시간별 통계
    const hourlyKey = `stats:hourly:${date}:${hour}`;
    pipeline.incr(hourlyKey);
    pipeline.expire(hourlyKey, 24 * 60 * 60);

    // 고유 사용자 카운트 (일별)
    const uniqueUsersKey = `stats:unique:${date}`;
    pipeline.sadd(uniqueUsersKey, activity.userId);
    pipeline.expire(uniqueUsersKey, 7 * 24 * 60 * 60);

    // 인기 주식 심볼 카운트
    if (activity.symbol) {
      const symbolKey = `stats:symbols:${date}`;
      pipeline.zincrby(symbolKey, 1, activity.symbol);
      pipeline.expire(symbolKey, 7 * 24 * 60 * 60);
    }

    // 채팅 메시지 카운트
    if (activity.action === 'sendMessage') {
      const chatKey = `stats:chat:${date}`;
      pipeline.incr(chatKey);
      pipeline.expire(chatKey, 7 * 24 * 60 * 60);
    }

    // 배치 실행
    await pipeline.exec();
  }

  async getDailyStats(date: string): Promise<DailyStats> {
    const uniqueUsersKey = `stats:unique:${date}`;
    const chatKey = `stats:chat:${date}`;
    const symbolKey = `stats:symbols:${date}`;

    const [uniqueUsers, chatMessages, popularSymbols] = await Promise.all([
      this.redisService.scard(uniqueUsersKey),
      this.redisService.get(chatKey),
      this.redisService.zrevrange(symbolKey, 0, 9, 'WITHSCORES'),
    ]);

    // 총 방문 수 계산 (시간별 통계 합계)
    const hourlyKeys: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      hourlyKeys.push(`stats:hourly:${date}:${hour}`);
    }

    const hourlyStats = await Promise.all(
      hourlyKeys.map((key) => this.redisService.get(key)),
    );

    const totalVisits = hourlyStats.reduce(
      (sum, count) => sum + parseInt(count || '0'),
      0,
    );

    // 인기 주식 심볼 파싱
    const symbols: string[] = [];
    for (let i = 0; i < popularSymbols.length; i += 2) {
      if (popularSymbols[i] && popularSymbols[i + 1]) {
        symbols.push(popularSymbols[i]);
      }
    }

    return {
      date,
      uniqueUsers: uniqueUsers || 0,
      totalVisits,
      popularSymbols: symbols,
      chatMessages: parseInt(chatMessages || '0'),
    };
  }

  async getWeeklyStats(startDate?: string): Promise<DailyStats[]> {
    const stats: DailyStats[] = [];
    const today = new Date();
    const start = startDate ? new Date(startDate) : new Date(today);
    start.setDate(start.getDate() - 6); // 7일 전부터

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // 오늘 이후 날짜는 제외
      if (date <= today) {
        stats.push(await this.getDailyStats(dateStr));
      }
    }

    return stats;
  }

  async getMonthlyStats(year: number, month: number): Promise<DailyStats[]> {
    const stats: DailyStats[] = [];
    const today = new Date();
    const endDate = new Date(year, month, 0);
    const daysInMonth = endDate.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = date.toISOString().split('T')[0];

      // 오늘 이후 날짜는 제외
      if (date <= today) {
        stats.push(await this.getDailyStats(dateStr));
      }
    }

    return stats;
  }
}
