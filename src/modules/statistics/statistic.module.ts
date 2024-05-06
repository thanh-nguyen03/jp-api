import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StatisticService, StatisticServiceImpl } from './statistic.service';
import { AdminStatisticController } from './controllers/admin-statistic.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminStatisticController],
  providers: [
    {
      provide: StatisticService,
      useClass: StatisticServiceImpl,
    },
  ],
})
export class StatisticModule {}
