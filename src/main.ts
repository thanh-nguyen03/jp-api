import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as process from 'process';
import { JsonNullInterceptor } from './interceptors/json-null.interceptor';
import { HttpExceptionFilter } from './exceptions/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = process.env.PORT || 8081;

  app.useGlobalInterceptors(new JsonNullInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(PORT, () =>
    console.log(`Server is running on port ${PORT}`),
  );
}
bootstrap();
