import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private requests = new Map<string, RateLimitRecord>();
  private readonly maxRequests = 100; // 1분당 100개 요청
  private readonly windowMs = 60000; // 1분

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIP = this.getClientIP(request);
    
    if (!this.isAllowed(clientIP)) {
      throw new HttpException(
        {
          message: 'Too many requests from this IP',
          statusCode: 429,
          error: 'Too Many Requests'
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  private getClientIP(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    const realIP = request.headers['x-real-ip'] as string;
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return request.ip || 'unknown';
  }

  private isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record) {
      this.requests.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (now > record.resetTime) {
      this.requests.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count >= this.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  // 정기적으로 만료된 레코드 정리
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// 정리 작업을 5분마다 실행
setInterval(() => {
  // 싱글톤 패턴으로 전역 인스턴스에서 정리
}, 300000);