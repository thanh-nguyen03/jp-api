import { Body, Controller, Put } from '@nestjs/common';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { CurrentUser } from '../../../decorators/current-user.decorator';
import { User } from '@prisma/client';
import ResponseDto from '../../../constants/response.dto';
import { UserService } from '../user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Put('change-password')
  async changePassword(
    @Body() body: ChangePasswordDto,
    @CurrentUser() user: User,
  ) {
    return ResponseDto.successDefault(
      await this.userService.changePassword(body, user),
    );
  }
}
