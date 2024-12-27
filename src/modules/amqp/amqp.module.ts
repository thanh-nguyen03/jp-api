import { Module } from '@nestjs/common';
import { AmqpService } from './amqp.service';
import { AmqpConfigModule } from '../../config/amqp/amqp-config.module';

@Module({
  imports: [AmqpConfigModule],
  providers: [AmqpService],
  exports: [AmqpService],
})
export class AmqpModule {}
