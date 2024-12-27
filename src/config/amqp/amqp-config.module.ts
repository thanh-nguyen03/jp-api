import { Module } from '@nestjs/common';
import { AmqpConfig } from './amqp.config';

@Module({
  providers: [AmqpConfig],
  exports: [AmqpConfig],
})
export class AmqpConfigModule {}
