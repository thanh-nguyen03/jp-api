import { Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { AdminCompanyController } from './controllers/admin-company.controller';
import { CompanyService, CompanyServiceImpl } from './company.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [AdminCompanyController],
  providers: [
    {
      provide: CompanyService,
      useClass: CompanyServiceImpl,
    },
  ],
  exports: [CompanyService],
})
export class CompanyModule {}
