import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserService, UserServiceImpl } from './user.service';
import { ManageUserController } from './controllers/manage-user.controller';
import { UserController } from './controllers/user.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ManageUserController, UserController],
  providers: [
    {
      provide: UserService,
      useClass: UserServiceImpl,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
