import { Module } from '@nestjs/common';
import { ManageRecruitmentCompanyController } from './controllers/manage-recruitment-company.controller';
import {
  RecruitmentService,
  RecruitmentServiceImpl,
} from './recruitment.service';
import { CompanyModule } from '../company/company.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminRecruitmentController } from './controllers/admin-recruitment.controller';
import { RecruitmentController } from './controllers/recruitment.controller';
import { ApplicationModule } from '../applications/application.module';

@Module({
  imports: [PrismaModule, CompanyModule, ApplicationModule],
  controllers: [
    AdminRecruitmentController,
    ManageRecruitmentCompanyController,
    RecruitmentController,
  ],
  providers: [
    {
      provide: RecruitmentService,
      useClass: RecruitmentServiceImpl,
    },
  ],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
