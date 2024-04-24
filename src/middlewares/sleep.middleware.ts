import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class SleepMiddleware implements NestMiddleware {
  use(_req: any, _res: any, next: () => void) {
    setTimeout(() => next(), Math.random() * 800);
  }
}
