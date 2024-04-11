import { Controller, Post, UseGuards, Request, Body } from '@nestjs/common';
import { LocalAuthGuard } from '../guards/local.guard';
import { AuthService } from '../auth.service';
import { RefreshAccessTokenRequestDto } from '../dtos/refresh-access-token-request.dto';
import ResponseDto from '../../../constants/response.dto';
import { Message } from '../../../constants/message';
import { Public } from '../../../decorators/public.decorator';
import { RegisterRequestDto } from '../dtos/register-request.dto';

@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('/login')
  async login(@Request() req: any) {
    return ResponseDto.success(
      await this.authService.login(req.user),
      Message.LOGIN_SUCCESSFUL,
    );
  }

  @Post('/refresh-token')
  async refreshAccessToken(@Body() body: RefreshAccessTokenRequestDto) {
    return ResponseDto.successDefault(
      await this.authService.refreshAccessToken(body),
    );
  }

  @Post('/register')
  async register(@Body() registerRequestDto: RegisterRequestDto) {
    await this.authService.register(registerRequestDto);
    return ResponseDto.successWithoutData(Message.REGISTER_SUCCESSFUL);
  }
}
