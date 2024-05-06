import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminCompanyController } from './controllers/admin-company.controller';
import { CompanyService, CompanyServiceImpl } from './company.service';
import { UserModule } from '../user/user.module';
import { CompanyController } from './controllers/company.controller';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [AdminCompanyController, CompanyController],
  providers: [
    {
      provide: CompanyService,
      useClass: CompanyServiceImpl,
    },
  ],
  exports: [CompanyService],
})
export class CompanyModule {}
