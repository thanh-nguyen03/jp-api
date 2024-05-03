import { Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import {
  ApplicationService,
  ApplicationServiceImpl,
} from './application.service';
import { ApplicationController } from './controllers/application.controller';
import { FilesModule } from '../files/file.module';

@Module({
  imports: [PrismaModule, FilesModule],
  controllers: [ApplicationController],
  providers: [
    {
      provide: ApplicationService,
      useClass: ApplicationServiceImpl,
    },
  ],
  exports: [ApplicationService],
})
export class ApplicationModule {}
