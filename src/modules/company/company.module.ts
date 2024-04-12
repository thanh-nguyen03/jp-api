import { Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AdminCompanyController } from './controllers/admin-company.controller';
import { CompanyService, CompanyServiceImpl } from './company.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminCompanyController],
  providers: [
    {
      provide: CompanyService,
      useClass: CompanyServiceImpl,
    },
  ],
})
export class CompanyModule {}
