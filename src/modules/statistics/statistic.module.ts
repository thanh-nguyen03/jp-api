import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StatisticService, StatisticServiceImpl } from './statistic.service';
import { AdminStatisticController } from './controllers/admin-statistic.controller';
import { CompanyModule } from '../company/company.module';
import { RecruitmentModule } from '../recruitments/recruitment.module';
import { ApplicationModule } from '../applications/application.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    PrismaModule,
    CompanyModule,
    RecruitmentModule,
    ApplicationModule,
    UserModule,
  ],
  controllers: [AdminStatisticController],
  providers: [
    {
      provide: StatisticService,
      useClass: StatisticServiceImpl,
    },
  ],
})
export class StatisticModule {}
