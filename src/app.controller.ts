import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from './decorators/role.decorator';
import ResponseDto from './constants/response.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserDto } from './modules/user/dtos/user.dto';

@Controller()
export class AppController {
  @Get('sample')
  getHello() {
    return ResponseDto.successWithoutData('Hello World!');
  }

  @Roles(Role.ADMIN, Role.COMPANY_ADMIN)
  @Get('admin-sample')
  getAdminHello() {
    return ResponseDto.successWithoutData('Hello Admin!');
  }

  @Get('current-user')
  getCurrentUser(@CurrentUser() user: UserDto) {
    return ResponseDto.successDefault(user);
  }
}
