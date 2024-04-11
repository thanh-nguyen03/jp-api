import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class AppLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const startTime = Date.now();

    response.on('finish', () => {
      const { ip, method, originalUrl: url } = request;
      const userAgent = request.get('user-agent') || '';
      const { statusCode } = response;
      const contentLength = response.get('content-length');
      const duration = Date.now() - startTime;
      const userId = (request as any)?.user?.id ?? '-';

      this.logger.log(
        `${ip} ${method} ${url} ${statusCode} ${contentLength} - ${userAgent} ${userId} \x1b[33m+${duration}ms \x1b[0m`,
      );
    });

    next();
  }
}
