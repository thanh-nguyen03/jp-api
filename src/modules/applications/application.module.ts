import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  ApplicationService,
  ApplicationServiceImpl,
} from './application.service';
import { ApplicationController } from './controllers/application.controller';
import { FilesModule } from '../files/file.module';
import { MailModule } from '../mail/mail.module';
import { ManageApplicationController } from './controllers/manage-application.controller';
import { AmqpModule } from '../amqp/amqp.module';

@Module({
  imports: [PrismaModule, FilesModule, MailModule, AmqpModule],
  controllers: [ApplicationController, ManageApplicationController],
  providers: [
    {
      provide: ApplicationService,
      useClass: ApplicationServiceImpl,
    },
  ],
  exports: [ApplicationService],
})
export class ApplicationModule {}
