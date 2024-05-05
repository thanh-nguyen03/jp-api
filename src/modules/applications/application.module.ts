import { Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import {
  ApplicationService,
  ApplicationServiceImpl,
} from './application.service';
import { ApplicationController } from './controllers/application.controller';
import { FilesModule } from '../files/file.module';
import { MailModule } from '../../config/mail/mail.module';
import { ManageApplicationController } from './controllers/manage-application.controller';

@Module({
  imports: [PrismaModule, FilesModule, MailModule],
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
