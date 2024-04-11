import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshAccessTokenRequestDto {
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
