import { Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { UserService, UserServiceImpl } from './user.service';

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [
    {
      provide: UserService,
      useClass: UserServiceImpl,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
