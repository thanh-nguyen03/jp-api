import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class JsonNullInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> | Promise<Observable<any>> {
    return next.handle().pipe(map((data) => this.handleJsonNull(data)));
  }

  private handleJsonNull(data: any) {
    const removeNull = (obj: any) => {
      for (const key in obj) {
        if (obj[key] === null) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          removeNull(obj[key]);
        }
      }
    };
    removeNull(data);
    return data;
  }
}
