import { Module } from '@nestjs/common';
import { ManageRecruitmentCompanyController } from './controllers/manage-recruitment-company.controller';
import {
  RecruitmentService,
  RecruitmentServiceImpl,
} from './recruitment.service';
import { CompanyModule } from '../company/company.module';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AdminRecruitmentController } from './controllers/admin-recruitment.controller';
import { RecruitmentController } from './controllers/recruitment.controller';

@Module({
  imports: [PrismaModule, CompanyModule],
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
})
export class RecruitmentModule {}
