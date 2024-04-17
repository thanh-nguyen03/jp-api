import { UserDto } from '../../user/dtos/user.dto';

export class RefreshAccessTokenResponseDto {
  access_token: string;
  refresh_token: string;
  user: Partial<UserDto>;
}
