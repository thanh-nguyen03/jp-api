import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { AmqpConfig } from '../../config/amqp/amqp.config';

@Injectable()
export class AmqpService implements OnModuleDestroy {
  private clients: Map<string, ClientProxy> = new Map();

  constructor(private readonly amqpConfig: AmqpConfig) {}

  private createClient(queue: string): ClientProxy {
    return ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [this.amqpConfig.uri],
        queue,
        queueOptions: {
          durable: true,
        },
      },
    });
  }

  getClient(queue: string): ClientProxy {
    if (!this.clients.has(queue)) {
      const client = this.createClient(queue);
      this.clients.set(queue, client);
    }
    return this.clients.get(queue);
  }

  emitMessage(queue: string, pattern: string, data: any) {
    const client = this.getClient(queue);
    return client.emit(pattern, data);
  }

  onModuleDestroy() {
    this.clients.forEach((client) => client.close());
  }
}
