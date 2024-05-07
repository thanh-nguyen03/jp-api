import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class SleepMiddleware implements NestMiddleware {
  use(_req: any, _res: any, next: () => void) {
    // only on development
    if (process.env.NODE_ENV !== 'development') {
      next();
      return;
    }
    setTimeout(() => next(), Math.random() * 800);
  }
}
