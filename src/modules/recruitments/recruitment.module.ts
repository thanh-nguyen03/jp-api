import { Module } from '@nestjs/common';
import { ManageRecruitmentCompanyController } from './controllers/manage-recruitment-company.controller';
import {
  RecruitmentService,
  RecruitmentServiceImpl,
} from './recruitment.service';
import { CompanyModule } from '../company/company.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RecruitmentController } from './controllers/recruitment.controller';
import { ApplicationModule } from '../applications/application.module';
import { AmqpModule } from '../amqp/amqp.module';

@Module({
  imports: [PrismaModule, CompanyModule, ApplicationModule, AmqpModule],
  controllers: [ManageRecruitmentCompanyController, RecruitmentController],
  providers: [
    {
      provide: RecruitmentService,
      useClass: RecruitmentServiceImpl,
    },
  ],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
