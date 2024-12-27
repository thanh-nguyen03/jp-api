import { Injectable } from '@nestjs/common';
import { IAmqpConfig } from './amqp-config.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AmqpConfig implements IAmqpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  vhost: string;
  uri: string;

  constructor(configService: ConfigService) {
    this.host = configService.get('amqp').host;
    this.port = configService.get('amqp').port;
    this.user = configService.get('amqp').user;
    this.password = configService.get('amqp').password;
    this.vhost = configService.get('amqp').vhost;
    this.uri = `amqp://${this.user}:${this.password}@${this.host}:${this.port}/${this.vhost}`;
    console.log(this.uri);
  }
}
