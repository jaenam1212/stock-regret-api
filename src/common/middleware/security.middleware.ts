import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 보안 헤더 설정
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // HTTPS 강제 (프로덕션에서만)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // 의심스러운 User-Agent 차단
    const userAgent = req.headers['user-agent'] || '';
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /http/i,
      /^$/,
    ];

    // 허용된 봇들 (구글, 빙 등)
    const allowedBots = [
      /googlebot/i,
      /bingbot/i,
      /slurp/i,
      /duckduckbot/i,
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    const isAllowedBot = allowedBots.some(pattern => pattern.test(userAgent));

    if (isSuspicious && !isAllowedBot) {
      console.warn(`Suspicious request blocked: ${req.ip} - ${userAgent}`);
      return res.status(403).json({
        message: 'Access denied',
        statusCode: 403,
        error: 'Forbidden'
      });
    }

    // 의심스러운 경로 차단
    const suspiciousPaths = [
      /\/wp-admin/i,
      /\/admin/i,
      /\/phpmyadmin/i,
      /\/config/i,
      /\/env/i,
      /\.env/i,
      /\/\.git/i,
      /\/backup/i,
      /\/sql/i,
      /\/db/i,
    ];

    if (suspiciousPaths.some(pattern => pattern.test(req.path))) {
      console.warn(`Suspicious path blocked: ${req.ip} - ${req.path}`);
      return res.status(404).json({
        message: 'Not found',
        statusCode: 404,
        error: 'Not Found'
      });
    }

    next();
  }
}