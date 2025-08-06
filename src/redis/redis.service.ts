import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    // Railway 환경변수에서 Redis 설정 가져오기
    const redisUrl = process.env.REDIS_URL;

    console.log('🔍 Redis 환경변수 확인:');
    console.log('REDIS_URL:', redisUrl);
    console.log('REDIS_HOST:', process.env.REDIS_HOST);
    console.log('REDIS_PORT:', process.env.REDIS_PORT);

    if (redisUrl) {
      // Railway Redis URL 사용
      console.log('🚀 Railway Redis URL 사용');
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
      });
    } else {
      // 로컬 개발용 Redis 설정
      console.log('🏠 로컬 Redis 설정 사용');
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
      });
    }

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
      // 에러 발생 시에도 앱이 계속 실행되도록
      console.log('⚠️ Redis 연결 실패, 일부 기능이 제한될 수 있습니다.');
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async lpush(key: string, value: string): Promise<void> {
    await this.redis.lpush(key, value);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.redis.lrange(key, start, stop);
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    await this.redis.ltrim(key, start, stop);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }

  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  async sadd(key: string, member: string): Promise<number> {
    return await this.redis.sadd(key, member);
  }

  async scard(key: string): Promise<number> {
    return await this.redis.scard(key);
  }

  async zincrby(
    key: string,
    increment: number,
    member: string,
  ): Promise<string> {
    return await this.redis.zincrby(key, increment, member);
  }

  async zrevrange(
    key: string,
    start: number,
    stop: number,
    withScores?: 'WITHSCORES',
  ): Promise<string[]> {
    if (withScores) {
      return await this.redis.zrevrange(key, start, stop, 'WITHSCORES');
    }
    return await this.redis.zrevrange(key, start, stop);
  }

  // 파이프라인 메서드 추가
  get pipeline() {
    return this.redis.pipeline();
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
