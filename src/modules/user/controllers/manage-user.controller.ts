import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { Roles } from '../../../decorators/role.decorator';
import { Role } from '@prisma/client';
import { UserService } from '../user.service';
import { UserFilter } from '../dtos/user-filter.dto';
import ResponseDto from '../../../constants/response.dto';

@Controller('admin/users')
@Roles(Role.ADMIN)
export class ManageUserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getAll(@Query() filter: UserFilter) {
    return ResponseDto.successDefault(await this.userService.findAll(filter));
  }

  @Get(':id')
  async getDetail(@Param('id', ParseIntPipe) id: number) {
    return ResponseDto.successDefault(await this.userService.getUserById(id));
  }
}
